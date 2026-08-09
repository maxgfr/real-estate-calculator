# Indicator reference

Exact definitions as implemented in `utils/`. Read this when a user questions a number, when
two indicators seem to disagree, or when you need to explain what a figure includes.

## Model conventions

Three choices explain most apparent inconsistencies:

- **Management fees are a % of effective rent** (what you actually collect, after vacancy).
- **The CapEx reserve is a % of gross rent** (the building wears out whether or not it is let).
- **CapEx is capital, not an operating expense.** It is deducted from cashflow and from net
  income, but excluded from NOI — and therefore from cap rate, DSCR and OER. This is the
  standard treatment and it is why net income and NOI differ by exactly the CapEx amount.

Year 1 uses the values as entered. Year *y* applies `rentIncreaseRate` to rent and
`expenseInflationRate` to fixed costs and property tax, both compounded over `y - 1` years.
Projections run to ten years past loan repayment, capped at 40.

## Monthly income waterfall

```
effective rent   = gross rent × (1 − vacancyRate/100)
management fees  = effective rent × managementRate/100
capex reserve    = gross rent × capexRate/100
NOI              = effective rent − management fees − fixed costs − propertyTax/12
net income       = NOI − capex reserve
cashflow         = net income − mortgage payment
```

## Purchase and loan

| Term | Definition |
|---|---|
| Total investment | `price + closing costs + renovation` |
| Property base value | `price + renovation`. Closing costs are not part of the property's value, so they never count as equity in it |
| Down payment | `total investment − loan`. Negative if the loan exceeds the total cost |
| Monthly payment | Standard annuity `P·r / (1 − (1+r)^−n)`, `r` monthly. Excludes mortgage insurance |
| Amortization | Simulated month by month. The final scheduled payment absorbs any residual balance, since the displayed payment is rounded |

## Ratios

| Indicator | Formula | Denominator basis |
|---|---|---|
| Gross yield | `annual gross rent / total investment × 100` | Total cost |
| Net yield | `annual net income / total investment × 100` | Total cost |
| Cap rate | `annual NOI / (price + renovation) × 100` | Property value |
| Cash-on-cash | `annual cashflow / down payment × 100` | Cash invested |
| DSCR | `monthly NOI / monthly mortgage payment` | — |
| LTV | `loan / price × 100` | Price only |
| GRM | `price / annual gross rent` | Price only |
| 1% rule | `monthly rent / price × 100` | Price only |
| OER | `operating expenses / effective rent × 100` | Effective rent |
| Break-even rent | `(fixed costs + tax/12 + mortgage) / ((1−v)(1−m) − c)` | — |

**The denominators differ on purpose.** Yields are judged against what the deal actually costs
you, including fees. Cap rate is a property-level measure, so it excludes financing and fees.
LTV, GRM and the 1% rule are quoted against the headline price because that is how the market
and lenders quote them. If a user is surprised that gross yield and the 1% rule disagree, this
is why.

## Sentinel values

| Value | Meaning |
|---|---|
| `"N/A"` on cash-on-cash or exit ROI | No equity at risk: the down payment is zero or negative. The ratio is undefined, not zero |
| `"∞"` on DSCR | No mortgage. Coverage is unconstrained |
| `null` in `annualizedRoiByExitYear` | The loss would exceed the whole down payment, so no annualized rate exists. A gap, not a zero |
| `null` payback year | Cumulative cash never turns non-negative and stays there within the horizon |

## Exit scenario

```
sale price       = (price + renovation) × (1 + appreciationRate/100)^exitYear
total profit     = cumulative cashflow + sale price − remaining balance
                   (cumulative cashflow already nets off the down payment)
ROI              = total profit / down payment × 100
annualized ROI   = ((1 + total profit/down payment)^(1/exitYear) − 1) × 100
```

`annualizedRoi` is a **CAGR on the down payment, not an IRR**: it ignores when the cash arrives,
so a deal front-loading cashflow and one back-loading it score identically. The cost basis is
`price + renovation`, which excludes closing costs — so the reported `capitalGain` is larger
than the gain a French tax basis would use.

## Stress test

Three scenarios over the same horizon:

| Scenario | Vacancy | Rent growth | Expense inflation |
|---|---|---|---|
| Optimistic | halved | +1 point | unchanged |
| Base | as entered | as entered | as entered |
| Pessimistic | doubled (capped at 100%) | 0% | +1 point |

Two limits worth stating when it matters: vacancy is stressed multiplicatively, so a deal
entered with `vacancyRate: 0` gets an identical stress test on its main lever; and neither the
interest rate nor the appreciation rate is stressed here. `compute_stress_test` also returns a
`rateSensitivity` grid (bank rate ±2 points) — use that for rate risk.

## Deal profile scores

Four axes scored 0–100 by piecewise interpolation, floor 10:

| Axis | Thresholds (worst → best) |
|---|---|
| DSCR | 0.8, 1.0, 1.25, 1.5 |
| Cash-on-cash | 0%, 4%, 8%, 12% |
| Net yield | 1%, 3%, 5%, 7% |
| GRM (lower is better) | 10, 15, 20, 25 |

Treat the composite as indicative only: the four axes are correlated. Net yield and GRM are
near-reciprocals of the same rent-over-price signal, and DSCR and cash-on-cash are both driven
by the mortgage, so a rent/price problem is counted twice. Quote the individual ratings from
`compute_metrics` in preference to the radar score.
