import type { ConnectorAdapter } from "./types";
import { createRecentTrend, truncate } from "./utils";

type ParsedEvent = {
  id: string;
  title: string;
  timestamp?: string;
};

const unfoldIcsText = (text: string): string[] => {
  return text
    .replace(/\r\n[ \t]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim());
};

const parseIcsEvents = (icsText: string): ParsedEvent[] => {
  const lines = unfoldIcsText(icsText);
  const events: ParsedEvent[] = [];
  let current: Partial<ParsedEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (current?.id && current.title) {
        events.push({ id: current.id, title: current.title, timestamp: current.timestamp });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    if (line.startsWith("UID:")) {
      current.id = line.replace("UID:", "");
    } else if (line.startsWith("SUMMARY:")) {
      current.title = truncate(line.replace("SUMMARY:", ""));
    } else if (line.startsWith("DTSTART")) {
      const [, value] = line.split(":");
      if (value) {
        const normalized = value.length === 8 ? `${value}T000000Z` : value;
        current.timestamp = normalized;
      }
    }
  }

  return events;
};

export const appleCalendarIcsAdapter: ConnectorAdapter = {
  type: "APPLE_CALENDAR_ICS",
  validateConfig(config) {
    if (typeof config.icsUrl !== "string" || config.icsUrl.length === 0) {
      return { valid: false, message: "ICS URL is required." };
    }
    return { valid: true };
  },
  async fetchData(config) {
    const icsUrl = String(config.icsUrl ?? "");
    const response = await fetch(icsUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`ICS fetch failed: ${response.status}`);
    }

    const text = await response.text();
    const events = parseIcsEvents(text)
      .filter((event) => Boolean(event.timestamp))
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return aTime - bTime;
      });

    const now = Date.now();
    const upcoming = events.filter((event) => {
      if (!event.timestamp) return false;
      return new Date(event.timestamp).getTime() >= now;
    });

    return {
      summary: [
        { key: "events_total", label: "Events", value: events.length },
        { key: "upcoming", label: "Upcoming", value: upcoming.length },
      ],
      items: upcoming.slice(0, 20),
      timeline: upcoming.slice(0, 20),
      chart: createRecentTrend(upcoming.length || 2),
    };
  },
};
