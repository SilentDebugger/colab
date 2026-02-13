import type { ConnectorAdapter } from "./types";
import { createRecentTrend, truncate } from "./utils";

type GCalEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
};

type GCalResponse = {
  items?: GCalEvent[];
};

export const googleCalendarAdapter: ConnectorAdapter = {
  type: "GOOGLE_CALENDAR",
  validateConfig(config) {
    if (typeof config.accessToken !== "string" || config.accessToken.length === 0) {
      return { valid: false, message: "Google access token is required." };
    }
    return { valid: true };
  },
  async fetchData(config) {
    const accessToken = String(config.accessToken ?? "");
    const calendarId =
      typeof config.calendarId === "string" && config.calendarId.length > 0
        ? config.calendarId
        : "primary";

    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId,
    )}/events?singleEvents=true&orderBy=startTime&maxResults=20&timeMin=${encodeURIComponent(timeMin)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Google Calendar request failed: ${response.status}`);
    }

    const payload: GCalResponse = await response.json();
    const events = payload.items ?? [];

    const items = events.map((event) => ({
      id: event.id,
      title: truncate(event.summary ?? "Untitled event"),
      timestamp: event.start?.dateTime ?? event.start?.date,
      url: event.htmlLink,
    }));

    return {
      summary: [
        { key: "upcoming", label: "Upcoming", value: items.length },
        { key: "next7", label: "Next 7d", value: Math.min(items.length, 7) },
      ],
      items,
      timeline: items,
      chart: createRecentTrend(items.length || 2),
    };
  },
};
