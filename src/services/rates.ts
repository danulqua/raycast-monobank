import { isSupportedRate, toCurrencyRate } from "../api/mappers";
import { getCurrencyRates } from "../api/monobank";
import { CurrencyRateResponse } from "../api/types";
import { AI_RATES_TTL, STORAGE_KEYS } from "../data/constants";
import { CurrencyRate } from "../types";
import { Cached, readJson, writeJson } from "./storage";

// The same cache as "Show Currency Rates", in the API format.
type RatesCache = Cached<{ rates: CurrencyRateResponse[] }>;

export interface LoadedRates {
  rates: CurrencyRate[];
  /** Whether monobank couldn't be reached and the rates come from an older cache. */
  stale: boolean;
  /** Unix milliseconds. */
  updatedAt: number;
}

/** monobank's currency rates, refetched when the cache is older than 5 minutes. Falls back to the cache on failure. */
export async function loadRates(): Promise<LoadedRates> {
  const cache = await readJson<RatesCache>(STORAGE_KEYS.rates);
  const hasCache = !!cache?.rates?.length;

  if (hasCache && Date.now() - cache.lastUpdated <= AI_RATES_TTL) {
    return { rates: cache.rates.map(toCurrencyRate), stale: false, updatedAt: cache.lastUpdated };
  }

  try {
    const rates = (await getCurrencyRates()).filter(isSupportedRate);
    const lastUpdated = Date.now();
    await writeJson(STORAGE_KEYS.rates, { rates, lastUpdated } satisfies RatesCache);
    return { rates: rates.map(toCurrencyRate), stale: false, updatedAt: lastUpdated };
  } catch (error) {
    if (!hasCache) throw error;

    console.error(error);
    return { rates: cache.rates.map(toCurrencyRate), stale: true, updatedAt: cache.lastUpdated };
  }
}
