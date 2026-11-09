# monobank Changelog

## [AI Support, Show Statement Command and Improvements] - {PR_MERGE_DATE}

- Added AI support: mention `@monobank` in AI Chat or Quick AI to ask, in English or Ukrainian, about balances, jars and their goals, top-up links, currency conversion, and spending or income by category and period. Accounts are found by their custom names, even across languages
- Added the "Show Statement" command to browse the transactions of your cards, PE accounts and jars, with a "View Statement" action (`⌘ ⇧ S`) in "Show Accounts"
- Choose a period (today, last 7 days, this or last month, last 31 days, or a custom range), see a summary with spending by category, and export to CSV
- Transaction details include the merchant category, cashback, balance, comment, receipt number and counterparty, and mark transactions the merchant's bank hasn't settled yet as "Hold"
- Requests wait for monobank's 60-second rate limit with a countdown, and statements are cached
- Pinned accounts from "Show Accounts" appear at the top of the account dropdown in "Show Statement". The chosen account is remembered for 5 minutes since it was last used; after that, the first pinned account (or the first UAH card) opens, and a different account no longer loads by mistake when the command opens
- Added a "Convert Currency" action (`⌘ O`) in "Show Currency Rates". It converts both ways, using the sell rate when you buy a currency and the buy rate when you sell it
- Updated dependencies to the latest Raycast API
- Adopted Raycast common shortcuts: Pin is now `⌘ .` (`Ctrl .` on Windows) and Copy IBAN is now `⌘ ⇧ C` (`Ctrl ⇧ C` on Windows)
- Fixed a crash when searching accounts that have no card number
- Moved the access token to the extension preferences. It's now optional and only needed for "Show Accounts". If you had set it before, you may need to enter it again
- Show a clear "Access token required" or "Invalid access token" screen with a shortcut to the preferences, and retry right after the token is fixed
- Cached accounts are now tied to the access token that loaded them, and are no longer shown after the token is changed, removed or rejected
- Fixed the accounts total showing NaN when an account or jar is in a currency other than UAH, USD or EUR
- Internal cleanup and refactoring

## [Fix] - 2025-12-02

- Used country flags in .png format so they look the same on both macOS and Windows platforms

## [Fix] - 2025-11-27

- Added Windows support

## [Fix] - 2024-05-28

- Fixed issue when extension was crashing if user has no jars

## [Update] - 2023-09-15

- Updated keywords for the extension

## [Initial Version] - 2023-08-23

Release of monobank extension
