import { Color, Image } from "@raycast/api";
import { BUDGET_WARNING_RATIO } from "../data/constants";
import { Budget, Period, Transaction } from "../types";
import { getProgressRing, progressColors } from "./accounts";
import { formatCurrency } from "./currency";
import { isPreset } from "./statement";

export type BudgetStatus = "ok" | "warning" | "over";

/** The calendar month budgets are counted for. */
export interface BudgetMonth {
  /** Unix seconds, the 1st at midnight. */
  from: number;
  /** Unix seconds, the last second of the month. */
  to: number;
  /** Whether it's the current month, which has a pace (`perDayLeft`, `projected`). */
  isCurrent: boolean;
  /** E.g. "November", or "December 2025" in another year. */
  label: string;
}

export interface BudgetProgress {
  budget: Budget;
  /** Expenses minus refunds in the budget's categories, never below 0. */
  spent: number;
  /** `limit - spent`, negative when over. */
  left: number;
  /** `spent / limit`. */
  ratio: number;
  status: BudgetStatus;
  /** Net spending per category, in the budget's order. */
  categories: { name: string; spent: number }[];
  /** Current month only: what's left per day, today included. */
  perDayLeft?: number;
  /** Current month only: the spending by the end of the month at the pace so far. */
  projected?: number;
  /** Current month only: days left, today included. */
  daysLeft?: number;
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/** The month for "This Month" and "Last Month", or `undefined` for other periods, which budgets don't show for. */
export function getBudgetMonth(period: Period, now = new Date()): BudgetMonth | undefined {
  if (!isPreset(period) || (period.preset !== "thisMonth" && period.preset !== "lastMonth")) return undefined;

  const offset = period.preset === "thisMonth" ? 0 : -1;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const label = start.toLocaleDateString("en-GB", {
    month: "long",
    year: start.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  return { from: toUnix(start), to: toUnix(end) - 1, isCurrent: offset === 0, label };
}

export function getBudgetStatus(ratio: number): BudgetStatus {
  if (ratio > 1) return "over";
  if (ratio >= BUDGET_WARNING_RATIO) return "warning";
  return "ok";
}

/**
 * How much of each budget is spent in `month`. Pass all loaded transactions of the month, not the ones a search
 * matched. Holds count; positive transactions in a budget's categories (refunds) reduce its spending.
 */
export function getBudgetProgress(
  budgets: Budget[],
  transactions: Transaction[],
  month: BudgetMonth,
  now = new Date(),
): BudgetProgress[] {
  const spentByCategory = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.time < month.from || transaction.time > month.to) continue;
    const { name } = transaction.category;
    spentByCategory.set(name, (spentByCategory.get(name) ?? 0) - transaction.amount);
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysLeft = daysInMonth - daysElapsed + 1;

  return budgets.map((budget) => {
    const categories = budget.categories.map((name) => ({ name, spent: spentByCategory.get(name) ?? 0 }));
    const spent = Math.max(
      categories.reduce((sum, category) => sum + category.spent, 0),
      0,
    );
    const left = budget.limit - spent;
    const ratio = budget.limit > 0 ? spent / budget.limit : 0;

    return {
      budget,
      spent,
      left,
      ratio,
      status: getBudgetStatus(ratio),
      categories,
      ...(month.isCurrent && {
        perDayLeft: Math.max(left, 0) / daysLeft,
        projected: (spent / daysElapsed) * daysInMonth,
        daysLeft,
      }),
    };
  });
}

const statusColors = {
  ok: progressColors.green,
  warning: progressColors.orange,
  over: progressColors.red,
} satisfies Record<BudgetStatus, unknown>;

/** A ring colored by status: green, orange at the warning, red when over. */
export function getBudgetIcon(progress: BudgetProgress): Image.ImageLike {
  return getProgressRing(progress.ratio, statusColors[progress.status]);
}

/** The text color for a status: none when it's fine. */
export function getBudgetColor(status: BudgetStatus) {
  if (status === "over") return Color.Red;
  if (status === "warning") return Color.Orange;
  return undefined;
}

/** Whole hryvnias, e.g. "5 000 ₴". Budgets show rounded amounts. */
export function formatHryvnias(amount: number) {
  return formatCurrency(Math.round(amount), "UAH", 0);
}

/** The used share as a whole percentage, e.g. "65%". */
export function formatBudgetPercentage(progress: BudgetProgress) {
  return `${Math.round(progress.ratio * 100)}%`;
}

/** E.g. "3 240 / 5 000 ₴". */
export function formatSpentOfLimit(progress: BudgetProgress) {
  return `${Math.round(progress.spent).toLocaleString("uk-UA")} / ${formatHryvnias(progress.budget.limit)}`;
}

/** E.g. "2 budgets over limit", "1 budget near limit", or `undefined` when all are fine. */
export function getBudgetAlert(progress: BudgetProgress[]): { status: BudgetStatus; text: string } | undefined {
  const over = progress.filter((item) => item.status === "over").length;
  if (over) return { status: "over", text: `${over} ${over === 1 ? "budget" : "budgets"} over limit` };

  const warning = progress.filter((item) => item.status === "warning").length;
  if (warning) return { status: "warning", text: `${warning} ${warning === 1 ? "budget" : "budgets"} near limit` };

  return undefined;
}

/**
 * A limit typed in a form, e.g. "5000", "5 000" or "5 000,50", in UAH. `undefined` when it isn't a number above 0.
 */
export function parseBudgetLimit(text: string): number | undefined {
  const cleaned = text
    .replace(/\s/g, "")
    .replace(/(₴|грн\.?|uah)$/i, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;

  const value = Math.round(Number(cleaned) * 100) / 100;
  return value > 0 ? value : undefined;
}
