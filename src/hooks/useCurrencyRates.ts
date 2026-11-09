import { useMemo } from "react";
import { isSupportedRate, toCurrencyRate } from "../api/mappers";
import { getCurrencyRates } from "../api/monobank";
import { CurrencyRateResponse } from "../api/types";
import { RATES_TTL, STORAGE_KEYS } from "../data/constants";
import { usePersistedResource } from "./usePersistedResource";

// The cache keeps the API format, so caches from earlier versions stay valid.
const initialValue: { rates: CurrencyRateResponse[] } = { rates: [] };

export function useCurrencyRates() {
  const { data, isLoading, isError } = usePersistedResource({
    key: STORAGE_KEYS.rates,
    initialValue,
    ttl: RATES_TTL,
    fetch: async () => ({ rates: (await getCurrencyRates()).filter(isSupportedRate) }),
  });

  const rates = useMemo(() => data.rates.map(toCurrencyRate), [data.rates]);

  return {
    data: rates,
    isLoading,
    isError,
  };
}
