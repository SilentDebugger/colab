import { describe, expect, it } from "vitest";

import { validateConnectorConfig } from "./index";

describe("connector config validation", () => {
  it("validates required RSS config", () => {
    expect(validateConnectorConfig("RSS", { feedUrls: ["https://example.com/rss.xml"] }).valid).toBe(
      true,
    );
    expect(validateConnectorConfig("RSS", {}).valid).toBe(false);
  });

  it("validates required GitHub config", () => {
    expect(validateConnectorConfig("GITHUB", { owner: "octocat" }).valid).toBe(true);
    expect(validateConnectorConfig("GITHUB", {}).valid).toBe(false);
  });

  it("validates required Gmail config", () => {
    expect(validateConnectorConfig("GMAIL", { accessToken: "token" }).valid).toBe(true);
    expect(validateConnectorConfig("GMAIL", {}).valid).toBe(false);
  });

  it("validates required Google Calendar config", () => {
    expect(validateConnectorConfig("GOOGLE_CALENDAR", { accessToken: "token" }).valid).toBe(true);
    expect(validateConnectorConfig("GOOGLE_CALENDAR", {}).valid).toBe(false);
  });

  it("validates required Apple Calendar ICS config", () => {
    expect(validateConnectorConfig("APPLE_CALENDAR_ICS", { icsUrl: "https://example.com.ics" }).valid)
      .toBe(true);
    expect(validateConnectorConfig("APPLE_CALENDAR_ICS", {}).valid).toBe(false);
  });
});
