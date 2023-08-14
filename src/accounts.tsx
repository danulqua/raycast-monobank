import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useAccounts } from "./hooks/useAccounts";
import { transformAccount } from "./utils/transformAccount";
import { transformJar } from "./utils/transformJar";
import { Account, Jar } from "./types";
import { isAccount } from "./utils/typeGuards";

export default function Command() {
  const { data, isLoading, isError } = useAccounts();
  const { accounts, jars } = data;

  const transformedAccounts = accounts.map(transformAccount);
  const transformedJars = jars.map(transformJar);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Accounts">
        {transformedAccounts.length ? (
          transformedAccounts.map((account) => {
            const maskedPan = account.maskedPan.length ? account.maskedPan[0] : "";
            return (
              <List.Item
                title={getTitle(account)}
                subtitle={account.balance.toFixed(2)}
                accessories={[{ text: maskedPan }]}
                actions={<AccountActions account={account} />}
              />
            );
          })
        ) : (
          <List.EmptyView />
        )}
      </List.Section>

      <List.Section title="Jars">
        {transformedJars.length ? (
          transformedJars.map((jar) => <List.Item title={getTitle(jar)} subtitle={jar.balance.toFixed(2)} />)
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
      <Action title="Copy IBAN" icon={Icon.CopyClipboard} shortcut={{ modifiers: ["cmd"], key: "c" }} />
    </ActionPanel>
  );
}
