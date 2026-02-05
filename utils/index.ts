export const getTotalMortgageInterest = (
  loanAmount: string | number,
  loanDurationYears: string | number,
  monthlyPayment: string | number,
  decimal = 0
): string => {
  const months = Number(loanDurationYears) * 12;
  const principalOnly = Number(loanAmount) / months;
  const interestOnly = Number(monthlyPayment) - principalOnly;
  const totalInterest = interestOnly * months;
  return isNaN(totalInterest) ? "0" : totalInterest.toFixed(decimal);
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
