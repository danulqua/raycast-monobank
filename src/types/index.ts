export * from "./api";

export interface Currency {
  name: string;
  code: string;
  number: string;
  flag: string | null;
}

export interface CurrencyRate {
  id: string;
  currencyA: Currency;
  currencyB: Currency;
  date: number;
  rateBuy: number;
  rateCross: number;
  rateSell: number;
}

export type Currencies = Record<number, Currency>;
