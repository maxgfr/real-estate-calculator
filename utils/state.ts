// State synchronization helpers between URL query params and React state.
// Extracted from pages/index.tsx so the URL ↔ state round-trip can be unit-tested.

export type QueryValue = string | string[] | undefined;
export type QueryRecord = Record<string, QueryValue>;

/**
 * Merge `defaults` with values from `query`, accepting only known keys.
 * Values coming from the URL are always strings; consumers are expected to
 * call `Number(state.x)` if they need numeric coercion.
 *
 * - Unknown keys in `query` are dropped (defends against URL tampering).
 * - Missing keys fall back to the default value.
 * - Array values (e.g. `?x=1&x=2`) take the first element.
 */
export function parseStateFromQuery<T extends Record<string, string | number>>(
  query: QueryRecord,
  defaults: T
): T {
  const result = { ...defaults } as Record<string, string | number>;
  for (const key of Object.keys(defaults)) {
    const raw = query[key];
    if (raw == null) continue;
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (typeof v === "string") result[key] = v;
  }
  return result as T;
}

/**
 * Serialize a state object into a record of strings suitable for `router.replace`.
 * Numbers are stringified; strings pass through. Useful when pushing defaults to
 * the URL on first load to make the link shareable.
 */
export function serializeStateToQuery<T extends Record<string, string | number>>(
  state: T
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(state)) {
    out[key] = String(state[key]);
  }
  return out;
}
