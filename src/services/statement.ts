import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { RateLimitError, getStatement, getTokenFingerprint, requireToken } from "../api/monobank";
import { StatementItemResponse } from "../api/types";
import { STATEMENT_CACHE_SIZE, STATEMENT_PAGE_SIZE, STATEMENT_RATE_LIMIT, STORAGE_KEYS } from "../data/constants";
import { validatePeriod } from "../utils/statement";
import { toUserFacingError } from "./clientInfo";
import { toLocalIso } from "./format";
import { readJson, writeJson } from "./storage";

// The cache keeps the API format, so changes to the domain types (e.g. new MCC data) apply to cached items too.
export interface StatementCacheEntry {
  /** Token fingerprint, account ID and period. */
  key: string;
  fetchedAt: number;
  /** Newest first. */
  items: StatementItemResponse[];
  /** Whether older items in the period may not be loaded yet. */
  hasMore: boolean;
}

export interface StatementCache {
  /** Most recently fetched first. */
  entries: StatementCacheEntry[];
}

/** Combines a fresh first page with the cached statement, keeping cached older pages beyond it. */
export function mergeFirstPage(existing: StatementCacheEntry | undefined, page: StatementItemResponse[]) {
  const isFull = page.length >= STATEMENT_PAGE_SIZE;
  // A page that isn't full covers the whole period.
  if (!isFull || !existing) return { items: page, hasMore: isFull };

  const boundary = page[page.length - 1].time;
  const ids = new Set(page.map((item) => item.id));
  const older = existing.items.filter((item) => item.time < boundary && !ids.has(item.id));

  return { items: [...page, ...older], hasMore: older.length ? existing.hasMore : true };
}

/** Adds a page of older items (requested with `to` set to the oldest cached item's time). */
export function appendOlder(existing: StatementCacheEntry, page: StatementItemResponse[]) {
  const ids = new Set(existing.items.map((item) => item.id));
  const added = page.filter((item) => !ids.has(item.id));
  const items = [...existing.items, ...added].sort((a, b) => b.time - a.time);

  // Stop when a page adds nothing, so a page of items that all share one time can't loop forever.
  return { items, hasMore: page.length >= STATEMENT_PAGE_SIZE && added.length > 0 };
}

export interface LoadedStatement {
  /** Newest first. */
  items: StatementItemResponse[];
  /** Whether the period has older transactions that weren't loaded (monobank returns up to 500 per request). */
  incomplete: boolean;
  /** Unix milliseconds. */
  fetchedAt: number;
}

/**
 * The statement of an account or jar from `period.from` to `period.to` (unix seconds; without `to`, until now).
 * `period.key` identifies the period in the cache: a preset key from `resolvePeriod`, or `${from}-${to}`.
 *
 * Uses the cache "Show Statement" uses. A statement fetched less than 60 seconds ago is returned without a
 * request. Otherwise the request waits for monobank's limit of one statement request per 60 seconds, which
 * is shared with the commands, and is retried once if monobank still answers 429.
 */
export async function loadStatement(
  accountId: string,
  period: { from: number; to?: number; key: string },
): Promise<LoadedStatement> {
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

  // The same key format as "Show Statement", so both use the same cached statements.
  const key = `${getTokenFingerprint(token)}:${accountId}:${period.key}`;
  const cached = (await readCache()).entries.find((entry) => entry.key === key);

  if (cached && Date.now() - cached.fetchedAt < STATEMENT_RATE_LIMIT) {
    return { items: cached.items, incomplete: cached.hasMore, fetchedAt: cached.fetchedAt };
  }

  let page: StatementItemResponse[];
  try {
    page = await withRateLimit(() => getStatement(token, accountId, from, to));
  } catch (error) {
    throw toUserFacingError(error);
  }

  const fetchedAt = Date.now();

  // Read again: the commands may have changed the cache while this request waited.
  const cache = await readCache();
  const existing = cache.entries.find((entry) => entry.key === key);
  const entry: StatementCacheEntry = { key, fetchedAt, ...mergeFirstPage(existing, page) };
  const entries = [entry, ...cache.entries.filter((entry) => entry.key !== key)].slice(0, STATEMENT_CACHE_SIZE);
  await writeJson(STORAGE_KEYS.statementCache, { entries } satisfies StatementCache);

  return { items: entry.items, incomplete: entry.hasMore, fetchedAt };
}

async function readCache(): Promise<StatementCache> {
  const cache = await readJson<StatementCache>(STORAGE_KEYS.statementCache);
  return Array.isArray(cache?.entries) ? cache : { entries: [] };
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
