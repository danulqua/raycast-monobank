import { List } from "@raycast/api";
import { CurrencyRate } from "../types";

export function getRateTitle(rate: CurrencyRate) {
  return `${rate.currencyA.code} – ${rate.currencyB.code}`;
}

export function getRateSubtitle(rate: CurrencyRate) {
  return rate.rateCross ? `${rate.rateCross}` : `${rate.rateBuy ?? "–"} / ${rate.rateSell ?? "–"}`;
}

export function getRateAccessories(rate: CurrencyRate): List.Item.Accessory[] {
  return [{ text: `${rate.currencyA.name} – ${rate.currencyB.name}` }];
}
