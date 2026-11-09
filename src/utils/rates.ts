import { List } from "@raycast/api";
import { USD_UAH_RATE_ID } from "../data/constants";
import { Currency, CurrencyRate } from "../types";

export function getRateTitle(rate: CurrencyRate) {
  return `${rate.currencyA.code} – ${rate.currencyB.code}`;
}

export function getRateSubtitle(rate: CurrencyRate) {
  return rate.rateCross ? `${rate.rateCross}` : `${rate.rateBuy ?? "–"} / ${rate.rateSell ?? "–"}`;
}

/** What "Currency Rate Menu Bar" shows next to the flag (its "Menu Bar Title" preference). */
export type RateMenuBarTitle = "sell" | "buy" | "buySell" | "none";

/** The rate in the menu bar title: the chosen one, else the first pinned one, else USD – UAH, else the first rate. */
export function getMenuBarRate(rates: CurrencyRate[], selectedId: string, pinnedIds: string[]) {
  const find = (id: string) => rates.find((rate) => rate.id === id);
  return (
    (selectedId ? find(selectedId) : undefined) ??
    pinnedIds.map(find).find(Boolean) ??
    find(USD_UAH_RATE_ID) ??
    rates[0]
  );
}

/** The menu bar title for `rate`, or undefined to show only the flag. Pairs with only a cross rate show it. */
export function getRateMenuBarTitle(rate: CurrencyRate, mode: RateMenuBarTitle) {
  if (mode === "none") return undefined;
  if (rate.rateCross !== undefined) return `${rate.rateCross}`;
  if (mode === "buy") return `${rate.rateBuy ?? "–"}`;
  if (mode === "buySell") return getRateSubtitle(rate);
  return `${rate.rateSell ?? "–"}`;
}

export function getRateAccessories(rate: CurrencyRate): List.Item.Accessory[] {
  return [{ text: `${rate.currencyA.name} – ${rate.currencyB.name}` }];
}

/** Parses a positive amount like "200", "200.50", "200,50" or "1 000". */
export function parseAmount(text: string): number | undefined {
  // `\s` also matches non-breaking spaces.
  const normalized = text.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;

  const amount = Number(normalized);
  return amount > 0 ? amount : undefined;
}

export interface RateConversion {
  from: Currency;
  to: Currency;
  /** Units of currency B for 1 unit of currency A. */
  rate: number;
  rateType: "Sell" | "Buy" | "Cross";
  convert: (amount: number) => number;
}

/**
 * Both directions of a pair, from the bank's side: buying currency A from the bank uses its sell rate,
 * selling A to the bank uses its buy rate. Pairs with only a cross rate use it both ways.
 */
export function getRateConversions(rate: CurrencyRate): RateConversion[] {
  const { currencyA, currencyB, rateBuy, rateSell, rateCross } = rate;
  const conversions: RateConversion[] = [];

  const sell = rateSell
    ? { rate: rateSell, rateType: "Sell" as const }
    : rateCross && { rate: rateCross, rateType: "Cross" as const };
  if (sell) {
    conversions.push({ from: currencyB, to: currencyA, ...sell, convert: (amount) => amount / sell.rate });
  }

  const buy = rateBuy
    ? { rate: rateBuy, rateType: "Buy" as const }
    : rateCross && { rate: rateCross, rateType: "Cross" as const };
  if (buy) {
    conversions.push({ from: currencyA, to: currencyB, ...buy, convert: (amount) => amount * buy.rate });
  }

  return conversions;
}
