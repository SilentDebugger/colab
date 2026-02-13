import type { Dashboard, Integration, VisualizationType, Widget } from "@prisma/client";

import type { ConnectorPayload } from "./connectors/types";

export type DashboardWidget = Widget & {
  config: Record<string, unknown>;
};

export type DashboardView = Dashboard & {
  widgets: DashboardWidget[];
};

export type IntegrationView = Integration & {
  config: Record<string, unknown>;
  snapshotPayload: ConnectorPayload | null;
};

export type WidgetForm = {
  title: string;
  integrationId?: string;
  visualizationType: VisualizationType;
  metricKey?: string;
  itemLimit?: number;
};
