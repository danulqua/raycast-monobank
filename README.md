# monobank

View currency rates, all your accounts and their transactions in monobank.

## Setup

The access token is required only for the "Show Accounts" and "Show Statement" commands. "Show Currency Rates" works without it. To create an access token:

1. Visit https://api.monobank.ua/
2. Authenticate with your account
3. Click "Activate"
4. Copy generated access token and paste it into extension preferences

## Show Statement

Browse the transactions of a card, PE account or jar. Pick the account in the search bar, or use "View Statement" (`⌘ ⇧ S`) on an account in "Show Accounts".

- Choose a period with "Change Period…" (`⌘ ⇧ P`): today, the last 7 days, this or last month, the last 31 days, or a custom range of up to 31 days.
- The first item summarizes the period: income, spending, cashback and spending by category.
- Toggle details (`⌘ ⇧ D`) to see a transaction's category, cashback, balance after it, comment, receipt number and counterparty.
- Search by description, comment, counterparty, category (in English or Ukrainian), MCC or amount.
- Export the statement to CSV in your Downloads folder, or copy it as CSV.

monobank allows one statement request per 60 seconds. Statements are cached, and when a request has to wait, a countdown shows until it's sent. One request returns up to 500 transactions; use "Load Older Transactions" to get more.

## Credits

Merchant categories come from the [Merchant Category Codes](https://github.com/Oleksios/Merchant-Category-Codes) dataset by Oleksios, licensed under MIT. Run `node scripts/update-mcc.mjs` to update them.
