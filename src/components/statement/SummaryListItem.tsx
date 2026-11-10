import { ActionPanel, Color, Icon, List } from "@raycast/api";
import {
  BudgetMonth,
  BudgetProgress,
  formatAmount,
  formatBudgetPercentage,
  formatHryvnias,
  formatSpentOfLimit,
  getBudgetAlert,
  getBudgetColor,
  getBudgetIcon,
  StatementSummary,
} from "../../utils";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

const { Metadata } = List.Item.Detail;

/**
 * Totals of the loaded transactions, with budgets and spending by category in the detail panel.
 * While searching, `summary` covers only the matching transactions, but budgets still cover the whole month.
 */
export default function SummaryListItem(props: {
  summary: StatementSummary;
  periodLabel: string;
  /** The trimmed search text; empty when not searching. */
  searchText: string;
  /** The number of loaded transactions, matching the search or not. */
  totalCount: number;
  /** Empty when there are no budgets or the period isn't a budget month. */
  budgetProgress: BudgetProgress[];
  budgetMonth?: BudgetMonth;
  /** Whether the period has older transactions that aren't loaded, so budgets may be undercounted. */
  isPartial: boolean;
  statement: StatementActionsProps;
}) {
  const { summary, periodLabel, searchText, totalCount, budgetProgress, budgetMonth, isPartial, statement } = props;
  const { currency } = summary;
  if (!currency) return null;

  const income = formatAmount(summary.income, currency, { signed: true });
  const spent = formatAmount(summary.expenses, currency);
  const net = formatAmount(summary.income - summary.expenses, currency, { signed: true });
  const cashback = formatAmount(summary.cashback, currency);
  const count = summary.holdCount ? `${summary.count} (${summary.holdCount} on hold)` : `${summary.count}`;
  const isSearching = searchText.length > 0;
  const budgetAlert = getBudgetAlert(budgetProgress);

  return (
    <List.Item
      id="summary"
      icon={{ source: Icon.PieChart, tintColor: Color.Blue }}
      title="Summary"
      subtitle={isSearching && !summary.count ? "No matching transactions" : `Income ${income} · Spent ${spent}`}
      accessories={[
        ...(budgetAlert
          ? [
              {
                icon: { source: Icon.ExclamationMark, tintColor: getBudgetColor(budgetAlert.status) },
                tooltip: budgetAlert.text,
              },
            ]
          : []),
        { text: isSearching ? `${summary.count} of ${totalCount} transactions` : `${totalCount} transactions` },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            // Keys include the text: Raycast doesn't resize a label whose text changes in place,
            // so a new key makes it recreate the label instead of truncating the new value.
            <Metadata>
              <Metadata.Label key={`period:${periodLabel}`} title="Period" text={periodLabel} />
              {isSearching && <Metadata.Label key={`search:${searchText}`} title="Search" text={searchText} />}
              <Metadata.Label key={`income:${income}`} title="Income" text={{ value: income, color: Color.Green }} />
              <Metadata.Label key={`spent:${spent}`} title="Spent" text={spent} />
              <Metadata.Label key={`net:${net}`} title="Net" text={net} />
              {summary.cashback !== 0 && (
                <Metadata.Label key={`cashback:${cashback}`} title="Cashback" text={cashback} />
              )}
              <Metadata.Label key={`count:${count}`} title="Transactions" text={count} />

              {budgetMonth && budgetProgress.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label
                    key={`budgets:${budgetMonth.label}:${isSearching}`}
                    title={`Budgets · ${budgetMonth.label}${isSearching ? " (whole month)" : ""}`}
                  />
                  {isPartial && <Metadata.Label title="Partial" text="Older transactions not loaded" />}
                  {budgetProgress.map((progress) => (
                    <BudgetLabels key={progress.budget.id} progress={progress} isCurrentMonth={budgetMonth.isCurrent} />
                  ))}
                </>
              )}

              {summary.categories.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label title="Spending by Category" />
                  {summary.categories.map((category) => {
                    const text = `${formatAmount(category.amount, currency)} (${category.count})`;
                    return (
                      <Metadata.Label
                        key={`${category.name}:${text}`}
                        title={category.name}
                        icon={category.icon}
                        text={text}
                      />
                    );
                  })}
                </>
              )}
            </Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <StatementActionsSection {...statement} />
        </ActionPanel>
      }
    />
  );
}

/** A budget's spending of its limit and, for the current month, what's left per day; or how much it's over by. */
function BudgetLabels(props: { progress: BudgetProgress; isCurrentMonth: boolean }) {
  const { progress, isCurrentMonth } = props;
  const color = getBudgetColor(progress.status);
  const text = `${formatSpentOfLimit(progress)} · ${formatBudgetPercentage(progress)}`;

  let pace: { title: string; text: string } | undefined;
  if (progress.left < 0) {
    pace = { title: "Over by", text: formatHryvnias(-progress.left) };
  } else if (isCurrentMonth) {
    const perDay = progress.perDayLeft !== undefined ? ` · ≈ ${formatHryvnias(progress.perDayLeft)}/day` : "";
    pace = { title: "Left", text: `${formatHryvnias(progress.left)}${perDay}` };
  }

  return (
    <>
      <Metadata.Label
        key={`${progress.budget.id}:${progress.budget.name}:${text}`}
        icon={getBudgetIcon(progress)}
        title={progress.budget.name}
        text={{ value: text, color }}
      />
      {pace && (
        <Metadata.Label
          key={`${progress.budget.id}:pace:${pace.title}:${pace.text}`}
          title={pace.title}
          text={{ value: pace.text, color: progress.left < 0 ? color : undefined }}
        />
      )}
    </>
  );
}
