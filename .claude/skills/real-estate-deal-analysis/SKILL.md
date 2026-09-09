---
name: real-estate-deal-analysis
description: Analyze and compare rental property investments with the real-estate-calculator MCP tools.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: 'false'
---

# Analysing a rental property

Answer in the language the user wrote in.

## Compute, never estimate

The `real-estate-calculator` MCP server exposes this repo's actual engine. **Always call it.**
Never do the arithmetic yourself and never quote a figure you did not get back from a tool —
mortgage amortisation, compounding rent and inflating costs are exactly where mental maths
goes wrong, and a wrong number here is a wrong purchase decision.

| Question | Tool |
|---|---|
| Is this deal any good? What's the cashflow / yield? | `compute_metrics` |
| What does it look like in 10, 20, 25 years? When do I get my money back? | `compute_projections` |
| What if I sell in year N? What's the best moment to sell? | `compute_exit_scenario` |
| What if it goes wrong? What if rates rise? | `compute_stress_test` |
| Which of these properties is better? | `compare_deals` |
| Give me a link to play with it | `build_share_url` |

For a first analysis, `compute_metrics` then `compute_projections` is usually enough. Reach for
the stress test whenever the deal looks tight (DSCR under 1.25, or cashflow near zero), and for
`compute_exit_scenario` whenever the user mentions reselling or a holding period.

## Filling the gaps

The tools take 16 inputs and all have defaults, so a partial description still works. Users
rarely give more than price, rent and loan terms. Fill the rest with these, and **say which
assumptions you made** — one short line, not a table:

| Input | Sensible default (France) |
|---|---|
| `notaryFees` | 7–8% of the price for an existing property, 2–3% for new-build |
| `vacancyRate` | 5% (about 18 days a year); 8–10% in a slack market or for student lets |
| `capexRate` | 5% of gross rent; 8–10% for an old building with no recent works |
| `monthlyCosts` | Non-recoverable service charges + landlord insurance |
| `managementRate` | 0 if self-managed; 7–8% of collected rent via an agency (one month of rent a year ≈ 8.33%) |
| `rentIncreaseRate` | 1.5% (long-run IRR/IRL) |
| `expenseInflationRate` | 2% |
| `appreciationRate` | 1–2%, or 0 to judge the deal on rent alone |
| `bankLoan` | Price + fees minus the stated down payment; ask if neither is given |

If the user gives a down payment rather than a loan amount, compute the loan as total cost
minus that. If a figure genuinely changes the verdict and you cannot guess it (the rent, the
price, the rate), ask — one question, not a form.

## Reading the result

Work through it in this order. Stop and lead with whatever fails first.

1. **Monthly cashflow.** Negative means writing a cheque every month. That is a legitimate
   choice when buying for capital growth, but it must be deliberate — say so plainly.
2. **DSCR.** The lender's view, measured on NOI. Under 1.0 the rent does not cover the loan.
   Under 1.25 most French banks will not lend without other income.
3. **Net yield and cash-on-cash.** Return on the total cost, and return on the cash actually
   put in. Cash-on-cash comes back `N/A` when no equity is at risk — that is not a failure,
   it means the ratio is undefined.
4. **Exit scenario.** Where most of the return usually sits. Note that `annualizedRoi` is a
   CAGR on the down payment, not an IRR.
5. **Stress test.** Does the pessimistic scenario still stand up?
6. **The weakest lever.** Say what would have to change to make the deal work: a lower price,
   a higher rent, a longer term, a bigger down payment. Use `compare_deals` or a second
   `compute_metrics` call to show the effect rather than asserting it.

Benchmarks (the tools return a `rating` per indicator using exactly these):

| Indicator | Excellent | Good | Weak |
|---|---|---|---|
| Net yield | > 5% | 3–5% | < 3% |
| Cashflow | Positive | — | Negative |
| Cash-on-cash | > 8% | 4–8% | < 4% |
| DSCR | ≥ 1.5 | ≥ 1.25 | < 1.0 |
| GRM | < 15 | 15–20 | > 20 |
| Cap rate | ≥ 6% | 4–6% | < 4% |
| 1% rule | ≥ 1% | ≥ 0.7% | < 0.7% |
| OER | ≤ 40% | 40–60% | > 60% |

These are general market thresholds. A 4% net yield is weak in Saint-Étienne and excellent in
central Paris — say so when the location makes the benchmark misleading.

## What the model does not cover

Every tool response carries a `caveats` array. **Always surface the ones that matter for the
question asked** — a "this deal returns 7.5%/yr" that silently ignores capital gains tax is
misleading, not concise.

The model is **pre-tax and pre-selling-costs**. It has no rental income tax and no regime
modelling (micro-foncier, réel, LMNP), no capital gains tax or holding-period allowances, no
mortgage insurance (typically 0.10–0.40%/yr, which moves DSCR), no agency commission on the
sale, and no discounting. If the user asks about a tax regime, say the calculator does not
model it rather than improvising a number.

## Answering

Short and decided. A verdict sentence, the four or five numbers that justify it, the weak
point, the assumptions you filled in, and the relevant caveat. Then offer the share URL from
`build_share_url` so they can turn the dials themselves.

Do not dump the whole tool response. Do not hedge into uselessness — if the numbers say the
deal is bad, say the deal is bad.

For the exact formula behind any indicator, and what each one includes or excludes, read
`reference.md` next to this file.
