# real-estate-calculator

![CI](https://github.com/maxgfr/real-estate-calculator/workflows/CI/badge.svg)

**Calculate rental property ROI, cashflow, and yield in seconds.** Make smarter real estate investment decisions with our free calculator — pre-filled with realistic defaults so you can start immediately.

## Features

- **10 financial metrics** — cashflow, yields, cash-on-cash, break-even rent, and more
- **Mortgage simulator** — accurate monthly payments with full interest breakdown
- **Complete cost model** — vacancy rate, monthly costs, property tax all factored in
- **Shareable URLs** — every input is reflected in the URL, bookmark or share any scenario
- **Excel export** — multi-sheet workbook (Purchase, Mortgage, Rental, Results)
- **Dark/Light theme** — system-aware, mobile responsive
- **Real-time updates** — results update instantly as you type

## Formulas

### Mortgage Payment
```
M = P × [t(1+t)^n] / [(1+t)^n - 1]
```
Where: P = loan amount, t = monthly rate (annual rate / 12 / 100), n = months

### Net Monthly Income
```
Effective rent  = Monthly rent × (1 - Vacancy rate)
Net income      = Effective rent - Monthly costs - Property tax / 12
```

### Cashflow
```
Cashflow = Net monthly income - Monthly mortgage payment
```

### Yields
```
Gross yield = (Annual rent / Total investment) × 100
Net yield   = (Net annual income / Total investment) × 100
```

### Cash-on-Cash Return
```
Cash-on-cash = (Annual cashflow / Down payment) × 100
```

### Break-Even Rent
```
Break-even = (Monthly costs + Property tax / 12 + Mortgage) / (1 - Vacancy rate)
```
The minimum monthly rent required to achieve zero cashflow.

### Total Operation Cost
```
Total operation cost = Total investment + Total interest paid
```
The real total spent over the full loan duration.

## Getting Started

```bash
pnpm install   # Install dependencies
pnpm dev       # Start dev server (http://localhost:3000)
pnpm build     # Production build
pnpm test      # Run tests
```

The calculator opens with pre-filled example values — just adjust the numbers for your property.

## Inputs

| Section | Field | Default |
|---------|-------|---------|
| Property | Purchase price | — |
| Property | Closing costs (notary, agency...) | — |
| Property | Renovation budget | 0 |
| Mortgage | Loan amount | — |
| Mortgage | Interest rate (%) | 3.5% |
| Mortgage | Loan term (years) | 20 |
| Rental | Monthly rent | — |
| Rental | Annual property tax | 0 |
| Rental | Monthly costs (charges, insurance, maintenance) | 150 |
| Rental | Vacancy rate (%) | 5% |

## Summary Metrics

| Group | Metric | Description |
|-------|--------|-------------|
| Investment | Total investment | Price + closing costs + renovation |
| Investment | Down payment | Investment − loan amount |
| Credit | Monthly payment | Amortized mortgage payment |
| Credit | Interest paid | Total interest over loan term |
| Credit | Total repaid | Loan + interest |
| Credit | Total operation cost | Investment + interest (true total cost) |
| Rental | Net monthly income | After vacancy, costs, and taxes |
| Rental | Monthly / Annual cashflow | Net income − mortgage |
| Rental | Break-even rent | Min rent for zero cashflow |
| Performance | Gross yield | Annual rent / investment |
| Performance | Net yield | Net annual income / investment |
| Performance | Cash-on-cash | Annual cashflow / down payment |

## Benchmarks

| Metric | Excellent | Good | Weak |
|--------|-----------|------|------|
| Net yield | > 5% | 3–5% | < 3% |
| Cashflow | Positive | — | Negative |
| Cash-on-cash | > 8% | 4–8% | < 4% |

## Shareable URLs

Every field is stored in the URL. Share or bookmark any scenario:

```
https://maxgfr.github.io/real-estate-calculator/?housingPrice=150000&notaryFees=12000&houseWorks=0&bankLoan=150000&bankRate=3.5&bankLoanPeriod=20&rent=750&propertyTax=1000&monthlyCosts=150&vacancyRate=5
```

## Project Structure

```
real-estate-calculator/
├── pages/
│   ├── index.tsx          # Main calculator (inputs + results)
│   └── _app.tsx           # Chakra UI theme provider
├── utils/
│   ├── index.ts           # All calculation functions (pure, typed)
│   └── index.test.ts      # Unit tests (39 tests)
├── .github/workflows/
│   ├── build.yml          # Build check
│   ├── ci.yml             # Lint + test + build
│   └── deploy.yml         # GitHub Pages deployment
└── public/                # Favicon, icon, manifest
```

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js | 16 |
| UI | Chakra UI | 2 |
| Language | TypeScript | 5 |
| Testing | Jest | 30 |
| Export | SheetJS (xlsx) | 0.18 |
| Package manager | pnpm | >=10 |

## License

MIT
