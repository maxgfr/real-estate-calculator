export const getTotalMortgageInterest = (
  loanAmount: string | number,
  loanDurationYears: string | number,
  monthlyPayment: string | number,
  decimal = 0
): string => {
  const months = Number(loanDurationYears) * 12;
  const totalInterest = Number(monthlyPayment) * months - Number(loanAmount);
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
  if (dp === 0) return '0';
  const pct = (Number(annualCashflow) / dp) * 100;
  return isNaN(pct) || !isFinite(pct) ? '0' : pct.toFixed(decimal);
};

export const getBreakEvenRent = (
  monthlyCosts: string | number,
  annualPropertyTax: string | number,
  monthlyMortgage: string | number,
  vacancyRatePercent: string | number,
  decimal = 0
): string => {
  const denominator = 1 - Number(vacancyRatePercent) / 100;
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
  if (mortgage === 0) return '0';
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
