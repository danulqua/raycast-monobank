import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCurrencyRates } from "./hooks/useCurrencyRates";
import { transformRate } from "./utils/transformRate";
import { Currency, CurrencyRate } from "./types";
import { useLocalStorage } from "./hooks/useLocalStorage";

export default function Command() {
  const { data, isLoading: isRatesLoading } = useCurrencyRates();
  const {
    data: pinned,
    setData: setPinned,
    isLoading: isPinnedLoadingFromLS,
  } = useLocalStorage<string[]>("pinned-rates", []);

  function onCategoryChange(newValue: string) {
    console.log(newValue);
  }

  function onPin(rate: CurrencyRate) {
    const isPinned = pinned.some((pinnedRate) => pinnedRate === rate.id);
    if (isPinned) {
      setPinned(pinned.filter((pinnedRate) => pinnedRate !== rate.id));
    } else {
      setPinned([...pinned, rate.id]);
    }
  }

  const transformedRates = data.map(transformRate);
  const filteredRates = transformedRates.filter((rate) => !pinned.includes(rate.id));
  const pinnedRates = transformedRates.filter((rate) => pinned.includes(rate.id));
  const isLoading = isRatesLoading || isPinnedLoadingFromLS;

  return (
    <List isLoading={isLoading} searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}>
      {pinnedRates.length ? (
        <List.Section title="Pinned">
          {pinnedRates.map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={getTitle(item.currencyA, item.currencyB)}
              subtitle={getSubtitle(item)}
              accessories={getAccessories(item)}
              actions={<RateActions item={item} onPin={onPin} />}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView />
      )}

      <List.Section title="All">
        {filteredRates.map((item) => (
          <List.Item
            key={item.id}
            id={item.id}
            title={getTitle(item.currencyA, item.currencyB)}
            subtitle={getSubtitle(item)}
            accessories={getAccessories(item)}
            actions={<RateActions item={item} onPin={onPin} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

type Category = "all" | "pinned";

function CategoryDropdown(props: { onCategoryChange: (newValue: string) => void }) {
  const { onCategoryChange } = props;

  return (
    <List.Dropdown tooltip="Select Category" storeValue={true} onChange={(newValue) => onCategoryChange(newValue)}>
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Item title="Pinned" value="pinned" />
    </List.Dropdown>
  );
}

function RateActions(props: { item: CurrencyRate; onPin: (rate: CurrencyRate) => void }) {
  const { item, onPin } = props;

  return (
    <ActionPanel>
      <Action.CopyToClipboard content={item.rateSell} />
      <Action
        title="Pin"
        icon={Icon.Pin}
        shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
        onAction={() => onPin(item)}
      />
    </ActionPanel>
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
