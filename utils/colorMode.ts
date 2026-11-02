/**
 * Where the light/dark choice is remembered.
 *
 * The site is served from maxgfr.github.io, an origin shared by every Pages
 * project of the account, and localStorage belongs to the origin. Chakra's
 * default key, `chakra-ui-color-mode`, is the same in every Chakra app, so
 * picking a theme here changed it on the other sites and the other way round.
 * The choice is kept under a key of our own instead.
 *
 * The old generic key is read once, as a starting value, and never deleted:
 * another site may own it. Every access is guarded: a full or blocked storage
 * only means the choice is not remembered.
 */
export const COLOR_MODE_KEY = "real-estate-calculator:color-mode";
export const LEGACY_COLOR_MODE_KEY = "chakra-ui-color-mode";

/** What Chakra stores: "system" is resolved to one of these before it is saved. */
type ColorModeChoice = "light" | "dark";

const isChoice = (value: unknown): value is ColorModeChoice => value === "light" || value === "dark";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not remembered, nothing else */
  }
}

/** A Chakra `StorageManager` (the shape `ChakraProvider` takes as `colorModeManager`). */
export const colorModeManager = {
  ssr: false,
  type: "localStorage" as const,
  get(init?: ColorModeChoice): ColorModeChoice | undefined {
    if (typeof document === "undefined") return init;
    const own = read(COLOR_MODE_KEY);
    if (isChoice(own)) return own;
    const legacy = read(LEGACY_COLOR_MODE_KEY);
    if (isChoice(legacy)) {
      write(COLOR_MODE_KEY, legacy);
      return legacy;
    }
    return init;
  },
  set(value: ColorModeChoice): void {
    write(COLOR_MODE_KEY, value);
  },
};
