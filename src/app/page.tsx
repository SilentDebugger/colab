import { unstable_noStore as noStore } from "next/cache";

import { DashboardHome } from "@/components/dashboard-home";
import { ensureDefaultDashboard, listDashboards, listIntegrations } from "@/lib/data-service";
import type { DashboardView, IntegrationView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  noStore();
  await ensureDefaultDashboard();
  const [dashboardsRaw, integrationsRaw] = await Promise.all([
    listDashboards(),
    listIntegrations(),
  ]);

  const dashboards = JSON.parse(JSON.stringify(dashboardsRaw)) as DashboardView[];
  const integrations = JSON.parse(JSON.stringify(integrationsRaw)) as IntegrationView[];

  return <DashboardHome dashboards={dashboards} integrations={integrations} />;
}
