import { Color } from "@raycast/api";
import { MOCK_API, MOCK_CONFIG } from "../mocks/config";
import { AccountType } from "../types";

/** Mock data is stored apart from real data, so turning mocks off leaves the real caches untouched. */
const STORAGE_PREFIX = MOCK_API ? "mock:" : "";

export const STORAGE_KEYS = {
  clientInfo: `${STORAGE_PREFIX}clientInfo`,
  rates: `${STORAGE_PREFIX}rates`,
  pinnedAccounts: `${STORAGE_PREFIX}pinnedAccounts`,
  pinnedRates: `${STORAGE_PREFIX}pinnedRates`,
  statementRequestedAt: `${STORAGE_PREFIX}statementRequestedAt`,
  statementPeriod: `${STORAGE_PREFIX}statementPeriod`,
  statementAccount: `${STORAGE_PREFIX}statementAccount`,
  menuBarRate: `${STORAGE_PREFIX}menuBarRate`,
  menuBarJar: `${STORAGE_PREFIX}menuBarJar`,
  rateHistory: `${STORAGE_PREFIX}rateHistory`,
} as const;

/** The stored statement of one account or jar (see `StoredStatement`). */
export function getStatementKey(accountId: string) {
  return `${STORAGE_PREFIX}statement:${accountId}`;
}

// Monobank allows one client-info request per 60 seconds.
export const CLIENT_INFO_TTL = MOCK_API ? MOCK_CONFIG.clientInfoTtl : 1000 * 60;
/**
 * "Show Currency Rates", "Show Accounts" and "Currency Rate Menu Bar". monobank changes its rates only a few times
 * a day. The menu bar refreshes every 2 hours, so its background runs always refetch, while opening its menu
 * refetches only rates older than this.
 */
export const RATES_TTL = 1000 * 60 * 30;
/**
 * AI tools and "Convert Currency" fetch only when the user asks something, so they refetch sooner and use the
 * current rate. monobank caches its rates for 5 minutes anyway.
 */
export const FRESH_RATES_TTL = 1000 * 60 * 5;
/** How many days of rates `rateHistory` keeps, one snapshot per day. */
export const RATE_HISTORY_DAYS = 7;

// Statement limits from the monobank API docs.
/** The longest period one statement request can cover: 31 days and 1 hour, in seconds. */
export const STATEMENT_MAX_PERIOD = 2682000;
/**
 * Monobank allows one statement request per 60 seconds. Also how long a sync stays fresh: periods that run until
 * now aren't resynced sooner.
 */
export const STATEMENT_RATE_LIMIT = MOCK_API ? MOCK_CONFIG.statementRateLimit : 60_000;
/**
 * How long a statement load waits before it uses the rate limit. A load replaced within this time
 * (e.g. by quickly switching accounts) is cancelled without sending a request.
 */
export const STATEMENT_REQUEST_DELAY = 500;
/** The most items one statement request returns. */
export const STATEMENT_PAGE_SIZE = 500;
/**
 * How many calendar months of transactions the stored statement keeps (counted from the start of the same day) when
 * the "Keep Statements For" preference has an unknown value. The preference sets retention, and its default of
 * 3 months always keeps "Last Month". Older transactions are dropped the next time a command reads the statement.
 */
export const DEFAULT_STATEMENT_RETENTION_MONTHS = 3;
/**
 * How long a statement remembers the chosen account and period since they were last used (picked or opened).
 * After that, the default account opens (the first pinned one, or the first UAH card) with the default period.
 * The period is also remembered only for the account it was chosen on, so it resets when the account changes.
 */
export const STATEMENT_SELECTION_TTL = 5 * 60_000;

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

/** Short names of account types, e.g. "Black" for an unnamed card in "Show Statement" ("Black *0001"). */
export const accountTypeTitles: Record<AccountType, string> = {
  black: "Black",
  white: "White",
  platinum: "Platinum",
  iron: "Iron",
  fop: "FOP",
  yellow: "Yellow",
  eAid: "eAid",
};

/** The id of the USD – UAH rate (ISO 4217 numeric codes), the default rate in the menu bar. */
export const USD_UAH_RATE_ID = "840-980";

/**
 * Payment details of Universal Bank, which issues monobank accounts. The MFO is also read from the IBAN
 * (see `getIbanMfo`); this one is the fallback.
 */
export const BANK_REQUISITES = {
  nameUk: "АТ «Універсал Банк»",
  nameEn: "JSC Universal Bank",
  edrpou: "21133352",
  mfo: "322001",
  swift: "UNJSUAUKXXX",
} as const;
