import { Action, Icon, List } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { TokenError } from "../../api/monobank";
import { shortcuts } from "../../data/shortcuts";
import { useStatement } from "../../hooks";
import { AccountOrJar } from "../../types";
import { getBudgetMonth } from "../../utils";
import { showInvalidTokenToast } from "../TokenErrorEmptyView";
import BudgetList from "./BudgetList";

export type BudgetPeriod = "thisMonth" | "lastMonth";

/**
 * The saved budgets with their progress for This Month or Last Month, loading that month's statement itself.
 * Used by Show Budgets and by "Manage Budgets…" in Show Statement.
 */
export default function BudgetsView(props: {
  account?: AccountOrJar;
  initialMonth?: BudgetPeriod;
  isLoadingAccount?: boolean;
  accountsTokenError?: TokenError;
  searchBarAccessory?: List.Props["searchBarAccessory"];
}) {
  const {
    account,
    initialMonth = "thisMonth",
    isLoadingAccount = false,
    accountsTokenError,
    searchBarAccessory,
  } = props;
  const [preset, setPreset] = useState<BudgetPeriod>(initialMonth);
  const period = useMemo(() => ({ preset }), [preset]);
  const month = useMemo(() => getBudgetMonth(period), [period]);

  // Only UAH accounts have budgets, so other accounts don't spend a statement request.
  const isUah = account?.currency.code === "UAH";
  const statement = useStatement(isUah ? account : undefined, period);
  const tokenError = accountsTokenError ?? statement.tokenError;

  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  return (
    <BudgetList
      account={account}
      transactions={statement.transactions}
      month={month}
      isLoading={isLoadingAccount || (isUah && statement.isLoading)}
      isPartial={statement.hasMore}
      note={tokenError ? "Add a valid access token to see spending" : undefined}
      searchBarAccessory={searchBarAccessory}
      actions={
        <>
          <Action
            title={preset === "thisMonth" ? "Show Last Month" : "Show This Month"}
            icon={Icon.Calendar}
            shortcut={shortcuts.changePeriod}
            onAction={() => setPreset((preset) => (preset === "thisMonth" ? "lastMonth" : "thisMonth"))}
          />
          {isUah && (
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={shortcuts.refresh}
              onAction={statement.refresh}
            />
          )}
        </>
      }
    />
  );
}
