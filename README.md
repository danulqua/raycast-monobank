# monobank

View currency rates, all your accounts and their transactions in monobank, set monthly budgets per category, keep a rate or a jar in the menu bar, and ask AI about them.

## Setup

The access token is required for the "Show Accounts", "Show Statement", "Show Budgets", "Sync Statements" and "Jar Progress Menu Bar" commands and for AI questions about your accounts, transactions and budgets. "Show Currency Rates" and currency questions work without it. To create an access token:

1. Visit https://api.monobank.ua/
2. Authenticate with your account
3. Click "Activate"
4. Copy generated access token and paste it into extension preferences

In "Show Accounts", "Copy Requisites" (`⌘ ⇧ R`) copies an account's payment details for an invoice or a transfer: the recipient, IBAN, tax ID, bank name, bank EDRPOU and MFO. "Copy Requisites in English" transliterates the name and adds the bank's SWIFT. Two optional preferences fill them in:

- **Full Name for Requisites**: your full name with the patronymic. Without it, the name from monobank is used, which has no patronymic.
- **Tax ID (РНОКПП)**: left out of the requisites when empty.

## Show Currency Rates

Browse monobank's currency rates. Enter copies the rate.

Use "Convert Currency" (`⌘ O`) on a rate and type an amount to see it converted both ways. For a pair like USD – UAH:

- UAH → USD uses the sell rate (the bank sells you dollars): `amount / sell`.
- USD → UAH uses the buy rate (the bank buys your dollars): `amount × buy`.
- Pairs with only a cross rate use it in both directions.

Next to each rate, an arrow shows how much it changed since the previous day, e.g. `↑ 0.12` (the sell rate, or the cross rate). Hover over it to see the old and new rates. monobank has no rate history, so the extension saves the last rates it loads each day. The first change appears the day after you first open the rates or run the menu bar.

## Convert Currency

Type `Convert` in Raycast, then an amount and the currencies, to see the result right away:

- `100 usd`: 100 USD sold for UAH and every other currency, and what 100 USD costs in UAH.
- `250 eur pln`: 250 EUR in PLN.
- `1000 грн`: 1000 UAH in USD, EUR and every other currency, starting with your pinned rates.

The currency to convert from defaults to USD. Codes are case-insensitive, and symbols and names work too: `$`, `€`, `₴`, `zł`, `£`, `грн`, `доларів`, `євро`. Edit the search text to convert something else, e.g. `$100`, `100 usd to eur` or `1 000,50 грн`. Enter copies the result, and `⌘ ↵` pastes it. Pairs without a direct rate are converted through UAH.

## Currency Rate Menu Bar

Keeps one currency rate in the macOS menu bar, next to its flag. Click it to copy the rate, or to see your pinned rates and all other rates.

- Choose the rate in the title by clicking another rate in the menu, or with "Show in Menu Bar" (`⌘ ⇧ M`) on a rate in "Show Currency Rates". Until you choose one, it shows your first pinned rate, or USD – UAH.
- The "Menu Bar Title" preference sets what's shown: the sell rate (default), the buy rate, both, or only the flag. Pairs with only a cross rate always show it.
- The menu shows how much each rate changed since the previous day (see "Show Currency Rates"). Turn on the "Change in Title" preference to also show it in the title, e.g. `41.32 ↑0.12`.

## Jar Progress Menu Bar

Keeps one jar in the macOS menu bar with a progress ring and how much of its goal is collected. Click it to copy the balance, goal or amount left, open its top-up page, or see your other jars with their progress or balance: jars with a goal not reached yet first, then the ones with a reached goal, then jars without a goal, each with your pinned jars on top.

Choose the jar in the title by clicking another jar in the menu, or with "Show in Menu Bar" (`⌘ ⇧ M`) on a jar in "Show Accounts". Hold `⌥` in the menu to open a jar's top-up page instead. Until you choose one, it shows your first pinned jar, else the first jar with a goal that isn't reached yet.

The "Menu Bar Title" preference sets what's shown next to the icon: the percentage (default), the balance, the balance and goal, or nothing. Jars without a goal show their balance.

Both menu bar commands are macOS only. The rate refreshes every 2 hours, and when you open its menu if the rates are older than 30 minutes. The jar refreshes every 10 minutes. When monobank can't be reached, they keep showing the last loaded data and say when it was loaded.

## Show Statement

Browse the transactions of a card, FOP account or jar. Pick the account in the search bar, or use "View Statement" (`⌘ ⇧ S`) on an account in "Show Accounts".

- Choose a period with "Change Period…" (`⌘ ⇧ P`): today, the last 7 days, this or last month, the last 31 days, or a custom range of up to 31 days.
- The first item summarizes the period: income, spending, cashback, your budgets (see "Budgets") and spending by category.
- Toggle details (`⌘ ⇧ D`) to see a transaction's category, cashback, balance after it, comment, receipt number and counterparty.
- Search by description, comment, counterparty, category (in English or Ukrainian), MCC or amount.
- Export the statement to CSV in your Downloads folder, or copy it as CSV.

monobank allows one statement request per 60 seconds. Statements are cached, and when a request has to wait, a countdown shows until it's sent. One request returns up to 500 transactions; use "Load Older Transactions" to get more.

Statements are stored on your device for as long as the "Keep Statements For" preference says: 1 month, 3 months (the default), 6 months, 1 year or unlimited. With "Sync Statements" on, the history builds up day by day. Unlimited never deletes transactions, so it uses more disk space over time. Raising the setting doesn't bring back transactions already deleted; they load again when you open their period.

## Budgets

Set a monthly limit for one or more spending categories, e.g. "Cafes & Restaurants: 5 000 ₴", and see how much of it you've spent.

- **What counts**: spending in the budget's categories on the UAH account you're viewing, in the calendar month. Budgets are shared by all your UAH accounts, and each account counts its own spending. Transactions on hold count, and money coming back in a budget's categories, such as refunds, is subtracted.
- **Where**: the Summary in "Show Statement" shows your budgets for "This Month" and "Last Month" on UAH accounts, with a ring, spent of the limit, what's left and, for this month, how much you can spend per day. An orange or red mark on the Summary means a budget is near (80%) or over its limit. While searching, budgets still cover the whole month.
- **Manage**: use "Manage Budgets…" (`⌘ ⇧ U`) in "Show Statement", or the "Show Budgets" command, which shares the account picked in "Show Statement" and switches between this and last month with `⌘ ⇧ P`. Create a budget from scratch or from a preset (Cafes & Restaurants, Groceries, Taxi, Transport, Car, Health, Clothes & Shoes, Subscriptions & Games, Entertainment, Beauty, Pets), then edit, reorder or delete it.
- **Categories** are merchant category names, searchable in English or Ukrainian. Categories you spent on recently are listed first.

## Sync Statements

Keeps the statements of all your cards, FOP accounts and jars up to date in the background, so "Show Statement" and AI answers have today's transactions right away, even for accounts you rarely open.

monobank allows one statement request per 60 seconds, so the command runs every 2 minutes and syncs the last 31 days of one account per run: the first one not synced today, starting with the account "Show Statement" opens by default. Accounts already synced today, by this command, "Show Statement" or AI, are skipped, and once all are synced, runs make no requests until the next day. The command's subtitle in Raycast shows the progress, e.g. "Synced today: 4 of 6".

Background refresh is off until you open the command once or turn it on in its preferences. Opening it syncs the next account right away.

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
- Скільки ще можу витратити на кафе цього місяця?
- Am I over budget anywhere?
- Встанови бюджет 5000 грн на таксі
- Скільки я отримав переказів минулого місяця?

AI finds accounts and jars by their names, including the custom names you give accounts in "Show Accounts", even when you ask in another language (e.g. "основний рахунок" for an account named "Primary"). When you don't name an account, it uses the default one (the first pinned account, or the first UAH card) and tells you which.

AI can also create, change and delete budgets; Raycast asks you to confirm before anything is saved.

Conversions use monobank's current rates, the same way as "Convert Currency". Questions about transactions cover up to 31 days at a time and share the statement cache and the 60-second rate limit with "Show Statement", so an answer can take up to a minute.

## Credits

Merchant categories come from the [Merchant Category Codes](https://github.com/Oleksios/Merchant-Category-Codes) dataset by Oleksios, licensed under MIT. Run `node scripts/update-mcc.mjs` to update them.
