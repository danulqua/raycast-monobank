import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, parse } from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { TokenError } from "../../api/monobank";
import { STATEMENT_SELECTION_TTL, STORAGE_KEYS } from "../../data/constants";
import { useClientInfo, usePinned, useRecentValue, useStatement } from "../../hooks";
import { AccountOrJar, AccountType, Period, SavedPeriod } from "../../types";
import {
  DEFAULT_PERIOD,
  filterTransactions,
  formatAmount,
  getCsvFileName,
  getDefaultItem,
  getFlagImage,
  getItemTitle,
  groupByDay,
  isAccount,
  isSavedPeriod,
  isString,
  summarize,
  toCsv,
} from "../../utils";
import TokenErrorEmptyView, { showInvalidTokenToast } from "../TokenErrorEmptyView";
import StatementActionsSection, { StatementActionsProps } from "./StatementActionsSection";
import SummaryListItem from "./SummaryListItem";
import TransactionListItem from "./TransactionListItem";

/**
 * Transactions of an account or jar. Without `account`, the account is picked in the search bar
 * (the "Show Statement" command); with it, the account is fixed ("View Statement" in "Show Accounts").
 */
export default function StatementView(props: { account?: AccountOrJar }) {
  return props.account ? <StatementList account={props.account} /> : <StatementCommand />;
}

function StatementCommand() {
  const {
    data: clientInfo,
    isLoading: isLoadingAccounts,
    isLoadingFromStorage: isLoadingCachedAccounts,
    isError,
    tokenError,
  } = useClientInfo();
  const {
    value: selectedId = "",
    setValue: setSelectedId,
    isLoading: isLoadingSelected,
  } = useRecentValue(STORAGE_KEYS.statementAccount, STATEMENT_SELECTION_TTL, isString);
  const pinned = usePinned<AccountOrJar>(STORAGE_KEYS.pinnedAccounts, getItemTitle);

  useEffect(() => {
    if (isError && !tokenError) {
      showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: "Failed to load accounts" });
    }
  }, [isError, tokenError]);

  const cards = clientInfo.accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = clientInfo.accounts.filter((account) => account.type === AccountType.FOP);
  const { jars } = clientInfo;
  const allItems: AccountOrJar[] = [...cards, ...fops, ...jars];

  const account = resolveAccount();

  // Every account loaded is a statement request, limited to one a minute. So nothing is picked until the saved
  // choice, the pins and the cached accounts are all read, and a default is never used in place of a saved
  // account that the accounts being fetched may still contain.
  function resolveAccount() {
    if (isLoadingSelected || pinned.isLoading || isLoadingCachedAccounts) return undefined;

    const selected = allItems.find((item) => item.id === selectedId);
    if (selected) return selected;
    if (selectedId && isLoadingAccounts) return undefined;

    return getDefaultItem(allItems, pinned.pinnedIds);
  }

  const dropdown = account && (
    // Rendered only once the account is known, so it starts on it instead of the first item.
    <AccountDropdown
      value={account.id}
      onChange={setSelectedId}
      sections={getSections({ cards, fops, jars, pinnedIds: pinned.pinnedIds })}
    />
  );

  return (
    <StatementList
      account={account}
      accountDropdown={dropdown}
      isLoadingAccounts={isLoadingAccounts || isLoadingSelected || pinned.isLoading}
      accountsTokenError={tokenError}
    />
  );
}

interface DropdownSection {
  title: string;
  items: AccountOrJar[];
}

/** Pinned items first, in pinned order, then cards, FOP accounts and jars without them, as in "Show Accounts". */
function getSections(options: {
  cards: AccountOrJar[];
  fops: AccountOrJar[];
  jars: AccountOrJar[];
  pinnedIds: string[];
}) {
  const { cards, fops, jars, pinnedIds } = options;
  const allItems = [...cards, ...fops, ...jars];
  const pinnedItems = pinnedIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is AccountOrJar => item !== undefined);
  const isUnpinned = (item: AccountOrJar) => !pinnedIds.includes(item.id);

  const sections: DropdownSection[] = [
    { title: "Pinned", items: pinnedItems },
    { title: "Cards", items: cards.filter(isUnpinned) },
    { title: "FOP Accounts", items: fops.filter(isUnpinned) },
    { title: "Jars", items: jars.filter(isUnpinned) },
  ];
  return sections.filter((section) => section.items.length > 0);
}

/**
 * `onChange` is only called when the user picks a different account.
 *
 * When the dropdown first appears, Raycast calls `onChange` with its first item, even when `value` is another
 * one. Saved as a choice, that event replaced the remembered account with the first one on every launch.
 * It is sent once per launch, not when the items change or the dropdown re-renders, so it is skipped once.
 */
function AccountDropdown(props: { value: string; onChange: (id: string) => void; sections: DropdownSection[] }) {
  const { value, onChange, sections } = props;
  const isInitialEventPending = useRef(true);
  const firstItemId = sections[0]?.items[0]?.id;

  function handleChange(id: string) {
    // The check on the id keeps a user's pick if Raycast ever stops sending that event.
    if (isInitialEventPending.current) {
      isInitialEventPending.current = false;
      if (id === firstItemId) return;
    }
    if (id !== value) onChange(id);
  }

  return (
    <List.Dropdown tooltip="Select Account" placeholder="Search Accounts…" value={value} onChange={handleChange}>
      {sections.map((section) => (
        <List.Dropdown.Section key={section.title} title={section.title}>
          {section.items.map((item) => (
            <List.Dropdown.Item
              key={item.id}
              value={item.id}
              title={getItemTitle(item)}
              icon={getFlagImage(item.currency.code)}
              keywords={[item.currency.code]}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

function StatementList(props: {
  account: AccountOrJar | undefined;
  accountDropdown?: List.Props["searchBarAccessory"];
  isLoadingAccounts?: boolean;
  accountsTokenError?: TokenError;
}) {
  const { account, accountDropdown, isLoadingAccounts = false, accountsTokenError } = props;
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const [searchText, setSearchText] = useState("");
  const {
    value: savedPeriod,
    setValue: setSavedPeriod,
    isLoading: isLoadingPeriod,
  } = useRecentValue<SavedPeriod>(STORAGE_KEYS.statementPeriod, STATEMENT_SELECTION_TTL, isSavedPeriod);
  // Derived during render, so switching accounts resets the period at once: the old period is never
  // requested for the new account.
  const period = account && savedPeriod?.accountId === account.id ? savedPeriod.period : DEFAULT_PERIOD;

  function setPeriod(period: Period) {
    if (account) setSavedPeriod({ accountId: account.id, period });
  }

  // Waits for the saved period, so the default one isn't fetched (and the rate limit spent) by mistake.
  const statement = useStatement(account, isLoadingPeriod ? undefined : period);
  const { transactions, hasMore } = statement;
  const tokenError = accountsTokenError ?? statement.tokenError;

  useEffect(() => {
    if (tokenError === "invalid") showInvalidTokenToast();
  }, [tokenError]);

  // Filtered here rather than by Raycast, so the Summary stays at the top and totals what the search found.
  const filtered = useMemo(() => filterTransactions(transactions, searchText), [transactions, searchText]);
  const days = useMemo(() => groupByDay(filtered), [filtered]);
  const summary = useMemo(() => summarize(filtered, account?.currency), [filtered, account?.currency]);

  const accountTitle = account ? getItemTitle(account) : undefined;
  const cashbackType = account && isAccount(account) ? account.cashbackType : undefined;
  const isLoading = isLoadingAccounts || isLoadingPeriod || statement.isLoading;

  async function exportCsv() {
    const path = getAvailablePath(join(homedir(), "Downloads", getCsvFileName(accountTitle ?? "", transactions)));
    // The byte order mark makes Excel read the file as UTF-8, so Cyrillic text shows correctly.
    await writeFile(path, "﻿" + toCsv(transactions));
    await showInFinder(path);
    await showToast({
      style: Toast.Style.Success,
      title: `Exported ${transactions.length} transactions`,
      message: hasMore ? "Older transactions in the period weren't loaded" : undefined,
    });
  }

  async function copyCsv() {
    await Clipboard.copy(toCsv(transactions));
    await showHUD("Copied to Clipboard");
  }

  const statementActions: StatementActionsProps = {
    period,
    onChangePeriod: setPeriod,
    onExportCsv: transactions.length ? exportCsv : undefined,
    onCopyCsv: transactions.length ? copyCsv : undefined,
    onRefresh: statement.refresh,
    onToggleDetails: () => setIsShowingDetail((isShowingDetail) => !isShowingDetail),
  };

  function renderEmptyView() {
    if (tokenError) {
      return <TokenErrorEmptyView tokenError={tokenError} purpose="see your statement" />;
    }

    // With transactions, the list is never empty: the Summary is always shown, even when the search matches nothing.
    if (transactions.length) return null;

    if (!account) {
      return <List.EmptyView icon={Icon.CreditCard} title="No Accounts" description="No accounts to show." />;
    }

    return (
      <List.EmptyView
        icon={Icon.Receipt}
        title="No Transactions in This Period"
        description={statement.period ? `${accountTitle} · ${statement.period.label}` : undefined}
        actions={
          <ActionPanel>
            <StatementActionsSection {...statementActions} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      navigationTitle={
        accountTitle && statement.period ? `${accountTitle} · ${statement.period.label}` : "Show Statement"
      }
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transactions"
      searchBarAccessory={accountDropdown}
    >
      {renderEmptyView()}

      {transactions.length > 0 && statement.period && (
        <SummaryListItem
          summary={summary}
          periodLabel={statement.period.label}
          searchText={searchText.trim()}
          totalCount={transactions.length}
          statement={statementActions}
        />
      )}

      {days.map((day) => (
        <List.Section
          key={day.key}
          title={day.title}
          subtitle={summary.currency && formatAmount(day.net, summary.currency, { signed: true })}
        >
          {day.transactions.map((transaction) => (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              cashbackType={cashbackType}
              isShowingDetail={isShowingDetail}
              statement={statementActions}
            />
          ))}
        </List.Section>
      ))}

      {hasMore && (
        <List.Item
          id="load-older"
          icon={{ source: Icon.ArrowDown, tintColor: Color.SecondaryText }}
          title="Load Older Transactions"
          subtitle="monobank sends up to 500 at a time"
          detail={<List.Item.Detail markdown="Load the next 500 transactions of this period." />}
          actions={
            <ActionPanel>
              <Action title="Load Older Transactions" icon={Icon.ArrowDown} onAction={statement.loadOlder} />
              <StatementActionsSection {...statementActions} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

/** `path`, or `name (2).ext`, `name (3).ext`… if a file with that name already exists. */
function getAvailablePath(path: string) {
  const { dir, name, ext } = parse(path);
  let candidate = path;
  for (let index = 2; existsSync(candidate); index++) {
    candidate = join(dir, `${name} (${index})${ext}`);
  }
  return candidate;
}
