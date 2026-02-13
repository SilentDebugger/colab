import { VisualizationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { parseJson } from "@/lib/data-service";

const widgetCreateSchema = z.object({
  dashboardId: z.string().min(1),
  title: z.string().min(2).max(80),
  integrationId: z.string().optional(),
  visualizationType: z.nativeEnum(VisualizationType),
  config: z.record(z.string(), z.unknown()).default({}),
  layout: z
    .object({
      x: z.number().int().min(0).default(0),
      y: z.number().int().min(0).default(0),
      w: z.number().int().min(2).max(12).default(4),
      h: z.number().int().min(2).max(12).default(4),
    })
    .default({ x: 0, y: 0, w: 4, h: 4 }),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = widgetCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { layout, config, ...data } = parsed.data;
  const widget = await db.widget.create({
    data: {
      ...data,
      integrationId: data.integrationId || null,
      configJson: JSON.stringify(config),
      layoutX: layout.x ?? 0,
      layoutY: layout.y ?? 0,
      layoutW: layout.w ?? 4,
      layoutH: layout.h ?? 4,
    },
  });

  return NextResponse.json(
    {
      widget: {
        ...widget,
        config: parseJson(widget.configJson, {}),
      },
    },
    { status: 201 },
  );
}
