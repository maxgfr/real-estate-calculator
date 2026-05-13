import { parseStateFromQuery, serializeStateToQuery } from "./state";

// Mirror the page-level default state. Kept here as a fixture so that if the
// page adds/removes a key, this test will break only if the *contract* changes.
const defaultState = {
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
  tenantSearchFeeMonths: 0,
  tenancyDurationYears: 3,
  exitYear: 25,
} as const;

describe("parseStateFromQuery", () => {
  it("returns defaults unchanged when query is empty", () => {
    const result = parseStateFromQuery({}, defaultState);
    expect(result).toEqual(defaultState);
  });

  it("overrides a known key from the URL", () => {
    const result = parseStateFromQuery({ rent: "1200" }, defaultState);
    expect(result.rent).toBe("1200");
    expect(result.housingPrice).toBe(150000);
  });

  it("handles the new tenantSearchFeeMonths from URL", () => {
    const result = parseStateFromQuery({ tenantSearchFeeMonths: "1.5" }, defaultState);
    expect(result.tenantSearchFeeMonths).toBe("1.5");
    // Numeric coercion (what the page does) should round-trip cleanly
    expect(Number(result.tenantSearchFeeMonths)).toBe(1.5);
  });

  it("handles the new tenancyDurationYears from URL", () => {
    const result = parseStateFromQuery({ tenancyDurationYears: "5" }, defaultState);
    expect(result.tenancyDurationYears).toBe("5");
    expect(Number(result.tenancyDurationYears)).toBe(5);
  });

  it("ignores unknown keys (URL tampering / typos)", () => {
    const result = parseStateFromQuery(
      { housingPrice: "200000", unknownKey: "evil", __proto__: "x" },
      defaultState
    );
    expect(result.housingPrice).toBe("200000");
    expect((result as Record<string, unknown>).unknownKey).toBeUndefined();
  });

  it("falls back to default when a key is missing from the URL", () => {
    const result = parseStateFromQuery({ rent: "750" }, defaultState);
    expect(result.tenantSearchFeeMonths).toBe(0);
    expect(result.tenancyDurationYears).toBe(3);
  });

  it("takes the first value when the URL repeats a key", () => {
    const result = parseStateFromQuery({ rent: ["750", "1200"] }, defaultState);
    expect(result.rent).toBe("750");
  });

  it("ignores undefined values", () => {
    const result = parseStateFromQuery({ rent: undefined }, defaultState);
    expect(result.rent).toBe(900);
  });

  it("preserves decimal values for the agency fee parameter", () => {
    // Common parameter examples mentioned by the user: 1, 1.2, 1.5
    for (const v of ["1", "1.2", "1.5", "2", "0"]) {
      const result = parseStateFromQuery({ tenantSearchFeeMonths: v }, defaultState);
      expect(Number(result.tenantSearchFeeMonths)).toBe(Number(v));
    }
  });
});

describe("serializeStateToQuery", () => {
  it("converts numeric values to strings", () => {
    const out = serializeStateToQuery({ rent: 900, vacancyRate: 5 });
    expect(out).toEqual({ rent: "900", vacancyRate: "5" });
  });

  it("preserves all keys (no dropping)", () => {
    const out = serializeStateToQuery(defaultState);
    for (const key of Object.keys(defaultState)) {
      expect(out[key]).toBeDefined();
    }
    expect(out.tenantSearchFeeMonths).toBe("0");
    expect(out.tenancyDurationYears).toBe("3");
  });

  it("round-trips through parseStateFromQuery", () => {
    const serialized = serializeStateToQuery({
      ...defaultState,
      tenantSearchFeeMonths: 1.5,
      tenancyDurationYears: 4,
      rent: 1200,
    });
    const reparsed = parseStateFromQuery(serialized, defaultState);
    expect(Number(reparsed.tenantSearchFeeMonths)).toBe(1.5);
    expect(Number(reparsed.tenancyDurationYears)).toBe(4);
    expect(Number(reparsed.rent)).toBe(1200);
    // unchanged keys still round-trip
    expect(Number(reparsed.housingPrice)).toBe(defaultState.housingPrice);
  });

  it("produces values URLSearchParams can safely encode", () => {
    const out = serializeStateToQuery({
      ...defaultState,
      tenantSearchFeeMonths: 1.5,
    });
    const params = new URLSearchParams(out);
    const url = `?${params.toString()}`;
    // parse back via URL
    const parsed = new URLSearchParams(url);
    expect(parsed.get("tenantSearchFeeMonths")).toBe("1.5");
    expect(parsed.get("tenancyDurationYears")).toBe("3");
    expect(parsed.get("rent")).toBe("900");
  });
});
