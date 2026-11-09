# monobank

View currency rates, all your accounts and their transactions in monobank, keep a rate or a jar in the menu bar, and ask AI about them.

## Setup

The access token is required for the "Show Accounts", "Show Statement" and "Jar Progress Menu Bar" commands and for AI questions about your accounts and transactions. "Show Currency Rates" and currency questions work without it. To create an access token:

1. Visit https://api.monobank.ua/
2. Authenticate with your account
3. Click "Activate"
4. Copy generated access token and paste it into extension preferences

## Show Currency Rates

Browse monobank's currency rates. Enter copies the rate.

Use "Convert Currency" (`⌘ O`) on a rate and type an amount to see it converted both ways. For a pair like USD – UAH:

- UAH → USD uses the sell rate (the bank sells you dollars): `amount / sell`.
- USD → UAH uses the buy rate (the bank buys your dollars): `amount × buy`.
- Pairs with only a cross rate use it in both directions.

## Currency Rate Menu Bar

Keeps one currency rate in the macOS menu bar, next to its flag. Click it to copy the rate, or to see your pinned rates and all other rates.

- Choose the rate in the title by clicking another rate in the menu, or with "Show in Menu Bar" (`⌘ ⇧ M`) on a rate in "Show Currency Rates". Until you choose one, it shows your first pinned rate, or USD – UAH.
- The "Menu Bar Title" preference sets what's shown: the sell rate (default), the buy rate, both, or only the flag. Pairs with only a cross rate always show it.

## Jar Progress Menu Bar

Keeps one jar in the macOS menu bar with a progress ring and how much of its goal is collected. Click it to copy the balance, goal or amount left, open its top-up page, or see your other jars:

- **Gatherings** are jars with a goal, with their progress. monobank doesn't tell fundraisers and personal jars apart, so every jar with a goal is listed here.
- **Jars** are jars without a goal, with their balance.

Choose the jar in the title by clicking another jar in the menu, or with "Show in Menu Bar" (`⌘ ⇧ M`) on a jar in "Show Accounts". Hold `⌥` in the menu to open a jar's top-up page instead. Until you choose one, it shows your first pinned jar, else the first jar with a goal that isn't reached yet.

The "Menu Bar Title" preference sets what's shown next to the icon: the percentage (default), the balance, the balance and goal, or nothing. Jars without a goal show their balance.

Both menu bar commands are macOS only and refresh every 10 minutes. When monobank can't be reached, they keep showing the last loaded data and say when it was loaded.

## Show Statement

Browse the transactions of a card, PE account or jar. Pick the account in the search bar, or use "View Statement" (`⌘ ⇧ S`) on an account in "Show Accounts".

- Choose a period with "Change Period…" (`⌘ ⇧ P`): today, the last 7 days, this or last month, the last 31 days, or a custom range of up to 31 days.
- The first item summarizes the period: income, spending, cashback and spending by category.
- Toggle details (`⌘ ⇧ D`) to see a transaction's category, cashback, balance after it, comment, receipt number and counterparty.
- Search by description, comment, counterparty, category (in English or Ukrainian), MCC or amount.
- Export the statement to CSV in your Downloads folder, or copy it as CSV.

monobank allows one statement request per 60 seconds. Statements are cached, and when a request has to wait, a countdown shows until it's sent. One request returns up to 500 transactions; use "Load Older Transactions" to get more.

## AI

Mention `@monobank` in Raycast AI Chat or Quick AI and ask in English or Ukrainian. For example:

- Скільки 500 гривень в доларах?
- 15 dollars in euro.
- How much is left to reach the "New Car" jar goal?
- Дай посилання для поповнення мого основного рахунку
- Скільки грошей я витратив в категорії кафе та ресторани за останній тиждень?
- How much money has been deposited into my account in total this month?
- Які у мене зараз є активні збори?
- Do I have enough money in my accounts to reach the goal in jar "A"? If not, how much more do I need?

AI finds accounts and jars by their names, including the custom names you give accounts in "Show Accounts", even when you ask in another language (e.g. "основний рахунок" for an account named "Primary"). When you don't name an account, it uses the default one (the first pinned account, or the first UAH card) and tells you which.

Conversions use monobank's current rates, the same way as "Convert Currency". Questions about transactions cover up to 31 days at a time and share the statement cache and the 60-second rate limit with "Show Statement", so an answer can take up to a minute.

## Credits

Merchant categories come from the [Merchant Category Codes](https://github.com/Oleksios/Merchant-Category-Codes) dataset by Oleksios, licensed under MIT. Run `node scripts/update-mcc.mjs` to update them.
