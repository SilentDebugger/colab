import type { IntegrationType } from "@prisma/client";

export type ConnectorMetric = {
  key: string;
  label: string;
  value: number;
};

export type ConnectorItem = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  url?: string;
  timestamp?: string;
};

export type ConnectorPoint = {
  label: string;
  value: number;
};

export type ConnectorPayload = {
  summary: ConnectorMetric[];
  items: ConnectorItem[];
  timeline: ConnectorItem[];
  chart: ConnectorPoint[];
};

export type ConnectorConfig = Record<string, unknown>;

export type ConnectorAdapter = {
  type: IntegrationType;
  validateConfig: (config: ConnectorConfig) => { valid: boolean; message?: string };
  fetchData: (config: ConnectorConfig) => Promise<ConnectorPayload>;
};
