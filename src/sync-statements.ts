import { LaunchType, Toast, environment, showHUD, showToast, updateCommandMetadata } from "@raycast/api";
import { getTokenError } from "./api/monobank";
import { fetchClientInfo } from "./services/clientInfo";
import { syncNextStatement } from "./services/statement";
import { getItemTitle } from "./utils";

/**
 * Accounts rarely change, and "Show Accounts" and "Show Statement" refresh the cache whenever they're opened,
 * so a run every 2 minutes doesn't need to request them.
 */
const CLIENT_INFO_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Runs every 2 minutes in the background. Each run syncs the last 31 days of the first account or jar that wasn't
 * synced today (by this command, "Show Statement" or the AI), so all of them are synced once a day, one per run.
 */
export default async function Command() {
  const isUserInitiated = environment.launchType === LaunchType.UserInitiated;

  try {
    if (isUserInitiated) {
      await showToast({ style: Toast.Style.Animated, title: "Syncing statements…" });
    }

    const { items, defaultItem } = await fetchClientInfo({ maxAge: CLIENT_INFO_MAX_AGE });
    // The account "Show Statement" opens by default first, as it's the one opened most.
    const ordered = defaultItem ? [defaultItem, ...items.filter((item) => item.id !== defaultItem.id)] : items;

    const { synced, syncedToday, total } = await syncNextStatement(ordered);
    await updateCommandMetadata({ subtitle: total ? `Synced today: ${syncedToday} of ${total}` : null });

    if (synced) console.log(`Synced ${getItemTitle(synced)} (${syncedToday} of ${total})`);

    if (isUserInitiated) {
      const left = total - syncedToday;
      await showHUD(
        synced
          ? `Synced ${getItemTitle(synced)}${left ? ` · ${left} left` : ""}`
          : total
            ? "All statements are up to date"
            : "No accounts to sync",
      );
    }
  } catch (error) {
    // In the background, only log: a missing token or being offline shouldn't flag the command every 2 minutes.
    console.error(error);
    if (isUserInitiated) await showHUD(getErrorMessage(error));
  }
}

function getErrorMessage(error: unknown) {
  switch (getTokenError(error)) {
    case "missing":
      return "Set your monobank access token in the extension preferences";
    case "invalid":
      return "monobank rejected the access token. Check it in the extension preferences";
    default:
      return `Couldn't sync statements: ${error instanceof Error ? error.message : String(error)}`;
  }
}
