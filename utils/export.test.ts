import {
  buildExportSheets,
  PURCHASE_LABELS,
  MORTGAGE_LABELS,
  RENTAL_LABELS,
  RESULTS_LABELS,
  STRESS_TEST_LABELS,
  type ExportInputs,
  type ExportMetrics,
  type ExportProjections,
} from './export';
import type { ExitScenarioResult, StressScenarioResult } from './index';
import { computeExitScenario, computeStressScenarios } from './index';

// --- Realistic test fixtures matching default state ---

const inputs: ExportInputs = {
  housingPrice: 150000,
  notaryFees: 12000,
  houseWorks: 0,
  bankLoan: 120000,
  bankRate: 3.5,
  bankLoanPeriod: 25,
  rent: 900,
  propertyTax: 1000,
  monthlyCosts: 120,
  managementRate: 0,
  vacancyRate: 5,
  appreciationRate: 1.5,
  rentIncreaseRate: 1.5,
  expenseInflationRate: 2,
  capexRate: 3,
  exitYear: 25,
};

const metrics: ExportMetrics = {
  totalPrice: 162000,
  downPayment: 42000,
  ltv: '80.00',
  monthlyMortgagePayment: 601,
  totalMortgageCost: 180300,
  totalMortgageInterest: 60300,
  totalOperationCost: 222300,
  netMonthlyIncome: 625,
  cashflow: 24,
  breakEvenRent: 878,
  grossYield: '6.67',
  netYield: '4.63',
  cashOnCash: '6.86',
  dscr: '1.04',
  grm: '13.89',
  capRate: '4.96',
  onePercentRule: '0.60',
  oer: '26.90',
};

const projections: ExportProjections = {
  period: 25,
  propertyValue: 217399,
  rentAtEnd: 1287,
  cashflowAfterLoan: 857,
  cumulativeCashflow: -10523,
  totalReturn: 206876,
  breakevenYear: 27,
  hasAppreciation: true,
  hasRentIncrease: true,
};

const exitScenario: ExitScenarioResult = {
  salePrice: 217399,
  remainingBalance: 0,
  capitalGain: 67399,
  cumulativeCashflow: -10523,
  equityPaid: 120000,
  totalProfit: 206876,
  roi: '492.6',
  annualizedRoi: '7.4',
};

const stressScenarios: StressScenarioResult[] = computeStressScenarios(
  inputs.rent, inputs.monthlyCosts, inputs.propertyTax,
  inputs.vacancyRate, metrics.monthlyMortgagePayment, inputs.rentIncreaseRate,
  inputs.bankLoanPeriod, inputs.expenseInflationRate, inputs.managementRate,
  inputs.capexRate, metrics.downPayment, inputs.housingPrice + inputs.houseWorks,
  inputs.appreciationRate
);

// Helper: extract first-column labels from a sheet (skip header row and empty/separator rows)
function getLabels(sheet: (string | number)[][]): string[] {
  return sheet
    .slice(1)
    .map(row => String(row[0]))
    .filter(label => label !== '' && !label.startsWith('---'));
}

// --- Tests ---

describe('buildExportSheets', () => {
  const sheets = buildExportSheets(inputs, metrics, projections, exitScenario, stressScenarios);

  describe('returns all 4 sheets', () => {
    it('should have purchase, mortgage, rental, results keys', () => {
      expect(Object.keys(sheets)).toEqual(['purchase', 'mortgage', 'rental', 'results']);
    });
  });

  describe('Purchase sheet', () => {
    it('should have correct header', () => {
      expect(sheets.purchase[0]).toEqual(['Item', 'Amount']);
    });

    it('should contain all required labels', () => {
      const labels = getLabels(sheets.purchase);
      for (const expected of PURCHASE_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should have correct input values', () => {
      const rows = Object.fromEntries(sheets.purchase.slice(1).map(r => [r[0], r[1]]));
      expect(rows['Purchase price']).toBe(150000);
      expect(rows['Closing costs']).toBe(12000);
      expect(rows['Renovation budget']).toBe(0);
      expect(rows['Total']).toBe(162000);
    });
  });

  describe('Mortgage sheet', () => {
    it('should have correct header', () => {
      expect(sheets.mortgage[0]).toEqual(['Item', 'Amount', 'Note']);
    });

    it('should contain all required labels', () => {
      const labels = getLabels(sheets.mortgage);
      for (const expected of MORTGAGE_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should have correct input values', () => {
      const rows = Object.fromEntries(sheets.mortgage.slice(1).map(r => [r[0], r[1]]));
      expect(rows['Loan amount']).toBe(120000);
      expect(rows['Duration']).toBe(25);
      expect(rows['Monthly payment']).toBe(601);
    });
  });

  describe('Rental sheet', () => {
    it('should have correct header', () => {
      expect(sheets.rental[0]).toEqual(['Item', 'Amount (Monthly)', 'Amount (Annual)']);
    });

    it('should contain all required labels', () => {
      const labels = getLabels(sheets.rental);
      for (const expected of RENTAL_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should compute effective rent correctly', () => {
      const effRow = sheets.rental.find(r => String(r[0]).includes('Effective rent'));
      expect(effRow).toBeDefined();
      // 900 * (1 - 5/100) = 855
      expect(effRow![1]).toBe(855);
      expect(effRow![2]).toBe(855 * 12);
    });
  });

  describe('Results sheet', () => {
    it('should have correct header', () => {
      expect(sheets.results[0]).toEqual(['Metric', 'Value', 'Note']);
    });

    it('should contain all required result labels', () => {
      const labels = getLabels(sheets.results);
      for (const expected of RESULTS_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should contain all stress test labels when scenarios are provided', () => {
      const labels = getLabels(sheets.results);
      for (const expected of STRESS_TEST_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should have 3 scenario columns for stress test rows', () => {
      const stressHeader = sheets.results.find(r => String(r[0]) === '--- Stress test ---');
      expect(stressHeader).toBeDefined();
      expect(stressHeader![1]).toBe('Optimistic');
      expect(stressHeader![2]).toBe('Base');
      expect(stressHeader![3]).toBe('Pessimistic');
    });

    it('should not have NaN in any numeric cell', () => {
      for (const row of sheets.results) {
        for (const cell of row) {
          if (typeof cell === 'number') {
            expect(isNaN(cell)).toBe(false);
          }
          expect(String(cell)).not.toBe('NaN');
        }
      }
    });
  });

  describe('without stress scenarios', () => {
    const sheetsNoStress = buildExportSheets(inputs, metrics, projections, exitScenario, []);

    it('should still contain all base result labels', () => {
      const labels = getLabels(sheetsNoStress.results);
      for (const expected of RESULTS_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should not contain stress test labels', () => {
      const labels = getLabels(sheetsNoStress.results);
      expect(labels).not.toContain('Cashflow Y1');
    });
  });

  describe('with null projections and exit scenario', () => {
    const sheetsNull = buildExportSheets(inputs, metrics, null, null, stressScenarios);

    it('should still have all result labels with fallback values', () => {
      const labels = getLabels(sheetsNull.results);
      for (const expected of RESULTS_LABELS) {
        expect(labels).toContain(expected);
      }
    });

    it('should use 0 for missing projection values', () => {
      const rows = Object.fromEntries(
        sheetsNull.results.slice(1).map(r => [r[0], r[1]])
      );
      expect(rows['Property value at loan end']).toBe(0);
      expect(rows['Cumulative cashflow']).toBe(0);
      expect(rows['Breakeven year']).toBe('N/A');
      expect(rows['Sale price']).toBe(0);
      expect(rows['ROI']).toBe('N/A');
    });
  });

  describe('edge cases', () => {
    it('should handle cash-on-cash N/A (100% financed)', () => {
      const m = { ...metrics, cashOnCash: 'N/A' };
      const s = buildExportSheets(inputs, m, projections, exitScenario, stressScenarios);
      const row = s.results.find(r => r[0] === 'Cash-on-cash return');
      expect(row![1]).toBe('N/A');
    });

    it('should handle DSCR infinity (cash purchase)', () => {
      const m = { ...metrics, dscr: '∞' };
      const s = buildExportSheets(inputs, m, projections, exitScenario, stressScenarios);
      const row = s.results.find(r => r[0] === 'DSCR');
      expect(row![1]).toBe('∞');
    });

    it('should handle Cap Rate 0 as N/A', () => {
      const m = { ...metrics, capRate: '0' };
      const s = buildExportSheets(inputs, m, projections, exitScenario, stressScenarios);
      const row = s.results.find(r => r[0] === 'Cap Rate');
      expect(row![1]).toBe('N/A');
    });
  });
});

describe('Export label completeness (UI ↔ Export contract)', () => {
  it('PURCHASE_LABELS should match actual purchase sheet rows', () => {
    const sheets = buildExportSheets(inputs, metrics, projections, exitScenario, stressScenarios);
    const actual = getLabels(sheets.purchase);
    expect(actual.sort()).toEqual([...PURCHASE_LABELS].sort());
  });

  it('MORTGAGE_LABELS should match actual mortgage sheet rows', () => {
    const sheets = buildExportSheets(inputs, metrics, projections, exitScenario, stressScenarios);
    const actual = getLabels(sheets.mortgage);
    expect(actual.sort()).toEqual([...MORTGAGE_LABELS].sort());
  });

  it('RENTAL_LABELS should match actual rental sheet rows', () => {
    const sheets = buildExportSheets(inputs, metrics, projections, exitScenario, stressScenarios);
    const actual = getLabels(sheets.rental);
    expect(actual.sort()).toEqual([...RENTAL_LABELS].sort());
  });

  it('RESULTS_LABELS + STRESS_TEST_LABELS should match actual results sheet rows', () => {
    const sheets = buildExportSheets(inputs, metrics, projections, exitScenario, stressScenarios);
    const actual = getLabels(sheets.results);
    // Results also contains input settings rows (Appreciation rate, etc.) that aren't in the UI summary
    const allExpected = [
      ...RESULTS_LABELS,
      ...STRESS_TEST_LABELS,
      // Settings rows (present in export but not in summary FlexRows)
      'Appreciation rate',
      'Rent increase rate',
      'Expense inflation rate',
      'Management fees',
      'CapEx reserve',
    ];
    expect(actual.sort()).toEqual([...allExpected].sort());
  });
});
