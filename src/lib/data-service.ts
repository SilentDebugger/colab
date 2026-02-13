import type { Dashboard, DataSnapshot, Integration, Widget } from "@prisma/client";

import { db } from "./db";

export const parseJson = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export type IntegrationWithSnapshot = Integration & {
  latestSnapshot: DataSnapshot | null;
  config: Record<string, unknown>;
  snapshotPayload: {
    summary: Array<{ key: string; label: string; value: number }>;
    items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      value?: string;
      url?: string;
      timestamp?: string;
    }>;
    timeline: Array<{
      id: string;
      title: string;
      subtitle?: string;
      value?: string;
      url?: string;
      timestamp?: string;
    }>;
    chart: Array<{ label: string; value: number }>;
  } | null;
};

export type WidgetHydrated = Widget & {
  config: Record<string, unknown>;
};

export type DashboardHydrated = Dashboard & {
  widgets: WidgetHydrated[];
};

export const ensureDefaultDashboard = async (): Promise<DashboardHydrated> => {
  const existing = await db.dashboard.findFirst({
    where: { isDefault: true },
    include: { widgets: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return {
      ...existing,
      widgets: existing.widgets.map((widget) => ({
        ...widget,
        config: parseJson(widget.configJson, {}),
      })),
    };
  }

  const created = await db.dashboard.create({
    data: {
      name: "My Home",
      description: "Your personalized entrepreneur cockpit",
      isDefault: true,
    },
    include: { widgets: true },
  });

  return {
    ...created,
    widgets: [],
  };
};

export const listDashboards = async (): Promise<DashboardHydrated[]> => {
  const dashboards = await db.dashboard.findMany({
    include: { widgets: true },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return dashboards.map((dashboard) => ({
    ...dashboard,
    widgets: dashboard.widgets.map((widget) => ({
      ...widget,
      config: parseJson(widget.configJson, {}),
    })),
  }));
};

export const listIntegrations = async (): Promise<IntegrationWithSnapshot[]> => {
  const integrations = await db.integration.findMany({
    include: {
      snapshots: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return integrations.map((integration) => {
    const latestSnapshot = integration.snapshots[0] ?? null;
    return {
      ...integration,
      latestSnapshot,
      config: parseJson(integration.configJson, {}),
      snapshotPayload: latestSnapshot ? parseJson(latestSnapshot.payloadJson, null) : null,
    };
  });
};
