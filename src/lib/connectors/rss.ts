import Parser from "rss-parser";

import type { ConnectorAdapter } from "./types";
import { createRecentTrend, truncate } from "./utils";

const parser = new Parser();

export const rssAdapter: ConnectorAdapter = {
  type: "RSS",
  validateConfig(config) {
    const feedUrls = config.feedUrls;
    if (!Array.isArray(feedUrls) || feedUrls.length === 0) {
      return { valid: false, message: "Add at least one RSS feed URL." };
    }
    return { valid: true };
  },
  async fetchData(config) {
    const urls = Array.isArray(config.feedUrls)
      ? config.feedUrls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [];

    const feeds = await Promise.all(
      urls.slice(0, 5).map(async (url) => {
        const feed = await parser.parseURL(url);
        return feed.items.slice(0, 8).map((item) => ({
          id: `${url}:${item.guid ?? item.id ?? item.link ?? item.title}`,
          title: truncate(item.title ?? "Untitled"),
          subtitle: feed.title,
          url: item.link,
          timestamp: item.pubDate ?? undefined,
        }));
      }),
    );

    const items = feeds.flat().sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

    const total = items.length;

    return {
      summary: [
        { key: "stories", label: "Stories", value: total },
        { key: "sources", label: "Sources", value: urls.length },
      ],
      items: items.slice(0, 20),
      timeline: items.slice(0, 20),
      chart: createRecentTrend(total || 4),
    };
  },
};
