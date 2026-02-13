import { IntegrationStatus, IntegrationType } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { validateConnectorConfig } from "@/lib/connectors";
import { db } from "@/lib/db";
import { listIntegrations, parseJson } from "@/lib/data-service";

const createIntegrationSchema = z.object({
  name: z.string().min(2).max(80),
  type: z.nativeEnum(IntegrationType),
  config: z.record(z.string(), z.unknown()),
});

export async function GET() {
  const integrations = await listIntegrations();
  return NextResponse.json({ integrations });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createIntegrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const validation = validateConnectorConfig(parsed.data.type, parsed.data.config);

  const integration = await db.integration.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      configJson: JSON.stringify(parsed.data.config),
      status: validation.valid ? IntegrationStatus.CONNECTED : IntegrationStatus.NEEDS_CONFIGURATION,
      lastError: validation.valid ? null : validation.message,
    },
  });

  return NextResponse.json(
    {
      integration: {
        ...integration,
        config: parseJson(integration.configJson, {}),
      },
    },
    { status: 201 },
  );
}
