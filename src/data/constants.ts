import { Color } from "@raycast/api";
import { AccountType } from "../types";

export const STORAGE_KEYS = {
  clientInfo: "clientInfo",
  rates: "rates",
  pinnedAccounts: "pinnedAccounts",
  pinnedRates: "pinnedRates",
} as const;

// Monobank allows one client-info request per 60 seconds.
export const CLIENT_INFO_TTL = 1000 * 60;
export const RATES_TTL = 1000 * 60 * 60 * 24;

export const SEND_BASE_URL = "https://send.monobank.ua";

export const accountTypeColors: Record<AccountType, Color | string> = {
  black: "#777777",
  white: Color.PrimaryText,
  platinum: Color.Magenta,
  iron: Color.SecondaryText,
  fop: Color.Green,
  yellow: Color.Yellow,
  eAid: Color.Blue,
};
