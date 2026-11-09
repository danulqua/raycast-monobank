import { Account, AccountType, CashbackType, ClientInfo, CurrencyRate, Jar } from "../types";
import { isKnownCurrency, toCurrency } from "../utils/currency";
import { AccountResponse, ClientInfoResponse, CurrencyRateResponse, JarResponse } from "./types";

// Fields are mapped one by one, so fields the API adds later never reach domain objects or the cache.

export function toAccount(account: AccountResponse): Account {
  return {
    id: account.id,
    title: "",
    sendId: account.sendId,
    balance: account.balance / 100,
    creditLimit: account.creditLimit / 100,
    // The domain enums have the same values as the API.
    type: account.type as AccountType,
    currency: toCurrency(account.currencyCode),
    cashbackType: account.cashbackType as CashbackType,
    maskedPan: account.maskedPan,
    iban: account.iban,
  };
}

export function toJar(jar: JarResponse): Jar {
  return {
    id: jar.id,
    sendId: jar.sendId,
    title: jar.title,
    description: jar.description,
    currency: toCurrency(jar.currencyCode),
    balance: jar.balance / 100,
    goal: jar.goal / 100,
  };
}

/**
 * Keeps custom titles from `previous`, which only exist locally. They are matched by account ID, so a
 * previous cache from another token only contributes titles of accounts this token can see.
 */
export function toClientInfo(response: ClientInfoResponse, previous: ClientInfo): ClientInfo {
  const accounts = response.accounts.map(toAccount).map((account) => {
    const savedAccount = previous.accounts.find((saved) => saved.id === account.id);
    return savedAccount ? { ...account, title: savedAccount.title } : account;
  });

  return { accounts, jars: response.jars?.map(toJar) ?? [] };
}

/** Whether both currencies are known to `currency-codes`, which `toCurrencyRate` requires. */
export function isSupportedRate(rate: CurrencyRateResponse) {
  return isKnownCurrency(rate.currencyCodeA) && isKnownCurrency(rate.currencyCodeB);
}

/** Callers must only pass rates that pass `isSupportedRate`. */
export function toCurrencyRate(rate: CurrencyRateResponse): CurrencyRate {
  const currencyA = toCurrency(rate.currencyCodeA);
  const currencyB = toCurrency(rate.currencyCodeB);

  return {
    id: `${currencyA.number}-${currencyB.number}`,
    currencyA,
    currencyB,
    date: rate.date,
    rateBuy: rate.rateBuy,
    rateSell: rate.rateSell,
    rateCross: rate.rateCross,
  };
}
