import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTransaction } from "../api/mappers";
import {
  ApiError,
  RateLimitError,
  getStatement,
  getTokenError,
  getTokenFingerprint,
  requireToken,
} from "../api/monobank";
import { StatementItemResponse } from "../api/types";
import {
  STATEMENT_CACHE_SIZE,
  STATEMENT_PAGE_SIZE,
  STATEMENT_RATE_LIMIT,
  STATEMENT_REQUEST_DELAY,
  STORAGE_KEYS,
} from "../data/constants";
import { AccountOrJar, Period } from "../types";
import { resolvePeriod } from "../utils/statement";
import { useLocalStorage } from "./useLocalStorage";

// The cache keeps the API format, so changes to the domain types (e.g. new MCC data) apply to cached items too.
interface CacheEntry {
  /** Token fingerprint, account ID and period. */
  key: string;
  fetchedAt: number;
  /** Newest first. */
  items: StatementItemResponse[];
  /** Whether older items in the period may not be loaded yet. */
  hasMore: boolean;
}

interface StatementCache {
  /** Most recently fetched first. */
  entries: CacheEntry[];
}

const initialCache: StatementCache = { entries: [] };

/** A load was replaced by a newer one, or the view was closed, before it sent its request. */
class CancelledError extends Error {}

/**
 * The statement of `account` for `period`. Nothing is loaded while either is `undefined`.
 *
 * Statements are cached, and a cached one is refetched once it's older than monobank's 60-second rate
 * limit. Requests are spaced to respect that limit across launches, with a countdown toast while waiting.
 */
export function useStatement(account: AccountOrJar | undefined, period: Period | undefined) {
  const { token } = getPreferenceValues<Preferences>();
  const tokenFingerprint = useMemo(() => getTokenFingerprint(token), [token]);
  const {
    data: cache,
    setData: setCache,
    isLoading: isLoadingCache,
  } = useLocalStorage(STORAGE_KEYS.statementCache, initialCache);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>();
  const [waitSeconds, setWaitSeconds] = useState(0);
  // Incremented by every load and on unmount. A load whose number is no longer current stops waiting.
  const generation = useRef(0);

  const resolvedPeriod = useMemo(() => period && resolvePeriod(period), [period]);
  const key = account && resolvedPeriod ? `${tokenFingerprint}:${account.id}:${resolvedPeriod.key}` : undefined;
  const entry = key ? cache.entries.find((entry) => entry.key === key) : undefined;

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  const load = useCallback(
    async (mode: "refresh" | "older") => {
      if (!account || !resolvedPeriod || !key) return;

      const oldest = entry?.items[entry.items.length - 1];
      if (mode === "older" && !oldest) return;

      const current = ++generation.current;
      const isCurrent = () => generation.current === current;

      setIsFetching(true);
      setError(undefined);

      try {
        // Token problems are reported right away, without waiting for the rate limit.
        requireToken(token);

        const to = mode === "older" ? oldest!.time : resolvedPeriod.to;
        const page = await withRateLimit(
          () => getStatement(token, account.id, resolvedPeriod.from, to),
          isCurrent,
          setWaitSeconds,
        );
        const fetchedAt = Date.now();

        // Stored even if a newer load has started, since the request has already been spent.
        setCache((prev) => {
          const existing = prev.entries.find((entry) => entry.key === key);
          if (mode === "older" && !existing) return prev;

          const next: CacheEntry =
            mode === "older"
              ? { ...existing!, ...appendOlder(existing!, page) }
              : { key, fetchedAt, ...mergeFirstPage(existing, page) };

          return {
            entries: [next, ...prev.entries.filter((entry) => entry.key !== key)].slice(0, STATEMENT_CACHE_SIZE),
          };
        });
      } catch (error) {
        if (error instanceof CancelledError || !isCurrent()) return;

        console.error(error);
        setError(error);

        if (!getTokenError(error)) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to load statement",
            message: error instanceof ApiError ? error.description : undefined,
          });
        }
      } finally {
        if (isCurrent()) {
          setIsFetching(false);
          setWaitSeconds(0);
        }
      }
    },
    [token, account?.id, resolvedPeriod, key, entry, setCache],
  );

  // Loads when the account or period changes, unless the cached statement is still fresh.
  useEffect(() => {
    if (isLoadingCache || !key) return;

    if (entry && Date.now() - entry.fetchedAt < STATEMENT_RATE_LIMIT) {
      // Stop waiting for a statement that's no longer shown.
      generation.current++;
      setIsFetching(false);
      setWaitSeconds(0);
      setError(undefined);
      return;
    }

    load("refresh");
  }, [key, isLoadingCache]);

  const tokenError = getTokenError(error);

  const transactions = useMemo(() => {
    // Without a token monobank accepts, cached data can't be confirmed to belong to the user.
    if (!account || !entry || tokenError) return [];
    return entry.items.map((item) => toTransaction(item, account.currency));
  }, [account, entry, tokenError]);

  return {
    transactions,
    /** The resolved period, for titles. */
    period: resolvedPeriod,
    isLoading: isLoadingCache || isFetching,
    error,
    tokenError,
    hasMore: !tokenError && !!entry?.hasMore,
    loadOlder: useCallback(() => load("older"), [load]),
    refresh: useCallback(() => load("refresh"), [load]),
    /** Seconds left until the rate limit allows the next request, or 0 when not waiting. */
    waitSeconds,
  };
}

/** Sends `request` once monobank's rate limit allows it. On a 429, waits a full minute and retries once. */
async function withRateLimit<T>(
  request: () => Promise<T>,
  isCurrent: () => boolean,
  onWait: (seconds: number) => void,
): Promise<T> {
  // A load replaced right away (e.g. while switching accounts) is cancelled before it uses the rate limit.
  await sleep(STATEMENT_REQUEST_DELAY);
  if (!isCurrent()) throw new CancelledError();

  await waitForRateLimit(isCurrent, onWait);

  try {
    return await request();
  } catch (error) {
    if (!(error instanceof RateLimitError)) throw error;

    // The limit was used elsewhere, e.g. by another app with the same token.
    await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
    await waitForRateLimit(isCurrent, onWait);
    return await request();
  }
}

async function waitForRateLimit(isCurrent: () => boolean, onWait: (seconds: number) => void) {
  const requestedAt = (await LocalStorage.getItem<number>(STORAGE_KEYS.statementRequestedAt)) ?? 0;
  // Capped, in case the stored time is in the future after a clock change.
  const remaining = Math.min(requestedAt + STATEMENT_RATE_LIMIT - Date.now(), STATEMENT_RATE_LIMIT);

  if (remaining > 0) {
    await countDown(Date.now() + remaining, isCurrent, onWait);
  }

  if (!isCurrent()) throw new CancelledError();
  await LocalStorage.setItem(STORAGE_KEYS.statementRequestedAt, Date.now());
}

async function countDown(until: number, isCurrent: () => boolean, onWait: (seconds: number) => void) {
  const getTitle = (seconds: number) => `Waiting for monobank's rate limit… ${seconds}s`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: getTitle(Math.ceil((until - Date.now()) / 1000)),
  });

  try {
    for (let remaining = until - Date.now(); remaining > 0; remaining = until - Date.now()) {
      if (!isCurrent()) throw new CancelledError();

      const seconds = Math.ceil(remaining / 1000);
      onWait(seconds);
      toast.title = getTitle(seconds);

      // Wake up when the displayed number of seconds changes.
      await sleep(remaining - (seconds - 1) * 1000);
    }
  } finally {
    await toast.hide();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Combines a fresh first page with the cached statement, keeping cached older pages beyond it. */
function mergeFirstPage(existing: CacheEntry | undefined, page: StatementItemResponse[]) {
  const isFull = page.length >= STATEMENT_PAGE_SIZE;
  // A page that isn't full covers the whole period.
  if (!isFull || !existing) return { items: page, hasMore: isFull };

  const boundary = page[page.length - 1].time;
  const ids = new Set(page.map((item) => item.id));
  const older = existing.items.filter((item) => item.time < boundary && !ids.has(item.id));

  return { items: [...page, ...older], hasMore: older.length ? existing.hasMore : true };
}

/** Adds a page of older items (requested with `to` set to the oldest cached item's time). */
function appendOlder(existing: CacheEntry, page: StatementItemResponse[]) {
  const ids = new Set(existing.items.map((item) => item.id));
  const added = page.filter((item) => !ids.has(item.id));
  const items = [...existing.items, ...added].sort((a, b) => b.time - a.time);

  // Stop when a page adds nothing, so a page of items that all share one time can't loop forever.
  return { items, hasMore: page.length >= STATEMENT_PAGE_SIZE && added.length > 0 };
}
