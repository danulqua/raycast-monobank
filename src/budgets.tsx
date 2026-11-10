import AccountDropdown from "./components/AccountDropdown";
import BudgetsView from "./components/budgets/BudgetsView";
import { useStatementAccount } from "./hooks";

export default function Command() {
  const { account, setAccountId, sections, isLoading, tokenError } = useStatementAccount();

  const dropdown = account && (
    // Rendered only once the account is known, so it starts on it instead of the first item.
    <AccountDropdown value={account.id} onChange={setAccountId} sections={sections} />
  );

  return (
    <BudgetsView
      account={account}
      searchBarAccessory={dropdown}
      isLoadingAccount={isLoading}
      accountsTokenError={tokenError}
    />
  );
}
