import { Currency } from "./common";

export interface CurrencyRate {
  id: string;
  currencyA: Currency;
  currencyB: Currency;
  /** Unix time in seconds. */
  date: number;
  /** A pair has buy and sell rates, a cross rate, or both. */
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}
