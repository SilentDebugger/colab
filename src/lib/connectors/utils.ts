import { subDays } from "date-fns";

import type { ConnectorPoint } from "./types";

export const safeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const createRecentTrend = (base: number): ConnectorPoint[] => {
  return Array.from({ length: 7 }, (_, idx) => {
    const dt = subDays(new Date(), 6 - idx);
    const shift = (idx % 3) - 1;
    return {
      label: dt.toLocaleDateString(undefined, { weekday: "short" }),
      value: Math.max(0, Math.round(base + base * (shift * 0.08))),
    };
  });
};

export const truncate = (input: string, max = 90): string =>
  input.length > max ? `${input.slice(0, max - 1)}…` : input;
