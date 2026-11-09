import { Action, ActionPanel } from "@raycast/api";
import { CurrencyRate } from "../../types";
import PinActionsSection, { PinProps } from "../PinActionsSection";

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
      </ActionPanel.Section>

      <PinActionsSection {...pin} />
    </ActionPanel>
  );
}
