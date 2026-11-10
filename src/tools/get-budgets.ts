import { toTransaction } from "../api/mappers";
import { budgetPresets } from "../data/budgetPresets";
import { readBudgets } from "../services/budgets";
import { loadClientInfo, resolveToolAccount } from "../services/clientInfo";
import { getDisplayNames, roundAmount, toLocalIso } from "../services/format";
import { loadStatement } from "../services/statement";
import { getBudgetMonth, getBudgetProgress } from "../utils/budgets";
import { resolvePeriod } from "../utils/statement";

type Input = {
  /**
   * The `id` of a UAH account from `get-accounts`, when the user names one. Leave out otherwise: the user's
   * default account is used, and the result says which.
   */
  accountId?: string;
  /** "thisMonth" (цього місяця, the default) or "lastMonth" (минулого місяця). */
  month?: "thisMonth" | "lastMonth";
};

/**
 * Get the user's monthly budgets (spending limits per category, бюджети, ліміти) and how much of each is spent in
 * a calendar month on one UAH account: `spent`, `left` (negative when over), `percentUsed` and `status` ("ok",
 * "warning" from 80%, "over" above 100%). For the current month, `perDayLeft` is what can still be spent per day
 * (today included) and `projected` is the month's spending at the pace so far.
 *
 * Use it for "how much can I still spend on…", "скільки лишилось на…" and "am I over budget" questions. Budgets are
 * shared by all accounts, but each count only the spending of the account used: say which one. Amounts are in UAH.
 * Refunds reduce spending, and transactions on hold count.
 *
 * `incomplete: true` means only transactions since `loadedSince` are counted. `presets` are ready-made budgets
 * for `set-budget`. Loading the month uses monobank's statement rate limit, so this can take up to a minute.
 */
export default async function tool(input: Input) {
  const budgets = await readBudgets();
  const presets = budgetPresets.map((preset) => preset.name);

  if (!budgets.length) {
    return {
      budgets: [],
      presets,
      note: 'The user has no budgets yet. Suggest creating one with set-budget (a preset fits common categories) or in the "Show Budgets" command.',
    };
  }

  const loaded = await loadClientInfo();
  const account = resolveToolAccount(loaded, input.accountId);
  const accountInfo = {
    id: account.id,
    name: getDisplayNames(loaded.items).get(account.id),
    currency: account.currency.code,
    isDefault: account.id === loaded.defaultItem?.id,
    usedBecauseNoneWasNamed: !input.accountId,
  };

  const preset = input.month ?? "thisMonth";
  const month = getBudgetMonth({ preset })!;

  if (account.currency.code !== "UAH") {
    return {
      account: accountInfo,
      month: month.label,
      budgets: budgets.map(({ id, name, categories, limit }) => ({ id, name, categories, limit })),
      presets,
      note: "Budgets count spending on UAH accounts only. Call get-accounts and pass a UAH account's id, or ask which one to use.",
    };
  }

  const { from, to } = resolvePeriod({ preset });
  const statement = await loadStatement(account.id, { from, to });
  const transactions = statement.items.map((item) => toTransaction(item, account.currency));
  const round = (amount: number) => roundAmount(amount, account.currency);
  const now = Math.floor(Date.now() / 1000);

  return {
    account: accountInfo,
    month: month.label,
    period: { from: toLocalIso(month.from), to: toLocalIso(Math.min(month.to, now)) },
    budgets: getBudgetProgress(budgets, transactions, month).map((progress) => ({
      id: progress.budget.id,
      name: progress.budget.name,
      categories: progress.budget.categories,
      limit: progress.budget.limit,
      spent: round(progress.spent),
      left: round(progress.left),
      percentUsed: Math.round(progress.ratio * 100),
      status: progress.status,
      perDayLeft: progress.perDayLeft !== undefined ? round(progress.perDayLeft) : undefined,
      projected: progress.projected !== undefined ? round(progress.projected) : undefined,
      daysLeft: progress.daysLeft,
    })),
    incomplete: statement.incomplete,
    loadedSince: statement.loadedSince !== undefined ? toLocalIso(statement.loadedSince) : undefined,
    presets,
  };
}
