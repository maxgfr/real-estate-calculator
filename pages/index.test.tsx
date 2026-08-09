/**
 * pages/index.tsx owns state, URL sync and the Excel hand-off; every number it
 * shows comes from analyzeDeal. These tests check that ownership: that the page
 * renders the kernel's figures rather than its own, that editing an input flows
 * to both the results and the URL, and that the workbook it exports is built
 * from the same analysis.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";

import Home from "./index";
import { analyzeDeal, DEAL_DEFAULTS } from "../utils/deal";

// Charts are heavy, client-only and covered by their own suite. Record the
// props the page hands them so we can assert the page and the charts agree.
const mockChartsRender = jest.fn();
jest.mock("next/dynamic", () => () => {
  const ChartsStub = (props: Record<string, unknown>) => {
    mockChartsRender(props);
    return <div data-testid="charts" />;
  };
  ChartsStub.displayName = "ChartsStub";
  return ChartsStub;
});

/** Props from the charts' most recent render. */
const lastChartProps = (): Record<string, unknown> =>
  mockChartsRender.mock.calls.at(-1)?.[0] ?? {};

const replace = jest.fn(() => Promise.resolve(true));
let query: Record<string, string> = {};
jest.mock("next/router", () => ({
  useRouter: () => ({
    query,
    isReady: true,
    basePath: "",
    replace,
    push: jest.fn(),
    pathname: "/",
  }),
}));

const writeFile = jest.fn();
jest.mock("xlsx", () => ({
  utils: {
    book_new: jest.fn(() => ({ SheetNames: [], Sheets: {} })),
    book_append_sheet: jest.fn(),
    aoa_to_sheet: jest.fn((rows: unknown[][]) => ({ rows })),
  },
  writeFile: (...args: unknown[]) => writeFile(...args),
}));

const renderPage = () => render(<ChakraProvider><Home /></ChakraProvider>);

/**
 * The value rendered next to a labelled row. Several labels appear both in the
 * at-a-glance summary and in the detail list, and the nesting depth differs
 * between the two, so walk up from the label until an ancestor also carries the
 * value and return whatever follows the label.
 */
const rowValue = (label: string): string => {
  for (const node of screen.getAllByText(label)) {
    let el: HTMLElement | null = node;
    while (el && el.textContent?.trim() === label) el = el.parentElement;
    const text = el?.textContent?.trim() ?? "";
    if (text.startsWith(label) && text.length > label.length) {
      return text.slice(label.length).trim();
    }
  }
  throw new Error(`no value found next to "${label}"`);
};

beforeEach(() => {
  query = {};
  mockChartsRender.mockClear();
  replace.mockClear();
  writeFile.mockClear();
});

describe("calculator page", () => {
  it("renders the headline figures analyzeDeal produces for the defaults", () => {
    const d = analyzeDeal(DEAL_DEFAULTS);
    renderPage();

    expect(screen.getByText("Real Estate ROI Calculator")).toBeInTheDocument();
    // Percentages are rendered with two decimals via toLocaleString("en-US").
    expect(rowValue("Net yield")).toContain(Number(d.netYield).toFixed(2));
    expect(rowValue("Gross yield")).toContain(Number(d.grossYield).toFixed(2));
    expect(rowValue("Loan-to-Value (LTV)")).toContain(Number(d.ltv).toFixed(2));
    expect(rowValue("GRM")).toContain(d.grm);
  });

  it("pushes the defaults to the URL on first load so the link is shareable", async () => {
    renderPage();
    await waitFor(() => expect(replace).toHaveBeenCalled());
    const [{ query: pushed }] = replace.mock.calls[0] as unknown as [
      { query: Record<string, string> }
    ];
    expect(pushed.housingPrice).toBe(String(DEAL_DEFAULTS.housingPrice));
    expect(pushed.currency).toBe("EUR");
    expect(pushed.managementRateUnit).toBe("percent");
  });

  it("hydrates its state from URL query params", () => {
    query = { ...query, housingPrice: "300000", rent: "2000", currency: "USD" };
    renderPage();

    const priceInput = screen.getByLabelText(/Purchase price/) as HTMLInputElement;
    expect(priceInput.value).toBe("300000");

    const d = analyzeDeal({ ...DEAL_DEFAULTS, housingPrice: 300000, rent: 2000 });
    expect(rowValue("Net yield")).toContain(Number(d.netYield).toFixed(2));
  });

  it("recomputes the results and updates the URL when an input changes", async () => {
    const user = userEvent.setup();
    renderPage();

    const before = rowValue("Gross yield");
    const rentInput = screen.getByLabelText(/^Monthly rent/) as HTMLInputElement;
    await user.clear(rentInput);
    await user.type(rentInput, "1500");

    const expected = analyzeDeal({ ...DEAL_DEFAULTS, rent: 1500 });
    await waitFor(() =>
      expect(rowValue("Gross yield")).toContain(Number(expected.grossYield).toFixed(2))
    );
    expect(rowValue("Gross yield")).not.toBe(before);

    const lastCall = replace.mock.calls.at(-1) as unknown as [
      { query: Record<string, string> }
    ];
    expect(lastCall[0].query.rent).toBe("1500");
  });

  it("reformats every amount when the currency changes", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(rowValue("Total investment")).toContain("€");

    await user.click(screen.getByRole("button", { name: "€" }));
    await user.click(await screen.findByText("USD ($)"));

    await waitFor(() => expect(rowValue("Total investment")).toContain("$"));
  });

  it("converts the management fee when its unit switches, keeping the rate identical", async () => {
    const user = userEvent.setup();
    query = { ...query, managementRate: "8.33", managementRateUnit: "percent" };
    renderPage();

    const netYieldBefore = rowValue("Net yield");

    await user.click(screen.getByRole("button", { name: "Management fee unit" }));
    await user.click(await screen.findByText("months / year"));

    // 8.33% of rent ≈ 1 month of rent per year — the displayed unit changes,
    // the underlying economics must not.
    const mgmtInput = screen.getByLabelText(/Management fees \(months\/year\)/) as HTMLInputElement;
    expect(Number(mgmtInput.value)).toBeCloseTo(1, 1);
    await waitFor(() => expect(rowValue("Net yield")).toBe(netYieldBefore));
  });

  it("resets every field back to the defaults", async () => {
    const user = userEvent.setup();
    query = { ...query, housingPrice: "999000" };
    renderPage();
    expect((screen.getByLabelText(/Purchase price/) as HTMLInputElement).value).toBe("999000");

    await user.click(screen.getByRole("button", { name: /Reset/ }));

    await waitFor(() =>
      expect((screen.getByLabelText(/Purchase price/) as HTMLInputElement).value)
        .toBe(String(DEAL_DEFAULTS.housingPrice))
    );
  });

  it("exports a four-sheet workbook built from the same analysis", async () => {
    const user = userEvent.setup();
    const XLSX = jest.requireMock("xlsx") as {
      utils: { book_append_sheet: jest.Mock; aoa_to_sheet: jest.Mock };
    };
    renderPage();

    await user.click(screen.getByRole("button", { name: /Export/ }));

    expect(writeFile).toHaveBeenCalledTimes(1);
    expect(XLSX.utils.book_append_sheet.mock.calls.map((c) => c[2])).toEqual([
      "Purchase", "Mortgage", "Rental", "Results",
    ]);

    // The Purchase sheet must carry analyzeDeal's total, not a re-derivation.
    const purchaseRows = XLSX.utils.aoa_to_sheet.mock.calls[0][0] as (string | number)[][];
    const total = purchaseRows.find((r) => r[0] === "Total");
    expect(total?.[1]).toBe(Number(analyzeDeal(DEAL_DEFAULTS).totalPrice));

    const [, filename] = writeFile.mock.calls[0] as unknown as [unknown, string];
    expect(filename).toMatch(/^rental-roi-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it("hands the charts the same numbers it displays", () => {
    renderPage();
    const d = analyzeDeal(DEAL_DEFAULTS);

    expect(screen.getByTestId("charts")).toBeInTheDocument();
    expect(lastChartProps()).toMatchObject({
      housingPrice: DEAL_DEFAULTS.housingPrice,
      loanAmount: DEAL_DEFAULTS.bankLoan,
      monthlyMortgage: d.monthlyMortgageExact,
      downPayment: Number(d.downPayment),
      totalPrice: Number(d.totalPrice),
      grm: Number(d.grm),
      currency: "EUR",
    });
  });

  it("passes Infinity, not zero, to the charts when there is no mortgage", () => {
    query = { ...query, bankLoan: "0", bankRate: "0" };
    renderPage();
    expect(lastChartProps().dscr).toBe(Infinity);
  });

  it("opens the formulas reference", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Show formulas" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Formulas")).toBeInTheDocument();
  });
});
