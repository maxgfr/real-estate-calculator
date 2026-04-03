import type { ExitScenarioResult, StressScenarioResult } from "./index";

// --- Types ---

export type ExportInputs = {
  housingPrice: number;
  notaryFees: number;
  houseWorks: number;
  bankLoan: number;
  bankRate: number;
  bankLoanPeriod: number;
  rent: number;
  propertyTax: number;
  monthlyCosts: number;
  managementRate: number;
  vacancyRate: number;
  appreciationRate: number;
  rentIncreaseRate: number;
  expenseInflationRate: number;
  capexRate: number;
  exitYear: number;
};

export type ExportMetrics = {
  totalPrice: number;
  downPayment: number;
  ltv: string;
  monthlyMortgagePayment: number;
  totalMortgageCost: number;
  totalMortgageInterest: number;
  totalOperationCost: number;
  netMonthlyIncome: number;
  cashflow: number;
  breakEvenRent: number;
  grossYield: string;
  netYield: string;
  cashOnCash: string;
  dscr: string;
  grm: string;
  capRate: string;
  onePercentRule: string;
  oer: string;
};

export type ExportProjections = {
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

// --- Sheet data types ---

export type SheetData = (string | number)[][];

export type ExportSheets = {
  purchase: SheetData;
  mortgage: SheetData;
  rental: SheetData;
  results: SheetData;
};

// --- Labels that must be present in the export (contract) ---

export const PURCHASE_LABELS = [
  "Purchase price",
  "Closing costs",
  "Renovation budget",
  "Total",
] as const;

export const MORTGAGE_LABELS = [
  "Loan amount",
  "Interest rate",
  "Duration",
  "Monthly payment",
  "Total credit cost",
  "Total interest",
] as const;

export const RENTAL_LABELS = [
  "Gross rent",
  "Vacancy rate",
  "Effective rent (after vacancy)",
  "Monthly fixed costs (charges, insurance, maintenance)",
  "Management fees (% of rent)",
  "Property tax",
  "Expense inflation rate",
  "CapEx reserve (% of gross rent)",
  "Net monthly income",
] as const;

export const RESULTS_LABELS = [
  // Investment
  "Total investment cost",
  "Down payment",
  "LTV (Loan-to-Value)",
  // Credit
  "Monthly mortgage payment",
  "Total interest paid",
  "Total operation cost",
  // Rental
  "Net monthly income (all-in)",
  "Monthly cashflow",
  "Annual cashflow",
  "Break-even rent",
  // Performance
  "Gross yield",
  "Net yield",
  "Cash-on-cash return",
  "DSCR",
  "GRM",
  "Cap Rate",
  "1% Rule",
  "OER",
  // Projections
  "Property value at loan end",
  "Monthly rent at loan end",
  "Cashflow after loan (monthly)",
  "Cumulative cashflow",
  "Total return",
  "Breakeven year",
  // Exit scenario
  "Sale price",
  "Capital gain",
  "Remaining balance",
  "Total profit",
  "ROI",
  "Annualized ROI",
] as const;

export const STRESS_TEST_LABELS = [
  "Cashflow Y1",
  "Cashflow Y10",
  "DSCR",
  "Breakeven",
  "Total return",
] as const;

// --- Builder ---

export function buildExportSheets(
  inputs: ExportInputs,
  metrics: ExportMetrics,
  projections: ExportProjections,
  exitScenario: ExitScenarioResult | null,
  stressScenarios: StressScenarioResult[]
): ExportSheets {
  const effectiveRent = inputs.rent * (1 - inputs.vacancyRate / 100);

  const purchase: SheetData = [
    ["Item", "Amount"],
    ["Purchase price", inputs.housingPrice],
    ["Closing costs", inputs.notaryFees],
    ["Renovation budget", inputs.houseWorks],
    ["Total", metrics.totalPrice],
  ];

  const mortgage: SheetData = [
    ["Item", "Amount", "Note"],
    ["Loan amount", inputs.bankLoan, ""],
    ["Interest rate", `${inputs.bankRate.toFixed(2)} %`, "Annual"],
    ["Duration", inputs.bankLoanPeriod, "Years"],
    ["Monthly payment", metrics.monthlyMortgagePayment, ""],
    ["Total credit cost", metrics.totalMortgageCost, ""],
    ["Total interest", metrics.totalMortgageInterest, ""],
  ];

  const rental: SheetData = [
    ["Item", "Amount (Monthly)", "Amount (Annual)"],
    ["Gross rent", inputs.rent, inputs.rent * 12],
    ["Vacancy rate", `${inputs.vacancyRate} %`, ""],
    ["Effective rent (after vacancy)", effectiveRent, effectiveRent * 12],
    ["Monthly fixed costs (charges, insurance, maintenance)", inputs.monthlyCosts, inputs.monthlyCosts * 12],
    ["Management fees (% of rent)", `${inputs.managementRate} %`, ""],
    ["Property tax", inputs.propertyTax / 12, inputs.propertyTax],
    ["Expense inflation rate", `${inputs.expenseInflationRate} %`, "Annual"],
    ["CapEx reserve (% of gross rent)", `${inputs.capexRate} %`, ""],
    ["Net monthly income", metrics.netMonthlyIncome, metrics.netMonthlyIncome * 12],
  ];

  const results: SheetData = [
    ["Metric", "Value", "Note"],
    ["Total investment cost", metrics.totalPrice, ""],
    ["Down payment", metrics.downPayment, ""],
    ["LTV (Loan-to-Value)", `${metrics.ltv} %`, "Loan / Purchase price"],
    ["Monthly mortgage payment", metrics.monthlyMortgagePayment, ""],
    ["Net monthly income (all-in)", metrics.netMonthlyIncome, "After all expenses"],
    ["Monthly cashflow", metrics.cashflow, "Net income - Mortgage"],
    ["Annual cashflow", metrics.cashflow * 12, ""],
    ["Break-even rent", metrics.breakEvenRent, "Min rent for zero cashflow"],
    ["Gross yield", parseFloat(metrics.grossYield) / 100, "Format: decimal"],
    ["Net yield", parseFloat(metrics.netYield) / 100, "Format: decimal"],
    ["Total interest paid", metrics.totalMortgageInterest, ""],
    ["Total operation cost", metrics.totalOperationCost, "Total investment + interest"],
    ["Cash-on-cash return", metrics.cashOnCash === 'N/A' ? 'N/A' : parseFloat(metrics.cashOnCash) / 100, "Format: decimal"],
    ["DSCR", metrics.dscr === '∞' ? '∞' : Number(metrics.dscr), "Debt Service Coverage Ratio"],
    ["GRM", Number(metrics.grm), "Gross Rent Multiplier"],
    ["Appreciation rate", `${inputs.appreciationRate} %`, "Annual (property value)"],
    ["Rent increase rate", `${inputs.rentIncreaseRate} %`, "Annual"],
    ["Expense inflation rate", `${inputs.expenseInflationRate} %`, "Annual (costs + tax)"],
    ["Management fees", `${inputs.managementRate} %`, "Of effective rent"],
    ["CapEx reserve", `${inputs.capexRate} %`, "Of gross rent"],
    ["Cap Rate", metrics.capRate === '0' ? 'N/A' : `${metrics.capRate} %`, "NOI / Property value"],
    ["1% Rule", `${metrics.onePercentRule} %`, "Monthly rent / Purchase price"],
    ["OER", `${metrics.oer} %`, "Operating expenses / Income"],
    ["", "", ""],
    ["--- Projections ---", "", `At year ${projections?.period ?? inputs.bankLoanPeriod}`],
    ["Property value at loan end", projections?.propertyValue ?? 0, "Including appreciation"],
    ["Monthly rent at loan end", projections?.rentAtEnd ?? 0, "Including rent increases"],
    ["Cashflow after loan (monthly)", projections?.cashflowAfterLoan ?? 0, "Passive income, no mortgage"],
    ["Cumulative cashflow", projections?.cumulativeCashflow ?? 0, "Over full loan period"],
    ["Total return", projections?.totalReturn ?? 0, "Equity + cumulative cashflow"],
    ["Breakeven year", projections?.breakevenYear ?? "N/A", "Year cumulative cashflow turns positive"],
    ["", "", ""],
    ["--- Exit scenario ---", "", `At year ${inputs.exitYear}`],
    ["Sale price", exitScenario?.salePrice ?? 0, "With appreciation"],
    ["Capital gain", exitScenario?.capitalGain ?? 0, "Sale price - purchase - renovation"],
    ["Remaining balance", exitScenario?.remainingBalance ?? 0, "Outstanding loan"],
    ["Total profit", exitScenario?.totalProfit ?? 0, "Cashflow + sale - balance"],
    ["ROI", exitScenario?.roi ?? "N/A", ""],
    ["Annualized ROI", exitScenario?.annualizedRoi ?? "N/A", ""],
  ];

  if (stressScenarios.length === 3) {
    results.push(
      ["", "", ""],
      ["--- Stress test ---", "Optimistic", "Base", "Pessimistic"],
      ["Cashflow Y1", stressScenarios[0].cashflowY1, stressScenarios[1].cashflowY1, stressScenarios[2].cashflowY1],
      ["Cashflow Y10", stressScenarios[0].cashflowY10, stressScenarios[1].cashflowY10, stressScenarios[2].cashflowY10],
      ["DSCR", stressScenarios[0].dscr, stressScenarios[1].dscr, stressScenarios[2].dscr],
      ["Breakeven", stressScenarios[0].breakevenYear ?? "N/A", stressScenarios[1].breakevenYear ?? "N/A", stressScenarios[2].breakevenYear ?? "N/A"],
      ["Total return", stressScenarios[0].totalReturn, stressScenarios[1].totalReturn, stressScenarios[2].totalReturn],
    );
  }

  return { purchase, mortgage, rental, results };
}
