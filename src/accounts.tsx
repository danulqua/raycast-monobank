import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useAccounts } from "./hooks/useAccounts";
import { transformAccount } from "./utils/transformAccount";
import { transformJar } from "./utils/transformJar";
import { Account, Jar } from "./types";
import { isAccount } from "./utils/typeGuards";

export default function Command() {
  const { data, isLoading, isError } = useAccounts();
  const { accounts, jars } = data;

  const transformedAccounts = accounts.map(transformAccount);
  const cards = transformedAccounts.filter((account) => account.type !== "fop");
  const fops = transformedAccounts.filter((account) => account.type === "fop");

  const transformedJars = jars.map(transformJar);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Cards">
        {cards.length ? (
          cards.map((card) => (
            <List.Item
              key={card.id}
              id={card.id}
              title={getTitle(card)}
              subtitle={getSubtitle(card)}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(card).map(([key, value]) => (
                        <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[{ text: card.maskedPan[0] }]}
              actions={<AccountActions account={card} />}
            />
          ))
        ) : (
          <List.EmptyView />
        )}
      </List.Section>

      <List.Section title="FOPs">
        {fops.length ? (
          fops.map((fop) => (
            <List.Item
              key={fop.id}
              id={fop.id}
              title={getTitle(fop)}
              subtitle={getSubtitle(fop)}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {Object.entries(fop).map(([key, value]) => (
                        <List.Item.Detail.Metadata.Label key={key} title={key} text={value} />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              accessories={[{ text: fop.iban }]}
              actions={<AccountActions account={fop} />}
            />
          ))
        ) : (
          <List.EmptyView />
        )}
      </List.Section>

      <List.Section title="Jars">
        {transformedJars.length ? (
          transformedJars.map((jar) => (
            <List.Item
              key={jar.id}
              id={jar.id}
              title={getTitle(jar)}
              subtitle={getSubtitle(jar)}
              accessories={getJarAccessories(jar)}
              actions={<JarActions jar={jar} />}
            />
          ))
        ) : (
          <List.EmptyView />
        )}
      </List.Section>
    </List>
  );
}

function getTitle(item: Account | Jar) {
  if (isAccount(item)) {
    return `${item.currency.flag} ${item.currency.code}, ${item.type}`;
  }

  return `${item.currency.flag} ${item.currency.code}, ${item.title}`;
}

function getSubtitle(item: Account | Jar) {
  if (isAccount(item)) {
    return item.balance.toFixed(2);
  }

  return item.goal ? `${item.balance.toFixed(2)} / ${item.goal.toFixed(2)}` : `${item.balance.toFixed(2)}`;
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

  if (!jar.goal) return [{ text: "No goal" }];

  return [
    {
      icon:
        progress < 1 ? getProgressIcon(progress, Color.Green) : { source: Icon.CheckCircle, tintColor: Color.Green },
      text: "Progress",
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
