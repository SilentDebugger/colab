import { describe, expect, it } from "vitest";

import { createRecentTrend, safeNumber, truncate } from "./utils";

describe("connector utils", () => {
  it("safeNumber should parse numeric values with fallback", () => {
    expect(safeNumber(15)).toBe(15);
    expect(safeNumber("42")).toBe(42);
    expect(safeNumber("abc", 7)).toBe(7);
    expect(safeNumber(undefined, 9)).toBe(9);
  });

  it("truncate should preserve short strings and trim long strings", () => {
    expect(truncate("short text", 50)).toBe("short text");
    expect(truncate("abcdefghijklmnopqrstuvwxyz", 10)).toBe("abcdefghi…");
  });

  it("createRecentTrend should return 7 non-negative points", () => {
    const trend = createRecentTrend(20);
    expect(trend).toHaveLength(7);
    expect(trend.every((point) => typeof point.label === "string")).toBe(true);
    expect(trend.every((point) => point.value >= 0)).toBe(true);
  });
});
