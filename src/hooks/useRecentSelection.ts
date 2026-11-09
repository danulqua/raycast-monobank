import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

interface StoredSelection {
  id: string;
  usedAt: number;
}

/**
 * An id saved in LocalStorage under `key` that is only restored if it was used within `ttl`.
 * Reading it on launch counts as a use, so each launch restarts the timer. Expiry is checked once,
 * on launch, so the selection never changes while the command stays open.
 * `selectedId` is `""` when nothing recent is saved.
 */
export function useRecentSelection(key: string, ttl: number) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedIdState] = useState("");

  useEffect(() => {
    let isCancelled = false;

    LocalStorage.getItem<string>(key)
      .then((json) => {
        if (isCancelled) return;
        const stored = parse(json);
        if (!stored) return;

        const now = Date.now();
        if (now - stored.usedAt >= ttl) return;

        setSelectedIdState(stored.id);
        LocalStorage.setItem(key, JSON.stringify({ id: stored.id, usedAt: now } satisfies StoredSelection));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [key, ttl]);

  function setSelectedId(id: string) {
    setSelectedIdState(id);
    LocalStorage.setItem(key, JSON.stringify({ id, usedAt: Date.now() } satisfies StoredSelection));
  }

  return { selectedId, setSelectedId, isLoading };
}

/** The stored selection, or undefined if there is none or it has another shape (e.g. a plain id string). */
function parse(json: string | undefined): StoredSelection | undefined {
  if (!json) return undefined;
  try {
    const value: unknown = JSON.parse(json);
    if (
      typeof value === "object" &&
      value !== null &&
      typeof (value as StoredSelection).id === "string" &&
      typeof (value as StoredSelection).usedAt === "number"
    ) {
      return value as StoredSelection;
    }
  } catch {
    // Not JSON: treated as nothing saved.
  }
  return undefined;
}
