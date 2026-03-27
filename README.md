# real-estate-calculator

![CI](https://github.com/maxgfr/real-estate-calculator/workflows/CI/badge.svg)

**Calculate rental property ROI, cashflow, and yield in seconds.** Make smarter real estate investment decisions with our free calculator — pre-filled with realistic defaults so you can start immediately.

## Features

- **14 financial metrics** — cashflow, yields, cash-on-cash, DSCR, GRM, break-even rent, and more
- **8 interactive charts** — ROI, amortization, equity build-up, rent sensitivity, and more
- **Mortgage simulator** — accurate monthly payments with full interest breakdown
- **Complete cost model** — vacancy rate, monthly costs, property tax, appreciation all factored in
- **Shareable URLs** — every input is reflected in the URL, bookmark or share any scenario
- **Excel export** — multi-sheet workbook (Purchase, Mortgage, Rental, Results)
- **Multi-currency** — EUR, USD, GBP, CHF, CAD with correct locale formatting
- **Dark/Light theme** — system-aware, mobile responsive
- **Real-time updates** — results update instantly as you type
- **Docker ready** — Dockerfile + docker-compose for easy deployment

## Formulas

### Total Investment

```
Total investment = Purchase price + Closing costs + Renovation budget
```

### Down Payment

```
Down payment = Total investment - Loan amount
```

The cash you put in upfront.

### Loan-to-Value (LTV)

```
LTV = (Loan amount / Purchase price) x 100
```

Banks typically require LTV <= 80%. Higher LTV = more leverage, more risk.

### Monthly Mortgage Payment

```
M = P x [t(1+t)^n] / [(1+t)^n - 1]
```

Where: P = loan amount, t = monthly rate (annual rate / 12 / 100), n = total months (years x 12).

If rate = 0%, then M = P / n.

### Total Mortgage Interest

```
Total interest = (Monthly payment x Total months) - Loan amount
```

### Total Mortgage Cost

```
Total repaid = Loan amount + Total interest
```

### Total Operation Cost

```
Total operation cost = Total investment + Total interest paid
```

The real total spent over the full loan duration.

### Net Monthly Income

```
Effective rent = Monthly rent x (1 - Vacancy rate / 100)
Net income     = Effective rent - Monthly costs - Property tax / 12
```

### Monthly Cashflow

```
Cashflow = Net monthly income - Monthly mortgage payment
```

Positive = the property pays for itself. Negative = you pay the difference.

### Break-Even Rent

```
Break-even rent = (Monthly costs + Property tax / 12 + Mortgage payment) / (1 - Vacancy rate / 100)
```

The minimum monthly rent required to achieve zero cashflow.

### Gross Yield

```
Gross yield = (Monthly rent x 12 / Total investment) x 100
```

Does not account for expenses. Use net yield for a realistic view.

### Net Yield

```
Net yield = (Net monthly income x 12 / Total investment) x 100
```

Accounts for vacancy, costs, and taxes. Target: > 5% excellent, 3-5% good.

### Cash-on-Cash Return

```
Cash-on-cash = (Monthly cashflow x 12 / Down payment) x 100
```

The actual return on the cash you invested. Target: > 8% excellent, 4-8% good.

### DSCR (Debt Service Coverage Ratio)

```
DSCR = Net monthly income / Monthly mortgage payment
```

The ratio banks use to evaluate if a property can service its debt. DSCR >= 1.25 is considered good. Above 1.0 means the property covers its mortgage from rental income alone.

### GRM (Gross Rent Multiplier)

```
GRM = Purchase price / (Monthly rent x 12)
```

A quick comparison metric. Lower is better. < 15 = good deal, 15-20 = average, > 20 = expensive relative to rent.

### Equity Build-Up

```
Property base value    = Purchase price + Renovation budget
Property value (yr Y)  = Property base value x (1 + Appreciation rate / 100)^Y
Equity from payments   = Property base value - Remaining loan balance
Equity from appreciation = Property value (yr Y) - Property base value
Total equity           = Equity from payments + Equity from appreciation
```

The appreciation rate applies to **property value only** — it does not affect rent or cashflow calculations.

### Amortization (per month)

```
Interest portion  = Remaining balance x Monthly rate
Principal portion = Monthly payment - Interest portion
New balance       = Remaining balance - Principal portion
```

Repeated each month over the loan term.

### Cumulative Cashflow Projection

```
Year 0:  -Down payment
Year Y:  Previous + (Net income at year Y - Mortgage if Y <= loan period) x 12
Rent at year Y = Monthly rent x (1 + Rent increase rate / 100)^(Y-1)
```

After the loan is fully repaid, mortgage drops to zero. If annual rent increase > 0%, cashflow grows each year.

## Getting Started

```bash
pnpm install   # Install dependencies
pnpm dev       # Start dev server (http://localhost:3000)
pnpm build     # Production build
pnpm test      # Run tests
```

### Docker

```bash
docker compose up      # Build & run on http://localhost:3000
```

The calculator opens with pre-filled example values — just adjust the numbers for your property.

## Inputs

| Section | Field | Default |
|---------|-------|---------|
| Property | Purchase price | 150,000 |
| Property | Closing costs (notary, agency...) | 12,000 |
| Property | Renovation budget | 0 |
| Property | Annual property appreciation (%) | 0% |
| Mortgage | Loan amount | 150,000 |
| Mortgage | Interest rate (%) | 3.5% |
| Mortgage | Loan term (years) | 20 |
| Rental | Monthly rent | 750 |
| Rental | Annual property tax | 1,000 |
| Rental | Monthly costs (charges, insurance, maintenance) | 150 |
| Rental | Vacancy rate (%) | 5% |
| Rental | Annual rent increase (%) | 0% |

## Summary Metrics

| Group | Metric | Description |
|-------|--------|-------------|
| Investment | Total investment | Price + closing costs + renovation |
| Investment | Down payment | Investment - loan amount |
| Investment | LTV | Loan-to-Value ratio |
| Credit | Monthly payment | Amortized mortgage payment |
| Credit | Interest paid | Total interest over loan term |
| Credit | Total repaid | Loan + interest |
| Credit | Total operation cost | Investment + interest (true total cost) |
| Rental | Net monthly income | After vacancy, costs, and taxes |
| Rental | Monthly / Annual cashflow | Net income - mortgage |
| Rental | Break-even rent | Min rent for zero cashflow |
| Performance | Gross yield | Annual rent / investment |
| Performance | Net yield | Net annual income / investment |
| Performance | Cash-on-cash | Annual cashflow / down payment |
| Performance | DSCR | Net income / mortgage (debt coverage) |
| Performance | GRM | Purchase price / annual rent (comparison metric) |

## Charts

| Chart | Type | Description |
|-------|------|-------------|
| Investment Breakdown | Donut | Purchase price, closing costs, renovation split |
| Monthly Expense Breakdown | Donut | Mortgage, charges, tax, vacancy loss |
| ROI & Yield Metrics | Horizontal bar | Gross yield, net yield, cash-on-cash side by side |
| Rent Sensitivity | Dual-axis line | Cashflow and net yield at rent -20% to +20% |
| Annual Principal vs Interest | Stacked bar | Per-year breakdown of mortgage payments |
| Amortization Schedule | Area | Balance, cumulative interest, cumulative principal |
| Equity Build-Up | Stacked area | Equity from payments + appreciation over time |
| Cumulative Cashflow | Line | Cumulative cashflow with break-even and loan-end markers |

## Benchmarks

| Metric | Excellent | Good | Weak |
|--------|-----------|------|------|
| Net yield | > 5% | 3-5% | < 3% |
| Cashflow | Positive | - | Negative |
| Cash-on-cash | > 8% | 4-8% | < 4% |
| DSCR | >= 1.25 | 1.0-1.25 | < 1.0 |
| GRM | < 15 | 15-20 | > 20 |

## Shareable URLs

Every field is stored in the URL. Share or bookmark any scenario:

```
https://maxgfr.github.io/real-estate-calculator/?housingPrice=150000&notaryFees=12000&houseWorks=0&appreciationRate=0&bankLoan=150000&bankRate=3.5&bankLoanPeriod=20&rent=750&propertyTax=1000&monthlyCosts=150&vacancyRate=5&rentIncreaseRate=0&currency=EUR
```

## Project Structure

```
real-estate-calculator/
├── pages/
│   ├── index.tsx          # Main calculator (inputs + results)
│   └── _app.tsx           # Chakra UI theme provider
├── components/
│   └── Charts.tsx         # 8 interactive charts (recharts)
├── utils/
│   ├── index.ts           # All calculation functions (pure, typed)
│   └── index.test.ts      # Unit tests (51 tests)
├── .github/workflows/
│   ├── build.yml          # Build check
│   ├── ci.yml             # Lint + test + build + Docker
│   └── deploy.yml         # GitHub Pages deployment
├── Dockerfile             # Multi-stage build (Node + nginx)
├── docker-compose.yml     # Local Docker setup
├── nginx.conf             # Static file serving config
└── public/                # Favicon, icon, manifest
```

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js | 16 |
| UI | Chakra UI | 2 |
| Charts | Recharts | 3 |
| Language | TypeScript | 5 |
| Testing | Jest | 30 |
| Export | SheetJS (xlsx) | 0.18 |
| Container | Docker + nginx | - |
| Package manager | pnpm | >=10 |

## License

MIT
