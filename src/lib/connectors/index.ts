import type { IntegrationType } from "@prisma/client";

import { appleCalendarIcsAdapter } from "./appleCalendarIcs";
import { githubAdapter } from "./github";
import { gmailAdapter } from "./gmail";
import { googleCalendarAdapter } from "./googleCalendar";
import { rssAdapter } from "./rss";
import type { ConnectorAdapter, ConnectorConfig, ConnectorPayload } from "./types";

const adapters: Record<IntegrationType, ConnectorAdapter> = {
  RSS: rssAdapter,
  GITHUB: githubAdapter,
  GMAIL: gmailAdapter,
  GOOGLE_CALENDAR: googleCalendarAdapter,
  APPLE_CALENDAR_ICS: appleCalendarIcsAdapter,
};

export const connectorTypes = Object.keys(adapters) as IntegrationType[];

export const getAdapter = (type: IntegrationType): ConnectorAdapter => adapters[type];

export const validateConnectorConfig = (type: IntegrationType, config: ConnectorConfig) =>
  adapters[type].validateConfig(config);

export const fetchConnectorData = async (
  type: IntegrationType,
  config: ConnectorConfig,
): Promise<ConnectorPayload> => {
  return adapters[type].fetchData(config);
};
