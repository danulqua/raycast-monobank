import { List } from "@raycast/api";
import { CurrencyRate } from "../../types";
import { getFlagImage, getRateAccessories, getRateSubtitle, getRateTitle } from "../../utils";
import { PinProps } from "../PinActionsSection";
import RateActions from "./RateActions";

export default function RateListItem(props: { rate: CurrencyRate; pin: PinProps }) {
  const { rate, pin } = props;

  return (
    <List.Item
      id={rate.id}
      icon={getFlagImage(rate.currencyA.code)}
      title={getRateTitle(rate)}
      subtitle={getRateSubtitle(rate)}
      accessories={getRateAccessories(rate)}
      actions={<RateActions rate={rate} pin={pin} />}
    />
  );
}
