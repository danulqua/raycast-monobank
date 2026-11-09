import { getPreferenceValues } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { toClientInfo } from "../api/mappers";
import { InvalidTokenError, MissingTokenError, getClientInfo, getTokenFingerprint } from "../api/monobank";
import { CLIENT_INFO_TTL, STORAGE_KEYS } from "../data/constants";
import { Account, ClientInfo } from "../types";
import { usePersistedResource } from "./usePersistedResource";

const initialValue: { clientInfo: ClientInfo } = {
  clientInfo: {
    accounts: [],
    jars: [],
  },
};

export function useClientInfo() {
  const { token } = getPreferenceValues<Preferences>();
  const tokenFingerprint = useMemo(() => getTokenFingerprint(token), [token]);

  const { data, setData, isLoading, isError, error } = usePersistedResource({
    key: STORAGE_KEYS.clientInfo,
    initialValue,
    ttl: CLIENT_INFO_TTL,
    // Data cached for another token (or before there was any) is never shown.
    scope: tokenFingerprint,
    fetch: async (previous) => ({
      clientInfo: toClientInfo(await getClientInfo(token), previous.clientInfo),
    }),
    // A missing or rejected token isn't rate limited, so refetch as soon as the user fixes it.
    shouldRetryNextLaunch: (error) => getTokenError(error) !== undefined,
  });

  const updateAccount = useCallback(
    (id: string, patch: Partial<Account>) => {
      setData((prev) => ({
        ...prev,
        clientInfo: {
          ...prev.clientInfo,
          accounts: prev.clientInfo.accounts.map((account) => (account.id === id ? { ...account, ...patch } : account)),
        },
      }));
    },
    [setData],
  );

  const tokenError = getTokenError(error);

  return {
    // Without a token Monobank accepts, cached data can't be confirmed to belong to the user.
    data: tokenError ? initialValue.clientInfo : data.clientInfo,
    updateAccount,
    isLoading,
    isError,
    tokenError,
  };
}

function getTokenError(error: unknown): "missing" | "invalid" | undefined {
  if (error instanceof MissingTokenError) return "missing";
  if (error instanceof InvalidTokenError) return "invalid";
  return undefined;
}
