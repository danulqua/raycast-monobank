import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Budget, Subscription, Transaction } from "../../types";
import { formatPlainAmount, getCheckGovUrl } from "../../utils";
import TransactionBudgetActions, { SetTransactionBudgets } from "../budgets/TransactionBudgetActions";
import SubscriptionActions, { SetSubscriptionHidden } from "../subscriptions/SubscriptionActions";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

export default function TransactionActions(props: {
  transaction: Transaction;
  statement: StatementActionsProps;
  /** The subscription the transaction is a charge of. */
  subscription?: Subscription;
  onSetSubscriptionHidden: SetSubscriptionHidden;
  /** The saved budgets, only on a budget account. */
  budgets?: Budget[];
  onSetBudgets: SetTransactionBudgets;
}) {
  const { transaction: t, statement, subscription, onSetSubscriptionHidden, budgets, onSetBudgets } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Amount" content={formatPlainAmount(t.amount, t.currency)} />
        <Action.CopyToClipboard title="Copy Description" content={t.description} />
        {t.receiptId && (
          <>
            <Action.CopyToClipboard title="Copy Receipt Number" icon={Icon.Receipt} content={t.receiptId} />
            <Action.OpenInBrowser title="Open Check.gov.ua" url={getCheckGovUrl()} />
          </>
        )}
        {t.counterIban && (
          <Action.CopyToClipboard
            title="Copy Counterparty IBAN"
            content={t.counterIban}
            shortcut={shortcuts.copyIban}
          />
        )}
        <Action.CopyToClipboard title="Copy Transaction ID" content={t.id} />
      </ActionPanel.Section>

      {subscription && <SubscriptionActions subscription={subscription} onSetHidden={onSetSubscriptionHidden} />}

      {budgets && budgets.length > 0 && (
        <TransactionBudgetActions transaction={t} budgets={budgets} onSetBudgets={onSetBudgets} />
      )}

      <StatementActionsSection {...statement} />
    </ActionPanel>
  );
}
