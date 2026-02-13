import { IntegrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { validateConnectorConfig } from "@/lib/connectors";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/data-service";

const updateIntegrationSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = updateIntegrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.integration.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  }

  const mergedConfig = {
    ...parseJson<Record<string, unknown>>(existing.configJson, {}),
    ...(parsed.data.config ?? {}),
  };
  const validation = validateConnectorConfig(existing.type, mergedConfig);

  const integration = await db.integration.update({
    where: { id },
    data: {
      name: parsed.data.name,
      configJson: JSON.stringify(mergedConfig),
      status: validation.valid ? IntegrationStatus.CONNECTED : IntegrationStatus.NEEDS_CONFIGURATION,
      lastError: validation.valid ? null : validation.message,
    },
  });

  return NextResponse.json({
    integration: {
      ...integration,
      config: parseJson(integration.configJson, {}),
    },
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.integration.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
