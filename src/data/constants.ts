import { Color } from "@raycast/api";
import { AccountType } from "../types";

export const STORAGE_KEYS = {
  clientInfo: "clientInfo",
  rates: "rates",
  pinnedAccounts: "pinnedAccounts",
  pinnedRates: "pinnedRates",
  statementCache: "statementCache",
  statementRequestedAt: "statementRequestedAt",
  statementPeriod: "statementPeriod",
  statementAccount: "statementAccount",
  menuBarRate: "menuBarRate",
  menuBarJar: "menuBarJar",
} as const;

// Monobank allows one client-info request per 60 seconds.
export const CLIENT_INFO_TTL = 1000 * 60;
export const RATES_TTL = 1000 * 60 * 60 * 24;
/** AI tools and the menu bar refetch rates sooner than "Show Currency Rates", so they show current rates. */
export const FRESH_RATES_TTL = 1000 * 60 * 5;

// Statement limits from the monobank API docs.
/** The longest period one statement request can cover: 31 days and 1 hour, in seconds. */
export const STATEMENT_MAX_PERIOD = 2682000;
/** Monobank allows one statement request per 60 seconds. Also how long a fetched statement stays fresh. */
export const STATEMENT_RATE_LIMIT = 60_000;
/**
 * How long a statement load waits before it uses the rate limit. A load replaced within this time
 * (e.g. by quickly switching accounts) is cancelled without sending a request.
 */
export const STATEMENT_REQUEST_DELAY = 500;
/** The most items one statement request returns. */
export const STATEMENT_PAGE_SIZE = 500;
/** How many statements (account and period pairs) are kept in the cache. */
export const STATEMENT_CACHE_SIZE = 5;
/**
 * How long "Show Statement" remembers the chosen account since it was last used (picked or opened).
 * After that, the default account opens: the first pinned one, or the first UAH card.
 */
export const STATEMENT_ACCOUNT_TTL = 5 * 60_000;

/** Receipts are looked up on check.gov.ua by their number. It has no documented deep link. */
export const CHECK_GOV_URL = "https://check.gov.ua/";

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

/** The id of the USD – UAH rate (ISO 4217 numeric codes), the default rate in the menu bar. */
export const USD_UAH_RATE_ID = "840-980";
