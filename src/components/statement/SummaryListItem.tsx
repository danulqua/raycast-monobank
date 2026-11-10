import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatAmount, StatementSummary } from "../../utils";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

const { Metadata } = List.Item.Detail;

/**
 * Totals of the loaded transactions, with spending by category in the detail panel.
 * While searching, `summary` covers only the matching transactions.
 */
export default function SummaryListItem(props: {
  summary: StatementSummary;
  periodLabel: string;
  /** The trimmed search text; empty when not searching. */
  searchText: string;
  /** The number of loaded transactions, matching the search or not. */
  totalCount: number;
  statement: StatementActionsProps;
}) {
  const { summary, periodLabel, searchText, totalCount, statement } = props;
  const { currency } = summary;
  if (!currency) return null;

  const income = formatAmount(summary.income, currency, { signed: true });
  const spent = formatAmount(summary.expenses, currency);
  const net = formatAmount(summary.income - summary.expenses, currency, { signed: true });
  const cashback = formatAmount(summary.cashback, currency);
  const count = summary.holdCount ? `${summary.count} (${summary.holdCount} on hold)` : `${summary.count}`;
  const isSearching = searchText.length > 0;

  return (
    <List.Item
      id="summary"
      icon={{ source: Icon.PieChart, tintColor: Color.Blue }}
      title="Summary"
      subtitle={isSearching && !summary.count ? "No matching transactions" : `Income ${income} · Spent ${spent}`}
      accessories={[
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

              {summary.categories.length > 0 && (
                <>
                  <Metadata.Separator />
                  <Metadata.Label title="Spending by Category" />
                  {summary.categories.map((category) => {
                    const text = `${formatAmount(category.amount, currency)} (${category.count})`;
                    return (
                      <Metadata.Label
                        key={`${category.mcc}:${text}`}
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
