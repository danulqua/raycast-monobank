import { Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { Account, AccountOrJar, AccountType, CurrencyRate, Jar } from "../types";
import { SEND_BASE_URL, accountTypeColors } from "../data/constants";
import { formatCurrency } from "./currency";
import { satisfiesTexts } from "./common";

/**
 * Total balance in UAH. Other currencies are converted with the sell rate, or the cross rate for
 * currencies that only have one. Items in a currency without a UAH rate are left out.
 */
export function calculateTotal(items: AccountOrJar[], rates: CurrencyRate[]) {
  return items.reduce((total, item) => {
    if (item.currency.code === "UAH") return total + item.balance;

    const rate = rates.find((rate) => rate.currencyA.code === item.currency.code && rate.currencyB.code === "UAH");
    const value = rate?.rateSell ?? rate?.rateCross;

    return value === undefined ? total : total + item.balance * value;
  }, 0);
}

export function isAccount(item: AccountOrJar): item is Account {
  return (item as Account).iban !== undefined;
}

export function getPanOrIban(account: Account) {
  return account.maskedPan.length ? account.maskedPan[0] : account.iban;
}

export function getItemTitle(item: AccountOrJar) {
  return isAccount(item) ? item.title || getPanOrIban(item) : item.title;
}

export function getSendUrl(sendId: string) {
  return `${SEND_BASE_URL}/${sendId}`;
}

export function hasTopUpPage(account: Account) {
  return !!account.sendId && account.currency.code === "UAH";
}

export function matchesSearch(item: AccountOrJar, searchText: string) {
  if (isAccount(item)) {
    return satisfiesTexts(searchText, item.title, item.currency.code, item.type, getPanOrIban(item));
  }

  return satisfiesTexts(searchText, item.title, item.currency.code);
}

export function getAccountAccessories(account: Account): List.Item.Accessory[] {
  const color = accountTypeColors[account.type];
  const panOrIban = account.type === AccountType.FOP ? account.iban : account.maskedPan[0];

  return account.title
    ? [{ text: panOrIban }, { tag: { value: account.type, color } }]
    : [{ tag: { value: account.type, color } }];
}

export function getJarAccessories(jar: Jar): List.Item.Accessory[] {
  if (!jar.goal) return [{ text: "No goal" }];

  const progress = jar.balance / jar.goal;
  const percentage = (progress * 100).toFixed(2);
  const progressIcon =
    progress < 1 ? getProgressIcon(progress, Color.Green) : { source: Icon.CheckCircle, tintColor: Color.Green };

  return [{ text: formatCurrency(jar.goal, jar.currency.code) }, { icon: progressIcon, tooltip: `${percentage}%` }];
}
