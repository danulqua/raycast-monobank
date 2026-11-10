import { LocalStorage, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTransaction } from "../api/mappers";
import { ApiError, RateLimitError, getStatement, getTokenError, requireToken } from "../api/monobank";
import { STATEMENT_RATE_LIMIT, STATEMENT_REQUEST_DELAY, STORAGE_KEYS } from "../data/constants";
import {
  RequestMode,
  StoredStatement,
  getPeriodGaps,
  getPeriodItems,
  planRequest,
  readStoredStatement,
  saveResponse,
} from "../services/statement";
import { AccountOrJar, Period } from "../types";
import { resolvePeriod } from "../utils/statement";

/** A load was replaced by a newer one, or the view was closed, before it sent its request. */
class CancelledError extends Error {}

/**
 * The statement of `account` for `period`. Nothing is loaded while either is `undefined`.
 *
 * Each account has one stored statement, and a period is shown by filtering it. A period within the last 31 days
 * resyncs all 31 days once the last sync is older than monobank's 60-second rate limit; an older period is fetched
 * once. Requests are spaced to respect that limit across launches, with a countdown toast while waiting.
 */
export function useStatement(account: AccountOrJar | undefined, period: Period | undefined) {
  const { token } = getPreferenceValues<Preferences>();
  const [stored, setStored] = useState<{ accountId: string; statement: StoredStatement }>();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>();
  const [waitSeconds, setWaitSeconds] = useState(0);
  // Incremented by every load and on unmount. A load whose number is no longer current stops waiting.
  const generation = useRef(0);
  // The request of the current load, so an identical one isn't sent again while it runs.
  const pendingRequest = useRef<string | undefined>(undefined);
  const accountId = useRef(account?.id);
  accountId.current = account?.id;

  const resolvedPeriod = useMemo(() => period && resolvePeriod(period), [period]);
  const statement = account && stored?.accountId === account.id ? stored.statement : undefined;
  const isLoadingStored = !!account && !statement;

  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  useEffect(() => {
    if (!account) return;

    let isCancelled = false;
    readStoredStatement(account.id).then(
      (statement) => {
        if (!isCancelled) setStored({ accountId: account.id, statement });
      },
      (error) => {
        console.error(error);
        if (!isCancelled) setError(error);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [account?.id]);

  const load = useCallback(
    async (mode: RequestMode) => {
      if (!account || !resolvedPeriod || !statement) return;

      const request = planRequest(statement, resolvedPeriod, mode, Date.now());
      if (!request) {
        if (mode === "auto") {
          // Stop waiting for a request this period doesn't need.
          generation.current++;
          pendingRequest.current = undefined;
          setIsFetching(false);
          setWaitSeconds(0);
          setError(undefined);
        }
        return;
      }

      // E.g. switching between periods of the last 31 days while their sync is waiting.
      const requestKey = `${account.id}:${request.from}-${request.to ?? "now"}`;
      if (mode === "auto" && pendingRequest.current === requestKey) return;

      const current = ++generation.current;
      const isCurrent = () => generation.current === current;
      pendingRequest.current = requestKey;

      setIsFetching(true);
      setError(undefined);

      try {
        // Token problems are reported right away, without waiting for the rate limit.
        requireToken(token);

        const page = await withRateLimit(
          () => getStatement(token, account.id, request.from, request.to),
          isCurrent,
          setWaitSeconds,
        );

        // Stored even if a newer load has started, since the request has already been spent.
        const next = await saveResponse(account.id, request, page, Date.now());
        if (accountId.current === account.id) setStored({ accountId: account.id, statement: next });
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
          pendingRequest.current = undefined;
          setIsFetching(false);
          setWaitSeconds(0);
        }
      }
    },
    [token, account?.id, resolvedPeriod, statement],
  );

  // Loads what the account and period need when either changes.
  useEffect(() => {
    if (isLoadingStored || !resolvedPeriod) return;
    load("auto");
  }, [account?.id, resolvedPeriod?.key, isLoadingStored]);

  const tokenError = getTokenError(error);

  const transactions = useMemo(() => {
    // Without a token monobank accepts, stored data can't be confirmed to belong to the user.
    if (!account || !statement || !resolvedPeriod || tokenError) return [];
    return getPeriodItems(statement, resolvedPeriod).map((item) => toTransaction(item, account.currency));
  }, [account, statement, resolvedPeriod, tokenError]);

  const hasGaps = useMemo(
    () => !!statement && !!resolvedPeriod && getPeriodGaps(statement, resolvedPeriod, Date.now()).length > 0,
    [statement, resolvedPeriod],
  );

  return {
    transactions,
    /** The resolved period, for titles. */
    period: resolvedPeriod,
    isLoading: isLoadingStored || isFetching,
    error,
    tokenError,
    /** Whether the period has older transactions that aren't loaded yet. */
    hasMore: !tokenError && !isFetching && hasGaps,
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
