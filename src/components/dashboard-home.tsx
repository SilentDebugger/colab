"use client";

import { IntegrationStatus, IntegrationType, VisualizationType } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, Calendar, Github, Mail, Newspaper, Plus, RefreshCw } from "lucide-react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout/legacy";
import { useMemo, useState, useTransition } from "react";

import type { ConnectorPayload } from "@/lib/connectors/types";
import type { DashboardView, IntegrationView } from "@/lib/types";

const AutoWidthGrid = WidthProvider(GridLayout);

const integrationTypeMeta: Record<
  IntegrationType,
  { title: string; subtitle: string; icon: React.ReactNode }
> = {
  RSS: {
    title: "RSS",
    subtitle: "News and blog feeds",
    icon: <Newspaper className="h-4 w-4" />,
  },
  GITHUB: {
    title: "GitHub",
    subtitle: "Repos, issues, activity",
    icon: <Github className="h-4 w-4" />,
  },
  GMAIL: {
    title: "Gmail",
    subtitle: "Unread and thread summaries",
    icon: <Mail className="h-4 w-4" />,
  },
  GOOGLE_CALENDAR: {
    title: "Google Calendar",
    subtitle: "Upcoming events",
    icon: <Calendar className="h-4 w-4" />,
  },
  APPLE_CALENDAR_ICS: {
    title: "Apple Calendar (ICS)",
    subtitle: "Private ICS subscription",
    icon: <Activity className="h-4 w-4" />,
  },
};

const statusClass: Record<IntegrationStatus, string> = {
  CONNECTED: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  ERROR: "text-rose-300 bg-rose-500/10 border-rose-500/30",
  NEEDS_CONFIGURATION: "text-amber-300 bg-amber-500/10 border-amber-500/30",
};

type Props = {
  dashboards: DashboardView[];
  integrations: IntegrationView[];
};

type WidgetFormState = {
  title: string;
  integrationId: string;
  visualizationType: VisualizationType;
  metricKey: string;
  itemLimit: string;
};

const defaultWidgetForm: WidgetFormState = {
  title: "",
  integrationId: "",
  visualizationType: VisualizationType.STAT,
  metricKey: "",
  itemLimit: "6",
};

type IntegrationFormState = {
  name: string;
  type: IntegrationType;
  feedUrls: string;
  owner: string;
  repo: string;
  token: string;
  accessToken: string;
  query: string;
  calendarId: string;
  icsUrl: string;
};

const defaultIntegrationForm: IntegrationFormState = {
  name: "",
  type: IntegrationType.RSS,
  feedUrls: "",
  owner: "",
  repo: "",
  token: "",
  accessToken: "",
  query: "is:unread in:inbox",
  calendarId: "primary",
  icsUrl: "",
};

const formatDate = (iso?: string) => {
  if (!iso) return "No date";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString();
};

const viewPayload = (
  visualization: VisualizationType,
  payload: ConnectorPayload | null,
  metricKey?: string,
  itemLimit = 6,
) => {
  if (!payload) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
        No data yet. Refresh integration to populate this widget.
      </div>
    );
  }

  switch (visualization) {
    case "STAT": {
      const metric = payload.summary.find((m) => m.key === metricKey) ?? payload.summary[0];
      if (!metric) {
        return <p className="text-sm text-zinc-400">No summary metric available.</p>;
      }
      return (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-zinc-500">{metric.label}</p>
          <p className="text-4xl font-semibold text-zinc-50">{metric.value.toLocaleString()}</p>
        </div>
      );
    }
    case "LIST":
      return (
        <ul className="space-y-2">
          {payload.items.slice(0, itemLimit).map((item) => (
            <li key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
              <p className="text-sm font-medium text-zinc-100">{item.title}</p>
              {item.subtitle ? <p className="text-xs text-zinc-400">{item.subtitle}</p> : null}
            </li>
          ))}
        </ul>
      );
    case "TIMELINE":
      return (
        <ul className="space-y-3">
          {payload.timeline.slice(0, itemLimit).map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="mt-2 h-2 w-2 rounded-full bg-cyan-400" />
              <div>
                <p className="text-sm text-zinc-100">{item.title}</p>
                <p className="text-xs text-zinc-400">{formatDate(item.timestamp)}</p>
              </div>
            </li>
          ))}
        </ul>
      );
    case "CHART":
      return (
        <div className="space-y-2">
          {payload.chart.map((point) => (
            <div key={point.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{point.label}</span>
                <span>{point.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{ width: `${Math.min(100, Math.max(4, point.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
};

export function DashboardHome({ dashboards, integrations }: Props) {
  const [selectedDashboardId, setSelectedDashboardId] = useState(dashboards[0]?.id ?? "");
  const [widgetForm, setWidgetForm] = useState<WidgetFormState>(defaultWidgetForm);
  const [integrationForm, setIntegrationForm] =
    useState<IntegrationFormState>(defaultIntegrationForm);
  const [dashboardName, setDashboardName] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedDashboard = useMemo(
    () => dashboards.find((dashboard) => dashboard.id === selectedDashboardId) ?? dashboards[0],
    [dashboards, selectedDashboardId],
  );

  const layout: Layout = useMemo(
    () =>
      selectedDashboard?.widgets.map((widget) => ({
        i: widget.id,
        x: widget.layoutX,
        y: widget.layoutY,
        w: widget.layoutW,
        h: widget.layoutH,
        minW: 2,
        minH: 2,
      })) ?? [],
    [selectedDashboard],
  );

  const integrationMap = useMemo(
    () => new Map(integrations.map((integration) => [integration.id, integration])),
    [integrations],
  );

  const buildIntegrationConfig = () => {
    switch (integrationForm.type) {
      case "RSS":
        return {
          feedUrls: integrationForm.feedUrls
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        };
      case "GITHUB":
        return {
          owner: integrationForm.owner,
          repo: integrationForm.repo,
          token: integrationForm.token,
        };
      case "GMAIL":
        return {
          accessToken: integrationForm.accessToken,
          query: integrationForm.query,
        };
      case "GOOGLE_CALENDAR":
        return {
          accessToken: integrationForm.accessToken,
          calendarId: integrationForm.calendarId,
        };
      case "APPLE_CALENDAR_ICS":
        return {
          icsUrl: integrationForm.icsUrl,
        };
      default:
        return {};
    }
  };

  const refreshPage = () => {
    window.location.reload();
  };

  const api = async (url: string, options?: RequestInit) => {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed: ${response.status}`);
    }
    return response.json();
  };

  const onCreateDashboard = () => {
    if (!dashboardName.trim()) return;
    startTransition(async () => {
      await api("/api/dashboards", {
        method: "POST",
        body: JSON.stringify({ name: dashboardName, description: "Custom home dashboard" }),
      });
      setDashboardName("");
      refreshPage();
    });
  };

  const onCreateIntegration = () => {
    if (!integrationForm.name.trim()) return;
    startTransition(async () => {
      await api("/api/integrations", {
        method: "POST",
        body: JSON.stringify({
          name: integrationForm.name,
          type: integrationForm.type,
          config: buildIntegrationConfig(),
        }),
      });
      setIntegrationForm(defaultIntegrationForm);
      refreshPage();
    });
  };

  const onRefreshIntegration = (id: string) => {
    startTransition(async () => {
      await api(`/api/integrations/${id}/refresh`, { method: "POST" });
      refreshPage();
    });
  };

  const onDeleteIntegration = (id: string) => {
    startTransition(async () => {
      await api(`/api/integrations/${id}`, { method: "DELETE" });
      refreshPage();
    });
  };

  const onCreateWidget = () => {
    if (!selectedDashboard || !widgetForm.title.trim()) return;
    startTransition(async () => {
      await api("/api/widgets", {
        method: "POST",
        body: JSON.stringify({
          dashboardId: selectedDashboard.id,
          title: widgetForm.title,
          integrationId: widgetForm.integrationId || undefined,
          visualizationType: widgetForm.visualizationType,
          config: {
            metricKey: widgetForm.metricKey || undefined,
            itemLimit: Number(widgetForm.itemLimit || "6"),
          },
          layout: { x: 0, y: 0, w: 4, h: 4 },
        }),
      });
      setWidgetForm(defaultWidgetForm);
      refreshPage();
    });
  };

  const onDeleteWidget = (id: string) => {
    startTransition(async () => {
      await api(`/api/widgets/${id}`, { method: "DELETE" });
      refreshPage();
    });
  };

  const onLayoutSave = (nextLayout: Layout) => {
    startTransition(async () => {
      await Promise.all(
        nextLayout.map((entry) =>
          api(`/api/widgets/${entry.i}`, {
            method: "PATCH",
            body: JSON.stringify({
              layout: { x: entry.x, y: entry.y, w: entry.w, h: entry.h },
            }),
          }),
        ),
      );
      refreshPage();
    });
  };

  if (!selectedDashboard) {
    return <div className="p-6 text-zinc-200">No dashboard available.</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Home</p>
            <h1 className="mt-1 text-xl font-semibold">Personal Dashboard Studio</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Craft a calm command center with widgets that match your workflow.
            </p>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <label className="text-xs uppercase tracking-wide text-zinc-500">Dashboard</label>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              value={selectedDashboard.id}
              onChange={(event) => setSelectedDashboardId(event.target.value)}
            >
              {dashboards.map((dashboard) => (
                <option key={dashboard.id} value={dashboard.id}>
                  {dashboard.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                value={dashboardName}
                onChange={(event) => setDashboardName(event.target.value)}
                placeholder="New dashboard name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={onCreateDashboard}
                className="rounded-lg bg-cyan-500/20 px-3 text-cyan-200 hover:bg-cyan-500/30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <h2 className="text-sm font-semibold">Integrations</h2>
            <div className="space-y-2">
              {integrations.length === 0 ? (
                <p className="text-sm text-zinc-500">No integrations yet.</p>
              ) : (
                integrations.map((integration) => (
                  <div key={integration.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {integrationTypeMeta[integration.type].icon}
                        <div>
                          <p className="text-sm">{integration.name}</p>
                          <p className="text-xs text-zinc-500">{integrationTypeMeta[integration.type].subtitle}</p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusClass[integration.status]}`}
                      >
                        {integration.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {integration.lastSyncedAt
                        ? `Synced ${formatDistanceToNow(new Date(integration.lastSyncedAt), { addSuffix: true })}`
                        : "Not synced yet"}
                    </p>
                    {integration.lastError ? (
                      <p className="mt-1 text-[11px] text-rose-300">{integration.lastError}</p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onRefreshIntegration(integration.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteIntegration(integration.id)}
                        className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <h3 className="text-sm font-semibold">Add integration</h3>
            <input
              value={integrationForm.name}
              onChange={(event) =>
                setIntegrationForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Integration name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
            <select
              value={integrationForm.type}
              onChange={(event) =>
                setIntegrationForm((prev) => ({
                  ...prev,
                  type: event.target.value as IntegrationType,
                }))
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            >
              {Object.entries(integrationTypeMeta).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.title}
                </option>
              ))}
            </select>

            {integrationForm.type === "RSS" ? (
              <input
                value={integrationForm.feedUrls}
                onChange={(event) =>
                  setIntegrationForm((prev) => ({ ...prev, feedUrls: event.target.value }))
                }
                placeholder="Comma-separated feed URLs"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            ) : null}
            {integrationForm.type === "GITHUB" ? (
              <div className="space-y-2">
                <input
                  value={integrationForm.owner}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, owner: event.target.value }))
                  }
                  placeholder="Owner/org"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <input
                  value={integrationForm.repo}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, repo: event.target.value }))
                  }
                  placeholder="Repo (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <input
                  value={integrationForm.token}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, token: event.target.value }))
                  }
                  placeholder="PAT (optional)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            {integrationForm.type === "GMAIL" ? (
              <div className="space-y-2">
                <input
                  value={integrationForm.accessToken}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, accessToken: event.target.value }))
                  }
                  placeholder="Google access token"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <input
                  value={integrationForm.query}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, query: event.target.value }))
                  }
                  placeholder="Gmail query"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            {integrationForm.type === "GOOGLE_CALENDAR" ? (
              <div className="space-y-2">
                <input
                  value={integrationForm.accessToken}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, accessToken: event.target.value }))
                  }
                  placeholder="Google access token"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <input
                  value={integrationForm.calendarId}
                  onChange={(event) =>
                    setIntegrationForm((prev) => ({ ...prev, calendarId: event.target.value }))
                  }
                  placeholder="Calendar ID (primary)"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
            {integrationForm.type === "APPLE_CALENDAR_ICS" ? (
              <input
                value={integrationForm.icsUrl}
                onChange={(event) =>
                  setIntegrationForm((prev) => ({ ...prev, icsUrl: event.target.value }))
                }
                placeholder="Private ICS URL"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              />
            ) : null}

            <button
              type="button"
              onClick={onCreateIntegration}
              className="w-full rounded-lg bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
            >
              Create integration
            </button>
          </section>
        </aside>

        <main className="space-y-4">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Active Dashboard</p>
                <h2 className="text-xl font-semibold">{selectedDashboard.name}</h2>
                {selectedDashboard.description ? (
                  <p className="text-sm text-zinc-400">{selectedDashboard.description}</p>
                ) : null}
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-4">
                <input
                  value={widgetForm.title}
                  onChange={(event) =>
                    setWidgetForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Widget title"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                />
                <select
                  value={widgetForm.integrationId}
                  onChange={(event) =>
                    setWidgetForm((prev) => ({ ...prev, integrationId: event.target.value }))
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value="">No data source</option>
                  {integrations.map((integration) => (
                    <option key={integration.id} value={integration.id}>
                      {integration.name}
                    </option>
                  ))}
                </select>
                <select
                  value={widgetForm.visualizationType}
                  onChange={(event) =>
                    setWidgetForm((prev) => ({
                      ...prev,
                      visualizationType: event.target.value as VisualizationType,
                    }))
                  }
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                >
                  <option value={VisualizationType.STAT}>Stat</option>
                  <option value={VisualizationType.LIST}>List</option>
                  <option value={VisualizationType.TIMELINE}>Timeline</option>
                  <option value={VisualizationType.CHART}>Chart</option>
                </select>
                <button
                  type="button"
                  onClick={onCreateWidget}
                  className="rounded-lg bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
                >
                  Add widget
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300">Canvas</h3>
              <p className="text-xs text-zinc-500">
                Drag and resize widgets, then release to auto-save layout.
              </p>
            </div>

            {selectedDashboard.widgets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 p-10 text-center text-zinc-400">
                No widgets yet. Add your first widget from the panel above.
              </div>
            ) : (
              <AutoWidthGrid
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={42}
                margin={[12, 12]}
                isResizable
                isDraggable
                onDragStop={(nextLayout) => onLayoutSave(nextLayout)}
                onResizeStop={(nextLayout) => onLayoutSave(nextLayout)}
              >
                {selectedDashboard.widgets.map((widget) => {
                  const integration = widget.integrationId
                    ? integrationMap.get(widget.integrationId)
                    : undefined;
                  const metricKey =
                    typeof widget.config.metricKey === "string" ? widget.config.metricKey : undefined;
                  const itemLimit =
                    typeof widget.config.itemLimit === "number"
                      ? widget.config.itemLimit
                      : Number(widget.config.itemLimit ?? 6);

                  return (
                    <div key={widget.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-sm">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{widget.title}</p>
                          <p className="text-xs text-zinc-500">
                            {integration?.name ?? "No integration"} · {widget.visualizationType}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteWidget(widget.id)}
                          className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                        >
                          Remove
                        </button>
                      </div>
                      {viewPayload(
                        widget.visualizationType,
                        integration?.snapshotPayload ?? null,
                        metricKey,
                        itemLimit,
                      )}
                    </div>
                  );
                })}
              </AutoWidthGrid>
            )}
          </section>
        </main>
      </div>
      {isPending ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 mx-auto mb-5 w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-100">
          Updating your home…
        </div>
      ) : null}
    </div>
  );
}
