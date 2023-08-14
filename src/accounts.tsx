import { Detail } from "@raycast/api";
import { useAccounts } from "./hooks/useAccounts";
import { transformAccount } from "./utils/transformAccount";
import { transformJar } from "./utils/transformJar";

export default function Command() {
  const { data, isLoading, isError } = useAccounts();
  const { accounts, jars } = data;

  const transformedAccounts = accounts.map(transformAccount);
  const transformedJars = jars.map(transformJar);

  return <Detail isLoading={isLoading} markdown={JSON.stringify(transformedAccounts)} />;
}
