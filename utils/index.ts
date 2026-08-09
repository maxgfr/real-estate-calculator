import {
  firstBreakevenYear,
  projectionHorizon,
  remainingBalanceAfter,
  yearCashflow,
  yearIncome,
  type EscalationRates,
  type OperatingInputs,
} from "./model.ts";

export const getTotalMortgageInterest = (
  loanAmount: string | number,
  loanDurationYears: string | number,
  interestRate: string | number,
  decimal = 0
): string => {
  const P = Number(loanAmount);
  const n = Number(loanDurationYears) * 12;
  const r = Number(interestRate) / 100 / 12;

  if (r === 0 || P <= 0 || n <= 0) return "0";

  const exactPayment = (P * r) / (1 - Math.pow(1 + r, -n));
  const totalInterest = exactPayment * n - P;

  return isNaN(totalInterest) || totalInterest < 0 ? "0" : totalInterest.toFixed(decimal);
};

export const getMonthlyMortgagePayment = (
  loanAmount: string | number,
  interestRate: string | number,
  loanDurationYears: string | number,
  decimal = 0
): string => {
  const months = Number(loanDurationYears) * 12;
  const monthlyRate = Number(interestRate) / 100 / 12;

  if (monthlyRate === 0) {
    const payment = Number(loanAmount) / months;
    return isNaN(payment) || !isFinite(payment) ? "0" : payment.toFixed(decimal);
  }

  const payment =
    (Number(loanAmount) * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months));
  return isNaN(payment) || !isFinite(payment)
    ? "0"
    : payment.toFixed(decimal);
};

export const getTotalMortgageCost = (
  loanAmount: string | number,
  totalInterest: string | number,
  decimal = 0
): string => {
  const total = Number(loanAmount) + Number(totalInterest);
  return isNaN(total) ? "0" : total.toFixed(decimal);
};

/**
 * Convert a management fee value into its monthly-percent equivalent.
 *
 * - unit = "percent": value is already a percent of monthly rent (used as-is).
 * - unit = "monthsPerYear": value is the number of months of rent paid per year.
 *   Equivalent monthly percent = (value × 100) / 12. (1 month/year = 8.33%/mo.)
 *
 * Returns 0 for invalid / negative inputs so downstream calculations stay safe.
 */
export type ManagementRateUnit = "percent" | "monthsPerYear";

export const getEffectiveManagementRatePercent = (
  managementRate: string | number,
  unit: ManagementRateUnit | string = "percent"
): number => {
  const v = Number(managementRate);
  if (!isFinite(v) || v < 0) return 0;
  if (unit === "monthsPerYear") return (v * 100) / 12;
  return v;
};

export const getTotalPurchasePrice = (
  propertyPrice: string | number,
  notaryFees: string | number,
  renovationCosts: string | number,
  decimal = 0
): string => {
  const total =
    Number(propertyPrice) + Number(notaryFees) + Number(renovationCosts);
  return isNaN(total) ? "0" : total.toFixed(decimal);
};

export const getYield = (
  annualRevenue: string | number,
  totalCost: string | number,
  decimal = 2
): string => {
  const yieldPercentage = (Number(annualRevenue) / Number(totalCost)) * 100;
  return isNaN(yieldPercentage) || !isFinite(yieldPercentage)
    ? "0"
    : yieldPercentage.toFixed(decimal);
};

export const getDownPayment = (
  loanAmount: string | number,
  totalCost: string | number
): string => {
  const downPayment = Number(totalCost) - Number(loanAmount);
  return isNaN(downPayment) ? "0" : downPayment.toFixed(0);
};

export const getTotalOperationCost = (
  totalInvestment: string | number,
  totalInterest: string | number,
  decimal = 0
): string => {
  const total = Number(totalInvestment) + Number(totalInterest);
  return isNaN(total) ? '0' : total.toFixed(decimal);
};

export const getCashOnCash = (
  annualCashflow: string | number,
  downPayment: string | number,
  decimal = 1
): string => {
  const dp = Number(downPayment);
  // A non-positive down payment means no equity at risk (or a loan exceeding
  // the total cost). Dividing by it inverts the sign of the return.
  if (dp <= 0) return 'N/A';
  const pct = (Number(annualCashflow) / dp) * 100;
  return isNaN(pct) || !isFinite(pct) ? '0' : pct.toFixed(decimal);
};

export const getBreakEvenRent = (
  monthlyCosts: string | number,
  annualPropertyTax: string | number,
  monthlyMortgage: string | number,
  vacancyRatePercent: string | number,
  managementRatePercent: string | number = 0,
  capexRatePercent: string | number = 0,
  decimal = 0
): string => {
  const vacancyFactor = 1 - Number(vacancyRatePercent) / 100;
  const mgmtFactor = 1 - Number(managementRatePercent) / 100;
  const capexFactor = Number(capexRatePercent) / 100;
  const denominator = vacancyFactor * mgmtFactor - capexFactor;
  if (denominator <= 0) return '0';
  const rent =
    (Number(monthlyCosts) +
      Number(annualPropertyTax) / 12 +
      Number(monthlyMortgage)) /
    denominator;
  return isNaN(rent) ? '0' : rent.toFixed(decimal);
};

export const getLTV = (
  loanAmount: string | number,
  purchasePrice: string | number,
  decimal = 1
): string => {
  const ltv = (Number(loanAmount) / Number(purchasePrice)) * 100;
  return isNaN(ltv) || !isFinite(ltv) ? '0' : ltv.toFixed(decimal);
};

export const getDSCR = (
  netMonthlyIncome: string | number,
  monthlyMortgage: string | number,
  decimal = 2
): string => {
  const mortgage = Number(monthlyMortgage);
  if (mortgage === 0) return '∞';
  const dscr = Number(netMonthlyIncome) / mortgage;
  return isNaN(dscr) || !isFinite(dscr) ? '0' : dscr.toFixed(decimal);
};

export const getGRM = (
  purchasePrice: string | number,
  annualGrossRent: string | number,
  decimal = 1
): string => {
  const rent = Number(annualGrossRent);
  if (rent === 0) return '0';
  const grm = Number(purchasePrice) / rent;
  return isNaN(grm) || !isFinite(grm) ? '0' : grm.toFixed(decimal);
};

export const getCapRate = (
  netOperatingIncome: string | number,
  propertyValue: string | number,
  decimal = 2
): string => {
  const value = Number(propertyValue);
  if (value === 0) return '0';
  const capRate = (Number(netOperatingIncome) / value) * 100;
  return isNaN(capRate) || !isFinite(capRate) ? '0' : capRate.toFixed(decimal);
};

export const getOnePercentRule = (
  monthlyRent: string | number,
  purchasePrice: string | number,
  decimal = 2
): string => {
  const price = Number(purchasePrice);
  if (price === 0) return '0';
  const ratio = (Number(monthlyRent) / price) * 100;
  return isNaN(ratio) || !isFinite(ratio) ? '0' : ratio.toFixed(decimal);
};

export const getOER = (
  monthlyExpenses: string | number,
  monthlyGrossIncome: string | number,
  decimal = 1
): string => {
  const income = Number(monthlyGrossIncome);
  if (income === 0) return '0';
  const oer = (Number(monthlyExpenses) / income) * 100;
  return isNaN(oer) || !isFinite(oer) ? '0' : oer.toFixed(decimal);
};

// --- Exit scenario ---

export type ExitScenarioResult = {
  salePrice: number;
  remainingBalance: number;
  capitalGain: number;
  cumulativeCashflow: number;
  equityPaid: number;
  totalProfit: number;
  roi: string;
  annualizedRoi: string;
};

export function computeExitScenario(
  exitYear: number,
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
): ExitScenarioResult | null {
  if (exitYear <= 0 || loanAmount < 0) return null;

  const baseValue = housingPrice + houseWorks;
  const salePrice = Math.round(baseValue * Math.pow(1 + appreciationRate / 100, exitYear));
  const capitalGain = salePrice - baseValue;

  const remainingBalance = Math.round(
    remainingBalanceAfter(loanAmount, bankRate, bankLoanPeriod, monthlyMortgage, exitYear)
  );
  const equityPaid = loanAmount - remainingBalance;

  const base: OperatingInputs = {
    monthlyRent, monthlyCosts, annualPropertyTax, vacancyRate, managementRate, capexRate,
  };
  const rates: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  let cumulativeCF = -downPayment;
  for (let y = 1; y <= exitYear; y++) {
    cumulativeCF += yearCashflow(base, rates, y, monthlyMortgage, bankLoanPeriod).annualCashflow;
  }
  const cumulativeCashflow = Math.round(cumulativeCF);

  // Total profit = cashflow + sale price - remaining debt
  const totalProfit = cumulativeCashflow + salePrice - remainingBalance;

  // Returns are expressed against the equity actually put in. With a
  // non-positive down payment (loan >= total cost) there is none, and dividing
  // by it silently flips the sign of every figure below.
  const dp = downPayment;
  const roi = dp <= 0 ? 'N/A' : ((totalProfit / dp) * 100).toFixed(1);
  const annualizedRoi = dp <= 0 || exitYear === 0
    ? 'N/A'
    : totalProfit / dp <= -1
      ? 'N/A'
      : ((Math.pow(1 + totalProfit / dp, 1 / exitYear) - 1) * 100).toFixed(1);

  return {
    salePrice,
    remainingBalance,
    capitalGain,
    cumulativeCashflow,
    equityPaid,
    totalProfit,
    roi,
    annualizedRoi,
  };
}

// --- Stress test scenarios ---

export type StressScenarioResult = {
  label: string;
  cashflowY1: number;
  cashflowY10: number;
  dscr: string;
  breakevenYear: number | null;
  totalReturn: number;
  annualData: { year: number; cashflow: number }[];
};

export function computeStressScenarios(
  monthlyRent: number,
  monthlyCosts: number,
  annualPropertyTax: number,
  vacancyRate: number,
  monthlyMortgage: number,
  rentIncreaseRate: number,
  loanPeriod: number,
  expenseInflationRate: number,
  managementRate: number,
  capexRate: number,
  downPayment: number,
  propertyBaseValue: number,
  appreciationRate: number
): StressScenarioResult[] {
  const scenarios = [
    { label: "Optimistic", vacancy: vacancyRate * 0.5, rentInc: rentIncreaseRate + 1, expInf: expenseInflationRate },
    { label: "Base", vacancy: vacancyRate, rentInc: rentIncreaseRate, expInf: expenseInflationRate },
    { label: "Pessimistic", vacancy: Math.min(vacancyRate * 2, 100), rentInc: 0, expInf: expenseInflationRate + 1 },
  ];

  return scenarios.map((s) => {
    const base: OperatingInputs = {
      monthlyRent, monthlyCosts, annualPropertyTax,
      vacancyRate: s.vacancy, managementRate, capexRate,
    };
    const rates: EscalationRates = {
      rentIncreaseRate: s.rentInc,
      expenseInflationRate: s.expInf,
    };

    const annualData: { year: number; cashflow: number }[] = [];
    const cumulative: number[] = [-downPayment];

    for (let y = 1; y <= projectionHorizon(loanPeriod); y++) {
      const { annualCashflow } = yearCashflow(base, rates, y, monthlyMortgage, loanPeriod);
      annualData.push({ year: y, cashflow: Math.round(annualCashflow) });
      cumulative.push(cumulative[cumulative.length - 1] + annualCashflow);
    }
    const breakevenYear = firstBreakevenYear(cumulative);

    // DSCR for year 1, on NOI (CapEx is a reserve, not an operating expense)
    const noi1 = yearIncome(base, rates, 1).noi;
    const dscrVal = monthlyMortgage === 0 ? '∞' : (noi1 / monthlyMortgage).toFixed(2);

    // Total return at loan end
    const propValue = propertyBaseValue * Math.pow(1 + appreciationRate / 100, loanPeriod);
    let cumAtLoanEnd = -downPayment;
    for (let y = 1; y <= loanPeriod; y++) {
      cumAtLoanEnd += yearCashflow(base, rates, y, monthlyMortgage, loanPeriod).annualCashflow;
    }
    const totalReturn = Math.round(propValue + cumAtLoanEnd);

    return {
      label: s.label,
      cashflowY1: annualData.length >= 1 ? annualData[0].cashflow : 0,
      cashflowY10: annualData.length >= 10 ? annualData[9].cashflow : 0,
      dscr: dscrVal,
      breakevenYear,
      totalReturn,
      annualData,
    };
  });
}

// --- Deal profile scoring ---

export function computeDealProfileScores(
  dscr: number,
  cashOnCash: number,
  netYield: number,
  grm: number
): { metric: string; score: number; fullMark: number }[] {
  // `thresholds` is always given worst-to-best for ascending metrics and
  // best-to-worst for descending ones — i.e. always sorted ascending. Do not
  // reverse it: both branches below already read it in that order.
  function score(value: number, thresholds: [number, number, number, number], ascending = true): number {
    const [t1, t2, t3, t4] = thresholds;
    if (!isFinite(value)) return value === Infinity ? (ascending ? 100 : 10) : 10;
    if (ascending) {
      if (value >= t4) return 100;
      if (value >= t3) return 70 + 30 * (value - t3) / (t4 - t3);
      if (value >= t2) return 40 + 30 * (value - t2) / (t3 - t2);
      if (value >= t1) return 10 + 30 * (value - t1) / (t2 - t1);
      return 10;
    }
    // Descending (lower is better)
    if (value <= t1) return 100;
    if (value <= t2) return 70 + 30 * (t2 - value) / (t2 - t1);
    if (value <= t3) return 40 + 30 * (t3 - value) / (t3 - t2);
    if (value <= t4) return 10 + 30 * (t4 - value) / (t4 - t3);
    return 10;
  }

  // An infinite DSCR means no mortgage at all, which is the best possible case.
  // A NaN one means the income is undefined — that must not read as perfect.
  const dscrScore = Math.round(score(dscr, [0.8, 1.0, 1.25, 1.5], true));
  const cocScore = Math.round(score(cashOnCash, [0, 4, 8, 12], true));
  const nyScore = Math.round(score(netYield, [1, 3, 5, 7], true));
  const grmScore = Math.round(score(grm, [10, 15, 20, 25], false));

  return [
    { metric: "DSCR", score: dscrScore, fullMark: 100 },
    { metric: "Cash-on-Cash", score: cocScore, fullMark: 100 },
    { metric: "Net Yield", score: nyScore, fullMark: 100 },
    { metric: "GRM", score: grmScore, fullMark: 100 },
  ];
}
