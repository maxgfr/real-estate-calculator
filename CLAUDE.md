# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js static real estate investment calculator. Fully client-side (no API routes, no database). All state lives in React hooks and URL query parameters (shareable links).

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Static export (output: 'export' in next.config.js)
pnpm lint             # ESLint (flat config, TypeScript + Next core-web-vitals)
pnpm lint:fix         # Auto-fix lint issues
pnpm typecheck        # tsc --noEmit; covers mcp/server.ts, which `next build` does not
pnpm test             # Jest (jsdom environment)
pnpm test:watch       # Jest in watch mode
pnpm test:coverage    # Jest with coverage
npx jest path/to/file # Run a single test file
```

## Architecture

**Data flow**: Input fields (16 params) → `useState` + URL sync → `analyzeDeal()` → results display + charts

All calculation lives in `utils/` and nothing there imports React, so the browser, the Excel
export and the MCP server read the same numbers by construction:

- **`utils/model.ts`** — the shared kernel. `monthlyIncomeBreakdown`, `yearIncome`,
  `yearCashflow`, `amortizationSchedule`, `remainingBalanceAfter`, `projectionHorizon`,
  `firstBreakevenYear`. Everything else is built from these; do not re-derive them.
- **`utils/index.ts`** — indicator functions (mortgage, yields, DSCR/GRM/cap rate/OER),
  `computeExitScenario`, `computeStressScenarios`, `computeDealProfileScores`. All accept
  `string | number` and return formatted strings with sentinels (`'N/A'`, `'∞'`).
- **`utils/projections.ts`** — the year-by-year series behind the 18 charts.
- **`utils/deal.ts`** — `analyzeDeal()`: 16 inputs in, every indicator out. Used by the page
  and by the MCP server. `MODEL_CAVEATS` lists what the model omits.
- **`pages/index.tsx`** — main (and only) page. Owns state and URL sync, calls `analyzeDeal`
  once, renders inputs/results, dynamically imports Charts (no SSR).
- **`components/Charts.tsx`** — rendering only. 18 Recharts visualizations reading from
  `utils/projections.ts`.
- **`mcp/server.ts`** — MCP server over the same engine. Run with `pnpm mcp`.

## Key Patterns

- **URL-based state**: All inputs stored as query params via `router.replace()` with `shallow: true`. No Redux/Context.
- **Multi-currency**: 5 currencies (EUR/USD/GBP/CHF/CAD) with locale-aware formatting via `Intl.NumberFormat`.
- **One kernel**: the annual-cashflow block and the amortization loop each exist once, in
  `utils/model.ts`. They were previously copy-pasted 10 and 5 times respectively; if you need
  either, import it.
- **Rounded payments**: `getMonthlyMortgagePayment()` is called at full precision for
  calculations and rounded only for display. `amortizationSchedule` lets the final scheduled
  payment absorb any residual balance.
- **Model conventions**: management fees are a % of *effective* rent, CapEx a % of *gross*
  rent. CapEx is a capital reserve, so it is excluded from NOI — and therefore from cap rate,
  DSCR and OER — but deducted from cashflow. Fixed costs and property tax inflate by
  `expenseInflationRate`, rent grows by `rentIncreaseRate`; year 1 uses the values as entered.
- **Pre-tax model**: no income tax, no capital gains tax, no mortgage insurance, no selling
  costs, no discounting. `MODEL_CAVEATS` in `utils/deal.ts` is the canonical list — keep it in
  sync with the README note if the model gains a feature.
- **Sentinels, not zeros**: `'N/A'` means undefined (no equity at risk), `'∞'` means no
  mortgage, `null` in a series means no value exists. Never coerce these to 0 — doing so
  previously plotted a total loss on the break-even line.
- **Static export**: `output: 'export'` in next.config.js, `basePath: '/real-estate-calculator'` in production. Deployed via GitHub Pages + Docker/Nginx.

## Tech Stack

Next.js 16 + React 19 + TypeScript 5 (strict) + Chakra UI 2 + Recharts 3 + XLSX (Excel export) + Jest 30 + pnpm

The MCP server runs under Node 24's native type stripping — no build step. That is why
relative imports inside `utils/` and `mcp/` carry explicit `.ts` extensions
(`allowImportingTsExtensions` is on); Next and Jest resolve them fine.
