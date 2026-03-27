# real-estate-calculator

![CI](https://github.com/maxgfr/real-estate-calculator/workflows/CI/badge.svg)

**Calculate rental property ROI, cashflow, and yield in seconds.** Make smarter real estate investment decisions with our free calculator — pre-filled with realistic defaults so you can start immediately.

## Features

- **14 financial metrics** — cashflow, yields, cash-on-cash, DSCR, GRM, break-even rent, and more
- **11 interactive charts** — ROI, amortization, equity build-up, rent sensitivity, total return, and more
- **Mortgage simulator** — accurate monthly payments with full interest breakdown
- **Complete cost model** — vacancy rate, monthly costs, property tax, appreciation all factored in
- **Shareable URLs** — every input is reflected in the URL, bookmark or share any scenario
- **Excel export** — multi-sheet workbook (Purchase, Mortgage, Rental, Results)
- **Multi-currency** — EUR, USD, GBP, CHF, CAD with correct locale formatting
- **Dark/Light theme** — system-aware, mobile responsive
- **Real-time updates** — results update instantly as you type
- **Docker ready** — Dockerfile + docker-compose for easy deployment

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
| Projections | Property value | At loan end, with appreciation (if set) |
| Projections | Monthly rent | At loan end, with rent increase (if set) |
| Projections | Cashflow after loan | Monthly passive income once mortgage is repaid |
| Projections | Cumulative cashflow | Total cashflow over loan period including down payment |
| Projections | Total return | Equity + cumulative cashflow at loan end |

## Charts

Organized in three sections: **Overview**, **Mortgage**, and **Investment**.

| Section | Chart | Type | Description |
|---------|-------|------|-------------|
| Overview | Investment Breakdown | Donut | Purchase price, closing costs, renovation split |
| Overview | Monthly Expense Breakdown | Donut | Mortgage, charges, tax, vacancy loss |
| Overview | ROI & Yield Metrics | Horizontal bar | Gross yield, net yield, cash-on-cash side by side |
| Overview | Rent Sensitivity | Dual-axis line | Cashflow and net yield at rent -20% to +20% |
| Mortgage | Annual Principal vs Interest | Stacked bar | Per-year breakdown of mortgage payments |
| Mortgage | Amortization Schedule | Area | Balance, cumulative interest, cumulative principal |
| Investment | Annual Cashflow | Bar | Year-by-year cashflow, green/red per year |
| Investment | Income vs Expenses | Area | Rental income vs total expenses over time |
| Investment | Equity Build-Up | Stacked area | Equity from payments + appreciation over time |
| Investment | Cumulative Cashflow | Line | Cumulative cashflow with break-even and loan-end markers |
| Investment | Total Return on Investment | Line | Equity + cumulative cashflow = total return |

## Benchmarks

| Metric | Excellent | Good | Weak |
|--------|-----------|------|------|
| Net yield | > 5% | 3-5% | < 3% |
| Cashflow | Positive | - | Negative |
| Cash-on-cash | > 8% | 4-8% | < 4% |
| DSCR | >= 1.25 | >= 1.0 | < 1.0 |
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
│   └── Charts.tsx         # 11 interactive charts (recharts)
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
