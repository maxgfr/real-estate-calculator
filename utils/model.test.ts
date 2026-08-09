import {
  amortizationSchedule,
  escalate,
  firstBreakevenYear,
  monthlyIncomeBreakdown,
  projectionHorizon,
  remainingBalanceAfter,
  yearCashflow,
  yearIncome,
} from './model';
import { getMonthlyMortgagePayment } from './index';

describe('projectionHorizon', () => {
  it('shows ten years past loan repayment', () => {
    expect(projectionHorizon(20)).toBe(30);
  });

  it('caps at 40 years', () => {
    expect(projectionHorizon(35)).toBe(40);
    expect(projectionHorizon(50)).toBe(40);
  });
});

describe('escalate', () => {
  it('leaves year 1 at the base value', () => {
    expect(escalate(1000, 5, 1)).toBe(1000);
  });

  it('compounds from year 2 onwards', () => {
    expect(escalate(1000, 10, 3)).toBeCloseTo(1210, 6);
  });

  it('handles deflation', () => {
    expect(escalate(1000, -10, 2)).toBeCloseTo(900, 6);
  });
});

describe('monthlyIncomeBreakdown', () => {
  const base = {
    monthlyRent: 1000,
    monthlyCosts: 100,
    annualPropertyTax: 1200,
    vacancyRate: 0,
    managementRate: 0,
    capexRate: 0,
  };

  it('subtracts fixed costs and prorated property tax', () => {
    expect(monthlyIncomeBreakdown(base).netIncome).toBe(1000 - 100 - 100);
  });

  it('charges management on effective rent, not gross', () => {
    const r = monthlyIncomeBreakdown({ ...base, vacancyRate: 10, managementRate: 10 });
    expect(r.effectiveRent).toBe(900);
    expect(r.managementFees).toBeCloseTo(90, 9);
  });

  it('charges capex on gross rent, not effective', () => {
    const r = monthlyIncomeBreakdown({ ...base, vacancyRate: 10, capexRate: 10 });
    expect(r.capex).toBeCloseTo(100, 9);
  });

  it('excludes capex from NOI but not from net income', () => {
    const r = monthlyIncomeBreakdown({ ...base, capexRate: 5 });
    expect(r.noi - r.netIncome).toBeCloseTo(r.capex, 9);
    expect(r.capex).toBeCloseTo(50, 9);
  });

  it('splits gross rent into effective rent and vacancy loss', () => {
    const r = monthlyIncomeBreakdown({ ...base, vacancyRate: 7 });
    expect(r.effectiveRent + r.vacancyLoss).toBeCloseTo(r.grossRent, 9);
  });
});

describe('yearIncome', () => {
  const base = {
    monthlyRent: 1000,
    monthlyCosts: 100,
    annualPropertyTax: 1200,
    vacancyRate: 0,
    managementRate: 0,
    capexRate: 0,
  };
  const rates = { rentIncreaseRate: 2, expenseInflationRate: 3 };

  it('uses base values in year 1', () => {
    expect(yearIncome(base, rates, 1).netIncome).toBe(monthlyIncomeBreakdown(base).netIncome);
  });

  it('grows rent and inflates expenses independently', () => {
    const y3 = yearIncome(base, rates, 3);
    expect(y3.grossRent).toBeCloseTo(1000 * 1.02 ** 2, 6);
    expect(y3.fixedCosts).toBeCloseTo(100 * 1.03 ** 2, 6);
    expect(y3.monthlyPropertyTax).toBeCloseTo((1200 * 1.03 ** 2) / 12, 6);
  });
});

describe('yearCashflow', () => {
  const base = {
    monthlyRent: 1000,
    monthlyCosts: 100,
    annualPropertyTax: 1200,
    vacancyRate: 0,
    managementRate: 0,
    capexRate: 0,
  };
  const rates = { rentIncreaseRate: 0, expenseInflationRate: 0 };

  it('charges debt service while the loan runs', () => {
    expect(yearCashflow(base, rates, 5, 600, 20).annualCashflow).toBe((800 - 600) * 12);
  });

  it('drops debt service once the loan is repaid', () => {
    expect(yearCashflow(base, rates, 21, 600, 20).annualCashflow).toBe(800 * 12);
  });
});

describe('amortizationSchedule', () => {
  const loan = 180000;
  const rate = 3.2;
  const term = 25;
  const payment = Number(getMonthlyMortgagePayment(loan, rate, term, 10));

  it('repays the loan exactly over its term', () => {
    const rows = amortizationSchedule(loan, rate, term, payment);
    expect(rows).toHaveLength(term);
    expect(rows[rows.length - 1].closingBalance).toBe(0);
  });

  it('conserves principal across the schedule', () => {
    const rows = amortizationSchedule(loan, rate, term, payment);
    const totalPrincipal = rows.reduce((sum, r) => sum + r.principal, 0);
    expect(totalPrincipal).toBeCloseTo(loan, 6);
  });

  it('chains opening and closing balances', () => {
    const rows = amortizationSchedule(loan, rate, term, payment);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].openingBalance).toBeCloseTo(rows[i - 1].closingBalance, 9);
    }
  });

  it('shifts interest to principal over time', () => {
    const rows = amortizationSchedule(loan, rate, term, payment);
    expect(rows[0].interest).toBeGreaterThan(rows[term - 1].interest);
    expect(rows[0].principal).toBeLessThan(rows[term - 1].principal);
  });

  it('handles a 0% loan as straight-line repayment', () => {
    const rows = amortizationSchedule(120000, 0, 10, 1000);
    expect(rows[0].interest).toBe(0);
    expect(rows[0].principal).toBe(12000);
    expect(rows[9].closingBalance).toBe(0);
  });

  it('never lets the balance grow when the payment is below the interest', () => {
    // 200k at 6% owes 1000/month in interest alone; a 200 payment amortizes nothing.
    const rows = amortizationSchedule(200000, 6, 25, 200);
    for (const row of rows) {
      expect(row.closingBalance).toBeLessThanOrEqual(row.openingBalance);
      expect(row.principal).toBeGreaterThanOrEqual(0);
    }
    expect(rows[0].closingBalance).toBe(200000);
  });

  it('pads rows past the loan term with a cleared balance', () => {
    const rows = amortizationSchedule(loan, rate, term, payment, term + 5);
    expect(rows).toHaveLength(term + 5);
    expect(rows[term].closingBalance).toBe(0);
    expect(rows[term].interest).toBe(0);
  });

  it('returns nothing for a non-positive horizon', () => {
    expect(amortizationSchedule(loan, rate, term, payment, 0)).toEqual([]);
  });
});

describe('remainingBalanceAfter', () => {
  const loan = 180000;
  const payment = Number(getMonthlyMortgagePayment(loan, 3.2, 25, 10));

  it('returns the full loan before any payment', () => {
    expect(remainingBalanceAfter(loan, 3.2, 25, payment, 0)).toBe(loan);
  });

  it('returns zero once the term is over', () => {
    expect(remainingBalanceAfter(loan, 3.2, 25, payment, 25)).toBe(0);
    expect(remainingBalanceAfter(loan, 3.2, 25, payment, 40)).toBe(0);
  });

  it('decreases monotonically', () => {
    const y5 = remainingBalanceAfter(loan, 3.2, 25, payment, 5);
    const y15 = remainingBalanceAfter(loan, 3.2, 25, payment, 15);
    expect(y15).toBeLessThan(y5);
    expect(y5).toBeLessThan(loan);
  });
});

describe('firstBreakevenYear', () => {
  it('finds the year the position turns positive and stays there', () => {
    expect(firstBreakevenYear([-100, -60, -20, 10, 40])).toBe(3);
  });

  it('reports year 0 when no capital is at risk and cash is positive', () => {
    expect(firstBreakevenYear([0, 50, 120])).toBe(0);
  });

  it('ignores a transient early crossing that does not hold', () => {
    // Starts level, dips under water, then recovers for good in year 4.
    expect(firstBreakevenYear([0, -30, -10, 5, 25])).toBe(3);
  });

  it('returns null when the position ends under water', () => {
    expect(firstBreakevenYear([-100, -80, -90])).toBeNull();
  });

  it('returns null for an empty series', () => {
    expect(firstBreakevenYear([])).toBeNull();
  });
});
