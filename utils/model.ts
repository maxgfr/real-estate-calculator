/**
 * Shared calculation kernel.
 *
 * Every projection in the app — the summary panel, the 18 charts, the exit
 * scenario, the stress test — is built from the primitives in this file. They
 * used to be copy-pasted a dozen times across `utils/`, `pages/` and
 * `components/`; keeping them here means a correction lands everywhere at once.
 *
 * No UI imports: this module must stay loadable by a plain Node process (the
 * MCP server imports it directly).
 *
 * Conventions, applied uniformly:
 * - Management fees are a % of **effective** rent (what you actually collect).
 * - CapEx reserve is a % of **gross** rent.
 * - CapEx is a capital reserve, not an operating expense, so it is excluded
 *   from NOI (and therefore from cap rate, DSCR and OER) but deducted from
 *   cashflow.
 * - Year 1 uses the base values; year `y` escalates by `(1 + rate)^(y-1)`.
 */

// --- Horizon ---

/** Years shown beyond loan repayment, to reveal the post-loan recovery. */
export const PROJECTION_EXTRA_YEARS = 10;
/** Hard cap on any projection, whatever the loan term. */
export const MAX_PROJECTION_HORIZON = 40;

export function projectionHorizon(loanPeriod: number): number {
  return Math.min(loanPeriod + PROJECTION_EXTRA_YEARS, MAX_PROJECTION_HORIZON);
}

/** Value of `base` in year `year` (1-based) after compounding `rate` % a year. */
export function escalate(base: number, rate: number, year: number): number {
  return base * Math.pow(1 + rate / 100, year - 1);
}

// --- Operating income ---

export type OperatingInputs = {
  monthlyRent: number;
  monthlyCosts: number;
  annualPropertyTax: number;
  /** % of the year the unit sits empty. */
  vacancyRate: number;
  /** % of effective rent paid to a property manager. */
  managementRate: number;
  /** % of gross rent set aside for capital expenditure. */
  capexRate: number;
};

export type EscalationRates = {
  rentIncreaseRate: number;
  expenseInflationRate: number;
};

export type IncomeBreakdown = {
  grossRent: number;
  vacancyLoss: number;
  effectiveRent: number;
  managementFees: number;
  capex: number;
  fixedCosts: number;
  monthlyPropertyTax: number;
  /** Effective rent less every operating expense and the CapEx reserve. Excludes debt service. */
  netIncome: number;
  /** Net operating income: like `netIncome` but without the CapEx reserve. Excludes debt service. */
  noi: number;
};

/** One month of operating economics, at the rent and cost levels given. */
export function monthlyIncomeBreakdown(i: OperatingInputs): IncomeBreakdown {
  const grossRent = i.monthlyRent;
  const effectiveRent = grossRent * (1 - i.vacancyRate / 100);
  const managementFees = effectiveRent * (i.managementRate / 100);
  const capex = grossRent * (i.capexRate / 100);
  const fixedCosts = i.monthlyCosts;
  const monthlyPropertyTax = i.annualPropertyTax / 12;

  return {
    grossRent,
    vacancyLoss: grossRent - effectiveRent,
    effectiveRent,
    managementFees,
    capex,
    fixedCosts,
    monthlyPropertyTax,
    netIncome: effectiveRent - managementFees - capex - fixedCosts - monthlyPropertyTax,
    noi: effectiveRent - managementFees - fixedCosts - monthlyPropertyTax,
  };
}

/** `monthlyIncomeBreakdown` for year `year`, with rent growth and expense inflation applied. */
export function yearIncome(
  base: OperatingInputs,
  rates: EscalationRates,
  year: number
): IncomeBreakdown {
  return monthlyIncomeBreakdown({
    monthlyRent: escalate(base.monthlyRent, rates.rentIncreaseRate, year),
    monthlyCosts: escalate(base.monthlyCosts, rates.expenseInflationRate, year),
    annualPropertyTax: escalate(base.annualPropertyTax, rates.expenseInflationRate, year),
    vacancyRate: base.vacancyRate,
    managementRate: base.managementRate,
    capexRate: base.capexRate,
  });
}

export type YearCashflow = {
  year: number;
  income: IncomeBreakdown;
  /** Debt service for the year — zero once the loan is repaid. */
  monthlyMortgage: number;
  annualCashflow: number;
};

/**
 * Net cash produced in year `year`. The single definition of an operating year:
 * every cumulative-cashflow, break-even and total-return series is a sum of these.
 */
export function yearCashflow(
  base: OperatingInputs,
  rates: EscalationRates,
  year: number,
  monthlyMortgage: number,
  loanPeriod: number
): YearCashflow {
  const income = yearIncome(base, rates, year);
  const mortgage = year <= loanPeriod ? monthlyMortgage : 0;
  return {
    year,
    income,
    monthlyMortgage: mortgage,
    annualCashflow: (income.netIncome - mortgage) * 12,
  };
}

// --- Amortization ---

export type AmortizationYear = {
  year: number;
  /** Balance owed at the start of the year. */
  openingBalance: number;
  /** Interest paid during the year. */
  interest: number;
  /** Principal repaid during the year. */
  principal: number;
  /** Balance owed at the end of the year. */
  closingBalance: number;
};

/**
 * Month-by-month amortization, aggregated per year.
 *
 * The monthly payment is computed at full precision but callers may pass a
 * rounded one, so the final scheduled month absorbs whatever balance is left
 * (balloon adjustment). Rows past `termYears` are all-zero, which lets callers
 * project past loan repayment without a special case.
 */
export function amortizationSchedule(
  loanAmount: number,
  annualRate: number,
  termYears: number,
  monthlyPayment: number,
  horizonYears: number = termYears
): AmortizationYear[] {
  const rows: AmortizationYear[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const lastYear = Math.max(0, Math.floor(horizonYears));

  let balance = loanAmount;

  for (let year = 1; year <= lastYear; year++) {
    const openingBalance = balance;
    let interest = 0;
    let principal = 0;

    for (let month = 0; month < 12; month++) {
      if (balance <= 0) break;
      const monthInterest = balance * monthlyRate;
      const isFinalScheduledPayment = year === termYears && month === 11;
      const scheduledPrincipal = Math.min(monthlyPayment - monthInterest, balance);
      const monthPrincipal = isFinalScheduledPayment ? balance : scheduledPrincipal;
      balance = Math.max(0, balance - monthPrincipal);
      interest += monthInterest;
      principal += monthPrincipal;
    }

    rows.push({ year, openingBalance, interest, principal, closingBalance: balance });
  }

  return rows;
}

/** Balance still owed after `years` full years of payments. */
export function remainingBalanceAfter(
  loanAmount: number,
  annualRate: number,
  termYears: number,
  monthlyPayment: number,
  years: number
): number {
  const schedule = amortizationSchedule(
    loanAmount,
    annualRate,
    termYears,
    monthlyPayment,
    Math.min(years, termYears)
  );
  return schedule.length === 0 ? loanAmount : schedule[schedule.length - 1].closingBalance;
}

// --- Break-even ---

/**
 * First year in which cumulative cash turns non-negative, or `null` if it never
 * does. `cumulative[i]` is the running cash position at end of year `i`
 * (index 0 = year 0, i.e. minus the down payment).
 *
 * Takes unrounded values on purpose: scanning a rounded series reports
 * break-even a year early whenever the true cumulative is a small negative.
 */
export function firstBreakevenYear(cumulative: number[]): number | null {
  for (let i = 1; i < cumulative.length; i++) {
    if (cumulative[i - 1] < 0 && cumulative[i] >= 0) return i;
  }
  return null;
}
