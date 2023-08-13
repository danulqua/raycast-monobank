import { ActionPanel, Action, List, Icon, showToast, Toast } from "@raycast/api";
import { useCurrencyRates } from "./hooks/useCurrencyRates";
import { transformRate } from "./utils/transformRate";
import { Currency, CurrencyRate } from "./types";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useState } from "react";

export default function Command() {
  const [category, setCategory] = useState<Category>("all");
  const { data, isLoading: isRatesLoading } = useCurrencyRates();
  const {
    data: pinned,
    setData: setPinned,
    isLoading: isPinnedLoadingFromLS,
  } = useLocalStorage<string[]>("pinned-rates", []);

  function onCategoryChange(newValue: string) {
    setCategory(newValue as Category);
  }

  async function onPin(rate: CurrencyRate) {
    const isPinned = pinned.some((pinnedRate) => pinnedRate === rate.id);
    if (isPinned) {
      setPinned(pinned.filter((pinnedRate) => pinnedRate !== rate.id));
      await showToast(Toast.Style.Success, `Unpinned ${getTitle(rate.currencyA, rate.currencyB)}`);
    } else {
      setPinned([...pinned, rate.id]);
      await showToast(Toast.Style.Success, `Pinned ${getTitle(rate.currencyA, rate.currencyB)}`);
    }
  }

  function isPinned(rate: CurrencyRate) {
    return pinned.some((pinnedRate) => pinnedRate === rate.id);
  }

  const transformedRates = data.map(transformRate);
  const filteredRates = category === "all" ? transformedRates.filter((rate) => !pinned.includes(rate.id)) : [];
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
              actions={<RateActions item={item} isPinned={isPinned(item)} onPin={onPin} />}
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
            actions={<RateActions item={item} isPinned={isPinned(item)} onPin={onPin} />}
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

function RateActions(props: { item: CurrencyRate; isPinned: boolean; onPin: (rate: CurrencyRate) => void }) {
  const { item, isPinned, onPin } = props;

  return (
    <ActionPanel>
      <Action.CopyToClipboard content={item.rateSell} />
      <Action
        title={!isPinned ? "Pin" : "Unpin"}
        icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
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
