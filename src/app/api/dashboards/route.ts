import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { listDashboards, parseJson } from "@/lib/data-service";

const createDashboardSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(180).optional(),
});

export async function GET() {
  const dashboards = await listDashboards();
  return NextResponse.json({ dashboards });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const dashboard = await db.dashboard.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
    },
    include: { widgets: true },
  });

  return NextResponse.json(
    {
      dashboard: {
        ...dashboard,
        widgets: dashboard.widgets.map((widget) => ({
          ...widget,
          config: parseJson(widget.configJson, {}),
        })),
      },
    },
    { status: 201 },
  );
}
