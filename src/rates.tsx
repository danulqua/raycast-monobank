import { ActionPanel, Action, List } from "@raycast/api";
import { useCurrencyRates } from "./hooks/useCurrencyRates";
import { transformRate } from "./utils/transformRate";
import { Currency, CurrencyRate } from "./types";

export default function Command() {
  const { data, isLoading } = useCurrencyRates();

  const formattedData = data.map(transformRate);

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Set Category">
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Pinned" value="pinned" />
        </List.Dropdown>
      }
    >
      {formattedData.map((item) => (
        <List.Item
          key={item.id}
          title={getTitle(item.currencyA, item.currencyB)}
          subtitle={getSubtitle(item)}
          accessories={getAccessories(item)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.rateSell} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getTitle(currencyA: Currency, currencyB: Currency) {
  return `${currencyA.flag} ${currencyA.code} - ${currencyB.flag} ${currencyB.code}`;
}

function getSubtitle(rate: CurrencyRate) {
  return rate.rateCross ? rate.rateCross.toFixed(2) : rate.rateBuy.toFixed(2) + " / " + rate.rateSell.toFixed(2);
}

function getAccessories(rate: CurrencyRate) {
  return [{ text: `${rate.currencyA.name} – ${rate.currencyB.name}` }];
}
