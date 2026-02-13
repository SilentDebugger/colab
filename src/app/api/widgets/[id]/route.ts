import { VisualizationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { parseJson } from "@/lib/data-service";

const widgetUpdateSchema = z.object({
  title: z.string().min(2).max(80).optional(),
  integrationId: z.string().nullable().optional(),
  visualizationType: z.nativeEnum(VisualizationType).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  layout: z
    .object({
      x: z.number().int().min(0),
      y: z.number().int().min(0),
      w: z.number().int().min(2).max(12),
      h: z.number().int().min(2).max(12),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = widgetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const widget = await db.widget.update({
    where: { id },
    data: {
      title: payload.title,
      integrationId: payload.integrationId,
      visualizationType: payload.visualizationType,
      configJson: payload.config ? JSON.stringify(payload.config) : undefined,
      layoutX: payload.layout?.x,
      layoutY: payload.layout?.y,
      layoutW: payload.layout?.w,
      layoutH: payload.layout?.h,
    },
  });

  return NextResponse.json({
    widget: {
      ...widget,
      config: parseJson(widget.configJson, {}),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.widget.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
