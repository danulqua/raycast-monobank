import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { ReactNode, useMemo, useState } from "react";
import { budgetPresets } from "../../data/budgetPresets";
import { shortcuts } from "../../data/shortcuts";
import { useBudgets } from "../../hooks";
import { AccountOrJar, Budget, Transaction } from "../../types";
import {
  BudgetMonth,
  BudgetProgress,
  formatBudgetPercentage,
  formatHryvnias,
  formatSpentOfLimit,
  getBudgetColor,
  getBudgetIcon,
  getBudgetProgress,
  getCategoryOptions,
  getStatementItemTitle,
} from "../../utils";
import BudgetForm from "./BudgetForm";

const { Metadata } = List.Item.Detail;

/**
 * The saved budgets, with each one's progress when `account` is in UAH and `month` is set. Used by "Manage Budgets…"
 * in "Show Statement" and by the "Show Budgets" command.
 */
export default function BudgetList(props: {
  account?: AccountOrJar;
  /** Every loaded transaction of the month, not only the ones a search matched. */
  transactions: Transaction[];
  month?: BudgetMonth;
  isLoading?: boolean;
  /** Whether the month has older transactions that aren't loaded. */
  isPartial?: boolean;
  /** Shown in the section subtitle instead of the usual note, e.g. a token problem. */
  note?: string;
  searchBarAccessory?: List.Props["searchBarAccessory"];
  /** Extra actions on every item, e.g. switching the month. */
  actions?: ReactNode;
}) {
  const { account, transactions, month, isLoading = false, isPartial, note, searchBarAccessory, actions } = props;
  const { budgets, isLoading: isLoadingBudgets, remove, move } = useBudgets();
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const isUah = account?.currency.code === "UAH";
  const progress = useMemo(
    () => (isUah && month ? getBudgetProgress(budgets, transactions, month) : undefined),
    [isUah, month, budgets, transactions],
  );
  const spentCategories = useMemo(() => getSpentCategories(transactions), [transactions]);

  function getNote() {
    if (note) return note;
    if (account && !isUah) return "Budgets count spending on UAH accounts only";
    if (!month) return "Progress shows for This Month and Last Month";
    if (isPartial) return "Partial: older transactions not loaded";
    return undefined;
  }

  const sectionTitle = [month?.label, account && getStatementItemTitle(account)].filter(Boolean).join(" · ");

  async function confirmDelete(budget: Budget) {
    const isConfirmed = await confirmAlert({
      title: `Delete "${budget.name}"?`,
      message: "This budget will be removed from all accounts.",
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!isConfirmed) return;

    await remove(budget);
    await showToast(Toast.Style.Success, "Budget Deleted", budget.name);
  }

  const formProps = { spentCategories };
  const createActions = (
    <>
      <Action.Push
        title="Create Budget"
        icon={Icon.Plus}
        shortcut={shortcuts.create}
        target={<BudgetForm {...formProps} />}
      />
      <PresetSubmenu budgets={budgets} spentCategories={spentCategories} />
    </>
  );

  return (
    <List
      isLoading={isLoading || isLoadingBudgets}
      isShowingDetail={isShowingDetail && budgets.length > 0}
      navigationTitle={sectionTitle ? `Budgets · ${sectionTitle}` : "Budgets"}
      searchBarPlaceholder="Search budgets"
      searchBarAccessory={searchBarAccessory}
    >
      {!isLoadingBudgets && (
        <List.EmptyView
          icon={Icon.Coins}
          title="No Budgets"
          description="Set a monthly limit for spending categories, e.g. 5 000 ₴ for cafes."
          actions={
            <ActionPanel>
              {createActions}
              {actions}
            </ActionPanel>
          }
        />
      )}

      <List.Section title={sectionTitle || "Budgets"} subtitle={getNote()}>
        {budgets.map((budget, index) => {
          const item = progress?.[index];
          return (
            <List.Item
              key={budget.id}
              icon={item ? getBudgetIcon(item) : { source: Icon.Coins, tintColor: Color.SecondaryText }}
              title={budget.name}
              subtitle={isShowingDetail ? undefined : formatCategories(budget.categories)}
              keywords={budget.categories}
              accessories={getAccessories(budget, item)}
              detail={<BudgetDetail budget={budget} progress={item} month={month} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title="Edit Budget"
                      icon={Icon.Pencil}
                      shortcut={shortcuts.edit}
                      target={<BudgetForm budget={budget} {...formProps} />}
                    />
                    <Action
                      title="Toggle Details"
                      icon={Icon.Sidebar}
                      shortcut={shortcuts.toggleDetails}
                      onAction={() => setIsShowingDetail((value) => !value)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>{createActions}</ActionPanel.Section>
                  <ActionPanel.Section>
                    {index > 0 && (
                      <Action
                        title="Move up"
                        icon={Icon.ArrowUp}
                        shortcut={shortcuts.moveUp}
                        onAction={() => move(budget, "up")}
                      />
                    )}
                    {index < budgets.length - 1 && (
                      <Action
                        title="Move Down"
                        icon={Icon.ArrowDown}
                        shortcut={shortcuts.moveDown}
                        onAction={() => move(budget, "down")}
                      />
                    )}
                    <Action
                      title="Delete Budget"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={shortcuts.remove}
                      onAction={() => confirmDelete(budget)}
                    />
                  </ActionPanel.Section>
                  {actions && <ActionPanel.Section>{actions}</ActionPanel.Section>}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/** Presets that aren't added yet, each opening the form filled in with it. */
function PresetSubmenu(props: { budgets: Budget[]; spentCategories: string[] }) {
  const { budgets, spentCategories } = props;
  const names = new Set(budgets.map((budget) => budget.name.toLowerCase()));
  const presets = budgetPresets.filter((preset) => !names.has(preset.name.toLowerCase()));
  if (!presets.length) return null;

  return (
    <ActionPanel.Submenu title="Create from Preset" icon={Icon.Wand}>
      {presets.map((preset) => (
        <Action.Push
          key={preset.name}
          title={preset.name}
          target={<BudgetForm preset={preset} spentCategories={spentCategories} />}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

function BudgetDetail(props: { budget: Budget; progress?: BudgetProgress; month?: BudgetMonth }) {
  const { budget, progress, month } = props;
  const options = getCategoryOptions();
  const color = progress && getBudgetColor(progress.status);

  return (
    <List.Item.Detail
      metadata={
        // Keys include the text, so Raycast recreates a label whose text changed instead of truncating it.
        <Metadata>
          <Metadata.Label key={`limit:${budget.limit}`} title="Monthly Limit" text={formatHryvnias(budget.limit)} />
          {progress && month && (
            <>
              <Metadata.Label key={`month:${month.label}`} title="Month" text={month.label} />
              <Metadata.Label
                key={`spent:${progress.spent}`}
                title="Spent"
                text={{ value: `${formatHryvnias(progress.spent)} · ${formatBudgetPercentage(progress)}`, color }}
              />
              <Metadata.Label
                key={`left:${progress.left}`}
                title={progress.left < 0 ? "Over by" : "Left"}
                text={{ value: formatHryvnias(Math.abs(progress.left)), color: progress.left < 0 ? color : undefined }}
              />
              {progress.perDayLeft !== undefined && (
                <Metadata.Label
                  key={`perDay:${progress.perDayLeft}:${progress.daysLeft}`}
                  title="Per Day"
                  text={`≈ ${formatHryvnias(progress.perDayLeft)} for ${progress.daysLeft} ${progress.daysLeft === 1 ? "day" : "days"}`}
                />
              )}
              {progress.projected !== undefined && (
                <Metadata.Label
                  key={`projected:${progress.projected}`}
                  title="At This Pace"
                  text={{
                    value: formatHryvnias(progress.projected),
                    color: progress.projected > budget.limit ? Color.Orange : undefined,
                  }}
                />
              )}
            </>
          )}
          <Metadata.Separator />
          <Metadata.Label title="Categories" />
          {budget.categories.map((name) => {
            const option = options.find((option) => option.name === name);
            const spent = progress?.categories.find((category) => category.name === name)?.spent;
            const text = spent !== undefined ? formatHryvnias(spent) : (option?.nameUk ?? "");
            return (
              <Metadata.Label
                key={`${name}:${text}`}
                title={name}
                icon={option ? option.icon : { source: Icon.Warning, tintColor: Color.Orange }}
                text={option ? text : "Unknown category"}
              />
            );
          })}
        </Metadata>
      }
    />
  );
}

function getAccessories(budget: Budget, progress?: BudgetProgress): List.Item.Accessory[] {
  if (!progress) return [{ text: formatHryvnias(budget.limit), tooltip: "Monthly limit" }];

  const color = getBudgetColor(progress.status);
  const left =
    progress.left < 0 ? `Over by ${formatHryvnias(-progress.left)}` : `${formatHryvnias(progress.left)} left`;
  return [
    { text: { value: formatSpentOfLimit(progress), color }, tooltip: left },
    { text: { value: formatBudgetPercentage(progress), color } },
  ];
}

/** E.g. "Cafe. Restaurants, Bars, Fast Food", or the first three and "+2". */
function formatCategories(categories: string[]) {
  const shown = categories.slice(0, 3).join(", ");
  return categories.length > 3 ? `${shown} +${categories.length - 3}` : shown;
}

/** Categories with spending in `transactions`, the most spent first. */
function getSpentCategories(transactions: Transaction[]) {
  const spent = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue;
    const { name } = transaction.category;
    spent.set(name, (spent.get(name) ?? 0) - transaction.amount);
  }
  return [...spent.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
