import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Transaction } from "../../types";
import { formatPlainAmount, getCheckGovUrl } from "../../utils";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";

export default function TransactionActions(props: { transaction: Transaction; statement: StatementActionsProps }) {
  const { transaction: t, statement } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Amount"
          content={formatPlainAmount(t.amount, t.currency)}
          shortcut={shortcuts.copyAmount}
        />
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

      <StatementActionsSection {...statement} />
    </ActionPanel>
  );
}
