import { createHash } from "node:crypto";
import { ClientInfoResponse, CurrencyRateResponse, ErrorResponse } from "./types";

const API_URL = "https://api.monobank.ua";

/** No access token is set in the preferences. */
export class MissingTokenError extends Error {
  constructor() {
    super("Access token is not set");
    this.name = "MissingTokenError";
  }
}

/** The access token is malformed or rejected by Monobank. */
export class InvalidTokenError extends Error {
  constructor(message = "Invalid access token") {
    super(message);
    this.name = "InvalidTokenError";
  }
}

async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(API_URL + path, {
    headers: token ? { "X-Token": token } : {},
  });

  if (response.status === 401 || response.status === 403) {
    throw new InvalidTokenError(`Access token was rejected with status ${response.status}`);
  }

  if (!response.ok) {
    const description = await getErrorDescription(response);
    throw new Error(`Request to ${path} failed with status ${response.status}${description ? `: ${description}` : ""}`);
  }

  return (await response.json()) as T;
}

/** Best effort, for the logs: the body may be missing or not JSON. */
async function getErrorDescription(response: Response) {
  try {
    const body = (await response.json()) as ErrorResponse;
    return typeof body?.errorDescription === "string" ? body.errorDescription : undefined;
  } catch {
    return undefined;
  }
}

// Tokens are often pasted with a trailing newline.
function normalizeToken(token: string | undefined) {
  return token?.trim() ?? "";
}

/**
 * Identifies which token cached data belongs to, without storing the token itself.
 * Returns an empty string when there is no token.
 */
export function getTokenFingerprint(token: string | undefined) {
  const normalizedToken = normalizeToken(token);
  return normalizedToken ? createHash("sha256").update(normalizedToken).digest("hex") : "";
}

export function getClientInfo(token: string | undefined) {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return Promise.reject(new MissingTokenError());
  }

  // Whitespace inside the token would make `fetch` throw on the header value, so reject it before the request.
  if (/\s/.test(normalizedToken)) {
    return Promise.reject(new InvalidTokenError("Access token is malformed"));
  }

  return request<ClientInfoResponse>("/personal/client-info", normalizedToken);
}

export function getCurrencyRates() {
  return request<CurrencyRateResponse[]>("/bank/currency");
}
