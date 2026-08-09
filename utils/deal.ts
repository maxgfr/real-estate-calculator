/**
 * One deal in, every indicator out.
 *
 * The page used to derive these across ~20 separate memos and the MCP server
 * would have had to reproduce the same chain. Keeping the derivation here means
 * the browser and any other consumer read the same numbers by construction.
 *
 * The model is **pre-tax**: no rental income tax, no capital gains tax on exit,
 * no mortgage insurance, no selling costs. See `MODEL_CAVEATS`.
 */
import {
  computeDealProfileScores,
  computeExitScenario,
  computeStressScenarios,
  getBreakEvenRent,
  getCapRate,
  getCashOnCash,
  getDSCR,
  getDownPayment,
  getGRM,
  getLTV,
  getMonthlyMortgagePayment,
  getOER,
  getOnePercentRule,
  getTotalMortgageCost,
  getTotalMortgageInterest,
  getTotalOperationCost,
  getTotalPurchasePrice,
  getYield,
  type ExitScenarioResult,
  type StressScenarioResult,
} from "./index.ts";
import {
  firstBreakevenYear,
  monthlyIncomeBreakdown,
  projectionHorizon,
  yearCashflow,
  type EscalationRates,
  type IncomeBreakdown,
  type OperatingInputs,
} from "./model.ts";

export type DealInputs = {
  /** Purchase price, excluding closing costs and renovation. */
  housingPrice: number;
  /** Closing costs: notary, agency commission, registration taxes. */
  notaryFees: number;
  /** Renovation budget. Added to the property's base value. */
  houseWorks: number;
  /** Annual property appreciation, %. */
  appreciationRate: number;
  /** Year of the planned sale, used by the exit scenario. */
  exitYear: number;
  bankLoan: number;
  /** Annual mortgage interest rate, %. */
  bankRate: number;
  /** Loan term, years. */
  bankLoanPeriod: number;
  /** Gross monthly rent, before vacancy and expenses. */
  rent: number;
  /** Annual property tax. */
  propertyTax: number;
  /** Monthly fixed costs: building fees, landlord insurance, upkeep. */
  monthlyCosts: number;
  /** Management fees as a % of effective rent. */
  managementRate: number;
  /** CapEx reserve as a % of gross rent. */
  capexRate: number;
  /** Share of the year the unit sits empty, %. */
  vacancyRate: number;
  /** Annual rent increase, %. */
  rentIncreaseRate: number;
  /** Annual inflation applied to fixed costs and property tax, %. */
  expenseInflationRate: number;
};

export const DEAL_DEFAULTS: DealInputs = {
  housingPrice: 150000,
  notaryFees: 12000,
  houseWorks: 0,
  appreciationRate: 1.5,
  exitYear: 25,
  bankLoan: 120000,
  bankRate: 3.5,
  bankLoanPeriod: 25,
  rent: 900,
  propertyTax: 1000,
  monthlyCosts: 120,
  managementRate: 0,
  capexRate: 3,
  vacancyRate: 5,
  rentIncreaseRate: 1.5,
  expenseInflationRate: 2,
};

/** What this model does not account for. Report these alongside any verdict. */
export const MODEL_CAVEATS = [
  "Pre-tax: no rental income tax and no regime modelling (micro-foncier, réel, LMNP); mortgage interest is never treated as deductible.",
  "No capital gains tax, holding-period allowances or social levies on the sale.",
  "No selling costs: agency commission, diagnostics, early repayment penalty.",
  "No mortgage insurance, arrangement or guarantee fees.",
  "Cumulative figures sum nominal amounts across up to 40 years; there is no discounting, so annualized ROI is a CAGR on the down payment, not an IRR — it ignores when the cash arrives.",
  "The stress test varies vacancy, rent growth and expense inflation only. Interest rate and appreciation are not stressed.",
] as const;

export type DealProjections = {
  period: number;
  propertyValue: number;
  rentAtEnd: number;
  cashflowAfterLoan: number;
  cumulativeCashflow: number;
  totalReturn: number;
  breakevenYear: number | null;
  hasAppreciation: boolean;
  hasRentIncrease: boolean;
} | null;

export type DealAnalysis = {
  totalPrice: string;
  downPayment: string;
  monthlyMortgageExact: number;
  monthlyMortgagePayment: string;
  totalMortgageInterest: string;
  totalMortgageCost: string;
  totalOperationCost: string;
  income: IncomeBreakdown;
  netMonthlyIncomeExact: number;
  netMonthlyIncome: string;
  cashflowExact: number;
  cashflow: string;
  grossYield: string;
  netYield: string;
  cashOnCash: string;
  breakEvenRent: string;
  ltv: string;
  dscr: string;
  grm: string;
  noi: string;
  capRate: string;
  onePercentRule: string;
  oer: string;
  dealScores: { metric: string; score: number; fullMark: number }[];
  projections: DealProjections;
  exitScenario: ExitScenarioResult | null;
  stressScenarios: StressScenarioResult[];
};

export function analyzeDeal(inputs: DealInputs): DealAnalysis {
  const {
    housingPrice, notaryFees, houseWorks, appreciationRate, exitYear,
    bankLoan, bankRate, bankLoanPeriod, rent, propertyTax, monthlyCosts,
    managementRate, capexRate, vacancyRate, rentIncreaseRate, expenseInflationRate,
  } = inputs;

  const totalPrice = getTotalPurchasePrice(housingPrice, notaryFees, houseWorks);
  const downPayment = getDownPayment(bankLoan, totalPrice);
  const propertyBaseValue = housingPrice + houseWorks;

  // Full precision for every calculation; the rounded string is display-only.
  const monthlyMortgageExact = Number(getMonthlyMortgagePayment(bankLoan, bankRate, bankLoanPeriod, 10));
  const totalMortgageInterest = getTotalMortgageInterest(bankLoan, bankLoanPeriod, bankRate);

  const operating: OperatingInputs = {
    monthlyRent: rent,
    monthlyCosts,
    annualPropertyTax: propertyTax,
    vacancyRate,
    managementRate,
    capexRate,
  };
  const escalation: EscalationRates = { rentIncreaseRate, expenseInflationRate };

  const income = monthlyIncomeBreakdown(operating);
  const netMonthlyIncomeExact = isNaN(income.netIncome) ? 0 : income.netIncome;
  const cashflowExact = netMonthlyIncomeExact - monthlyMortgageExact;

  const netYield = getYield(netMonthlyIncomeExact * 12, totalPrice);
  const cashOnCash = getCashOnCash(cashflowExact * 12, downPayment);
  const noi = String(income.noi * 12);
  const dscr = getDSCR(income.noi, monthlyMortgageExact);
  const grm = getGRM(housingPrice, rent * 12);

  return {
    totalPrice,
    downPayment,
    monthlyMortgageExact,
    monthlyMortgagePayment: Math.round(monthlyMortgageExact).toFixed(0),
    totalMortgageInterest,
    totalMortgageCost: getTotalMortgageCost(bankLoan, totalMortgageInterest),
    totalOperationCost: getTotalOperationCost(totalPrice, totalMortgageInterest),
    income,
    netMonthlyIncomeExact,
    netMonthlyIncome: netMonthlyIncomeExact.toFixed(0),
    cashflowExact,
    cashflow: Number.isNaN(cashflowExact) ? "0" : cashflowExact.toFixed(0),
    grossYield: getYield(rent * 12, totalPrice),
    netYield,
    cashOnCash,
    breakEvenRent: getBreakEvenRent(monthlyCosts, propertyTax, monthlyMortgageExact, vacancyRate, managementRate, capexRate),
    ltv: getLTV(bankLoan, housingPrice),
    dscr,
    grm,
    noi,
    capRate: getCapRate(noi, String(propertyBaseValue)),
    onePercentRule: getOnePercentRule(rent, housingPrice),
    oer: getOER(String(Math.max(0, income.effectiveRent - income.noi)), String(income.effectiveRent)),
    dealScores: computeDealProfileScores(
      dscr === "∞" ? Infinity : Number(dscr),
      cashOnCash === "N/A" ? 0 : Number(cashOnCash),
      Number(netYield),
      Number(grm)
    ),
    projections: computeProjections(inputs, operating, escalation, monthlyMortgageExact, Number(downPayment)),
    exitScenario: computeExitScenario(
      exitYear, housingPrice, houseWorks, appreciationRate, bankLoan, bankRate, bankLoanPeriod,
      monthlyMortgageExact, Number(downPayment), rent, monthlyCosts, propertyTax,
      vacancyRate, managementRate, rentIncreaseRate, expenseInflationRate, capexRate
    ),
    stressScenarios: computeStressScenarios(
      rent, monthlyCosts, propertyTax, vacancyRate, monthlyMortgageExact, rentIncreaseRate,
      bankLoanPeriod, expenseInflationRate, managementRate, capexRate, Number(downPayment),
      propertyBaseValue, appreciationRate
    ),
  };
}

function computeProjections(
  inputs: DealInputs,
  operating: OperatingInputs,
  escalation: EscalationRates,
  monthlyMortgage: number,
  downPayment: number
): DealProjections {
  const { bankLoanPeriod: period, appreciationRate, rentIncreaseRate, expenseInflationRate } = inputs;
  const base = inputs.housingPrice + inputs.houseWorks;
  if (period <= 0 || isNaN(base)) return null;

  const propertyValue = Math.round(base * Math.pow(1 + appreciationRate / 100, period));
  const rentAtEnd = Math.round(inputs.rent * Math.pow(1 + rentIncreaseRate / 100, period));

  // Monthly cashflow after the loan is repaid: rent has grown, costs have
  // inflated, and there is no debt service left.
  const inflator = Math.pow(1 + expenseInflationRate / 100, period);
  const cashflowAfterLoan = Math.round(
    monthlyIncomeBreakdown({
      ...operating,
      monthlyRent: rentAtEnd,
      monthlyCosts: inputs.monthlyCosts * inflator,
      annualPropertyTax: inputs.propertyTax * inflator,
    }).netIncome
  );

  // Extend past the loan to reveal the recovery year.
  const cumulative = [-downPayment];
  for (let y = 1; y <= projectionHorizon(period); y++) {
    cumulative.push(cumulative[y - 1] + yearCashflow(operating, escalation, y, monthlyMortgage, period).annualCashflow);
  }

  let cumulativeCFAtLoanEnd = -downPayment;
  for (let y = 1; y <= period; y++) {
    cumulativeCFAtLoanEnd += yearCashflow(operating, escalation, y, monthlyMortgage, period).annualCashflow;
  }

  return {
    period,
    propertyValue,
    rentAtEnd,
    cashflowAfterLoan,
    cumulativeCashflow: Math.round(cumulativeCFAtLoanEnd),
    // The loan is repaid by definition at this point, so there is no balance to net off.
    totalReturn: Math.round(propertyValue + cumulativeCFAtLoanEnd),
    breakevenYear: firstBreakevenYear(cumulative),
    hasAppreciation: appreciationRate !== 0,
    hasRentIncrease: rentIncreaseRate !== 0,
  };
}
