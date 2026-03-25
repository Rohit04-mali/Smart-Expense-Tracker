Power BI - Quick setup (PBIX can't be created here)

Below are clear steps and sample DAX measures so you can reproduce the same visuals in Power BI Desktop.

1) Data source
   - Use the `expenses` SQL table (above) or export the localStorage to CSV and load it.
   - Columns required: `id`, `expense_date` (date), `amount` (decimal), `category` (text), `description` (text), `created_at` (datetime).

2) Model
   - Treat `expense_date` as a Date column (set data type -> Date).
   - Optionally create a Date table and relate `Date[Date]` -> `Expenses[expense_date]`.

3) Suggested visuals
   - Bar chart: Axis = `category`, Values = `Sum(amount)`
   - Slicer: `expense_date` (Relative date slicer), to implement 1/3/6 months filter use the relative slicer or create a calculated column.
   - Table: show details (date, amount, category, description)

4) Useful DAX measures

Total Expense =
Total Expense = SUM(Expenses[amount])

Expense Last 30 Days =
ExpenseLast30 =
CALCULATE(
    [Total Expense],
    DATESINPERIOD(Expenses[expense_date], LASTDATE(Expenses[expense_date]), -30, DAY)
)

Expense by Category (example for a card showing the top category):
TopCategory =
VAR tbl = SUMMARIZE(Expenses, Expenses[category], "s", SUM(Expenses[amount]))
RETURN
TOPN(1, tbl, [s], DESC)

(You may want to return the category name — use CONCATENATEX/TOPN pattern.)

5) Tips
   - Use a relative date slicer set to last 1/3/6 months for quick duration filtering.
   - Add conditional formatting (data bars) to the table for quick scanning.
