import { useEffect, useState } from "react";
import { Cached } from "../services/storage";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Data cached in LocalStorage and refetched once the cache is older than `ttl`.
 * On a failed fetch the cached data is kept, and `lastUpdated` is still bumped so
 * the next attempt waits for another `ttl`, unless `shouldRetryNextLaunch(error)` returns true.
 *
 * When `scope` is set (e.g. a fingerprint of the credentials), the cache is only returned if it
 * was stored under the same scope. A cache from another scope is never returned and is refetched
 * right away; it is only passed to `fetch` as `previous`, which must not expose it.
 */
export function usePersistedResource<T extends object>(options: {
  key: string;
  initialValue: T;
  ttl: number;
  scope?: string;
  fetch: (previous: T) => Promise<T>;
  shouldRetryNextLaunch?: (error: unknown) => boolean;
}) {
  const { key, initialValue, ttl, scope, fetch, shouldRetryNextLaunch } = options;
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<unknown>();
  const {
    data,
    setData,
    isLoading: isLoadingFromStorage,
  } = useLocalStorage<Cached<T>>(key, { ...initialValue, lastUpdated: 0 });

  const isOtherScope = scope !== undefined && data.scope !== scope;

  // Runs once, right after the cached value has been read.
  useEffect(() => {
    if (isLoadingFromStorage) return;

    const now = Date.now();
    if (!isOtherScope && now - data.lastUpdated <= ttl) return;

    setIsFetching(true);
    setError(undefined);

    fetch(data)
      .then((fresh) => setData({ ...fresh, lastUpdated: now, scope }))
      .catch((error) => {
        console.error(error);
        setError(error);
        if (!shouldRetryNextLaunch?.(error)) {
          setData((prev) => ({ ...prev, lastUpdated: now }));
        }
      })
      .finally(() => setIsFetching(false));
  }, [isLoadingFromStorage]);

  return {
    data: isOtherScope ? initialValue : data,
    /** When the data was last fetched (or last attempted), in unix milliseconds. 0 before the first fetch. */
    lastUpdated: isOtherScope ? 0 : data.lastUpdated,
    setData,
    isLoading: isFetching || isLoadingFromStorage,
    /** Whether the cached value is still being read. Stays false while refetching. */
    isLoadingFromStorage,
    isError: error !== undefined,
    error,
  };
}
