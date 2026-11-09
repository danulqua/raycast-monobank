import cc from "currency-codes";
import { Currency } from "../types";

export function isKnownCurrency(numericCode: number) {
  return !!cc.number(numericCode.toString());
}

/** Callers must only pass codes known to `currency-codes` (see `isKnownCurrency`). */
export function toCurrency(numericCode: number): Currency {
  const record = cc.number(numericCode.toString())!;

  return {
    name: record.currency,
    code: record.code,
    number: record.number,
  };
}

export function formatCurrency(number: number, currencyCode: string) {
  return Intl.NumberFormat("uk-UA", {
    currency: currencyCode,
    style: "currency",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(number)
    .replace(",", ".");
}

export function getFlagImage(currencyCode: string) {
  return `country-flags/${currencyCode}.png`;
}
