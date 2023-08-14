import cc from "currency-codes";
import { Account, AccountResponse, Currency } from "../types";
import { getEmojiByCurrencyCode } from "./getEmojiByCurrencyCode";

export function transformAccount(account: AccountResponse): Account {
  const { currencyCode, balance, ...other } = account;
  const currencyCodeRecord = cc.number(currencyCode.toString())!;

  const currency: Currency = {
    name: currencyCodeRecord.currency,
    code: currencyCodeRecord.code,
    number: currencyCodeRecord.number,
    flag: getEmojiByCurrencyCode(currencyCodeRecord.code),
  };

  return {
    currency,
    balance: balance / 100,
    ...other,
  };
}
