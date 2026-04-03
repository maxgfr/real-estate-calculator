# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js static real estate investment calculator. Fully client-side (no API routes, no database). All state lives in React hooks and URL query parameters (shareable links).

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Static export (output: 'export' in next.config.js)
pnpm lint             # ESLint (flat config, TypeScript)
pnpm lint:fix         # Auto-fix lint issues
pnpm test             # Jest (jsdom environment)
pnpm test:watch       # Jest in watch mode
pnpm test:coverage    # Jest with coverage
npx jest path/to/file # Run a single test file
```

## Architecture

**Data flow**: Input fields (16 params) → `useState` + URL sync → `useMemo` derived calculations → Results display + Charts

Three layers with clear separation:

- **`utils/index.ts`** — Pure calculation functions (mortgage, yields, metrics, exit scenario, stress test, deal scoring). All accept `string | number`, return formatted strings. Fully tested in `utils/index.test.ts`.
- **`pages/index.tsx`** — Main (and only) page. Owns all state, derives ~23 memoized values, renders inputs/results/at-a-glance card, dynamically imports Charts (no SSR).
- **`components/Charts.tsx`** — 18 Recharts visualizations (pie, bar, area, line, composed, radar). Contains its own computation functions (`computeAmortization`, `computeEquityBuildUp`, `computeTotalReturn`, `computeExpenseDecomposition`, `computeROIByExitYear`, etc.) that run month-by-month amortization simulations. Exported compute functions tested in `components/Charts.test.ts`.

## Key Patterns

- **URL-based state**: All inputs stored as query params via `router.replace()` with `shallow: true`. No Redux/Context.
- **Multi-currency**: 5 currencies (EUR/USD/GBP/CHF/CAD) with locale-aware formatting via `Intl.NumberFormat`.
- **Amortization loops**: Several chart functions simulate month-by-month loan payments. The monthly payment from `getMonthlyMortgagePayment()` is rounded to 0 decimals, so these loops adjust the final payment to fully pay off any residual balance (balloon payment pattern).
- **Projection model**: All projection functions inflate fixed costs and property tax by `expenseInflationRate` each year, compute management fees as `% of effective rent`, and CapEx as `% of gross rent`. Rent increases with `rentIncreaseRate`. This ensures realistic long-term projections where expenses grow alongside income.
- **Static export**: `output: 'export'` in next.config.js, `basePath: '/real-estate-calculator'` in production. Deployed via GitHub Pages + Docker/Nginx.

## Tech Stack

Next.js 16 + React 19 + TypeScript 5 (strict) + Chakra UI 2 + Recharts 3 + XLSX (Excel export) + Jest 30 + pnpm
