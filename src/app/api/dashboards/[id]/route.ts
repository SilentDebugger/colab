import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";

const updateDashboardSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(180).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dashboard = await db.dashboard.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ dashboard });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await db.dashboard.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Dashboard not found." }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json(
      { error: "Default dashboard cannot be deleted." },
      { status: 400 },
    );
  }

  await db.dashboard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
