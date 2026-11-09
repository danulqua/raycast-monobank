# monobank Changelog

## [Refactor] - {PR_MERGE_DATE}

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
