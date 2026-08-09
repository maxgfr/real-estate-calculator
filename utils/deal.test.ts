import { analyzeDeal, DEAL_DEFAULTS, MODEL_CAVEATS, type DealInputs } from './deal';
import {
  getBreakEvenRent, getCapRate, getCashOnCash, getDSCR, getGRM, getLTV,
  getMonthlyMortgagePayment, getOnePercentRule, getTotalPurchasePrice, getYield,
} from './index';
import { monthlyIncomeBreakdown } from './model';

const CASH_PURCHASE: DealInputs = { ...DEAL_DEFAULTS, bankLoan: 0, bankRate: 0, managementRate: 7 };
const OVER_FINANCED: DealInputs = {
  ...DEAL_DEFAULTS,
  housingPrice: 200000, notaryFees: 16000, houseWorks: 20000, bankLoan: 250000,
  bankRate: 4.2, bankLoanPeriod: 20, rent: 1400, propertyTax: 1800, monthlyCosts: 200,
  managementRate: 8, capexRate: 6, vacancyRate: 8, appreciationRate: -1, exitYear: 12,
};

describe('analyzeDeal', () => {
  const d = analyzeDeal(DEAL_DEFAULTS);

  it('agrees with the individual indicator functions', () => {
    const p = DEAL_DEFAULTS;
    expect(d.totalPrice).toBe(getTotalPurchasePrice(p.housingPrice, p.notaryFees, p.houseWorks));
    expect(d.monthlyMortgageExact).toBe(
      Number(getMonthlyMortgagePayment(p.bankLoan, p.bankRate, p.bankLoanPeriod, 10))
    );
    expect(d.grossYield).toBe(getYield(p.rent * 12, d.totalPrice));
    expect(d.ltv).toBe(getLTV(p.bankLoan, p.housingPrice));
    expect(d.grm).toBe(getGRM(p.housingPrice, p.rent * 12));
    expect(d.onePercentRule).toBe(getOnePercentRule(p.rent, p.housingPrice));
    expect(d.capRate).toBe(getCapRate(d.noi, String(p.housingPrice + p.houseWorks)));
    expect(d.cashOnCash).toBe(getCashOnCash(d.cashflowExact * 12, d.downPayment));
    expect(d.breakEvenRent).toBe(
      getBreakEvenRent(p.monthlyCosts, p.propertyTax, d.monthlyMortgageExact, p.vacancyRate, p.managementRate, p.capexRate)
    );
  });

  it('derives cashflow as net income minus debt service', () => {
    expect(d.cashflowExact).toBeCloseTo(d.netMonthlyIncomeExact - d.monthlyMortgageExact, 9);
  });

  it('measures DSCR on NOI, not on net income', () => {
    expect(d.dscr).toBe(getDSCR(d.income.noi, d.monthlyMortgageExact));
    expect(Number(d.dscr)).toBeGreaterThan(d.netMonthlyIncomeExact / d.monthlyMortgageExact);
  });

  it('annualizes NOI from the monthly breakdown', () => {
    expect(Number(d.noi)).toBeCloseTo(d.income.noi * 12, 6);
  });

  it('keeps the income breakdown internally consistent', () => {
    const i = d.income;
    expect(i.effectiveRent + i.vacancyLoss).toBeCloseTo(i.grossRent, 9);
    expect(i.netIncome).toBeCloseTo(i.noi - i.capex, 9);
    expect(monthlyIncomeBreakdown({
      monthlyRent: DEAL_DEFAULTS.rent,
      monthlyCosts: DEAL_DEFAULTS.monthlyCosts,
      annualPropertyTax: DEAL_DEFAULTS.propertyTax,
      vacancyRate: DEAL_DEFAULTS.vacancyRate,
      managementRate: DEAL_DEFAULTS.managementRate,
      capexRate: DEAL_DEFAULTS.capexRate,
    })).toEqual(i);
  });

  it('produces the four profile scores', () => {
    expect(d.dealScores.map(s => s.metric)).toEqual(['DSCR', 'Cash-on-Cash', 'Net Yield', 'GRM']);
    d.dealScores.forEach(s => {
      expect(s.score).toBeGreaterThanOrEqual(10);
      expect(s.score).toBeLessThanOrEqual(100);
    });
  });

  it('produces projections, an exit scenario and three stress scenarios', () => {
    expect(d.projections?.period).toBe(DEAL_DEFAULTS.bankLoanPeriod);
    expect(d.exitScenario).not.toBeNull();
    expect(d.stressScenarios.map(s => s.label)).toEqual(['Optimistic', 'Base', 'Pessimistic']);
  });

  it('ranks the stress scenarios in the expected order', () => {
    const [opt, base, pess] = d.stressScenarios;
    expect(opt.cashflowY1).toBeGreaterThanOrEqual(base.cashflowY1);
    expect(base.cashflowY1).toBeGreaterThanOrEqual(pess.cashflowY1);
  });

  it('states the model caveats', () => {
    expect(MODEL_CAVEATS.length).toBeGreaterThan(0);
    expect(MODEL_CAVEATS.join(' ')).toMatch(/pre-tax/i);
  });
});

describe('analyzeDeal on a cash purchase', () => {
  const d = analyzeDeal(CASH_PURCHASE);

  it('has no debt service', () => {
    expect(d.monthlyMortgageExact).toBe(0);
    expect(d.totalMortgageInterest).toBe('0');
    expect(d.ltv).toBe('0.0');
  });

  it('reports an unconstrained DSCR', () => {
    expect(d.dscr).toBe('∞');
    expect(d.dealScores.find(s => s.metric === 'DSCR')?.score).toBe(100);
  });

  it('puts the whole purchase in as equity', () => {
    expect(Number(d.downPayment)).toBe(Number(d.totalPrice));
    expect(d.cashOnCash).not.toBe('N/A');
  });
});

describe('analyzeDeal on an over-financed purchase', () => {
  const d = analyzeDeal(OVER_FINANCED);

  it('has a negative down payment', () => {
    expect(Number(d.downPayment)).toBeLessThan(0);
  });

  it('refuses to report a return on equity that is not at risk', () => {
    expect(d.cashOnCash).toBe('N/A');
    expect(d.exitScenario?.roi).toBe('N/A');
    expect(d.exitScenario?.annualizedRoi).toBe('N/A');
  });

  it('still reports the operating indicators', () => {
    expect(Number(d.grossYield)).toBeGreaterThan(0);
    expect(Number(d.dscr)).toBeLessThan(1);
  });
});

describe('analyzeDeal edge cases', () => {
  it('returns null projections without a loan period', () => {
    expect(analyzeDeal({ ...DEAL_DEFAULTS, bankLoanPeriod: 0 }).projections).toBeNull();
  });

  it('survives an empty deal without producing NaN strings', () => {
    const zero = Object.fromEntries(
      Object.keys(DEAL_DEFAULTS).map(k => [k, 0])
    ) as unknown as DealInputs;
    const d = analyzeDeal(zero);
    for (const value of [d.grossYield, d.netYield, d.ltv, d.grm, d.capRate, d.onePercentRule, d.oer]) {
      expect(value).not.toMatch(/NaN/);
    }
  });
});
