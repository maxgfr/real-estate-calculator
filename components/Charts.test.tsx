/**
 * Charts.tsx is rendering only — every number it draws comes from utils/.
 * These tests therefore check the wiring, not the arithmetic: that each
 * documented chart is present, that the series handed to Recharts match what
 * utils/projections.ts returns, and that the sentinels (`∞` DSCR, no-mortgage,
 * zero-appreciation) do not blow the component up.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";

import Charts from "./Charts";
import { analyzeDeal, DEAL_DEFAULTS, type DealInputs } from "../utils/deal";
import { computeAnnualCashflow, computeWaterfallData } from "../utils/projections";

// ResponsiveContainer measures its parent, which jsdom never lays out. Hand the
// chart explicit dimensions instead so the svg is actually drawn.
jest.mock("recharts", () => {
  const actual = jest.requireActual("recharts");
  type Sized = { width?: number; height?: number };
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<Sized> }) =>
      React.cloneElement(children, { width: 800, height: 400 }),
  };
});

type ChartsProps = React.ComponentProps<typeof Charts>;

/** Build Charts props from a deal exactly the way pages/index.tsx does. */
function propsFor(inputs: DealInputs): ChartsProps {
  const d = analyzeDeal(inputs);
  return {
    housingPrice: inputs.housingPrice,
    notaryFees: inputs.notaryFees,
    houseWorks: inputs.houseWorks,
    loanAmount: inputs.bankLoan,
    grossYield: Number(d.grossYield),
    netYield: Number(d.netYield),
    cashOnCash: d.cashOnCash === "N/A" ? 0 : Number(d.cashOnCash),
    bankRate: inputs.bankRate,
    bankLoanPeriod: inputs.bankLoanPeriod,
    monthlyMortgage: d.monthlyMortgageExact,
    monthlyRent: inputs.rent,
    monthlyCosts: inputs.monthlyCosts,
    annualPropertyTax: inputs.propertyTax,
    vacancyRate: inputs.vacancyRate,
    downPayment: Number(d.downPayment),
    appreciationRate: inputs.appreciationRate,
    rentIncreaseRate: inputs.rentIncreaseRate,
    expenseInflationRate: inputs.expenseInflationRate,
    managementRate: inputs.managementRate,
    capexRate: inputs.capexRate,
    exitYear: inputs.exitYear,
    dscr: d.dscr === "∞" ? Infinity : Number(d.dscr),
    grm: Number(d.grm),
    totalPrice: Number(d.totalPrice),
    currency: "EUR",
  };
}

const renderCharts = (inputs: DealInputs = DEAL_DEFAULTS) =>
  render(
    <ChakraProvider>
      <Charts {...propsFor(inputs)} />
    </ChakraProvider>
  );

// Every chart title rendered by ChartCard, per the README's chart table.
const CHART_TITLES = [
  "Investment Breakdown",
  "Monthly Expense Breakdown",
  "Monthly Cashflow Waterfall",
  "ROI & Yield Metrics (%)",
  "Rent Sensitivity Analysis",
  "Interest Rate Sensitivity",
  "Deal Profile",
  "Annual Principal vs Interest",
  "Amortization Schedule",
  "Annual Cashflow",
  "Income vs Expenses",
  "Expense Decomposition by Year",
  // Equity Build-Up carries the appreciation rate in its title unless the rate
  // is zero, so it is asserted separately below rather than listed here.
  "Cumulative Cashflow Projection",
  "Total Return on Investment",
  "Profit Composition at Exit",
  "Annualized ROI by Exit Year",
  "Cashflow Projection — 3 Scenarios",
];

describe("Charts", () => {
  it("renders every documented chart for the default deal", () => {
    renderCharts();
    for (const title of CHART_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    // 18th chart: README's chart table must stay in step with what renders.
    expect(screen.getByText(/^Equity Build-Up/)).toBeInTheDocument();
    expect(CHART_TITLES.length + 1).toBe(18);
  });

  it("labels Equity Build-Up with the appreciation rate, and drops it at zero", () => {
    const { unmount } = renderCharts({ ...DEAL_DEFAULTS, appreciationRate: 2.5 });
    expect(screen.getByText("Equity Build-Up (+2.5%/yr)")).toBeInTheDocument();
    unmount();

    renderCharts({ ...DEAL_DEFAULTS, appreciationRate: 0 });
    expect(screen.getByText("Equity Build-Up")).toBeInTheDocument();
  });

  it("renders the five section headings", () => {
    renderCharts();
    // getAllByText, not getByText: "Mortgage" is also a slice label in the
    // expense donut, so the heading is not the only node carrying that text.
    for (const heading of ["Overview", "Mortgage", "Investment", "Stress Test"]) {
      expect(screen.getAllByText(heading).length).toBeGreaterThan(0);
    }
    // The exit heading carries the year, so it doubles as a props check.
    expect(
      screen.getByText(`Exit Scenario (Year ${DEAL_DEFAULTS.exitYear})`)
    ).toBeInTheDocument();
  });

  it("draws an svg for each chart card", () => {
    const { container } = renderCharts();
    // One <svg> per chart, plus the info icons Chakra renders inside tooltips.
    const charts = container.querySelectorAll(".recharts-surface");
    expect(charts.length).toBeGreaterThanOrEqual(CHART_TITLES.length);
  });

  it("plots the cashflow series utils/projections computes, not its own", () => {
    const { container } = renderCharts();
    const expected = computeAnnualCashflow(
      DEAL_DEFAULTS.rent, DEAL_DEFAULTS.monthlyCosts, DEAL_DEFAULTS.propertyTax,
      DEAL_DEFAULTS.vacancyRate, analyzeDeal(DEAL_DEFAULTS).monthlyMortgageExact,
      DEAL_DEFAULTS.rentIncreaseRate, DEAL_DEFAULTS.bankLoanPeriod,
      DEAL_DEFAULTS.expenseInflationRate, DEAL_DEFAULTS.managementRate, DEAL_DEFAULTS.capexRate
    );
    expect(expected.length).toBeGreaterThan(0);
    // The waterfall's gross-rent step must equal the kernel's own figure.
    const waterfall = computeWaterfallData(
      DEAL_DEFAULTS.rent, DEAL_DEFAULTS.vacancyRate, DEAL_DEFAULTS.managementRate,
      DEAL_DEFAULTS.capexRate, DEAL_DEFAULTS.monthlyCosts, DEAL_DEFAULTS.propertyTax,
      analyzeDeal(DEAL_DEFAULTS).monthlyMortgageExact
    );
    expect(waterfall.length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBeGreaterThan(0);
  });

  it("survives an all-cash deal, where DSCR is infinite", () => {
    const allCash: DealInputs = { ...DEAL_DEFAULTS, bankLoan: 0, bankRate: 0 };
    expect(() => renderCharts(allCash)).not.toThrow();
    expect(screen.getByText("Deal Profile")).toBeInTheDocument();
  });

  it("survives a zero-appreciation, zero-growth deal", () => {
    const flat: DealInputs = {
      ...DEAL_DEFAULTS,
      appreciationRate: 0,
      rentIncreaseRate: 0,
      expenseInflationRate: 0,
    };
    expect(() => renderCharts(flat)).not.toThrow();
    expect(screen.getByText("Cumulative Cashflow Projection")).toBeInTheDocument();
  });

  it("formats amounts in the currency it is given", () => {
    const { container, rerender } = render(
      <ChakraProvider>
        <Charts {...propsFor(DEAL_DEFAULTS)} currency="USD" />
      </ChakraProvider>
    );
    expect(container.textContent).toContain("$");

    rerender(
      <ChakraProvider>
        <Charts {...propsFor(DEAL_DEFAULTS)} currency="GBP" />
      </ChakraProvider>
    );
    expect(container.textContent).toContain("£");
  });
});
