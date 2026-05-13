import { computeAmortization, computeAnnualPrincipalVsInterest, computeCumulativeCashflow, computeAnnualCashflow, computeTotalReturn, computeExpenseDecomposition, computeROIByExitYear, tenantSearchFeeFactor } from './Charts';
import { computeStressScenarios, computeExitScenario, getMonthlyMortgagePayment } from '../utils/index';

describe('computeAmortization', () => {
  it('should return empty array for zero loan amount', () => {
    expect(computeAmortization(0, 3.5, 20, 1160)).toEqual([]);
  });

  it('should return empty array for zero years', () => {
    expect(computeAmortization(200000, 3.5, 0, 1160)).toEqual([]);
  });

  it('should return empty array for zero monthly payment', () => {
    expect(computeAmortization(200000, 3.5, 20, 0)).toEqual([]);
  });

  it('should start with full balance at year 0', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    expect(data[0]).toEqual({ year: 0, balance: 200000, interest: 0, principal: 0 });
  });

  it('should have balance reach exactly 0 at end (rounded-up payment)', () => {
    // Exact payment ≈ 1159.92, rounded to 1160
    const data = computeAmortization(200000, 3.5, 20, 1160);
    const last = data[data.length - 1];
    expect(last.year).toBe(20);
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(200000);
  });

  it('should have balance reach exactly 0 at end (rounded-down payment)', () => {
    // Exact payment ≈ 872.42, rounded down to 872
    const data = computeAmortization(180000, 3.2, 25, 872);
    const last = data[data.length - 1];
    expect(last.year).toBe(25);
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(180000);
  });

  it('should maintain principal + balance = loanAmount invariant', () => {
    const loanAmount = 180000;
    const data = computeAmortization(loanAmount, 3.2, 25, 872);
    for (const d of data) {
      // Allow ±1 for Math.round
      expect(Math.abs(d.principal + d.balance - loanAmount)).toBeLessThanOrEqual(1);
    }
  });

  it('should handle 0% interest rate correctly', () => {
    const data = computeAmortization(120000, 0, 10, 1000);
    const last = data[data.length - 1];
    expect(last.balance).toBe(0);
    expect(last.principal).toBe(120000);
    expect(last.interest).toBe(0);
  });

  it('should have monotonically decreasing balance', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].balance).toBeLessThanOrEqual(data[i - 1].balance);
    }
  });

  it('should have monotonically increasing cumulative interest', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].interest).toBeGreaterThanOrEqual(data[i - 1].interest);
    }
  });

  it('should have monotonically increasing cumulative principal', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].principal).toBeGreaterThanOrEqual(data[i - 1].principal);
    }
  });

  it('should return years+1 data points', () => {
    const data = computeAmortization(200000, 3.5, 20, 1160);
    expect(data.length).toBe(21); // year 0 through 20
  });
});

describe('computeAnnualPrincipalVsInterest', () => {
  it('should return empty array for zero loan amount', () => {
    expect(computeAnnualPrincipalVsInterest(0, 3.5, 20, 1160)).toEqual([]);
  });

  it('should return empty array for zero years', () => {
    expect(computeAnnualPrincipalVsInterest(200000, 3.5, 0, 1160)).toEqual([]);
  });

  it('should return correct number of data points', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    expect(data.length).toBe(20); // year 1 through 20
  });

  it('should have total principal sum equal to loan amount (rounded-down payment)', () => {
    // Exact payment ≈ 872.42, rounded down to 872
    const data = computeAnnualPrincipalVsInterest(180000, 3.2, 25, 872);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    // Allow ±1 for rounding
    expect(Math.abs(totalPrincipal - 180000)).toBeLessThanOrEqual(1);
  });

  it('should have total principal sum equal to loan amount (rounded-up payment)', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    // Each year's Math.round can introduce ±0.5, accumulating over 20 years
    expect(Math.abs(totalPrincipal - 200000)).toBeLessThanOrEqual(data.length);
  });

  it('should have interest decreasing and principal increasing over time', () => {
    const data = computeAnnualPrincipalVsInterest(200000, 3.5, 20, 1160);
    // First year should have more interest than last year
    expect(data[0].interest).toBeGreaterThan(data[data.length - 1].interest);
    // First year should have less principal than last year (except last year may be partial)
    expect(data[0].principal).toBeLessThan(data[data.length - 2].principal);
  });

  it('should handle 0% interest rate', () => {
    const data = computeAnnualPrincipalVsInterest(120000, 0, 10, 1000);
    const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
    const totalInterest = data.reduce((sum, d) => sum + d.interest, 0);
    expect(totalPrincipal).toBe(120000);
    expect(totalInterest).toBe(0);
  });
});

describe('computeCumulativeCashflow', () => {
  const baseArgs = {
    downPayment: 12000,
    monthlyRent: 750,
    monthlyCosts: 150,
    annualPropertyTax: 1000,
    vacancyRate: 5,
    monthlyMortgage: 870,
    rentIncreaseRate: 0,
    loanPeriod: 20,
  };

  it('should return empty array for zero loan period', () => {
    expect(computeCumulativeCashflow(12000, 750, 150, 1000, 5, 870, 0, 0)).toEqual([]);
  });

  it('should start with negative down payment at year 0', () => {
    const data = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod
    );
    expect(data[0]).toEqual({ year: 0, cumulative: -12000 });
  });

  it('should produce identical results with default params (0% inflation, 0% mgmt)', () => {
    const withoutParams = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod
    );
    const withZeroParams = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod, 0, 0
    );
    expect(withoutParams).toEqual(withZeroParams);
  });

  it('should produce lower cashflow with expense inflation', () => {
    const noInflation = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod, 0, 0
    );
    const withInflation = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod, 2, 0
    );
    // Year 10+ should show noticeably lower cumulative cashflow with inflation
    const y10noInfl = noInflation.find(d => d.year === 10);
    const y10withInfl = withInflation.find(d => d.year === 10);
    expect(y10noInfl).toBeDefined();
    expect(y10withInfl).toBeDefined();
    expect(y10withInfl?.cumulative).toBeLessThan(y10noInfl?.cumulative ?? 0);
  });

  it('should produce lower cashflow with management fees', () => {
    const noMgmt = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod, 0, 0
    );
    const withMgmt = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod, 0, 8
    );
    const y10noMgmt = noMgmt.find(d => d.year === 10);
    const y10withMgmt = withMgmt.find(d => d.year === 10);
    expect(y10noMgmt).toBeDefined();
    expect(y10withMgmt).toBeDefined();
    expect(y10withMgmt?.cumulative).toBeLessThan(y10noMgmt?.cumulative ?? 0);
  });
});

describe('computeAnnualCashflow', () => {
  it('should return empty array for zero loan period', () => {
    expect(computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 0)).toEqual([]);
  });

  it('should produce lower annual cashflow with expense inflation', () => {
    const noInflation = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20, 0, 0);
    const withInflation = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20, 2, 0);
    // Year 10 should show lower cashflow with inflation
    const y10noInfl = noInflation.find(d => d.year === 10);
    const y10withInfl = withInflation.find(d => d.year === 10);
    expect(y10noInfl).toBeDefined();
    expect(y10withInfl).toBeDefined();
    expect(y10withInfl?.cashflow).toBeLessThan(y10noInfl?.cashflow ?? 0);
  });

  it('should produce lower annual cashflow with management fees', () => {
    const noMgmt = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20, 0, 0);
    const withMgmt = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20, 0, 8);
    // Every year should have lower cashflow with management fees
    expect(withMgmt[0].cashflow).toBeLessThan(noMgmt[0].cashflow);
  });

  it('should produce identical results with default params', () => {
    const withoutParams = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20);
    const withZeroParams = computeAnnualCashflow(750, 150, 1000, 5, 870, 0, 20, 0, 0);
    expect(withoutParams).toEqual(withZeroParams);
  });
});

describe('computeTotalReturn', () => {
  it('should return empty array for zero loan period', () => {
    expect(computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 0, 150000, 3.5, 150000, 0)).toEqual([]);
  });

  it('should produce lower total return with expense inflation', () => {
    const noInflation = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2, 0, 0);
    const withInflation = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2, 2, 0);
    const lastNoInfl = noInflation[noInflation.length - 1];
    const lastWithInfl = withInflation[withInflation.length - 1];
    expect(lastWithInfl.totalReturn).toBeLessThan(lastNoInfl.totalReturn);
  });

  it('should produce lower total return with management fees', () => {
    const noMgmt = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2, 0, 0);
    const withMgmt = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2, 0, 8);
    const lastNoMgmt = noMgmt[noMgmt.length - 1];
    const lastWithMgmt = withMgmt[withMgmt.length - 1];
    expect(lastWithMgmt.totalReturn).toBeLessThan(lastNoMgmt.totalReturn);
  });

  it('should produce identical results with default params', () => {
    const withoutParams = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2);
    const withZeroParams = computeTotalReturn(12000, 750, 150, 1000, 5, 870, 0, 20, 150000, 3.5, 150000, 2, 0, 0);
    expect(withoutParams).toEqual(withZeroParams);
  });
});

describe('computeExpenseDecomposition', () => {
  it('should return empty array for zero loan period', () => {
    expect(computeExpenseDecomposition(750, 150, 1000, 5, 0, 0)).toEqual([]);
  });

  it('should show growing expenses with inflation', () => {
    const data = computeExpenseDecomposition(750, 150, 1000, 5, 0, 20, 2, 0, 0);
    expect(data.length).toBe(30); // min(20+10, 40) = 30
    // Year 10 fixed costs should be higher than year 1
    expect(data[9].fixedCosts).toBeGreaterThan(data[0].fixedCosts);
    expect(data[9].propertyTax).toBeGreaterThan(data[0].propertyTax);
  });

  it('should scale management fees with rent', () => {
    const data = computeExpenseDecomposition(750, 150, 1000, 5, 2, 20, 0, 8, 0);
    // Year 1: eff rent = 750 * 0.95 = 712.5, mgmt = 712.5 * 0.08 * 12 = 684
    expect(data[0].managementFees).toBeGreaterThan(0);
    // With rent increase, year 10 mgmt should be higher
    expect(data[9].managementFees).toBeGreaterThan(data[0].managementFees);
  });

  it('should include capex when capexRate > 0', () => {
    const data = computeExpenseDecomposition(750, 150, 1000, 5, 0, 20, 0, 0, 5);
    // Year 1: capex = 750 * 0.05 * 12 = 450
    expect(data[0].capex).toBe(450);
  });
});

describe('computeCumulativeCashflow with capex', () => {
  it('should produce lower cashflow with capex', () => {
    const noCapex = computeCumulativeCashflow(12000, 750, 150, 1000, 5, 870, 0, 20, 0, 0, 0);
    const withCapex = computeCumulativeCashflow(12000, 750, 150, 1000, 5, 870, 0, 20, 0, 0, 5);
    const y10noCapex = noCapex.find(d => d.year === 10);
    const y10withCapex = withCapex.find(d => d.year === 10);
    expect(y10noCapex).toBeDefined();
    expect(y10withCapex).toBeDefined();
    expect(y10withCapex?.cumulative).toBeLessThan(y10noCapex?.cumulative ?? 0);
  });
});

describe('computeROIByExitYear', () => {
  const mm = Number(getMonthlyMortgagePayment(120000, 3.5, 25, 10));

  it('should return empty array when down payment is zero', () => {
    expect(computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 0, 900, 120, 1000, 5, 0, 1.5, 2, 3)).toEqual([]);
  });

  it('should return data for each year up to horizon', () => {
    const data = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3);
    // horizon = min(25+10, 40) = 35
    expect(data).toHaveLength(35);
    expect(data[0].year).toBe(1);
    expect(data[34].year).toBe(35);
  });

  it('should use annualized ROI (not total ROI)', () => {
    const data = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3);
    // Annualized ROI should stay in a reasonable range (not hundreds of percent)
    // Total ROI at year 35 would be ~900%, but annualized should be ~7%
    const lastYear = data[data.length - 1];
    expect(lastYear.roi).toBeLessThan(30);
    expect(lastYear.roi).toBeGreaterThan(0);
  });

  it('should match computeExitScenario annualizedRoi values', () => {
    const data = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3);
    // Verify a few points match the underlying computeExitScenario
    for (const y of [1, 5, 10, 25]) {
      const exitResult = computeExitScenario(y, 150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3);
      const chartPoint = data.find(d => d.year === y);
      expect(chartPoint).toBeDefined();
      expect(exitResult).not.toBeNull();
      if (!exitResult || !chartPoint) continue;
      const expected = exitResult.annualizedRoi === 'N/A' ? 0 : Number(exitResult.annualizedRoi);
      expect(chartPoint.roi).toBe(expected);
    }
  });

  it('should start negative (transaction costs) then become positive', () => {
    const data = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3);
    expect(data[0].roi).toBeLessThan(0);
    const y10 = data.find(d => d.year === 10);
    expect(y10?.roi).toBeGreaterThan(0);
  });
});

describe('cashflow consistency between stress test and direct computation', () => {
  // The main page computes cashflow as: effectiveRent - mgmt - capex - costs - tax/12 - mortgage
  // The stress test base scenario should produce the same Y1 value
  const configs = [
    { rent: 900, costs: 120, tax: 1000, mgmt: 0, vac: 5, capex: 3, loan: 120000, rate: 3.5, period: 25 },
    { rent: 750, costs: 150, tax: 1200, mgmt: 8, vac: 5, capex: 5, loan: 150000, rate: 4, period: 20 },
    { rent: 1200, costs: 200, tax: 1500, mgmt: 10, vac: 8, capex: 7, loan: 200000, rate: 3, period: 25 },
    { rent: 650, costs: 100, tax: 800, mgmt: 7, vac: 3, capex: 5, loan: 100000, rate: 3.8, period: 20 },
  ];

  for (const c of configs) {
    it(`should match for rent=${c.rent} mgmt=${c.mgmt}% capex=${c.capex}%`, () => {
      const mm = Number(getMonthlyMortgagePayment(c.loan, c.rate, c.period, 10));

      // Direct computation (same as main page with full precision)
      const effectiveRent = c.rent * (1 - c.vac / 100);
      const mgmtFees = effectiveRent * (c.mgmt / 100);
      const capex = c.rent * c.capex / 100;
      const netIncome = effectiveRent - mgmtFees - capex - c.costs - c.tax / 12;
      const annualDirect = Math.round((netIncome - mm) * 12);

      // Stress test base case Y1
      const stress = computeStressScenarios(c.rent, c.costs, c.tax, c.vac, mm, 1.5, c.period, 2, c.mgmt, c.capex, 42000, 150000, 1.5);
      const baseCase = stress.find(s => s.label === 'Base')!;

      expect(annualDirect).toBe(baseCase.cashflowY1);
    });
  }

  it('should match computeAnnualCashflow Y1 with stress test base Y1', () => {
    const mm = Number(getMonthlyMortgagePayment(120000, 3.5, 25, 10));
    const annual = computeAnnualCashflow(900, 120, 1000, 5, mm, 1.5, 25, 2, 0, 3);
    const stress = computeStressScenarios(900, 120, 1000, 5, mm, 1.5, 25, 2, 0, 3, 42000, 150000, 1.5);
    const baseCase = stress.find(s => s.label === 'Base')!;

    expect(annual[0].cashflow).toBe(baseCase.cashflowY1);
  });

  it('should remain consistent when tenant search fee is added', () => {
    const mm = Number(getMonthlyMortgagePayment(120000, 3.5, 25, 10));
    // Same computation with tsf=1 month over 3 years
    const annual = computeAnnualCashflow(900, 120, 1000, 5, mm, 1.5, 25, 2, 0, 3, 1, 3);
    const stress = computeStressScenarios(900, 120, 1000, 5, mm, 1.5, 25, 2, 0, 3, 42000, 150000, 1.5, 1, 3);
    const baseCase = stress.find(s => s.label === 'Base')!;
    expect(annual[0].cashflow).toBe(baseCase.cashflowY1);
  });
});

describe('tenantSearchFeeFactor', () => {
  it('should compute factor as months / (years × 12)', () => {
    expect(tenantSearchFeeFactor(1, 3)).toBeCloseTo(1 / 36, 10);
    expect(tenantSearchFeeFactor(1.5, 3)).toBeCloseTo(1.5 / 36, 10);
  });

  it('should return 0 for zero or negative months', () => {
    expect(tenantSearchFeeFactor(0, 3)).toBe(0);
    expect(tenantSearchFeeFactor(-1, 3)).toBe(0);
  });

  it('should return 0 for zero or negative tenancy duration', () => {
    expect(tenantSearchFeeFactor(1, 0)).toBe(0);
    expect(tenantSearchFeeFactor(1, -1)).toBe(0);
  });

  it('should return 0 for non-finite inputs', () => {
    expect(tenantSearchFeeFactor(Infinity, 3)).toBe(0);
    expect(tenantSearchFeeFactor(1, Infinity)).toBe(0);
    expect(tenantSearchFeeFactor(NaN, 3)).toBe(0);
  });
});

describe('Charts compute functions with tenant search fee', () => {
  const baseArgs = {
    downPayment: 42000,
    monthlyRent: 900,
    monthlyCosts: 120,
    annualPropertyTax: 1000,
    vacancyRate: 5,
    monthlyMortgage: 601,
    rentIncreaseRate: 1.5,
    loanPeriod: 25,
    expenseInflationRate: 2,
    managementRate: 8,
    capexRate: 3,
  };

  it('computeCumulativeCashflow: default params equal explicit 0 fee', () => {
    const defaults = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod,
      baseArgs.expenseInflationRate, baseArgs.managementRate, baseArgs.capexRate
    );
    const explicit = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod,
      baseArgs.expenseInflationRate, baseArgs.managementRate, baseArgs.capexRate, 0, 3
    );
    expect(defaults).toEqual(explicit);
  });

  it('computeCumulativeCashflow: tenant search fee lowers cumulative cashflow', () => {
    const noFee = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod,
      baseArgs.expenseInflationRate, baseArgs.managementRate, baseArgs.capexRate, 0, 3
    );
    const withFee = computeCumulativeCashflow(
      baseArgs.downPayment, baseArgs.monthlyRent, baseArgs.monthlyCosts,
      baseArgs.annualPropertyTax, baseArgs.vacancyRate, baseArgs.monthlyMortgage,
      baseArgs.rentIncreaseRate, baseArgs.loanPeriod,
      baseArgs.expenseInflationRate, baseArgs.managementRate, baseArgs.capexRate, 1, 3
    );
    const y10noFee = noFee.find(d => d.year === 10);
    const y10withFee = withFee.find(d => d.year === 10);
    expect(y10noFee).toBeDefined();
    expect(y10withFee).toBeDefined();
    expect(y10withFee?.cumulative).toBeLessThan(y10noFee?.cumulative ?? 0);
  });

  it('computeAnnualCashflow: tenant search fee lowers annual cashflow', () => {
    const noFee = computeAnnualCashflow(900, 120, 1000, 5, 601, 1.5, 25, 2, 0, 3, 0, 3);
    const withFee = computeAnnualCashflow(900, 120, 1000, 5, 601, 1.5, 25, 2, 0, 3, 1, 3);
    expect(withFee[0].cashflow).toBeLessThan(noFee[0].cashflow);
  });

  it('computeTotalReturn: tenant search fee lowers total return', () => {
    const noFee = computeTotalReturn(42000, 900, 120, 1000, 5, 601, 1.5, 25, 120000, 3.5, 150000, 1.5, 2, 0, 3, 0, 3);
    const withFee = computeTotalReturn(42000, 900, 120, 1000, 5, 601, 1.5, 25, 120000, 3.5, 150000, 1.5, 2, 0, 3, 1, 3);
    const lastNoFee = noFee[noFee.length - 1];
    const lastWithFee = withFee[withFee.length - 1];
    expect(lastWithFee.totalReturn).toBeLessThan(lastNoFee.totalReturn);
  });

  it('computeExpenseDecomposition: should include tenantSearchFee key', () => {
    const data = computeExpenseDecomposition(900, 120, 1000, 5, 1.5, 25, 2, 0, 3, 1, 3);
    expect(data[0].tenantSearchFee).toBeGreaterThan(0);
    // Y1 = 900 × (1/36) × 12 = 300 (one month of rent over 3 years)
    expect(data[0].tenantSearchFee).toBe(300);
  });

  it('computeExpenseDecomposition: should show zero tenant search fee by default', () => {
    const data = computeExpenseDecomposition(900, 120, 1000, 5, 1.5, 25, 2, 0, 3);
    expect(data[0].tenantSearchFee).toBe(0);
  });

  it('computeExpenseDecomposition: should scale tenant search fee with rent over time', () => {
    const data = computeExpenseDecomposition(900, 120, 1000, 5, 2, 25, 2, 0, 3, 1, 3);
    // rentIncreaseRate = 2%/yr, so year 10 should be ~1.02^9 × year 1
    expect(data[9].tenantSearchFee).toBeGreaterThan(data[0].tenantSearchFee);
  });

  it('computeROIByExitYear: tenant search fee lowers annualized ROI', () => {
    const mm = Number(getMonthlyMortgagePayment(120000, 3.5, 25, 10));
    const noFee = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3, 0, 3);
    const withFee = computeROIByExitYear(150000, 0, 2, 120000, 3.5, 25, mm, 42000, 900, 120, 1000, 5, 0, 1.5, 2, 3, 1, 3);
    const y10noFee = noFee.find(d => d.year === 10);
    const y10withFee = withFee.find(d => d.year === 10);
    expect(y10noFee).toBeDefined();
    expect(y10withFee).toBeDefined();
    expect(y10withFee!.roi).toBeLessThan(y10noFee!.roi);
  });

  it('cumulative cashflow drop should equal amortized tenant search fee', () => {
    // No rent inflation, no expense inflation → deterministic
    const noFee = computeCumulativeCashflow(0, 900, 0, 0, 0, 0, 0, 25, 0, 0, 0, 0, 3);
    const withFee = computeCumulativeCashflow(0, 900, 0, 0, 0, 0, 0, 25, 0, 0, 0, 1, 3);
    // Y1: 900 * 12 = 10800 cumulative without fee
    // Y1 with fee: 10800 - (1/36 * 900 * 12) = 10800 - 300 = 10500
    const y1noFee = noFee.find(d => d.year === 1);
    const y1withFee = withFee.find(d => d.year === 1);
    expect(y1noFee?.cumulative).toBe(10800);
    expect(y1withFee?.cumulative).toBe(10500);
    // Y2: 10800 + 10800 = 21600 vs 10500 + 10500 = 21000
    const y2noFee = noFee.find(d => d.year === 2);
    const y2withFee = withFee.find(d => d.year === 2);
    expect(y2noFee?.cumulative).toBe(21600);
    expect(y2withFee?.cumulative).toBe(21000);
  });
});
