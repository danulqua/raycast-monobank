import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatAmount, StatementSummary } from "../../utils";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

const { Metadata } = List.Item.Detail;

/** Totals of the loaded transactions, with spending by category in the detail panel. */
export default function SummaryListItem(props: {
  summary: StatementSummary;
  periodLabel: string;
  statement: StatementActionsProps;
}) {
  const { summary, periodLabel, statement } = props;
  const { currency } = summary;
  if (!currency) return null;

  const income = formatAmount(summary.income, currency, { signed: true });
  const spent = formatAmount(summary.expenses, currency);
  const net = summary.income - summary.expenses;

  return (
    <List.Item
      id="summary"
      icon={{ source: Icon.PieChart, tintColor: Color.Blue }}
      title="Summary"
      subtitle={`Income ${income} · Spent ${spent}`}
      accessories={[{ text: `${summary.count} transactions` }]}
      detail={
        <List.Item.Detail
          metadata={
            <Metadata>
              <Metadata.Label title="Period" text={periodLabel} />
              <Metadata.Label title="Income" text={{ value: income, color: Color.Green }} />
              <Metadata.Label title="Spent" text={spent} />
              <Metadata.Label title="Net" text={formatAmount(net, currency, { signed: true })} />
              {summary.cashback !== 0 && (
                <Metadata.Label title="Cashback" text={formatAmount(summary.cashback, currency)} />
              )}
              <Metadata.Label
                title="Transactions"
                text={summary.holdCount ? `${summary.count} (${summary.holdCount} on hold)` : `${summary.count}`}
              />

              {summary.categories.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label title="Spending by Category" />
                  {summary.categories.map((category) => (
                    <Metadata.Label
                      key={category.group}
                      title={category.name}
                      icon={category.icon}
                      text={`${formatAmount(category.amount, currency)} (${category.count})`}
                    />
                  ))}
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
