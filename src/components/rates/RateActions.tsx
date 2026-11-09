import { Action, ActionPanel, Icon } from "@raycast/api";
import { shortcuts } from "../../data/shortcuts";
import { CurrencyRate } from "../../types";
import PinActionsSection, { PinProps } from "../PinActionsSection";
import ConvertCurrency from "./ConvertCurrency";

export default function RateActions(props: { rate: CurrencyRate; pin: PinProps }) {
  const { rate, pin } = props;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {rate.rateCross !== undefined ? (
          <Action.CopyToClipboard title="Copy Cross Rate" content={rate.rateCross} />
        ) : (
          <>
            {rate.rateSell !== undefined && <Action.CopyToClipboard title="Copy Sell Rate" content={rate.rateSell} />}
            {rate.rateBuy !== undefined && <Action.CopyToClipboard title="Copy Buy Rate" content={rate.rateBuy} />}
          </>
        )}
        <Action.Push
          title="Convert Currency"
          icon={Icon.Coins}
          shortcut={shortcuts.convert}
          target={<ConvertCurrency rate={rate} />}
        />
      </ActionPanel.Section>

      <PinActionsSection {...pin} />
    </ActionPanel>
  );
}
