import {
  BENCHMARKS,
  DSCR_COVERS_DEBT,
  rateIndicator,
  rateMetric,
  type RatedMetric,
} from "./benchmarks";

describe("rateMetric", () => {
  // Every bound is inclusive; the value just under it must drop a band.
  const cases: [RatedMetric, number, number, number][] = [
    // metric, excellent bound, good bound, a clearly weak value
    ["netYield", 5, 3, 1],
    ["cashOnCash", 8, 4, 0],
    ["dscr", 1.5, 1.25, 0.8],
    ["capRate", 6, 4, 2],
    ["onePercentRule", 1, 0.7, 0.3],
  ];

  it.each(cases)("rates %s at its inclusive bounds", (metric, excellent, good, weak) => {
    expect(rateMetric(metric, excellent)).toBe("excellent");
    expect(rateMetric(metric, excellent + 1)).toBe("excellent");
    expect(rateMetric(metric, good)).toBe("good");
    expect(rateMetric(metric, excellent - 0.01)).toBe("good");
    expect(rateMetric(metric, good - 0.01)).toBe("weak");
    expect(rateMetric(metric, weak)).toBe("weak");
  });

  it.each([
    ["grm", 15, 20] as const,
    ["oer", 40, 60] as const,
  ])("rates %s as lower-is-better", (metric, excellent, good) => {
    expect(rateMetric(metric, excellent)).toBe("excellent");
    expect(rateMetric(metric, excellent - 1)).toBe("excellent");
    expect(rateMetric(metric, excellent + 0.01)).toBe("good");
    expect(rateMetric(metric, good)).toBe("good");
    expect(rateMetric(metric, good + 0.01)).toBe("weak");
  });

  it("puts a DSCR that covers the debt but misses the lender minimum in weak", () => {
    expect(DSCR_COVERS_DEBT).toBe(1);
    expect(rateMetric("dscr", 1.1)).toBe("weak");
    expect(1.1).toBeGreaterThan(DSCR_COVERS_DEBT);
  });
});

describe("rateIndicator", () => {
  it("treats no mortgage as excellent, never as zero", () => {
    expect(rateIndicator("dscr", "∞")).toBe("excellent");
    expect(rateIndicator("dscr", "0")).toBe("weak");
  });

  it("returns no rating when there is no equity at risk", () => {
    expect(rateIndicator("cashOnCash", "N/A")).toBeNull();
  });

  it("reads the formatted strings analyzeDeal returns", () => {
    expect(rateIndicator("netYield", "4.63")).toBe("good");
    expect(rateIndicator("netYield", "5.00")).toBe("excellent");
    expect(rateIndicator("grm", "13.9")).toBe("excellent");
  });

  it("returns no rating for a value that is not a number", () => {
    expect(rateIndicator("netYield", "—")).toBeNull();
  });
});

describe("BENCHMARKS", () => {
  it("orders every band so excellent is strictly better than good", () => {
    for (const [metric, b] of Object.entries(BENCHMARKS)) {
      if (b.direction === "higher") {
        expect(b.excellent).toBeGreaterThan(b.good);
      } else {
        expect(b.excellent).toBeLessThan(b.good);
      }
      expect(metric).toBeTruthy();
    }
  });
});
