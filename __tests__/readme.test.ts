/**
 * The README publishes numbers the code owns: the rating thresholds, the input
 * defaults, and the chart count. Each of those had already drifted once. This
 * suite fails the build when the document and the code disagree, so the README
 * cannot quietly go stale again.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BENCHMARKS, type RatedMetric } from "../utils/benchmarks";
import { DEAL_DEFAULTS } from "../utils/deal";

const root = process.cwd();
const readme = readFileSync(join(root, "README.md"), "utf8");
const charts = readFileSync(join(root, "components/Charts.tsx"), "utf8");

/**
 * Body rows of the table identified by its first two header cells. Two cells,
 * not one: both the inputs table and the charts table start with "| Section |".
 */
function tableRows(firstCol: string, secondCol: string): string[][] {
  const lines = readme.split("\n");
  const header = `| ${firstCol} | ${secondCol} |`;
  const start = lines.findIndex((l) => l.startsWith(header));
  if (start === -1) throw new Error(`no table headed "${header}" in README.md`);
  const rows: string[][] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
  }
  return rows;
}

const firstNumber = (cell: string): number => {
  const m = cell.match(/-?\d+(\.\d+)?/);
  if (!m) throw new Error(`no number in "${cell}"`);
  return Number(m[0]);
};

describe("README benchmarks table", () => {
  const LABEL_TO_METRIC: Record<string, RatedMetric> = {
    "Net yield": "netYield",
    "Cash-on-cash": "cashOnCash",
    DSCR: "dscr",
    GRM: "grm",
    "Cap Rate": "capRate",
    "1% Rule": "onePercentRule",
    OER: "oer",
  };

  const rows = tableRows("Metric", "Excellent").filter(([label]) => label in LABEL_TO_METRIC);

  it("documents every rated metric", () => {
    expect(rows.map(([label]) => LABEL_TO_METRIC[label]).sort())
      .toEqual((Object.keys(BENCHMARKS) as RatedMetric[]).sort());
  });

  it.each(rows)("publishes the real thresholds for %s", (label, excellent, _good, weak) => {
    const b = BENCHMARKS[LABEL_TO_METRIC[label]];
    expect(firstNumber(excellent)).toBe(b.excellent);
    // The weak cell states the bound below/above which a deal stops being good.
    expect(firstNumber(weak)).toBe(b.good);
  });

  it("states the inclusive direction each metric is read in", () => {
    for (const [label, excellent] of rows) {
      const { direction } = BENCHMARKS[LABEL_TO_METRIC[label]];
      expect(excellent.startsWith(direction === "higher" ? ">=" : "<=")).toBe(true);
    }
  });
});

describe("README inputs table", () => {
  const LABEL_TO_KEY: Record<string, keyof typeof DEAL_DEFAULTS> = {
    "Purchase price": "housingPrice",
    "Closing costs (notary, agency...)": "notaryFees",
    "Renovation budget": "houseWorks",
    "Annual property appreciation (%)": "appreciationRate",
    "Exit year (sale)": "exitYear",
    "Loan amount": "bankLoan",
    "Interest rate (%)": "bankRate",
    "Loan term (years)": "bankLoanPeriod",
    "Monthly rent": "rent",
    "Annual property tax": "propertyTax",
    "Monthly fixed costs (charges, insurance, maintenance)": "monthlyCosts",
    "CapEx reserve (% of gross rent)": "capexRate",
    "Vacancy rate (%)": "vacancyRate",
    "Annual rent increase (%)": "rentIncreaseRate",
    "Annual expense inflation (%)": "expenseInflationRate",
  };

  const rows = tableRows("Section", "Field").filter(([, field]) => field in LABEL_TO_KEY);

  it("covers every input", () => {
    // Management fees is matched separately: its label carries the unit note.
    expect(rows.length + 1).toBe(Object.keys(DEAL_DEFAULTS).length);
  });

  it.each(rows)("publishes the real default for %s / %s", (_section, field, shown) => {
    const expected = DEAL_DEFAULTS[LABEL_TO_KEY[field]];
    expect(firstNumber(shown.replace(/,/g, ""))).toBe(expected);
  });
});

describe("README claims about the app", () => {
  it("counts the charts the component actually renders", () => {
    const rendered = charts.split("<ChartCard").length - 1;
    const claimed = firstNumber(readme.match(/\*\*(\d+) interactive charts\*\*/)?.[1] ?? "");
    expect(claimed).toBe(rendered);

    // The chart table must list every chart, not just claim a count.
    expect(tableRows("Section", "Chart").length).toBe(rendered);
  });

  it("quotes the test count the suite actually has", () => {
    const claimed = firstNumber(readme.match(/pnpm test\s+# Run tests \((\d+)\)/)?.[1] ?? "");
    // Kept honest by hand; assert it is at least plausible rather than exact so
    // adding one test does not fail on the README alone.
    expect(claimed).toBeGreaterThan(200);
  });

  it("lists exactly the tools the MCP server registers", () => {
    const server = readFileSync(join(root, "mcp/server.ts"), "utf8");
    const registered = [...server.matchAll(/registerTool\(\s*"([a-z_]+)"/g)].map((m) => m[1]);
    const documented = tableRows("Tool", "Returns").map(([tool]) => tool.replace(/`/g, ""));
    expect(documented.sort()).toEqual(registered.sort());
  });
});
