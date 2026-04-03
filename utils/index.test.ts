import {
  getLTV,
  getTotalMortgageInterest,
  getMonthlyMortgagePayment,
  getTotalMortgageCost,
  getNetMonthlyIncome,
  getNetMonthlyIncomeDetailed,
  getTotalPurchasePrice,
  getYield,
  getDownPayment,
  getTotalOperationCost,
  getCashOnCash,
  getBreakEvenRent,
  getDSCR,
  getGRM,
  computeExitScenario,
  computeStressScenarios,
  computeDealProfileScores,
  getCapRate,
  getOnePercentRule,
  getOER,
} from './index';

describe('getMonthlyMortgagePayment', () => {
  it('should calculate monthly payment correctly', () => {
    // Example: $200,000 loan at 3.5% for 20 years
    const result = getMonthlyMortgagePayment('200000', '3.5', '20');
    // M = P * [t(1+t)^n] / [(1+t)^n - 1]
    // P = 200000, t = 0.035/12 = 0.0029167, n = 240
    // Expected monthly payment ≈ $1159.92 ≈ $1160
    const monthly = Number(result);
    expect(monthly).toBeGreaterThan(1150);
    expect(monthly).toBeLessThanOrEqual(1160);
  });

  it('should return 0 for zero interest rate with principal only', () => {
    const result = getMonthlyMortgagePayment('120000', '0', '10');
    // 120000 / 120 = 1000
    expect(result).toBe('1000');
  });

  it('should handle zero loan amount', () => {
    const result = getMonthlyMortgagePayment('0', '3.5', '20');
    expect(result).toBe('0');
  });

  it('should handle zero duration', () => {
    const result = getMonthlyMortgagePayment('100000', '3.5', '0');
    expect(result).toBe('0');
  });
});

describe('getTotalMortgageInterest', () => {
  it('should calculate total interest correctly', () => {
    // Example: €230,000 loan at 3% for 25 years
    // Exact monthly payment = 1090.686..., total = 1090.686 * 300 - 230000 ≈ 97206
    const result = getTotalMortgageInterest('230000', '25', '3');
    expect(Number(result)).toBeGreaterThanOrEqual(97205);
    expect(Number(result)).toBeLessThanOrEqual(97207);
  });

  it('should handle zero interest rate', () => {
    const result = getTotalMortgageInterest('100000', '20', '0');
    expect(result).toBe('0');
  });

  it('should handle zero loan amount', () => {
    const result = getTotalMortgageInterest('0', '20', '3');
    expect(result).toBe('0');
  });
});

describe('getTotalMortgageCost', () => {
  it('should calculate total mortgage cost correctly', () => {
    const result = getTotalMortgageCost('168000', '65280');
    // 168000 + 65280 = 233280
    expect(result).toBe('233280');
  });
});

describe('getNetMonthlyIncome', () => {
  it('should calculate net monthly income correctly', () => {
    // Annual rent: $9600, Annual charges: $600, Annual tax: $800
    const result = getNetMonthlyIncome('9600', '600', '800');
    // (9600 - 600 - 800) / 12 = 8200 / 12 = 683.33
    expect(result).toBe('683');
  });

  it('should handle zero rent', () => {
    const result = getNetMonthlyIncome('0', '600', '800');
    expect(result).toBe('-117');
  });

  it('should handle negative income correctly', () => {
    const result = getNetMonthlyIncome('5000', '600', '800');
    // (5000 - 600 - 800) / 12 = 3600 / 12 = 300
    expect(result).toBe('300');
  });
});

describe('getTotalPurchasePrice', () => {
  it('should calculate total purchase price correctly', () => {
    const result = getTotalPurchasePrice('150000', '13000', '5000');
    // 150000 + 13000 + 5000 = 168000
    expect(result).toBe('168000');
  });

  it('should handle zero values', () => {
    const result = getTotalPurchasePrice('0', '0', '0');
    expect(result).toBe('0');
  });
});

describe('getYield', () => {
  it('should calculate gross yield correctly', () => {
    // Annual rent: $9600, Total cost: $168000
    const result = getYield('9600', '168000');
    // (9600 / 168000) * 100 = 5.714...
    expect(Number(result)).toBeCloseTo(5.71, 1);
  });

  it('should calculate net yield correctly', () => {
    // Net annual: $8200, Total cost: $168000
    const result = getYield('8200', '168000');
    // (8200 / 168000) * 100 = 4.88...
    expect(Number(result)).toBeCloseTo(4.88, 1);
  });

  it('should handle zero total cost', () => {
    const result = getYield('9600', '0');
    // Returns "0" when division by zero occurs (isNaN check in function)
    expect(result).toBe('0');
  });

  it('should handle zero revenue', () => {
    const result = getYield('0', '168000');
    expect(result).toBe('0.00');
  });

  it('should format yield with 2 decimal places', () => {
    const result = getYield('9600', '168000');
    // Should have 2 decimal places
    expect(result).toBe('5.71');
  });
});

describe('getDownPayment', () => {
  it('should calculate down payment correctly', () => {
    const result = getDownPayment('168000', '168000');
    // 168000 - 168000 = 0
    expect(result).toBe('0');
  });

  it('should calculate positive down payment', () => {
    const result = getDownPayment('150000', '168000');
    // 168000 - 150000 = 18000
    expect(result).toBe('18000');
  });

  it('should handle loan greater than total cost', () => {
    const result = getDownPayment('200000', '168000');
    // 168000 - 200000 = -32000
    expect(result).toBe('-32000');
  });
});

describe('getNetMonthlyIncomeDetailed', () => {
  it('should match getNetMonthlyIncomeMixed when extra expenses are zero', () => {
    // rent=1000, charges=100, propertyTax=1200 (100/mo), vacancy=0%, mgmt=0%, insurance=0, maintenance=0
    const result = getNetMonthlyIncomeDetailed('1000', '100', '1200', '0', '0', '0', '0');
    // 1000 - 100 - 100 = 800
    expect(result).toBe('800');
  });

  it('should apply vacancy rate correctly', () => {
    // rent=1000, vacancy=5% → effective rent = 950, no other expenses
    const result = getNetMonthlyIncomeDetailed('1000', '0', '0', '0', '0', '0', '5');
    expect(result).toBe('950');
  });

  it('should apply management fees as % of effective rent', () => {
    // rent=1000, vacancy=0%, mgmt=8% → fees = 80
    const result = getNetMonthlyIncomeDetailed('1000', '0', '0', '0', '8', '0', '0');
    // 1000 - 80 = 920
    expect(result).toBe('920');
  });

  it('should deduct all expenses correctly', () => {
    // rent=1000, charges=80, tax=1200/yr(100/mo), insurance=30, mgmt=7%, maintenance=50, vacancy=5%
    // effectiveRent = 1000 * 0.95 = 950
    // mgmtFees = 950 * 0.07 = 66.5
    // net = 950 - 80 - 100 - 30 - 66.5 - 50 = 623.5 → 624 (rounded)
    const result = getNetMonthlyIncomeDetailed('1000', '80', '1200', '30', '7', '50', '5');
    expect(Number(result)).toBeCloseTo(624, 0);
  });

  it('should handle zero rent', () => {
    const result = getNetMonthlyIncomeDetailed('0', '80', '1200', '30', '7', '50', '5');
    // effectiveRent = 0, net = 0 - 80 - 100 - 30 - 0 - 50 = -260
    expect(result).toBe('-260');
  });

  it('should handle NaN inputs gracefully', () => {
    const result = getNetMonthlyIncomeDetailed('invalid', '80', '1200', '30', '7', '50', '5');
    expect(result).toBe('0');
  });
});

describe('getTotalOperationCost', () => {
  it('should sum total investment and total interest', () => {
    // 162000 investment + 58800 interest = 220800
    const result = getTotalOperationCost('162000', '58800');
    expect(result).toBe('220800');
  });

  it('should handle zero interest', () => {
    const result = getTotalOperationCost('162000', '0');
    expect(result).toBe('162000');
  });

  it('should handle NaN inputs', () => {
    const result = getTotalOperationCost('invalid', '58800');
    expect(result).toBe('0');
  });
});

describe('getCashOnCash', () => {
  it('should calculate cash-on-cash return correctly', () => {
    // annual cashflow = -4692, down payment = 12000
    // (-4692 / 12000) * 100 = -39.1
    const result = getCashOnCash('-4692', '12000');
    expect(Number(result)).toBeCloseTo(-39.1, 0);
  });

  it('should return N/A when down payment is zero (100% financed)', () => {
    const result = getCashOnCash('-4692', '0');
    expect(result).toBe('N/A');
  });

  it('should handle positive cashflow', () => {
    // annual cashflow = 2400, down payment = 20000
    // (2400 / 20000) * 100 = 12.0
    const result = getCashOnCash('2400', '20000');
    expect(Number(result)).toBeCloseTo(12.0, 0);
  });

  it('should handle NaN inputs', () => {
    const result = getCashOnCash('invalid', '12000');
    expect(result).toBe('0');
  });
});

describe('getBreakEvenRent', () => {
  it('should calculate break-even rent with no vacancy', () => {
    // costs=150, tax=1200(100/mo), mortgage=870, vacancy=0%
    // (150 + 100 + 870) / 1 = 1120
    const result = getBreakEvenRent('150', '1200', '870', '0');
    expect(result).toBe('1120');
  });

  it('should account for vacancy rate', () => {
    // costs=150, tax=1200(100/mo), mortgage=870, vacancy=5%
    // (150 + 100 + 870) / 0.95 = 1178.9 ≈ 1179
    const result = getBreakEvenRent('150', '1200', '870', '5');
    expect(Number(result)).toBeCloseTo(1179, 0);
  });

  it('should return 0 when vacancy rate is 100%', () => {
    const result = getBreakEvenRent('150', '1200', '870', '100');
    expect(result).toBe('0');
  });

  it('should handle zero costs', () => {
    // only mortgage, no vacancy: break-even = mortgage payment
    const result = getBreakEvenRent('0', '0', '870', '0');
    expect(result).toBe('870');
  });

  it('should account for management fees', () => {
    // costs=150, tax=1200(100/mo), mortgage=870, vacancy=0%, mgmt=8%
    // (150 + 100 + 870) / (1 * 0.92) = 1120 / 0.92 ≈ 1217
    const result = getBreakEvenRent('150', '1200', '870', '0', '8');
    expect(Number(result)).toBeCloseTo(1217, 0);
  });

  it('should account for both vacancy and management fees', () => {
    // costs=150, tax=1200(100/mo), mortgage=870, vacancy=5%, mgmt=8%
    // (150 + 100 + 870) / (0.95 * 0.92) = 1120 / 0.874 ≈ 1281
    const result = getBreakEvenRent('150', '1200', '870', '5', '8');
    expect(Number(result)).toBeCloseTo(1281, 0);
  });

  it('should account for capex rate', () => {
    // costs=150, tax=1200(100/mo), mortgage=870, vacancy=0%, mgmt=0%, capex=5%
    // (150 + 100 + 870) / (1 * 1 - 0.05) = 1120 / 0.95 ≈ 1179
    const result = getBreakEvenRent('150', '1200', '870', '0', '0', '5');
    expect(Number(result)).toBeCloseTo(1179, 0);
  });

  it('should handle NaN inputs', () => {
    const result = getBreakEvenRent('invalid', '1200', '870', '5');
    expect(result).toBe('0');
  });
});

describe('getLTV', () => {
  it('should calculate LTV correctly', () => {
    // 150000 loan on 150000 purchase = 100%
    expect(getLTV('150000', '150000')).toBe('100.0');
  });

  it('should calculate partial LTV', () => {
    // 120000 loan on 200000 purchase = 60%
    expect(getLTV('120000', '200000')).toBe('60.0');
  });

  it('should return 0 for zero purchase price', () => {
    expect(getLTV('150000', '0')).toBe('0');
  });

  it('should handle NaN inputs', () => {
    expect(getLTV('invalid', '200000')).toBe('0');
  });
});

describe('getDSCR', () => {
  it('should calculate DSCR correctly', () => {
    // net income = 950, mortgage = 870 → 950/870 = 1.09
    const result = getDSCR('950', '870');
    expect(Number(result)).toBeCloseTo(1.09, 1);
  });

  it('should return ∞ when mortgage is zero (cash purchase)', () => {
    expect(getDSCR('950', '0')).toBe('∞');
  });

  it('should handle negative net income', () => {
    const result = getDSCR('-200', '870');
    expect(Number(result)).toBeLessThan(0);
  });

  it('should handle NaN inputs', () => {
    expect(getDSCR('invalid', '870')).toBe('0');
  });
});

describe('getGRM', () => {
  it('should calculate GRM correctly', () => {
    // 150000 / 9000 = 16.7
    const result = getGRM('150000', '9000');
    expect(Number(result)).toBeCloseTo(16.7, 0);
  });

  it('should return 0 when rent is zero', () => {
    expect(getGRM('150000', '0')).toBe('0');
  });

  it('should handle low GRM (good deal)', () => {
    // 100000 / 12000 = 8.3
    const result = getGRM('100000', '12000');
    expect(Number(result)).toBeCloseTo(8.3, 0);
  });

  it('should handle NaN inputs', () => {
    expect(getGRM('invalid', '9000')).toBe('0');
  });
});

describe('Edge cases and NaN handling', () => {
  it('should handle NaN inputs gracefully', () => {
    expect(getMonthlyMortgagePayment('invalid', '3.5', '20')).toBe('0');
    expect(getTotalMortgageInterest('invalid', '20', '3')).toBe('0');
    expect(getTotalPurchasePrice('invalid', '13000', '5000')).toBe('0');
  });
});

describe('computeExitScenario', () => {
  it('should return null for zero exit year', () => {
    expect(computeExitScenario(0, 150000, 0, 2, 150000, 3.5, 20, 870, 12000, 750, 150, 1000, 5, 0, 0, 2)).toBeNull();
  });

  it('should calculate sale price with appreciation', () => {
    const result = computeExitScenario(10, 150000, 0, 3, 150000, 3.5, 20, 870, 12000, 750, 150, 1000, 5, 0, 0, 2);
    expect(result).not.toBeNull();
    if (!result) return;
    // 150000 * (1.03)^10 ≈ 201587
    expect(result.salePrice).toBeGreaterThan(200000);
    expect(result.salePrice).toBeLessThan(202000);
  });

  it('should have lower remaining balance at later exit year', () => {
    const early = computeExitScenario(5, 150000, 0, 0, 150000, 3.5, 20, 870, 12000, 750, 150, 1000, 5, 0, 0, 2);
    const late = computeExitScenario(15, 150000, 0, 0, 150000, 3.5, 20, 870, 12000, 750, 150, 1000, 5, 0, 0, 2);
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    if (!early || !late) return;
    expect(late.remainingBalance).toBeLessThan(early.remainingBalance);
  });

  it('should return N/A for ROI when down payment is zero', () => {
    const result = computeExitScenario(10, 150000, 0, 2, 150000, 3.5, 20, 870, 0, 750, 150, 1000, 5, 0, 0, 2);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.roi).toBe('N/A');
  });
});

describe('computeStressScenarios', () => {
  it('should return 3 scenarios', () => {
    const result = computeStressScenarios(750, 150, 1000, 5, 870, 0, 20, 2, 0, 5, 12000, 150000, 0);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe('Optimistic');
    expect(result[1].label).toBe('Base');
    expect(result[2].label).toBe('Pessimistic');
  });

  it('should have optimistic cashflow >= base >= pessimistic', () => {
    const result = computeStressScenarios(750, 150, 1000, 5, 870, 1, 20, 2, 0, 5, 12000, 150000, 0);
    expect(result[0].cashflowY1).toBeGreaterThanOrEqual(result[1].cashflowY1);
    expect(result[1].cashflowY1).toBeGreaterThanOrEqual(result[2].cashflowY1);
  });

  it('should return annual data arrays', () => {
    const result = computeStressScenarios(750, 150, 1000, 5, 870, 0, 20, 2, 0, 5, 12000, 150000, 0);
    // horizon = min(20+10, 40) = 30
    expect(result[0].annualData.length).toBe(30);
  });
});

describe('computeDealProfileScores', () => {
  it('should return 4 metrics', () => {
    const result = computeDealProfileScores(1.3, 8, 5, 14);
    expect(result).toHaveLength(4);
    expect(result.map(r => r.metric)).toEqual(['DSCR', 'Cash-on-Cash', 'Net Yield', 'GRM']);
  });

  it('should score excellent metrics near 100', () => {
    const result = computeDealProfileScores(1.6, 12, 8, 8);
    result.forEach(r => {
      expect(r.score).toBeGreaterThanOrEqual(90);
    });
  });

  it('should score poor metrics near 10', () => {
    const result = computeDealProfileScores(0.5, -5, 0.5, 30);
    result.forEach(r => {
      expect(r.score).toBeLessThanOrEqual(20);
    });
  });

  it('should handle infinite DSCR (no mortgage)', () => {
    const result = computeDealProfileScores(Infinity, 8, 5, 14);
    const dscrScore = result.find(r => r.metric === 'DSCR');
    expect(dscrScore?.score).toBe(100);
  });
});

describe('getCapRate', () => {
  it('should calculate cap rate correctly', () => {
    // NOI = 12000/yr, property value = 200000
    // 12000 / 200000 * 100 = 6.0
    expect(getCapRate('12000', '200000')).toBe('6.00');
  });

  it('should return 0 for zero property value', () => {
    expect(getCapRate('12000', '0')).toBe('0');
  });
});

describe('getOnePercentRule', () => {
  it('should calculate 1% rule correctly', () => {
    // 1500 rent / 150000 price * 100 = 1.0
    expect(getOnePercentRule('1500', '150000')).toBe('1.00');
  });

  it('should detect below 1% rule', () => {
    // 750 / 150000 * 100 = 0.5
    expect(Number(getOnePercentRule('750', '150000'))).toBeLessThan(1);
  });

  it('should return 0 for zero price', () => {
    expect(getOnePercentRule('750', '0')).toBe('0');
  });
});

describe('getOER', () => {
  it('should calculate OER correctly', () => {
    // expenses = 400, income = 1000 → 40%
    expect(getOER('400', '1000')).toBe('40.0');
  });

  it('should return 0 for zero income', () => {
    expect(getOER('400', '0')).toBe('0');
  });
});
