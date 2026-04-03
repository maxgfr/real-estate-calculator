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

export const getNetMonthlyIncome = (
  annualRent: string | number,
  annualCharges: string | number,
  annualPropertyTax: string | number,
  decimal = 0
): string => {
  const monthly =
    Number(annualRent) / 12 -
    Number(annualCharges) / 12 -
    Number(annualPropertyTax) / 12;
  return Number.isNaN(monthly) ? "0" : monthly.toFixed(decimal);
};

export const getNetMonthlyIncomeMixed = (
  monthlyRent: string | number,
  monthlyCharges: string | number,
  annualPropertyTax: string | number,
  decimal = 0
): string => {
  const monthly =
    Number(monthlyRent) -
    Number(monthlyCharges) -
    Number(annualPropertyTax) / 12;
  return Number.isNaN(monthly) ? "0" : monthly.toFixed(decimal);
};

/**
 * Complete net monthly income calculation including:
 * - Vacancy rate (reduces effective rent)
 * - Non-recoverable charges (building fees)
 * - Annual property tax (prorated monthly)
 * - Monthly insurance
 * - Property management fees (% of effective rent)
 * - Monthly maintenance budget
 */
export const getNetMonthlyIncomeDetailed = (
  monthlyRent: string | number,
  monthlyCharges: string | number,
  annualPropertyTax: string | number,
  monthlyInsurance: string | number,
  managementRatePercent: string | number,
  monthlyMaintenance: string | number,
  vacancyRatePercent: string | number,
  decimal = 0
): string => {
  const effectiveRent =
    Number(monthlyRent) * (1 - Number(vacancyRatePercent) / 100);
  const managementFees =
    effectiveRent * (Number(managementRatePercent) / 100);
  const monthly =
    effectiveRent -
    Number(monthlyCharges) -
    Number(annualPropertyTax) / 12 -
    Number(monthlyInsurance) -
    managementFees -
    Number(monthlyMaintenance);
  return Number.isNaN(monthly) ? "0" : monthly.toFixed(decimal);
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
  if (dp === 0) return 'N/A';
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

  // Simulate amortization to get remaining balance
  let balance = loanAmount;
  const monthlyRate = bankRate / 100 / 12;
  for (let y = 0; y < Math.min(exitYear, bankLoanPeriod); y++) {
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
      const isLastPayment = y === bankLoanPeriod - 1 && m === 11;
      const regularPrincipal = Math.min(monthlyMortgage - interest, balance);
      const principal = isLastPayment ? balance : regularPrincipal;
      balance = Math.max(0, balance - principal);
    }
  }
  const remainingBalance = Math.round(balance);
  const equityPaid = loanAmount - remainingBalance;

  // Cumulative cashflow
  let cumulativeCF = -downPayment;
  for (let y = 1; y <= exitYear; y++) {
    const rent = monthlyRent * Math.pow(1 + rentIncreaseRate / 100, y - 1);
    const effectiveRent = rent * (1 - vacancyRate / 100);
    const mgmtFees = effectiveRent * (managementRate / 100);
    const capex = rent * (capexRate / 100);
    const inflatedCosts = monthlyCosts * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const inflatedTax = annualPropertyTax * Math.pow(1 + expenseInflationRate / 100, y - 1);
    const netIncome = effectiveRent - mgmtFees - capex - inflatedCosts - inflatedTax / 12;
    const mortgage = y <= bankLoanPeriod ? monthlyMortgage : 0;
    cumulativeCF += (netIncome - mortgage) * 12;
  }
  const cumulativeCashflow = Math.round(cumulativeCF);

  // Total profit = cashflow + sale price - remaining debt
  const totalProfit = cumulativeCashflow + salePrice - remainingBalance;

  const dp = downPayment;
  const roi = dp === 0 ? 'N/A' : ((totalProfit / dp) * 100).toFixed(1);
  const annualizedRoi = dp === 0 || exitYear === 0
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
    const horizon = Math.min(loanPeriod + 10, 40);
    const annualData: { year: number; cashflow: number }[] = [];
    let cumCF = -downPayment;
    let breakevenYear: number | null = null;

    for (let y = 1; y <= horizon; y++) {
      const rent = monthlyRent * Math.pow(1 + s.rentInc / 100, y - 1);
      const effectiveRent = rent * (1 - s.vacancy / 100);
      const mgmtFees = effectiveRent * (managementRate / 100);
      const capex = rent * (capexRate / 100);
      const inflatedCosts = monthlyCosts * Math.pow(1 + s.expInf / 100, y - 1);
      const inflatedTax = annualPropertyTax * Math.pow(1 + s.expInf / 100, y - 1);
      const netIncome = effectiveRent - mgmtFees - capex - inflatedCosts - inflatedTax / 12;
      const mortgage = y <= loanPeriod ? monthlyMortgage : 0;
      const annualCashflow = (netIncome - mortgage) * 12;
      annualData.push({ year: y, cashflow: Math.round(annualCashflow) });

      const prevCum = cumCF;
      cumCF += annualCashflow;
      if (prevCum < 0 && cumCF >= 0 && breakevenYear === null) {
        breakevenYear = y;
      }
    }

    // DSCR for year 1
    const rent1 = monthlyRent;
    const eff1 = rent1 * (1 - s.vacancy / 100);
    const mgmt1 = eff1 * (managementRate / 100);
    const capex1 = rent1 * (capexRate / 100);
    const netIncome1 = eff1 - mgmt1 - capex1 - monthlyCosts - annualPropertyTax / 12;
    const dscrVal = monthlyMortgage === 0 ? '∞' : (netIncome1 / monthlyMortgage).toFixed(2);

    // Total return at loan end
    const propValue = propertyBaseValue * Math.pow(1 + appreciationRate / 100, loanPeriod);
    let cumAtLoanEnd = -downPayment;
    for (let y = 1; y <= loanPeriod; y++) {
      const rent = monthlyRent * Math.pow(1 + s.rentInc / 100, y - 1);
      const effectiveRent = rent * (1 - s.vacancy / 100);
      const mgmtFees = effectiveRent * (managementRate / 100);
      const capex = rent * (capexRate / 100);
      const inflatedCosts = monthlyCosts * Math.pow(1 + s.expInf / 100, y - 1);
      const inflatedTax = annualPropertyTax * Math.pow(1 + s.expInf / 100, y - 1);
      const netIncome = effectiveRent - mgmtFees - capex - inflatedCosts - inflatedTax / 12;
      cumAtLoanEnd += (netIncome - monthlyMortgage) * 12;
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
  function score(value: number, thresholds: [number, number, number, number], ascending = true): number {
    const [t1, t2, t3, t4] = ascending ? thresholds : [...thresholds].reverse();
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

  const dscrScore = !isFinite(dscr) ? 100 : Math.round(score(dscr, [0.8, 1.0, 1.25, 1.5], true));
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
