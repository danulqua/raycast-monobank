import { toTransaction } from "../api/mappers";
import { loadClientInfo } from "../services/clientInfo";
import { getDisplayNames, parseDateTime, roundAmount, toLocalIso } from "../services/format";
import { loadStatement } from "../services/statement";
import { PeriodPreset, Transaction } from "../types";
import { resolvePeriod, summarize } from "../utils/statement";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type Input = {
  /**
   * The `id` of an account or jar from `get-accounts`. Call `get-accounts` first when the user names an
   * account or jar. Leave out when none is named: the user's default account is used, and the result says which.
   */
  accountId?: string;
  /**
   * A period relative to today, computed in the user's time zone. Prefer it over `from`/`to` whenever it fits:
   * "today" (сьогодні); "last7Days" (last week, this week, за тиждень, за останній тиждень: today and the 6 days
   * before); "thisMonth" (цього місяця: from the 1st until now); "lastMonth" (минулого місяця: the whole previous
   * month); "last31Days" (last month as "the last 30 days", за останній місяць). When set, `from` and `to` are
   * ignored. When neither `period` nor `from` is set, the last 31 days are used.
   */
  period?: PeriodPreset;
  /**
   * Start of a custom period, as an ISO 8601 local date ("2026-11-01", the start of that day) or date-time
   * ("2026-11-01T18:00"). Only for periods `period` can't express. The period can be at most 31 days long.
   */
  from?: string;
  /**
   * End of a custom period, as an ISO 8601 local date (the end of that day) or date-time. Leave out for "until now".
   */
  to?: string;
  /**
   * "expense" for spending (outgoing money), "income" for deposits, top-ups and incoming transfers
   * (поповнення, надходження), or "all" (the default).
   */
  type?: "expense" | "income" | "all";
  /**
   * Only transactions with these Merchant Category Codes (ISO 18245), e.g. [5812, 5813, 5814] for cafes and
   * restaurants. When unsure which codes fit, leave out and use `byCategory` of the result.
   */
  mccCodes?: number[];
  /** Only transactions whose description, counterparty or comment contains this text (case-insensitive). */
  search?: string;
  /** How many transactions to list, newest first. Defaults to 50, at most 200. Totals always cover all matches. */
  limit?: number;
};

/**
 * Get the transactions (statement) of a monobank account or jar for a period of up to 31 days, with totals
 * computed for the matching transactions: income, expenses, net, cashback, and spending by merchant
 * category (`byCategory`). Use the totals to answer "how much did I spend/receive" questions instead of
 * adding up the listed transactions, which may be cut to `limit`.
 *
 * Amounts are in the account currency; expenses are negative in `transactions` and positive in the totals.
 * `holdCount` counts transactions the merchant's bank hasn't settled yet, whose amounts may still change.
 * `incomplete: true` means the period has more than monobank returns in one request, and only transactions
 * since `loadedSince` are counted. When `account.usedBecauseNoneWasNamed` is true, tell the user which account
 * was used.
 *
 * monobank allows one statement request per minute, so this can take up to a minute. Calling it again for the
 * same account and period within a minute (e.g. with other filters) is instant.
 */
export default async function tool(input: Input) {
  const { items, defaultItem } = await loadClientInfo();
  const names = getDisplayNames(items);

  const account = input.accountId ? items.find((item) => item.id === input.accountId) : defaultItem;
  if (!account) {
    throw new Error(
      input.accountId
        ? `No account or jar has the id "${input.accountId}". Call get-accounts to get the ids.`
        : "The user has no accounts",
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const { from, to, key } = getPeriod(input, now);
  const statement = await loadStatement(account.id, { from, to, key });
  const matches = statement.items
    .map((item) => toTransaction(item, account.currency))
    .filter((transaction) => matchesInput(transaction, input));

  const summary = summarize(matches);
  const round = (amount: number) => roundAmount(amount, account.currency);
  const limit = Math.min(Math.max(Math.floor(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);
  const oldest = statement.items[statement.items.length - 1];

  return {
    account: {
      id: account.id,
      name: names.get(account.id),
      currency: account.currency.code,
      isDefault: account.id === defaultItem?.id,
      usedBecauseNoneWasNamed: !input.accountId,
    },
    period: { from: toLocalIso(from), to: toLocalIso(to ?? now) },
    totals: {
      income: round(summary.income),
      expenses: round(summary.expenses),
      net: round(summary.income - summary.expenses),
      cashback: round(summary.cashback),
      count: summary.count,
      holdCount: summary.holdCount,
    },
    byCategory: getCategoryTotals(matches).map((category) => ({
      ...category,
      expenses: round(category.expenses),
      income: round(category.income),
    })),
    transactions: matches.slice(0, limit).map(toCompactTransaction),
    truncated: matches.length > limit,
    incomplete: statement.incomplete,
    loadedSince: statement.incomplete && oldest ? toLocalIso(oldest.time) : undefined,
  };
}

/** Resolves the period to unix seconds. `to` is left out when the period ends now. */
function getPeriod(input: Input, now: number): { from: number; to?: number; key: string } {
  if (input.period || !input.from) {
    // The same keys as "Show Statement" presets, so both share cached statements.
    const { from, to, key } = resolvePeriod({ preset: input.period ?? "last31Days" });
    return { from, to, key };
  }

  const from = parseDateTime(input.from);
  const requestedTo = input.to ? parseDateTime(input.to, { endOfDay: true }) : undefined;
  // monobank rejects an end in the future, so a period that runs until today ends now.
  const to = requestedTo !== undefined && requestedTo < now ? requestedTo : undefined;

  if (from >= (to ?? now)) {
    throw new Error(`\`from\` must be before \`to\` and not in the future. Today is ${toLocalIso(now).slice(0, 10)}.`);
  }

  return { from, to, key: `${from}-${to ?? "now"}` };
}

function matchesInput(transaction: Transaction, input: Input) {
  if (input.type === "expense" && transaction.amount >= 0) return false;
  if (input.type === "income" && transaction.amount <= 0) return false;
  if (input.mccCodes?.length && !input.mccCodes.includes(transaction.mcc)) return false;

  const search = input.search?.trim().toLowerCase();
  if (search) {
    const texts = [transaction.description, transaction.counterName, transaction.comment];
    if (!texts.some((text) => text?.toLowerCase().includes(search))) return false;
  }

  return true;
}

/** Totals per MCC, largest spending first. */
function getCategoryTotals(transactions: Transaction[]) {
  const categories = new Map<
    number,
    { mcc: number; name: string; nameUk: string; group: string; expenses: number; income: number; count: number }
  >();

  for (const transaction of transactions) {
    const { mcc, category } = transaction;
    const entry = categories.get(mcc) ?? {
      mcc,
      name: category.name,
      nameUk: category.nameUk,
      group: category.groupName,
      expenses: 0,
      income: 0,
      count: 0,
    };

    if (transaction.amount < 0) entry.expenses -= transaction.amount;
    else entry.income += transaction.amount;
    entry.count++;
    categories.set(mcc, entry);
  }

  return [...categories.values()].sort((a, b) => b.expenses - a.expenses || b.income - a.income);
}

function toCompactTransaction(transaction: Transaction) {
  const isOtherCurrency = transaction.operationCurrency.code !== transaction.currency.code;

  return {
    time: toLocalIso(transaction.time),
    description: transaction.description,
    amount: transaction.amount,
    operationAmount: isOtherCurrency ? transaction.operationAmount : undefined,
    operationCurrency: isOtherCurrency ? transaction.operationCurrency.code : undefined,
    category: transaction.category.name,
    categoryUk: transaction.category.nameUk,
    mcc: transaction.mcc,
    comment: transaction.comment,
    counterparty: transaction.counterName,
    hold: transaction.hold || undefined,
  };
}
