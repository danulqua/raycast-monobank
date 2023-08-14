import { useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";
import { AccountsResponse, Preferences } from "../types";
import api from "../api";
import { getPreferenceValues } from "@raycast/api";

interface LocalStorageAccountsData {
  accounts: AccountsResponse;
  lastUpdated: number;
}

const lsInitialValue: LocalStorageAccountsData = {
  accounts: {
    clientId: "",
    name: "",
    webHookUrl: "",
    permissions: "",
    accounts: [],
    jars: [],
  },
  lastUpdated: 0,
};

export function useAccounts() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  const {
    data,
    setData,
    isLoading: isLoadingFromLS,
  } = useLocalStorage<LocalStorageAccountsData>("accounts", lsInitialValue);

  const { token } = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (isLoadingFromLS) return;

    const now = Date.now();
    if (now - data.lastUpdated <= 1000 * 60) return;

    fetchAccounts().then((accounts) => {
      setData({
        accounts,
        lastUpdated: now,
      });
    });
  }, [isLoadingFromLS]);

  async function fetchAccounts() {
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await api.get<AccountsResponse>("/personal/client-info", {
        headers: {
          "X-Token": token,
        },
      });

      return response.data;
    } catch (error) {
      console.error(error);
      setIsError(true);
      return data.accounts || {};
    } finally {
      setIsLoading(false);
    }
  }

  return {
    data: data.accounts,
    isLoading: isLoading || isLoadingFromLS,
    isError,
  };
}
