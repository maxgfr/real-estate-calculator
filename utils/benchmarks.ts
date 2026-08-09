// The thresholds every surface grades a deal against. They lived inline in
// pages/index.tsx and again in mcp/server.ts, which is how the README's
// published table drifted away from what the code actually does. One table now,
// documented in README.md under "Benchmarks" — keep the two in step.

export type Rating = "excellent" | "good" | "weak";

/** Metrics that carry a rating. Cashflow is judged on its sign, not a threshold. */
export type RatedMetric =
  | "netYield"
  | "cashOnCash"
  | "dscr"
  | "capRate"
  | "onePercentRule"
  | "grm"
  | "oer";

type Benchmark = {
  /** "higher" — at or above the bound is better. "lower" — at or below is better. */
  direction: "higher" | "lower";
  excellent: number;
  good: number;
};

export const BENCHMARKS: Record<RatedMetric, Benchmark> = {
  netYield: { direction: "higher", excellent: 5, good: 3 },
  cashOnCash: { direction: "higher", excellent: 8, good: 4 },
  dscr: { direction: "higher", excellent: 1.5, good: 1.25 },
  capRate: { direction: "higher", excellent: 6, good: 4 },
  onePercentRule: { direction: "higher", excellent: 1, good: 0.7 },
  grm: { direction: "lower", excellent: 15, good: 20 },
  oer: { direction: "lower", excellent: 40, good: 60 },
};

/** Bounds are inclusive: a net yield of exactly 5% is excellent. */
export function rateMetric(metric: RatedMetric, value: number): Rating {
  const { direction, excellent, good } = BENCHMARKS[metric];
  if (direction === "higher") {
    if (value >= excellent) return "excellent";
    return value >= good ? "good" : "weak";
  }
  if (value <= excellent) return "excellent";
  return value <= good ? "good" : "weak";
}

/**
 * Rate an indicator straight off `analyzeDeal`, which returns formatted strings
 * with sentinels. `'∞'` (no mortgage) is excellent — nothing to service.
 * `'N/A'` (no equity at risk) has no rating at all.
 */
export function rateIndicator(metric: RatedMetric, raw: string | number): Rating | null {
  if (raw === "N/A") return null;
  if (raw === "∞") return "excellent";
  const value = Number(raw);
  return Number.isNaN(value) ? null : rateMetric(metric, value);
}

/**
 * DSCR has a fourth band the rating scale does not express: at or above 1.0 the
 * mortgage is covered, but below 1.25 it still sits under the usual lender
 * minimum. The UI shows that as neutral rather than red.
 */
export const DSCR_COVERS_DEBT = 1.0;
