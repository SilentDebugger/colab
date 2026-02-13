import { afterEach, describe, expect, it, vi } from "vitest";

import { appleCalendarIcsAdapter } from "./appleCalendarIcs";

const sampleIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:past-event
SUMMARY:Past Event
DTSTART:20240101T090000Z
END:VEVENT
BEGIN:VEVENT
UID:future-event
SUMMARY:Future Event
DTSTART:20270101T090000Z
END:VEVENT
END:VCALENDAR`;

describe("appleCalendarIcsAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("fetches and parses upcoming events from ICS content", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-13T00:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(sampleIcs, { status: 200 });
      }),
    );

    const payload = await appleCalendarIcsAdapter.fetchData({
      icsUrl: "https://calendar.example.com/private.ics",
    });

    expect(payload.summary.find((item) => item.key === "events_total")?.value).toBe(2);
    expect(payload.summary.find((item) => item.key === "upcoming")?.value).toBe(1);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.title).toBe("Future Event");
  });

  it("throws for failed ICS requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("not found", { status: 404 });
      }),
    );

    await expect(
      appleCalendarIcsAdapter.fetchData({ icsUrl: "https://calendar.example.com/missing.ics" }),
    ).rejects.toThrow("ICS fetch failed: 404");
  });
});
