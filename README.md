# Estate Calc

![CI](https://github.com/maxgfr/estate-calc/workflows/CI/badge.svg)
![Tests](https://github.com/maxgfr/estate-calc/workflows/Tests/badge.svg)

**Calculate rental property ROI, cashflow, and yield in seconds.** Make smarter real estate investment decisions with our free, modern calculator featuring Excel export.

## ✨ Features

- 📊 **Instant Calculations** - Monthly cashflow, gross & net yield
- 💰 **Mortgage Simulator** - Accurate monthly payments with interest breakdown
- 📥 **Excel Export** - Multi-sheet professional export
- 🎨 **Modern UI** - Dark/Light theme, mobile responsive
- ⚡ **Real-time Updates** - See results change as you type

## 🧮 Calculations

### Monthly Mortgage Payment
```
M = P × [t(1+t)^n] / [(1+t)^n - 1]
```
- M = Monthly payment
- P = Loan amount
- t = Monthly rate (Annual rate / 12 / 100)
- n = Number of months (Duration × 12)

### Cashflow
```
Cashflow = Net Monthly Income - Monthly Mortgage Payment
```

### Yields
```
Gross Yield = (Annual Rent / Total Investment) × 100
Net Yield = ((Annual Rent - Annual Charges - Annual Taxes) / Total Investment) × 100
```

## 🚀 Usage

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

1. Enter **Property** details (purchase price, closing costs, renovation budget)
2. Configure **Mortgage** (loan amount, rate, term)
3. Add **Rental Income** parameters (monthly rent, building fees, annual property tax)
4. View real-time **Results** and export to Excel

## 🔗 Share Calculations

The calculator automatically generates a shareable URL with your values. For example:

```
https://maxgfr.github.io/estate-calc/?housingPrice=250000&notaryFees=18000&houseWorks=5000&bankLoan=200000&bankRate=3.2&bankLoanPeriod=25&rent=1200&rentalCharges=100&propertyTax=1200
```

This allows you to bookmark specific scenarios or share them with others.

## 📁 Project Structure

```
estate-calc/
├── pages/
│   ├── index.tsx          # Main calculator page
│   └── _app.tsx           # App with theme provider
├── utils/
│   ├── index.ts           # Calculation functions
│   └── index.test.ts      # Unit tests (21 tests)
├── .github/workflows/
│   ├── build.yml          # Build workflow
│   ├── ci.yml            # Lint, test, build
│   └── deploy.yml        # GitHub Pages deployment
└── public/               # Static assets (favicon, icon)
```

## 📊 Performance Indicators

| Metric | Excellent | Good | Weak |
|--------|-----------|------|-------|
| Net Yield | > 5% | 3-5% | < 3% |
| Cashflow | Positive | — | Negative |

## 🛠️ Tech Stack

- **Framework**: Next.js 16
- **UI**: Chakra UI
- **Language**: TypeScript
- **Testing**: Jest, React Testing Library
- **Package Manager**: pnpm
- **Deployment**: GitHub Pages

## 📄 License

MIT
