#!/usr/bin/env node
/**
 * Local MCP server exposing this calculator's engine.
 *
 * Every tool delegates to `utils/`, the same modules the web app renders from,
 * so a figure quoted in a conversation is the figure the page would show for
 * the same inputs. No formula is reimplemented here.
 *
 * Run with `node mcp/server.ts` — Node 24 strips the types natively, which is
 * why the relative imports below carry explicit `.ts` extensions.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { rateIndicator } from "../utils/benchmarks.ts";
import { analyzeDeal, DEAL_DEFAULTS, MODEL_CAVEATS, type DealInputs } from "../utils/deal.ts";
import {
  computeAmortization,
  computeAnnualCashflow,
  computeBreakevenYear,
  computeCumulativeCashflow,
  computeEquityBuildUp,
  computeRateSensitivity,
  computeRentSensitivity,
  computeROIByExitYear,
  computeTotalReturn,
  computeWaterfallData,
} from "../utils/projections.ts";
import { serializeStateToQuery } from "../utils/state.ts";

const APP_URL = "https://maxgfr.github.io/real-estate-calculator/";

// Bounds mirror the input constraints in pages/index.tsx.
const dealShape = {
  housingPrice: z.number().min(0).default(DEAL_DEFAULTS.housingPrice)
    .describe("Purchase price, excluding closing costs and renovation"),
  notaryFees: z.number().min(0).default(DEAL_DEFAULTS.notaryFees)
    .describe("Closing costs: notary, agency commission, registration taxes. Typically 7-10% of the price for an existing property in France"),
  houseWorks: z.number().min(0).default(DEAL_DEFAULTS.houseWorks)
    .describe("Renovation budget. Added to the property's base value"),
  appreciationRate: z.number().min(-10).max(20).default(DEAL_DEFAULTS.appreciationRate)
    .describe("Annual property appreciation, %"),
  exitYear: z.number().int().min(1).max(50).default(DEAL_DEFAULTS.exitYear)
    .describe("Year of the planned sale"),
  bankLoan: z.number().min(0).default(DEAL_DEFAULTS.bankLoan)
    .describe("Amount borrowed. The down payment is the total cost minus this"),
  bankRate: z.number().min(0).max(20).default(DEAL_DEFAULTS.bankRate)
    .describe("Annual mortgage interest rate, %. Excludes mortgage insurance"),
  bankLoanPeriod: z.number().int().min(1).max(50).default(DEAL_DEFAULTS.bankLoanPeriod)
    .describe("Loan term, years"),
  rent: z.number().min(0).default(DEAL_DEFAULTS.rent)
    .describe("Gross monthly rent, before vacancy and expenses"),
  propertyTax: z.number().min(0).default(DEAL_DEFAULTS.propertyTax)
    .describe("Annual property tax (taxe foncière)"),
  monthlyCosts: z.number().min(0).default(DEAL_DEFAULTS.monthlyCosts)
    .describe("Monthly fixed costs: building fees, landlord insurance, upkeep"),
  managementRate: z.number().min(0).max(100).default(DEAL_DEFAULTS.managementRate)
    .describe("Management fees as a % of effective rent. One month of rent a year is 8.33%"),
  capexRate: z.number().min(0).max(50).default(DEAL_DEFAULTS.capexRate)
    .describe("CapEx reserve as a % of gross rent. 5-10% is the usual range"),
  vacancyRate: z.number().min(0).max(100).default(DEAL_DEFAULTS.vacancyRate)
    .describe("Share of the year the unit sits empty, %. 5% is about 18 days"),
  rentIncreaseRate: z.number().min(-10).max(20).default(DEAL_DEFAULTS.rentIncreaseRate)
    .describe("Annual rent increase, %"),
  expenseInflationRate: z.number().min(-5).max(20).default(DEAL_DEFAULTS.expenseInflationRate)
    .describe("Annual inflation applied to fixed costs and property tax, %"),
};

function summarize(inputs: DealInputs) {
  const d = analyzeDeal(inputs);
  return {
    purchase: {
      price: inputs.housingPrice,
      closingCosts: inputs.notaryFees,
      renovation: inputs.houseWorks,
      totalInvestment: Number(d.totalPrice),
      downPayment: Number(d.downPayment),
      ltvPercent: Number(d.ltv),
    },
    mortgage: {
      loanAmount: inputs.bankLoan,
      monthlyPayment: Math.round(d.monthlyMortgageExact),
      totalInterest: Number(d.totalMortgageInterest),
      totalCredit: Number(d.totalMortgageCost),
      totalOperationCost: Number(d.totalOperationCost),
    },
    monthlyIncome: {
      grossRent: Math.round(d.income.grossRent),
      vacancyLoss: -Math.round(d.income.vacancyLoss),
      managementFees: -Math.round(d.income.managementFees),
      capexReserve: -Math.round(d.income.capex),
      fixedCosts: -Math.round(d.income.fixedCosts),
      propertyTax: -Math.round(d.income.monthlyPropertyTax),
      netIncome: Math.round(d.income.netIncome),
      mortgage: -Math.round(d.monthlyMortgageExact),
      cashflow: Math.round(d.cashflowExact),
      breakEvenRent: Number(d.breakEvenRent),
    },
    indicators: {
      grossYieldPercent: Number(d.grossYield),
      netYieldPercent: { value: Number(d.netYield), rating: rateIndicator("netYield", d.netYield) },
      cashOnCashPercent: { value: d.cashOnCash, rating: rateIndicator("cashOnCash", d.cashOnCash) },
      dscr: { value: d.dscr, rating: rateIndicator("dscr", d.dscr) },
      capRatePercent: { value: Number(d.capRate), rating: rateIndicator("capRate", d.capRate) },
      grm: { value: Number(d.grm), rating: rateIndicator("grm", d.grm) },
      onePercentRulePercent: { value: Number(d.onePercentRule), rating: rateIndicator("onePercentRule", d.onePercentRule) },
      oerPercent: { value: Number(d.oer), rating: rateIndicator("oer", d.oer) },
      noiAnnual: Math.round(Number(d.noi)),
    },
    dealProfileScores: d.dealScores,
    caveats: MODEL_CAVEATS,
  };
}

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

const server = new McpServer({ name: "real-estate-calculator", version: "1.0.0" });

server.registerTool(
  "compute_metrics",
  {
    title: "Compute deal indicators",
    description:
      "Full indicator set for one property: purchase and loan totals, the monthly income waterfall, " +
      "and every ratio (gross/net yield, cash-on-cash, DSCR, cap rate, GRM, 1% rule, OER, LTV, break-even rent) " +
      "rated against the app's benchmarks. Pre-tax model — see `caveats` in the response.",
    inputSchema: dealShape,
  },
  async (inputs) => json(summarize(inputs as DealInputs))
);

server.registerTool(
  "compute_projections",
  {
    title: "Project the deal over time",
    description:
      "Year-by-year projection to ten years past loan repayment (capped at 40): cumulative cashflow, " +
      "equity build-up, total return, and the payback year. Rents grow and expenses inflate each year.",
    inputSchema: dealShape,
  },
  async (inputs) => {
    const p = inputs as DealInputs;
    const d = analyzeDeal(p);
    const dp = Number(d.downPayment);
    const base = p.housingPrice + p.houseWorks;
    const args = [
      dp, p.rent, p.monthlyCosts, p.propertyTax, p.vacancyRate, d.monthlyMortgageExact,
      p.rentIncreaseRate, p.bankLoanPeriod, p.expenseInflationRate, p.managementRate, p.capexRate,
    ] as const;

    return json({
      atLoanEnd: d.projections,
      paybackYear: computeBreakevenYear(...args),
      annualCashflow: computeAnnualCashflow(
        p.rent, p.monthlyCosts, p.propertyTax, p.vacancyRate, d.monthlyMortgageExact,
        p.rentIncreaseRate, p.bankLoanPeriod, p.expenseInflationRate, p.managementRate, p.capexRate
      ),
      cumulativeCashflow: computeCumulativeCashflow(...args),
      equityBuildUp: computeEquityBuildUp(
        p.bankLoan, p.bankRate, p.bankLoanPeriod, d.monthlyMortgageExact, base, p.appreciationRate
      ),
      totalReturn: computeTotalReturn(
        dp, p.rent, p.monthlyCosts, p.propertyTax, p.vacancyRate, d.monthlyMortgageExact,
        p.rentIncreaseRate, p.bankLoanPeriod, p.bankLoan, p.bankRate, base, p.appreciationRate,
        p.expenseInflationRate, p.managementRate, p.capexRate
      ),
      amortization: computeAmortization(p.bankLoan, p.bankRate, p.bankLoanPeriod, d.monthlyMortgageExact),
      caveats: MODEL_CAVEATS,
    });
  }
);

server.registerTool(
  "compute_exit_scenario",
  {
    title: "Value the exit",
    description:
      "Sale price, remaining loan balance, cumulative cashflow, total profit, ROI and annualized ROI " +
      "for the planned exit year, plus the annualized ROI for every other exit year so the best holding " +
      "period is visible. Annualized ROI is a CAGR on the down payment, not an IRR; a null entry means " +
      "the loss would exceed the whole down payment. Ignores capital gains tax and selling costs.",
    inputSchema: dealShape,
  },
  async (inputs) => {
    const p = inputs as DealInputs;
    const d = analyzeDeal(p);
    return json({
      exitYear: p.exitYear,
      scenario: d.exitScenario,
      annualizedRoiByExitYear: computeROIByExitYear(
        p.housingPrice, p.houseWorks, p.appreciationRate, p.bankLoan, p.bankRate, p.bankLoanPeriod,
        d.monthlyMortgageExact, Number(d.downPayment), p.rent, p.monthlyCosts, p.propertyTax,
        p.vacancyRate, p.managementRate, p.rentIncreaseRate, p.expenseInflationRate, p.capexRate
      ),
      caveats: MODEL_CAVEATS,
    });
  }
);

server.registerTool(
  "compute_stress_test",
  {
    title: "Stress the deal",
    description:
      "Optimistic / base / pessimistic scenarios varying vacancy, rent growth and expense inflation, " +
      "with year-1 and year-10 cashflow, DSCR, payback year and total return for each. Also returns " +
      "rent and interest-rate sensitivity grids. The scenarios themselves do not stress the interest rate — " +
      "read `rateSensitivity` for that.",
    inputSchema: dealShape,
  },
  async (inputs) => {
    const p = inputs as DealInputs;
    const d = analyzeDeal(p);
    return json({
      scenarios: d.stressScenarios.map(({ annualData, ...rest }) => ({
        ...rest,
        cashflowByYear: annualData,
      })),
      rentSensitivity: computeRentSensitivity(
        p.rent, p.monthlyCosts, p.propertyTax, p.vacancyRate, d.monthlyMortgageExact,
        Number(d.totalPrice), p.managementRate, p.capexRate
      ),
      rateSensitivity: computeRateSensitivity(
        p.rent, p.monthlyCosts, p.propertyTax, p.vacancyRate, p.managementRate, p.capexRate,
        p.bankLoan, p.bankRate, p.bankLoanPeriod
      ),
      monthlyWaterfall: computeWaterfallData(
        p.rent, p.vacancyRate, p.managementRate, p.capexRate, p.monthlyCosts, p.propertyTax,
        d.monthlyMortgageExact
      ),
      caveats: MODEL_CAVEATS,
    });
  }
);

server.registerTool(
  "compare_deals",
  {
    title: "Compare several properties",
    description:
      "Run two or more deals through the same engine and return a side-by-side table ranked by " +
      "annual cashflow, with the headline indicators for each. Use this rather than calling " +
      "compute_metrics repeatedly when the question is which property is better.",
    inputSchema: {
      deals: z.array(
        z.object({ label: z.string().describe("How to refer to this property"), ...dealShape })
      ).min(2).max(10).describe("The properties to compare"),
    },
  },
  async ({ deals }) => {
    const rows = (deals as (DealInputs & { label: string })[]).map(({ label, ...inputs }) => {
      const d = analyzeDeal(inputs);
      return {
        label,
        totalInvestment: Number(d.totalPrice),
        downPayment: Number(d.downPayment),
        monthlyCashflow: Math.round(d.cashflowExact),
        annualCashflow: Math.round(d.cashflowExact * 12),
        grossYieldPercent: Number(d.grossYield),
        netYieldPercent: Number(d.netYield),
        cashOnCashPercent: d.cashOnCash,
        dscr: d.dscr,
        capRatePercent: Number(d.capRate),
        grm: Number(d.grm),
        paybackYear: d.projections?.breakevenYear ?? null,
        exitRoiPercent: d.exitScenario?.roi ?? null,
        annualizedExitRoiPercent: d.exitScenario?.annualizedRoi ?? null,
      };
    });

    rows.sort((a, b) => b.annualCashflow - a.annualCashflow);
    return json({
      rankedByAnnualCashflow: rows,
      note: "Ranked on cashflow only. A deal can rank low here and still win on total return — compare exitRoiPercent and paybackYear too.",
      caveats: MODEL_CAVEATS,
    });
  }
);

server.registerTool(
  "build_share_url",
  {
    title: "Build a shareable link",
    description:
      "Turn a set of inputs into a link that opens the calculator pre-filled with them. " +
      "Give this to the user so they can explore the deal themselves.",
    inputSchema: {
      ...dealShape,
      currency: z.enum(["EUR", "USD", "GBP", "CHF", "CAD"]).default("EUR"),
    },
  },
  async ({ currency, ...inputs }) => {
    const query = serializeStateToQuery({ ...(inputs as DealInputs), currency: String(currency) });
    return json({ url: `${APP_URL}?${new URLSearchParams(query).toString()}` });
  }
);

await server.connect(new StdioServerTransport());
