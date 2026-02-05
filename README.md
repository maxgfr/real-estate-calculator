# Estate Calc

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
Net Yield = (Annual Rent - Charges - Taxes) / Total Investment × 100
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

1. Enter **Purchase** details (property price, notary fees, renovation)
2. Configure **Mortgage** (loan amount, rate, duration)
3. Add **Rental** parameters (rent, charges, property tax)
4. View real-time **Results** and export to Excel

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
│   ├── ci.yml            # Lint, test, build
│   └── deploy.yml        # GitHub Pages deployment
└── public/               # Static assets
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
