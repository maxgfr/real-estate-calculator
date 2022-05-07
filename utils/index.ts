export const getTotalFeesMortgage = (
  amount: string | number,
  loanDurationInYear: string | number,
  monthlyPayment: string | number,
  decimal = 0
): string => {
  const monthlyLoanDuration = Number(loanDurationInYear) * 12;
  const mounthlyWithoutFees = Number(amount) / monthlyLoanDuration;
  const monthlyFees = Number(monthlyPayment) - mounthlyWithoutFees;
  const totalFees = monthlyFees * monthlyLoanDuration;
  return isNaN(totalFees) ? "0" : totalFees.toFixed(decimal);
};

export const getMonthlyMortgagePayment = (
  amount: string | number,
  interestRate: string | number,
  loanDurationInYear: string | number,
  decimal = 0
): string => {
  const monthlyLoanDuration = Number(loanDurationInYear) * 12;
  const interestPerMonth = Number(interestRate) / 100 / 12;
  const monthlyPayment =
    (Number(amount) * interestPerMonth) /
    (1 - Math.pow(1 + interestPerMonth, -monthlyLoanDuration));
  return isNaN(monthlyPayment) ? "0" : monthlyPayment.toFixed(decimal);
};

export const getTotalPriceMortgage = (
  amount: string | number,
  totalFees: string | number,
  decimal = 0
): string => {
  const totalPrice = Number(amount) + Number(totalFees);
  return isNaN(totalPrice) ? "0" : totalPrice.toFixed(decimal);
};

export const getRevenuPerMonth = (
  rentPerYear: string | number,
  rentalChargesPerYear: string | number,
  propertyTaxPerYear: string | number,
  decimal = 0
): string => {
  const monthlyRent =
    Number(rentPerYear) / 12 -
    Number(rentalChargesPerYear) / 12 -
    Number(propertyTaxPerYear) / 12;
  return isNaN(monthlyRent) ? "0" : monthlyRent.toFixed(decimal);
};

export const getTotalPrice = (
  housingPrice: string | number,
  notaryFees: string | number,
  houseWorks: string | number,
  decimal = 0
): string => {
  const totalPrice =
    Number(housingPrice) + Number(notaryFees) + Number(houseWorks);
  return isNaN(totalPrice) ? "0" : totalPrice.toFixed(decimal);
};

export const getProfitability = (
  revenuPerMonth: string | number,
  totalPrice: string | number,
  decimal = 2
): string => {
  const revenuPerYear = Number(revenuPerMonth) * 12;
  const profitability = (revenuPerYear / Number(totalPrice)) * 100;
  return isNaN(profitability) ? "0" : profitability.toFixed(decimal);
};
