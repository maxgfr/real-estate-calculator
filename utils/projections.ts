/**
 * Chart-facing projections.
 *
 * These used to live inside `components/Charts.tsx`, which made them
 * unreachable from a plain Node process (JSX + recharts) and impossible to test
 * without exporting them one by one. They are pure functions over
 * `utils/model.ts`, so the charts, the summary panel and the MCP server all
 * read the same numbers.
 */
import {
  amortizationSchedule,
  monthlyIncomeBreakdown,
  projectionHorizon,
  yearCashflow,
  yearIncome,
  escalate,
  type EscalationRates,
  type OperatingInputs,
} from "./model.ts";
import { computeExitScenario, getMonthlyMortgagePayment } from "./index.ts";

// --- Loan ---

export function computeAmortization(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number
) {
  const data: { year: number; balance: number; interest: number; principal: number }[] = [];
  if (loanAmount <= 0 || years <= 0 || monthlyPayment <= 0) return data;

  data.push({ year: 0, balance: Math.round(loanAmount), interest: 0, principal: 0 });

  let cumInterest = 0;
  let cumPrincipal = 0;
  for (const row of amortizationSchedule(loanAmount, annualRate, years, monthlyPayment)) {
    cumInterest += row.interest;
    cumPrincipal += row.principal;
    data.push({
      year: row.year,
      balance: Math.round(row.closingBalance),
      interest: Math.round(cumInterest),
      principal: Math.round(cumPrincipal),
    });
  }
  return data;
}

export function computeAnnualPrincipalVsInterest(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number
) {
  const data: { year: number; principal: number; interest: number }[] = [];
  if (loanAmount <= 0 || years <= 0 || monthlyPayment <= 0) return data;

  for (const row of amortizationSchedule(loanAmount, annualRate, years, monthlyPayment)) {
    data.push({
      year: row.year,
      principal: Math.round(row.principal),
      interest: Math.round(row.interest),
    });
  }
  return data;
}

export function computeEquityBuildUp(
  loanAmount: number,
  annualRate: number,
  years: number,
  monthlyPayment: number,
  propertyBaseValue: number,
  appreciationRate: number
) {
  const data: { year: number; paidEquity: number; appreciation: number }[] = [];
  if (years <= 0 || propertyBaseValue <= 0) return data;

  const schedule = amortizationSchedule(loanAmount, annualRate, years, monthlyPayment);

  for (let y = 0; y <= years; y++) {
    const balance = y === 0 ? loanAmount : schedule[y - 1].closingBalance;
    const propertyValue = propertyBaseValue * Math.pow(1 + appreciationRate / 100, y);

    data.push({
      year: y,
      paidEquity: Math.round(Math.max(0, propertyBaseValue - balance)),
      appreciation: Math.round(Math.max(0, propertyValue - propertyBaseValue)),
    });
  }
  return data;
}

// --- Cashflow ---

export function computeCumulativeCashflow(
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cumulative: number }[] = [];
  if (loanPeriod <= 0) return data;

  const base: OperatingInputs = { monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  let cumulative = -downPayment;
  data.push({ year: 0, cumulative: Math.round(cumulative) });

  for (let y = 1; y <= projectionHorizon(loanPeriod); y++) {
    cumulative += yearCashflow(base, rates, y, monthlyMortgage, loanPeriod).annualCashflow;
    data.push({ year: y, cumulative: Math.round(cumulative) });
  }
  return data;
}

export function computeAnnualCashflow(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cashflow: number }[] = [];
  if (loanPeriod <= 0) return data;

  const base: OperatingInputs = { monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  for (let y = 1; y <= projectionHorizon(loanPeriod); y++) {
    data.push({
      year: y,
      cashflow: Math.round(yearCashflow(base, rates, y, monthlyMortgage, loanPeriod).annualCashflow),
    });
  }
  return data;
}

export function computeIncomeVsExpenses(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; income: number; totalExpenses: number }[] = [];
  if (loanPeriod <= 0) return data;

  const base: OperatingInputs = { monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  for (let y = 1; y <= projectionHorizon(loanPeriod); y++) {
    const { income, monthlyMortgage: mortgage } = yearCashflow(base, rates, y, monthlyMortgage, loanPeriod);
    const monthlyExpenses =
      income.fixedCosts + income.managementFees + income.capex + income.monthlyPropertyTax + mortgage;
    data.push({
      year: y,
      income: Math.round(income.effectiveRent * 12),
      totalExpenses: Math.round(monthlyExpenses * 12),
    });
  }
  return data;
}

export function computeExpenseDecomposition(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: {
    year: number; fixedCosts: number; propertyTax: number;
    managementFees: number; capex: number; income: number;
  }[] = [];
  if (loanPeriod <= 0) return data;

  const base: OperatingInputs = { monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  for (let y = 1; y <= projectionHorizon(loanPeriod); y++) {
    const income = yearIncome(base, rates, y);
    data.push({
      year: y,
      fixedCosts: Math.round(income.fixedCosts * 12),
      propertyTax: Math.round(escalate(annualPropertyTax, expenseInflationRate, y)),
      managementFees: Math.round(income.managementFees * 12),
      capex: Math.round(income.capex * 12),
      income: Math.round(income.effectiveRent * 12),
    });
  }
  return data;
}

// --- Wealth ---

export function computeTotalReturn(
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  loanAmount: number,
  annualRate: number,
  propertyBaseValue: number,
  appreciationRate: number,
  expenseInflationRate: number = 0,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { year: number; cumulativeCashflow: number; equity: number; totalReturn: number }[] = [];
  if (loanPeriod <= 0) return data;

  const horizon = projectionHorizon(loanPeriod);
  const base: OperatingInputs = { monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };
  const schedule = amortizationSchedule(loanAmount, annualRate, loanPeriod, monthlyMortgage, horizon);

  let cumulativeCF = -downPayment;

  for (let y = 0; y <= horizon; y++) {
    if (y > 0) cumulativeCF += yearCashflow(base, rates, y, monthlyMortgage, loanPeriod).annualCashflow;

    const balance = y === 0 ? loanAmount : schedule[y - 1].closingBalance;
    const equity = propertyBaseValue * Math.pow(1 + appreciationRate / 100, y) - balance;

    data.push({
      year: y,
      cumulativeCashflow: Math.round(cumulativeCF),
      equity: Math.round(Math.max(0, equity)),
      totalReturn: Math.round(cumulativeCF + Math.max(0, equity)),
    });
  }
  return data;
}

export function computeROIByExitYear(
  housingPrice: number,
  houseWorks: number,
  appreciationRate: number,
  loanAmount: number,
  bankRate: number,
  bankLoanPeriod: number,
  monthlyMortgage: number,
  downPayment: number,
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  managementRate: number,
  rentIncreaseRate: number,
  expenseInflationRate: number,
  capexRate: number = 0
) {
  const data: { year: number; roi: number }[] = [];
  if (downPayment === 0) return data;

  for (let y = 1; y <= projectionHorizon(bankLoanPeriod); y++) {
    const result = computeExitScenario(
      y, housingPrice, houseWorks, appreciationRate, loanAmount, bankRate, bankLoanPeriod,
      monthlyMortgage, downPayment, monthlyRent, monthlyCosts, annualPropertyTax,
      vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate
    );
    if (result) {
      data.push({ year: y, roi: Number(result.annualizedRoi === "N/A" ? "0" : result.annualizedRoi) });
    }
  }
  return data;
}

// --- Sensitivity ---

export function computeRentSensitivity(
  baseRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  totalPrice: number,
  managementRate: number = 0,
  capexRate: number = 0
) {
  const data: { label: string; cashflow: number; netYield: number }[] = [];
  if (baseRent <= 0 || totalPrice <= 0) return data;

  for (let pct = -20; pct <= 20; pct += 5) {
    const { netIncome } = monthlyIncomeBreakdown({
      monthlyRent: baseRent * (1 + pct / 100),
      monthlyCosts,
      annualPropertyTax,
      vacancyRate,
      managementRate,
      capexRate,
    });

    data.push({
      label: pct === 0 ? "0%" : `${pct > 0 ? "+" : ""}${pct}%`,
      cashflow: Math.round(netIncome - monthlyMortgage),
      netYield: Number((((netIncome * 12) / totalPrice) * 100).toFixed(2)),
    });
  }
  return data;
}

export function computeRateSensitivity(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  managementRate: number,
  capexRate: number,
  loanAmount: number,
  bankRate: number,
  bankLoanPeriod: number
) {
  const data: { label: string; cashflow: number; dscr: number }[] = [];
  if (loanAmount <= 0 || bankLoanPeriod <= 0) return data;

  const { netIncome } = monthlyIncomeBreakdown({
    monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate,
  });

  for (const delta of [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2]) {
    const rate = Math.max(0, bankRate + delta);
    const payment = Number(getMonthlyMortgagePayment(loanAmount, rate, bankLoanPeriod, 10));

    data.push({
      label: `${delta === 0 ? "" : delta > 0 ? "+" : ""}${delta}%`,
      cashflow: Math.round(netIncome - payment),
      dscr: Number((payment === 0 ? 0 : netIncome / payment).toFixed(2)),
    });
  }
  return data;
}

// --- Waterfall ---

export function computeWaterfallData(
  monthlyRent: number,
  vacancyRate: number,
  managementRate: number,
  capexRate: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  monthlyMortgage: number
) {
  const i = monthlyIncomeBreakdown({
    monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate,
  });

  const items: { name: string; start: number; end: number; value: number; isTotal?: boolean }[] = [];
  let running = i.grossRent;
  items.push({ name: "Gross rent", start: 0, end: i.grossRent, value: i.grossRent, isTotal: true });

  const deductions: [string, number][] = [
    ["Vacancy", i.vacancyLoss],
    ["Management", i.managementFees],
    ["CapEx", i.capex],
    ["Fixed costs", i.fixedCosts],
    ["Property tax", i.monthlyPropertyTax],
  ];
  for (const [name, amount] of deductions) {
    if (amount > 0) {
      items.push({ name, start: running - amount, end: running, value: -amount });
      running -= amount;
    }
  }

  items.push({ name: "Net income", start: 0, end: running, value: running, isTotal: true });
  if (monthlyMortgage > 0) {
    items.push({ name: "Mortgage", start: running - monthlyMortgage, end: running, value: -monthlyMortgage });
    running -= monthlyMortgage;
  }
  items.push({
    name: "Cashflow",
    start: Math.min(0, running),
    end: Math.max(0, running),
    value: running,
    isTotal: true,
  });

  // Stacked-bar encoding: an invisible base plus the visible magnitude.
  return items.map((item) => ({
    name: item.name,
    base: Math.round(Math.min(item.start, item.end)),
    value: Math.round(Math.abs(item.end - item.start)),
    rawValue: Math.round(item.value),
    isPositive: item.value >= 0,
    isTotal: item.isTotal || false,
  }));
}
