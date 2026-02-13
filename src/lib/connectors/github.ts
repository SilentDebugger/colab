import type { ConnectorAdapter } from "./types";
import { createRecentTrend, safeNumber } from "./utils";

type GitHubRepo = {
  name: string;
  full_name: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
};

type GitHubEvent = {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
};

export const githubAdapter: ConnectorAdapter = {
  type: "GITHUB",
  validateConfig(config) {
    if (typeof config.owner !== "string" || config.owner.length === 0) {
      return { valid: false, message: "Owner/organization is required." };
    }
    return { valid: true };
  },
  async fetchData(config) {
    const owner = String(config.owner ?? "");
    const repo = typeof config.repo === "string" ? config.repo : "";
    const token = typeof config.token === "string" ? config.token : "";

    const headers: HeadersInit = {
      Accept: "application/vnd.github+json",
      "User-Agent": "home-dashboard",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const repoUrl = repo
      ? `https://api.github.com/repos/${owner}/${repo}`
      : `https://api.github.com/users/${owner}/repos?sort=updated&per_page=8`;
    const eventsUrl = `https://api.github.com/users/${owner}/events/public?per_page=12`;

    const [repoResponse, eventsResponse] = await Promise.all([
      fetch(repoUrl, { headers, cache: "no-store" }),
      fetch(eventsUrl, { headers, cache: "no-store" }),
    ]);

    if (!repoResponse.ok) {
      throw new Error(`GitHub request failed: ${repoResponse.status}`);
    }
    if (!eventsResponse.ok) {
      throw new Error(`GitHub events failed: ${eventsResponse.status}`);
    }

    const repoData = await repoResponse.json();
    const repos: GitHubRepo[] = Array.isArray(repoData) ? repoData : [repoData];
    const events: GitHubEvent[] = await eventsResponse.json();

    const stars = repos.reduce((sum, r) => sum + safeNumber(r.stargazers_count), 0);
    const issues = repos.reduce((sum, r) => sum + safeNumber(r.open_issues_count), 0);

    return {
      summary: [
        { key: "repos", label: "Repos", value: repos.length },
        { key: "stars", label: "Stars", value: stars },
        { key: "open_issues", label: "Open issues", value: issues },
      ],
      items: repos.map((r) => ({
        id: r.full_name,
        title: r.name,
        subtitle: `${r.stargazers_count}★ · ${r.forks_count} forks · ${r.open_issues_count} issues`,
        url: r.html_url,
      })),
      timeline: events.map((event) => ({
        id: event.id,
        title: event.type.replace(/Event$/, ""),
        subtitle: event.repo.name,
        timestamp: event.created_at,
      })),
      chart: createRecentTrend(Math.max(issues, repos.length)),
    };
  },
};
