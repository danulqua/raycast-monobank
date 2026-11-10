import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { RateLimitError, getStatement, getTokenFingerprint, requireToken } from "../api/monobank";
import { StatementItemResponse } from "../api/types";
import {
  STATEMENT_PAGE_SIZE,
  STATEMENT_RATE_LIMIT,
  STATEMENT_RETENTION_MONTHS,
  STORAGE_KEYS,
  getStatementKey,
} from "../data/constants";
import { resolvePeriod, validatePeriod } from "../utils/statement";
import { toUserFacingError } from "./clientInfo";
import { toLocalIso } from "./format";
import { readJson, writeJson } from "./storage";

/** Unix seconds, both ends included. */
export interface TimeRange {
  from: number;
  to: number;
}

/** A period to show. Without `to`, it runs until now. */
export interface StatementPeriod {
  from: number;
  to?: number;
}

/** The parameters of a statement request. Without `to`, monobank returns transactions until now. */
export type StatementRequest = StatementPeriod;

/**
 * Every transaction of one account known so far. Each response is merged in, and any period is shown by
 * filtering `items`. Items keep the API format, so changes to the domain types (e.g. new MCC data) apply to them too.
 */
export interface StoredStatement {
  /** Token fingerprint. A statement stored for another token reads as empty. */
  scope: string;
  /** Newest first, with unique ids. */
  items: StatementItemResponse[];
  /** Where `items` has every transaction. Sorted, without overlapping or adjacent ranges. */
  covered: TimeRange[];
  /** Unix milliseconds of the last request that ended now, or 0. */
  syncedAt: number;
}

export type RequestMode = "auto" | "refresh" | "older";

/** The parts of `[from, to]` that `covered` doesn't include, newest first. */
export function getGaps(covered: TimeRange[], from: number, to: number): TimeRange[] {
  const gaps: TimeRange[] = [];
  let end = to;

  for (let i = covered.length - 1; i >= 0 && end >= from; i--) {
    const range = covered[i];
    if (range.from > end) continue;
    if (range.to < end) gaps.push({ from: Math.max(range.to + 1, from), to: end });
    end = range.from - 1;
  }

  if (end >= from) gaps.push({ from, to: end });
  return gaps;
}

/** The union of `covered` and `range`, with overlapping or adjacent ranges merged. */
export function addRange(covered: TimeRange[], range: TimeRange): TimeRange[] {
  if (range.from > range.to) return covered;

  const sorted = [...covered, range].sort((a, b) => a.from - b.from);
  const merged: TimeRange[] = [];

  for (const next of sorted) {
    const last = merged[merged.length - 1];
    if (last && next.from <= last.to + 1) {
      last.to = Math.max(last.to, next.to);
    } else {
      merged.push({ ...next });
    }
  }

  return merged;
}

/**
 * Merges a response into the stored statement. The response replaces the stored items in the range it covers,
 * so transactions that changed (e.g. a settled hold) are updated and ones monobank dropped (a cancelled hold)
 * are removed.
 */
export function mergeResponse(
  stored: StoredStatement,
  request: StatementRequest,
  page: StatementItemResponse[],
  fetchedAt: number,
): StoredStatement {
  const isFull = page.length >= STATEMENT_PAGE_SIZE;
  const to = request.to ?? Math.floor(fetchedAt / 1000);
  // A full page may stop before `request.from`, and in the middle of its oldest second.
  const from = isFull ? Math.min(...page.map((item) => item.time)) : request.from;

  const pageIds = new Set(page.map((item) => item.id));
  const kept = stored.items.filter((item) => {
    if (pageIds.has(item.id)) return false;
    if (item.time > to || item.time < from) return true;
    // Items at `from` that a full page lacks may be beyond its cut.
    return isFull && item.time === from;
  });

  return {
    scope: stored.scope,
    items: [...page, ...kept].sort((a, b) => b.time - a.time),
    covered: addRange(stored.covered, { from: isFull ? from + 1 : from, to }),
    syncedAt: request.to === undefined ? fetchedAt : stored.syncedAt,
  };
}

/** Drops transactions older than the retention period (see `STATEMENT_RETENTION_MONTHS`). */
export function prune(stored: StoredStatement, now: number): StoredStatement {
  const date = new Date(now);
  const cutoff = new Date(date.getFullYear(), date.getMonth() - STATEMENT_RETENTION_MONTHS, date.getDate());
  const cutoffTime = Math.floor(cutoff.getTime() / 1000);

  return {
    ...stored,
    items: stored.items.filter((item) => item.time >= cutoffTime),
    covered: stored.covered
      .filter((range) => range.to >= cutoffTime)
      .map((range) => ({ from: Math.max(range.from, cutoffTime), to: range.to })),
  };
}

/**
 * The parts of `period` the stored statement is missing, newest first. A period that runs until now is checked
 * until the last sync: transactions since then are new, not missing.
 */
export function getPeriodGaps(stored: StoredStatement, period: StatementPeriod, now: number): TimeRange[] {
  const end = period.to ?? Math.floor((stored.syncedAt || now) / 1000);
  return getGaps(stored.covered, period.from, end);
}

/** The stored transactions in `period`, newest first. */
export function getPeriodItems(stored: StoredStatement, period: StatementPeriod) {
  return stored.items.filter((item) => item.time >= period.from && (period.to === undefined || item.time <= period.to));
}

/**
 * The request `period` needs, or `undefined` when the stored statement already has it.
 *
 * - `auto`: when a period is opened. A period within the last 31 days resyncs all 31 days (the most one request
 *   covers) once the last sync is older than the rate limit. An older period fetches what's missing.
 * - `refresh`: always requests: the last 31 days, or the period itself when it's older.
 * - `older`: the newest missing part of the period.
 */
export function planRequest(
  stored: StoredStatement,
  period: StatementPeriod,
  mode: RequestMode,
  now: number,
): StatementRequest | undefined {
  const window = resolvePeriod({ preset: "last31Days" }, new Date(now));
  const syncWindow: StatementRequest = { from: window.from };
  const isInWindow = period.from >= window.from;
  const isOngoing = period.to === undefined;
  const gaps = getPeriodGaps(stored, period, now);
  const isStale = now - stored.syncedAt >= STATEMENT_RATE_LIMIT;

  switch (mode) {
    case "auto":
      if (isInWindow) return isStale && (isOngoing || gaps.length) ? syncWindow : undefined;
      if (isOngoing && isStale) return { from: period.from };
      return gaps[0];
    case "refresh":
      return isInWindow ? syncWindow : { from: period.from, to: period.to };
    case "older":
      return gaps[0];
  }
}

function getScope() {
  const { token } = getPreferenceValues<Preferences>();
  return getTokenFingerprint(token);
}

function isStoredStatement(value: unknown): value is StoredStatement {
  if (typeof value !== "object" || value === null) return false;
  const { scope, items, covered, syncedAt } = value as Partial<Record<keyof StoredStatement, unknown>>;
  return typeof scope === "string" && Array.isArray(items) && Array.isArray(covered) && typeof syncedAt === "number";
}

/** The stored statement as is, or an empty one when there's none for the current token. */
async function readRaw(accountId: string): Promise<StoredStatement> {
  const scope = getScope();
  const stored = await readJson<unknown>(getStatementKey(accountId));
  if (isStoredStatement(stored) && stored.scope === scope) return stored;
  return { scope, items: [], covered: [], syncedAt: 0 };
}

/** Accounts pruned since the command (or AI tool) started. */
const prunedAccounts = new Set<string>();

/**
 * The stored statement of an account. Old transactions are dropped on the first read of each account in a
 * command run, so a period fetched beyond the retention period stays until the command closes.
 */
export async function readStoredStatement(accountId: string): Promise<StoredStatement> {
  const stored = await readRaw(accountId);
  if (prunedAccounts.has(accountId)) return stored;

  prunedAccounts.add(accountId);
  const pruned = prune(stored, Date.now());
  if (pruned.items.length !== stored.items.length || pruned.covered.length !== stored.covered.length) {
    await writeJson(getStatementKey(accountId), pruned);
  }
  return pruned;
}

/**
 * Merges a response into the stored statement and returns the result. Reads storage again first, so a statement
 * saved meanwhile (e.g. by the AI tool while a command is open) isn't overwritten.
 */
export async function saveResponse(
  accountId: string,
  request: StatementRequest,
  page: StatementItemResponse[],
  fetchedAt: number,
): Promise<StoredStatement> {
  const next = mergeResponse(await readRaw(accountId), request, page, fetchedAt);
  await writeJson(getStatementKey(accountId), next);
  return next;
}

export interface LoadedStatement {
  /** Newest first. */
  items: StatementItemResponse[];
  /**
   * Whether the period has transactions that aren't loaded (monobank returns up to 500 per request). `items` then
   * only has the transactions since `loadedSince`.
   */
  incomplete: boolean;
  /** Unix seconds. */
  loadedSince?: number;
  /** Unix milliseconds of the request the statement is from. */
  fetchedAt: number;
}

/**
 * The statement of an account or jar from `period.from` to `period.to` (unix seconds; without `to`, until now).
 *
 * Uses the statement "Show Statement" stores. A period the stored statement covers is returned without a request,
 * except that one running until now is resynced once the last sync is older than 60 seconds. A request waits for
 * monobank's limit of one statement request per 60 seconds, which is shared with the commands, and is retried
 * once if monobank still answers 429.
 */
export async function loadStatement(accountId: string, period: StatementPeriod): Promise<LoadedStatement> {
  const { from, to } = period;
  const { token } = getPreferenceValues<Preferences>();

  try {
    requireToken(token);
  } catch (error) {
    throw toUserFacingError(error);
  }

  const invalid = validatePeriod(from, to ?? Math.floor(Date.now() / 1000));
  if (invalid) {
    throw new Error(
      `${invalid}. monobank returns at most 31 days per request: shorten the period, or split it into several calls. ` +
        `Today is ${toLocalIso(Math.floor(Date.now() / 1000)).slice(0, 10)}.`,
    );
  }

  let stored = await readStoredStatement(accountId);
  let fetchedAt = stored.syncedAt;
  const request = planRequest(stored, period, "auto", Date.now());

  if (request) {
    let page: StatementItemResponse[];
    try {
      page = await withRateLimit(() => getStatement(token, accountId, request.from, request.to));
    } catch (error) {
      throw toUserFacingError(error);
    }

    fetchedAt = Date.now();
    stored = await saveResponse(accountId, request, page, fetchedAt);
  }

  const gaps = getPeriodGaps(stored, period, Date.now());
  // Only the transactions after the newest missing part, so the totals cover one complete range.
  const loadedSince = gaps[0] && gaps[0].to + 1;
  const items = getPeriodItems(stored, loadedSince === undefined ? period : { from: loadedSince, to });

  return { items, incomplete: gaps.length > 0, loadedSince, fetchedAt };
}

/** Sends `request` once monobank's rate limit allows it. On a 429, waits a full minute and retries once. */
async function withRateLimit<T>(request: () => Promise<T>): Promise<T> {
  await waitForRateLimit();

  try {
    return await request();
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;

    // The limit was used elsewhere, e.g. by another app with the same token.
    await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
    await waitForRateLimit();
    return await request();
  }
}

async function waitForRateLimit() {
  const requestedAt = (await LocalStorage.getItem<number>(STORAGE_KEYS.statementRequestedAt)) ?? 0;
  // Capped, in case the stored time is in the future after a clock change.
  const remaining = Math.min(requestedAt + STATEMENT_RATE_LIMIT - Date.now(), STATEMENT_RATE_LIMIT);

  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }

  await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
}
