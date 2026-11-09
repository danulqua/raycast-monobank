import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Period } from "../../types";
import PeriodForm from "./PeriodForm";

export interface StatementActionsProps {
  period: Period;
  onChangePeriod: (period: Period) => void;
  /** Left out when there is nothing to export. */
  onExportCsv?: () => void;
  onCopyCsv?: () => void;
  onRefresh: () => void;
  onToggleDetails: () => void;
}

/** Actions for the whole statement, shown on every item. */
export default function StatementActionsSection(props: StatementActionsProps) {
  const { period, onChangePeriod, onExportCsv, onCopyCsv, onRefresh, onToggleDetails } = props;

  return (
    <ActionPanel.Section>
      <Action.Push
        title="Change Period…"
        icon={Icon.Calendar}
        shortcut={shortcuts.changePeriod}
        target={<PeriodForm period={period} onChange={onChangePeriod} />}
      />
      {onExportCsv && (
        <Action title="Export to CSV" icon={Icon.Download} shortcut={shortcuts.exportCsv} onAction={onExportCsv} />
      )}
      {onCopyCsv && <Action title="Copy as CSV" icon={Icon.CopyClipboard} onAction={onCopyCsv} />}
      <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={shortcuts.refresh} onAction={onRefresh} />
      <Action
        title="Toggle Details"
        icon={Icon.Sidebar}
        shortcut={shortcuts.toggleDetails}
        onAction={onToggleDetails}
      />
    </ActionPanel.Section>
  );
}
