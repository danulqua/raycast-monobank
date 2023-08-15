import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useAccounts } from "./hooks/useAccounts";
import { transformAccount } from "./utils/transformAccount";
import { transformJar } from "./utils/transformJar";
import { Account, Jar, RateResponse } from "./types";
import { isAccount } from "./utils/typeGuards";
import { accountTypeColors } from "./data/constants";
import { useCurrencyRates } from "./hooks/useCurrencyRates";

export default function Command() {
  const { data: accountsData, isLoading: isAccountsLoading, isError: isAccountsError } = useAccounts();
  const { data: rates, isLoading: isRatesLoading, isError: isRatesError } = useCurrencyRates();
  const { accounts, jars } = accountsData;

  const transformedAccounts = accounts.map(transformAccount);
  const cards = transformedAccounts.filter((account) => account.type !== "fop");
  const fops = transformedAccounts.filter((account) => account.type === "fop");

  const transformedJars = jars.map(transformJar);

  const totalAmount = calculateTotal([...cards, ...fops, ...transformedJars], rates);

  const isLoading = isAccountsLoading || isRatesLoading;

  return (
    <List isLoading={isLoading} navigationTitle={`Total: ${totalAmount.toFixed(2)}`}>
      <List.Section title="Cards">
        {cards.map((card) => (
          <List.Item
            key={card.id}
            id={card.id}
            title={getTitle(card)}
            subtitle={getSubtitle(card)}
            detail={<List.Item.Detail />}
            accessories={getAccountAccessories(card)}
            actions={<AccountActions account={card} />}
          />
        ))}
      </List.Section>

      <List.Section title="FOPs">
        {fops.map((fop) => (
          <List.Item
            key={fop.id}
            id={fop.id}
            title={getTitle(fop)}
            subtitle={getSubtitle(fop)}
            detail={<List.Item.Detail />}
            accessories={getAccountAccessories(fop)}
            actions={<AccountActions account={fop} />}
          />
        ))}
      </List.Section>

      <List.Section title="Jars">
        {transformedJars.map((jar) => (
          <List.Item
            key={jar.id}
            id={jar.id}
            title={getTitle(jar)}
            subtitle={getSubtitle(jar)}
            accessories={getJarAccessories(jar)}
            actions={<JarActions jar={jar} />}
          />
        ))}
      </List.Section>
    </List>
  );
}

function calculateTotal(accounts: (Account | Jar)[], rates: RateResponse[]) {
  return accounts.reduce((total, account) => {
    if (account.currency.code === "UAH") return total + account.balance;
    const rate = rates.find((rate) => rate.currencyCodeA === +account.currency.number);

    if (!rate) return total;

    return total + account.balance * rate.rateSell;
  }, 0);
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

function AccountActions(props: { account: Account }) {
  const { account } = props;

  const sendUrl = `https://send.monobank.ua/${account.sendId}`;

  return (
    <ActionPanel>
      {account.sendId && account.currency.code === "UAH" && (
        <>
          <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
          <Action.CopyToClipboard title="Copy Top Up Page URL" content={sendUrl} />
        </>
      )}
      <Action.CopyToClipboard
        title="Copy IBAN"
        content={account.iban}
        shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
      />
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

function JarActions(props: { jar: Jar }) {
  const { jar } = props;

  const sendUrl = `https://send.monobank.ua/${jar.sendId}`;

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Top Up Page" url={sendUrl} />
      <Action.CopyToClipboard title="Copy Top Up Page URL" content={sendUrl} />
    </ActionPanel>
  );
}
