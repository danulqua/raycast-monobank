import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useAccounts } from "./hooks/useAccounts";
import { transformAccount } from "./utils/transformAccount";
import { transformJar } from "./utils/transformJar";
import { Account, Jar } from "./types";
import { isAccount } from "./utils/typeGuards";
import { accountTypeColors } from "./data/constants";
import { useCurrencyRates } from "./hooks/useCurrencyRates";
import { useState } from "react";
import { calculateTotal } from "./utils/calculateTotal";
import { useLocalStorage } from "./hooks/useLocalStorage";

type Category = "all" | "pinned" | "card" | "fop" | "jar";

export default function Command() {
  const [category, setCategory] = useState<Category>("all");
  const { data: accountsData, isLoading: isAccountsLoading, isError: isAccountsError } = useAccounts();
  const { data: rates, isLoading: isRatesLoading, isError: isRatesError } = useCurrencyRates();
  const {
    data: pinned,
    setData: setPinned,
    isLoading: isPinnedLoadingFromLS,
  } = useLocalStorage<string[]>("pinned-accounts", []);
  const { accounts, jars } = accountsData;

  function onCategoryChange(newValue: Category) {
    setCategory(newValue);
  }

  async function onPin(item: Account | Jar) {
    const isPinned = pinned.some((pinnedAccount) => pinnedAccount === item.id);
    if (isPinned) {
      setPinned(pinned.filter((pinnedAccount) => pinnedAccount !== item.id));
      await showToast(Toast.Style.Success, `Unpinned ${getTitle(item)}`);
    } else {
      setPinned([...pinned, item.id]);
      await showToast(Toast.Style.Success, `Pinned ${getTitle(item)}`);
    }
  }

  async function onRearrange(item: Account | Jar, direction: "up" | "down") {
    const accountIndex = pinned.findIndex((pinnedAccount) => pinnedAccount === item.id);
    const newPinned = [...pinned];

    if (direction === "up") {
      newPinned[accountIndex] = newPinned[accountIndex - 1];
      newPinned[accountIndex - 1] = item.id;
      await showToast(Toast.Style.Success, `Moved up ${getTitle(item)}`);
    } else {
      newPinned[accountIndex] = newPinned[accountIndex + 1];
      newPinned[accountIndex + 1] = item.id;
      await showToast(Toast.Style.Success, `Moved down ${getTitle(item)}`);
    }

    setPinned(newPinned);
  }

  function getValidRearrangeDirections(item: Account | Jar) {
    return {
      up: pinned.findIndex((pinnedAccount) => pinnedAccount === item.id) > 0,
      down: pinned.findIndex((pinnedAccount) => pinnedAccount === item.id) < pinned.length - 1,
    };
  }

  const transformedAccounts = accounts.map(transformAccount);
  const cards = transformedAccounts.filter((account) => account.type !== "fop");
  const fops = transformedAccounts.filter((account) => account.type === "fop");

  const transformedJars = jars.map(transformJar);

  const pinnedAccounts = pinned.map(
    (pinnedAccountId) => [...transformedAccounts, ...transformedJars].find((account) => account.id === pinnedAccountId)!
  );

  const filteredCards = category === "all" ? cards.filter((card) => !pinned.includes(card.id)) : cards;
  const filteredFops = category === "all" ? fops.filter((fop) => !pinned.includes(fop.id)) : fops;
  const filteredJars = category === "all" ? transformedJars.filter((jar) => !pinned.includes(jar.id)) : transformedJars;

  const totalAmount = calculateTotal([...cards, ...fops, ...transformedJars], rates);

  const isLoading = isAccountsLoading || isRatesLoading || isPinnedLoadingFromLS;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Total: ${totalAmount.toFixed(2)}`}
      searchBarAccessory={<CategoryDropdown onCategoryChange={onCategoryChange} />}
    >
      {(category === "all" || category === "pinned") && (
        <List.Section title="Pinned">
          {pinnedAccounts.map((account) => (
            <List.Item
              key={account.id}
              id={account.id}
              title={getTitle(account)}
              subtitle={getSubtitle(account)}
              accessories={isAccount(account) ? getAccountAccessories(account) : getJarAccessories(account)}
              actions={
                isAccount(account) ? (
                  <AccountActions
                    account={account}
                    isPinned={true}
                    validRearrangeDirections={getValidRearrangeDirections(account)}
                    onPin={onPin}
                    onRearrange={onRearrange}
                  />
                ) : (
                  <JarActions
                    jar={account}
                    isPinned={true}
                    validRearrangeDirections={getValidRearrangeDirections(account)}
                    onPin={onPin}
                    onRearrange={onRearrange}
                  />
                )
              }
            />
          ))}
        </List.Section>
      )}

      {(category === "all" || category === "card") && (
        <List.Section title="Cards">
          {filteredCards.map((card) => (
            <List.Item
              key={card.id}
              id={card.id}
              title={getTitle(card)}
              subtitle={getSubtitle(card)}
              detail={<List.Item.Detail />}
              accessories={getAccountAccessories(card)}
              actions={<AccountActions account={card} isPinned={false} onPin={onPin} />}
            />
          ))}
        </List.Section>
      )}

      {(category === "all" || category === "fop") && (
        <List.Section title="FOPs">
          {filteredFops.map((fop) => (
            <List.Item
              key={fop.id}
              id={fop.id}
              title={getTitle(fop)}
              subtitle={getSubtitle(fop)}
              detail={<List.Item.Detail />}
              accessories={getAccountAccessories(fop)}
              actions={<AccountActions account={fop} isPinned={false} onPin={onPin} />}
            />
          ))}
        </List.Section>
      )}

      {(category === "all" || category === "jar") && (
        <List.Section title="Jars">
          {filteredJars.map((jar) => (
            <List.Item
              key={jar.id}
              id={jar.id}
              title={getTitle(jar)}
              subtitle={getSubtitle(jar)}
              accessories={getJarAccessories(jar)}
              actions={<JarActions jar={jar} isPinned={false} onPin={onPin} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CategoryDropdown(props: { onCategoryChange: (newValue: Category) => void }) {
  const { onCategoryChange } = props;

  return (
    <List.Dropdown tooltip="Select Category" storeValue onChange={(newValue) => onCategoryChange(newValue as Category)}>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="All" value="all" />
        <List.Dropdown.Item title="Pinned" value="pinned" />
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        <List.Dropdown.Item title="Cards" value="card" />
        <List.Dropdown.Item title="FOPs" value="fop" />
        <List.Dropdown.Item title="Jars" value="jar" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function getTitle(item: Account | Jar) {
  if (isAccount(item)) {
    return `${item.currency.flag} ${item.currency.code}, ${item.type}`;
  }

  return `${item.currency.flag} ${item.currency.code}, ${item.title}`;
}

function getSubtitle(item: Account | Jar) {
  return item.balance.toFixed(2);
}

function getAccountAccessories(account: Account): List.Item.Accessory[] {
  const color = accountTypeColors[account.type];

  return [
    { text: account.type === "fop" ? account.iban : account.maskedPan[0] },
    { tag: { value: account.type, color } },
  ];
}

function AccountActions(props: {
  account: Account;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Account) => void;
  onRearrange?: (account: Account, direction: "up" | "down") => void;
}) {
  const { account, isPinned, validRearrangeDirections, onPin, onRearrange } = props;

  const sendUrl = `https://send.monobank.ua/${account.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {account.sendId && account.currency.code === "UAH" && (
          <>
            <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
            <Action.CopyToClipboard title="Copy Top Up Page URL" icon={Icon.Link} content={sendUrl} />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy IBAN"
          content={account.iban}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(account)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(account, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(account, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getJarAccessories(jar: Jar): List.Item.Accessory[] {
  const progress = jar.balance / jar.goal;
  const percentage = (progress * 100).toFixed(2);

  if (!jar.goal) return [{ text: "No goal" }];

  return [
    {
      text: jar.goal.toFixed(2),
    },
    {
      icon:
        progress < 1 ? getProgressIcon(progress, Color.Green) : { source: Icon.CheckCircle, tintColor: Color.Green },
      tooltip: `${percentage}%`,
    },
  ];
}

function JarActions(props: {
  jar: Jar;
  isPinned: boolean;
  validRearrangeDirections?: { up: boolean; down: boolean };
  onPin: (account: Jar) => void;
  onRearrange?: (account: Jar, direction: "up" | "down") => void;
}) {
  const { jar, isPinned, validRearrangeDirections, onPin, onRearrange } = props;

  const sendUrl = `https://send.monobank.ua/${jar.sendId}`;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
        <Action.CopyToClipboard title="Copy Top Up Page URL" icon={Icon.Link} content={sendUrl} />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title={!isPinned ? "Pin" : "Unpin"}
          icon={!isPinned ? Icon.Pin : Icon.PinDisabled}
          shortcut={{ key: "p", modifiers: ["cmd", "shift"] }}
          onAction={() => onPin(jar)}
        />
        {isPinned && onRearrange && (
          <>
            {validRearrangeDirections?.up && (
              <Action
                title="Move Up in Pinned"
                icon={Icon.ArrowUp}
                shortcut={{ key: "arrowUp", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "up")}
              />
            )}

            {validRearrangeDirections?.down && (
              <Action
                title="Move Down in Pinned"
                icon={Icon.ArrowDown}
                shortcut={{ key: "arrowDown", modifiers: ["cmd", "opt"] }}
                onAction={() => onRearrange(jar, "down")}
              />
            )}
          </>
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
