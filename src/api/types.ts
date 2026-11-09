/**
 * Response contracts of the monobank open API (https://api.monobank.ua/docs/index.html, spec v250818).
 * Only `src/api/` uses these types. The rest of the extension works with the domain types in `src/types/`,
 * which `./mappers` builds from them.
 *
 * Amounts are in the currency's minor units (e.g. kopiyky), and currency codes are ISO 4217 numeric codes.
 */

/** Body of a failed response (e.g. 400, 403, 429). */
export interface ErrorResponse {
  errorDescription?: string;
}

/** `GET /bank/currency`. Each pair has one or more of `rateBuy`, `rateSell` and `rateCross`. */
export interface CurrencyRateResponse {
  /** ISO 4217 numeric code. */
  currencyCodeA: number;
  /** ISO 4217 numeric code. */
  currencyCodeB: number;
  /** Unix time in seconds. */
  date: number;
  rateBuy?: number;
  rateSell?: number;
  rateCross?: number;
}

/** `GET /personal/client-info`. */
export interface ClientInfoResponse {
  clientId: string;
  name: string;
  webHookUrl: string;
  /** Permissions of the token, one letter per permission. */
  permissions: string;
  accounts: AccountResponse[];
  /** Missing for some clients without jars. */
  jars?: JarResponse[];
  /** Clients whose FOP accounts the token's owner manages (accountant access). */
  managedClients?: ManagedClientResponse[];
}

export type AccountTypeResponse = "black" | "white" | "platinum" | "iron" | "fop" | "yellow" | "eAid";

export type CashbackTypeResponse = "None" | "UAH" | "Miles";

export interface AccountResponse {
  id: string;
  /** Identifier for the send.monobank.ua top-up page. */
  sendId: string;
  /** In minor units. */
  balance: number;
  /** In minor units. */
  creditLimit: number;
  type: AccountTypeResponse;
  /** ISO 4217 numeric code. */
  currencyCode: number;
  cashbackType: CashbackTypeResponse;
  /** Masked card numbers. Empty for accounts without a card (e.g. FOP). */
  maskedPan: string[];
  iban: string;
}

export interface JarResponse {
  id: string;
  /** Identifier for the send.monobank.ua top-up page. */
  sendId: string;
  title: string;
  description: string;
  /** ISO 4217 numeric code. */
  currencyCode: number;
  /** In minor units. */
  balance: number;
  /** In minor units. 0 when the jar has no goal. */
  goal: number;
}

export interface ManagedClientResponse {
  clientId: string;
  /** Tax identification number. */
  tin: number;
  name: string;
  accounts: ManagedClientAccountResponse[];
}

export interface ManagedClientAccountResponse {
  id: string;
  /** In minor units. */
  balance: number;
  /** In minor units. */
  creditLimit: number;
  type: "fop";
  /** ISO 4217 numeric code. */
  currencyCode: number;
  iban: string;
}
