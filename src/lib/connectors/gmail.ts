import type { ConnectorAdapter } from "./types";
import { createRecentTrend, truncate } from "./utils";

type GmailMessagesList = {
  resultSizeEstimate?: number;
  messages?: { id: string; threadId: string }[];
};

type GmailMessage = {
  id: string;
  internalDate?: string;
  payload?: {
    headers?: { name: string; value: string }[];
  };
};

const messageHeader = (message: GmailMessage, key: string): string | undefined =>
  message.payload?.headers?.find((h) => h.name.toLowerCase() === key.toLowerCase())?.value;

export const gmailAdapter: ConnectorAdapter = {
  type: "GMAIL",
  validateConfig(config) {
    if (typeof config.accessToken !== "string" || config.accessToken.length === 0) {
      return { valid: false, message: "Google access token is required for Gmail." };
    }
    return { valid: true };
  },
  async fetchData(config) {
    const accessToken = String(config.accessToken ?? "");
    const query = typeof config.query === "string" ? config.query : "is:unread in:inbox";

    const headers: HeadersInit = { Authorization: `Bearer ${accessToken}` };
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=10`,
      { headers, cache: "no-store" },
    );
    if (!listResponse.ok) {
      throw new Error(`Gmail request failed: ${listResponse.status}`);
    }

    const listJson: GmailMessagesList = await listResponse.json();
    const messages = listJson.messages ?? [];

    const details = await Promise.all(
      messages.slice(0, 8).map(async (message) => {
        const response = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
          { headers, cache: "no-store" },
        );
        if (!response.ok) return null;
        return (await response.json()) as GmailMessage;
      }),
    );

    const items = details
      .filter((msg): msg is GmailMessage => Boolean(msg))
      .map((msg) => ({
        id: msg.id,
        title: truncate(messageHeader(msg, "Subject") ?? "No subject"),
        subtitle: messageHeader(msg, "From"),
        timestamp: msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : undefined,
      }));

    const trendBase = listJson.resultSizeEstimate ?? items.length;
    const trendValue = trendBase > 0 ? trendBase : 3;

    return {
      summary: [
        { key: "unread", label: "Unread", value: listJson.resultSizeEstimate ?? items.length },
        { key: "previewed", label: "Previewed", value: items.length },
      ],
      items,
      timeline: items,
      chart: createRecentTrend(trendValue),
    };
  },
};
