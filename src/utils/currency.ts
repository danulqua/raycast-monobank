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

/** Like `toCurrency`, but an unknown code becomes a currency named after its number instead of crashing. */
export function toCurrencyOrUnknown(numericCode: number): Currency {
  if (isKnownCurrency(numericCode)) return toCurrency(numericCode);

  const number = numericCode.toString();
  return { name: `Currency ${number}`, code: number, number };
}

/** Number of minor-unit digits (2 for kopiyky and cents). Falls back to 2 for unknown currencies. */
export function getCurrencyDigits(currency: Currency) {
  return cc.code(currency.code)?.digits ?? 2;
}

/** Converts an API amount in minor units to major units. */
export function fromMinorUnits(amount: number, currency: Currency) {
  return amount / 10 ** getCurrencyDigits(currency);
}

/** An amount as plain text with the currency's decimals, e.g. "-120.50", for copying and CSV. */
export function formatPlainAmount(amount: number, currency: Currency) {
  return amount.toFixed(getCurrencyDigits(currency));
}

export function formatCurrency(number: number, currencyCode: string, fractionDigits = 2) {
  // `Intl` throws on codes that aren't 3 letters, e.g. the number of an unknown currency.
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    return `${number.toFixed(fractionDigits)} ${currencyCode}`;
  }

  return Intl.NumberFormat("uk-UA", {
    currency: currencyCode,
    style: "currency",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
    .format(number)
    .replace(",", ".");
}

/** Formats an amount with the currency's own decimals. With `signed`, income gets a leading "+". */
export function formatAmount(amount: number, currency: Currency, options: { signed?: boolean } = {}) {
  const formatted = formatCurrency(amount, currency.code, getCurrencyDigits(currency));
  return options.signed && amount > 0 ? `+${formatted}` : formatted;
}

export function getFlagImage(currencyCode: string) {
  return `country-flags/${currencyCode}.png`;
}
