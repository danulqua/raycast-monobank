import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { Jar } from "../../types";
import { getSendUrl } from "../../utils";
import PinActionsSection, { PinProps } from "../PinActionsSection";
import StatementView from "../statement/StatementView";

export default function JarActions(props: {
  jar: Jar;
  pin: PinProps;
  onToggleDetails: () => void;
  onCopyTotal: () => void;
}) {
  const { jar, pin, onToggleDetails, onCopyTotal } = props;
  const sendUrl = getSendUrl(jar.sendId);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Top up Page" url={sendUrl} />
        <Action.CopyToClipboard title="Copy Top up Page URL" icon={Icon.Link} content={sendUrl} />
        <Action.Push
          title="View Statement"
          icon={Icon.List}
          shortcut={shortcuts.viewStatement}
          target={<StatementView account={jar} />}
        />
        <Action.CopyToClipboard title="Copy Balance" content={jar.balance} shortcut={shortcuts.copyBalance} />
        {!!jar.goal && <Action.CopyToClipboard title="Copy Goal" content={jar.goal} shortcut={shortcuts.copyGoal} />}
        <Action title="Copy Total" icon={Icon.CopyClipboard} shortcut={shortcuts.copyTotal} onAction={onCopyTotal} />
      </ActionPanel.Section>

      <PinActionsSection {...pin}>
        <Action
          title="Toggle Details"
          icon={Icon.Sidebar}
          shortcut={shortcuts.toggleDetails}
          onAction={onToggleDetails}
        />
      </PinActionsSection>
    </ActionPanel>
  );
}
