import { COLOR_MODE_KEY, LEGACY_COLOR_MODE_KEY, colorModeManager } from "./colorMode";

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe("color mode on a shared origin", () => {
  it("keeps the choice under a key of its own", () => {
    colorModeManager.set("dark");
    expect(localStorage.getItem(COLOR_MODE_KEY)).toBe("dark");
    expect(localStorage.getItem(LEGACY_COLOR_MODE_KEY)).toBeNull();
    expect(colorModeManager.get()).toBe("dark");
  });

  it("starts from Chakra's generic key once, without deleting it", () => {
    localStorage.setItem(LEGACY_COLOR_MODE_KEY, "light");
    expect(colorModeManager.get()).toBe("light");
    expect(localStorage.getItem(COLOR_MODE_KEY)).toBe("light");
    expect(localStorage.getItem(LEGACY_COLOR_MODE_KEY)).toBe("light");

    // Another site changing the generic key no longer changes ours.
    localStorage.setItem(LEGACY_COLOR_MODE_KEY, "dark");
    expect(colorModeManager.get()).toBe("light");
  });

  it("ignores a foreign or corrupted value", () => {
    localStorage.setItem(LEGACY_COLOR_MODE_KEY, "{oops");
    expect(colorModeManager.get("light")).toBe("light");
  });

  it("never throws when storage refuses", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(() => colorModeManager.set("dark")).not.toThrow();
    expect(colorModeManager.get()).toBeUndefined();
  });
});
