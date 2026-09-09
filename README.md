# real-estate-calculator

![CI](https://github.com/maxgfr/real-estate-calculator/workflows/CI/badge.svg)

**Calculate rental property ROI, cashflow, and yield in seconds.** Make smarter real estate investment decisions with our free calculator — pre-filled with realistic defaults so you can start immediately.

## Features

- **20+ financial metrics** — cashflow, yields, cash-on-cash, DSCR, GRM, Cap Rate, 1% Rule, OER, break-even rent, breakeven year, exit scenario ROI, and more
- **18 interactive charts** — ROI, amortization, equity build-up, rent/rate sensitivity, cashflow waterfall, deal profile radar, stress test scenarios, exit ROI, expense decomposition, and more
- **Mortgage simulator** — accurate monthly payments with full interest breakdown
- **Detailed cost model** — vacancy, management fees (% of effective rent, or months of rent per year — switch the unit and the figure converts so the economics stay identical), CapEx reserve (% of gross rent), fixed costs, property tax, expense inflation — all factored in with realistic yearly projections
- **Exit scenario** — simulate selling at any year with sale price, capital gain, total profit, ROI, and annualized ROI
- **Stress test** — automatic optimistic/base/pessimistic scenarios with comparison table and 3-curve chart
- **Deal scoring** — radar chart profiling deal quality across 4 axes (DSCR, CoC, Net Yield, GRM)
- **Shareable URLs** — every input is reflected in the URL, bookmark or share any scenario
- **Excel export** — multi-sheet workbook (Purchase, Mortgage, Rental, Results) with all metrics and projections
- **Multi-currency** — EUR, USD, GBP, CHF, CAD with correct locale formatting
- **Dark/Light theme** — system-aware, mobile responsive
- **Real-time updates** — results update instantly as you type
- **Docker ready** — Dockerfile + docker-compose for easy deployment
- **MCP server** — the same engine exposed as local tools, so an AI assistant can analyse a property using the real formulas (`pnpm mcp`)

> **The model is pre-tax.** It does not account for rental income tax or any regime
> (micro-foncier, réel, LMNP), capital gains tax on the sale, mortgage insurance,
> arrangement or guarantee fees, or selling costs such as agency commission. Cumulative
> figures sum nominal amounts without discounting, so the annualized exit ROI is a compound
> growth rate on the down payment, not an IRR — it is insensitive to when the cash arrives.

## Getting Started

```bash
pnpm install   # Install dependencies
pnpm dev       # Start dev server (http://localhost:3000)
pnpm build     # Production build
pnpm test      # Run tests (295)
pnpm typecheck # tsc --noEmit across the whole repo, MCP server included
pnpm mcp       # Run the MCP server on stdio
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
| Property | Annual property appreciation (%) | 1.5% |
| Property | Exit year (sale) | 25 |
| Mortgage | Loan amount | 120,000 |
| Mortgage | Interest rate (%) | 3.5% |
| Mortgage | Loan term (years) | 25 |
| Rental | Monthly rent | 900 |
| Rental | Annual property tax | 1,000 |
| Rental | Monthly fixed costs (charges, insurance, maintenance) | 120 |
| Rental | Management fees — % of effective rent, or months/year (1 month/yr ≈ 8.33%) | 0% |
| Rental | CapEx reserve (% of gross rent) | 3% |
| Rental | Vacancy rate (%) | 5% |
| Rental | Annual rent increase (%) | 1.5% |
| Rental | Annual expense inflation (%) | 2% |

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
| Rental | Net monthly income | After vacancy, mgmt fees, CapEx, costs, and taxes |
| Rental | Monthly / Annual cashflow | Net income - mortgage |
| Rental | Break-even rent | Min rent for zero cashflow (accounts for vacancy, mgmt, CapEx) |
| Performance | Gross yield | Annual rent / investment |
| Performance | Net yield | Net annual income / investment |
| Performance | Cash-on-cash | Annual cashflow / down payment (N/A if 100% financed) |
| Performance | DSCR | Net income / mortgage (∞ if no mortgage) |
| Performance | GRM | Purchase price / annual rent |
| Performance | Cap Rate | NOI / property value (financing-independent) |
| Performance | 1% Rule | Monthly rent / purchase price |
| Performance | OER | Operating expenses / effective income |
| Projections | Property value | At loan end, with appreciation |
| Projections | Cashflow after loan | Passive income with inflated costs, mgmt fees, CapEx |
| Projections | Cumulative cashflow | Total over loan period with all yearly adjustments |
| Projections | Total return | Equity + cumulative cashflow |
| Projections | Breakeven year | Year cumulative cashflow turns positive |
| Exit scenario | Sale price, Capital gain, ROI | Sell at chosen year with full profit breakdown |
| Stress test | 3-scenario comparison | Optimistic / Base / Pessimistic cashflow and metrics |

## Charts

Organized in five sections: **Overview**, **Mortgage**, **Investment**, **Exit & Scenarios**, and **Stress Test**.

| Section | Chart | Type | Description |
|---------|-------|------|-------------|
| Overview | Investment Breakdown | Donut | Purchase price, closing costs, renovation split |
| Overview | Monthly Expense Breakdown | Donut | Mortgage, charges, tax, mgmt fees, CapEx, vacancy |
| Overview | Cashflow Waterfall | Stacked bar | Step-by-step from gross rent to cashflow |
| Overview | ROI & Yield Metrics | Horizontal bar | Gross yield, net yield, cash-on-cash side by side |
| Overview | Rent Sensitivity | Dual-axis line | Cashflow and net yield at rent -20% to +20% |
| Overview | Interest Rate Sensitivity | Composed | Cashflow bars + DSCR line at rate -2% to +2% |
| Overview | Deal Profile Radar | Radar | 4-axis spider chart (DSCR, CoC, Net Yield, GRM) |
| Mortgage | Annual Principal vs Interest | Stacked bar | Per-year breakdown of mortgage payments |
| Mortgage | Amortization Schedule | Area | Balance, cumulative interest, cumulative principal |
| Investment | Annual Cashflow | Bar | Year-by-year cashflow with inflation, green/red |
| Investment | Income vs Expenses | Area | Rental income vs total expenses over time |
| Investment | Expense Decomposition | Composed | Stacked bar of expenses by category + income line |
| Investment | Equity Build-Up | Stacked area | Equity from payments + appreciation over time |
| Investment | Cumulative Cashflow | Line | With breakeven marker, break-even and loan-end lines |
| Investment | Total Return on Investment | Line | Equity + cumulative cashflow = total return |
| Exit | Profit Composition | Donut | Cashflow, capital gain, equity at exit year |
| Exit | ROI by Exit Year | Line | Total ROI% if selling at each year (1 to horizon) |
| Stress Test | 3-Scenario Cashflow | Composed | Optimistic/base/pessimistic curves + uncertainty area |

## Benchmarks

Boundaries are inclusive exactly as written. These are not a separate editorial opinion: they
are read straight out of `utils/benchmarks.ts`, the single table the app's rating badges and
the MCP server's `rating` field both use, and `__tests__/readme.test.ts` fails the build if
this table stops matching it.

| Metric | Excellent | Good | Weak |
|--------|-----------|------|------|
| Net yield | >= 5% | 3-5% | < 3% |
| Cashflow | Positive | - | Negative |
| Cash-on-cash | >= 8% | 4-8% | < 4% |
| DSCR | >= 1.5 | 1.25-1.5 | < 1.25 |
| GRM | <= 15 | 15-20 | > 20 |
| Cap Rate | >= 6% | 4-6% | < 4% |
| 1% Rule | >= 1% | 0.7-1% | < 0.7% |
| OER | <= 40% | 40-60% | > 60% |

A DSCR between 1.0 and 1.25 covers the debt but sits under the usual lender minimum, so it
rates weak here even though the mortgage is paid.

These are general market thresholds; what counts as a good yield varies enormously by location.

## MCP server

The calculation engine is also available as a local MCP server, so an AI assistant can analyse
a property with the real formulas instead of doing arithmetic in its head. `.mcp.json`
registers it for the project; it runs under Node's native TypeScript support, so there is no
build step.

| Tool | Returns |
|------|---------|
| `compute_metrics` | Every indicator, rated against the benchmarks above |
| `compute_projections` | Cumulative cashflow, equity, total return, payback year |
| `compute_exit_scenario` | Sale value and ROI for the exit year, plus ROI by exit year |
| `compute_stress_test` | Optimistic/base/pessimistic, plus rent and rate sensitivity |
| `compare_deals` | Several properties side by side, ranked |
| `build_share_url` | A link that opens the app pre-filled |

Every response carries the model's caveats. `.claude/skills/real-estate-deal-analysis/` holds
the accompanying skill: when to call which tool, how to read the output, and the exact formula
behind each indicator.

## Shareable URLs

Every field is stored in the URL. Share or bookmark any scenario:

```
https://maxgfr.github.io/real-estate-calculator/?housingPrice=150000&notaryFees=12000&houseWorks=0&appreciationRate=1.5&exitYear=25&bankLoan=120000&bankRate=3.5&bankLoanPeriod=25&rent=900&propertyTax=1000&monthlyCosts=120&managementRate=0&capexRate=3&vacancyRate=5&rentIncreaseRate=1.5&expenseInflationRate=2&currency=EUR&managementRateUnit=percent
```

That is the full set: the 16 inputs plus `currency` and `managementRateUnit`. Any parameter you
leave out falls back to its default, and unknown ones are ignored, so shorter links work too.

## Project Structure

```
real-estate-calculator/
├── pages/
│   ├── index.tsx          # Main calculator (inputs + results)
│   └── _app.tsx           # Chakra UI theme provider
├── __tests__/
│   ├── index.test.tsx     # Page: state, URL sync, currency, Excel hand-off
│   └── readme.test.ts     # Fails if this file drifts from the code
├── components/
│   ├── Charts.tsx         # 18 interactive charts (recharts, rendering only)
│   └── Charts.test.tsx    # Every chart renders, on normal and edge-case deals
├── utils/                 # The whole engine — pure, typed, UI-free
│   ├── model.ts           # Shared kernel: income breakdown, amortization, horizons
│   ├── index.ts           # Indicator functions + exit scenario + stress test
│   ├── projections.ts     # Year-by-year series behind the charts
│   ├── deal.ts            # analyzeDeal(): 16 inputs -> every indicator
│   ├── benchmarks.ts      # The rating thresholds, shared by the app and the MCP server
│   ├── export.ts          # Excel sheet builder
│   ├── state.ts           # URL <-> state round-trip
│   └── *.test.ts          # One suite per module
├── mcp/
│   └── server.ts          # MCP server exposing the engine as tools
├── .claude/skills/        # Skill for analysing a property in conversation
├── .github/workflows/
│   ├── build.yml          # Build check
│   ├── ci.yml             # Lint + typecheck + test + build + Docker
│   └── deploy.yml         # GitHub Pages deployment
├── Dockerfile             # Multi-stage build (Node + nginx)
├── docker-compose.yml     # Local Docker setup
├── nginx.conf             # Static file serving config
└── public/                # Favicon, icon, manifest
```

Every calculation lives in `utils/` and nothing there imports React, so the browser, the
Excel export and the MCP server all read the same numbers by construction.

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Framework | Next.js | 16 |
| UI | Chakra UI | 2 |
| Charts | Recharts | 3 |
| Language | TypeScript | 5 |
| Testing | Jest | 30 |
| Export | SheetJS (xlsx) | 0.18 |
| MCP | @modelcontextprotocol/sdk | 1 |
| Container | Docker + nginx | - |
| Package manager | pnpm | >=10 |

## License

MIT

## Manual skill invocation

These skills run when explicitly invoked: `real-estate-deal-analysis`. Use `$name` in Codex or `/name` in Claude Code and OpenCode (with the plugin namespace when installed as a Claude plugin).

The skill bundle disables implicit selection in Codex and Claude Code. OpenCode V2 reads `metadata.opencode/autoinvoke: "false"`. For OpenCode V1, merge these entries into `permission.skill` in `~/.config/opencode/opencode.json` or the project configuration; retain unrelated permissions:

```json
{
  "permission": {
    "skill": {
      "real-estate-deal-analysis": "deny"
    }
  }
}
```

On OpenCode 1.18.30, these rules hide the skills from the agent and reject skill-tool loading, while explicit `/name` commands remain available. Installation with `skills add` does not apply this OpenCode V1 configuration.
