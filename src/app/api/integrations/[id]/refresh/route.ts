import { IntegrationStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { fetchConnectorData, validateConnectorConfig } from "@/lib/connectors";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/data-service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const integration = await db.integration.findUnique({ where: { id } });
  if (!integration) {
    return NextResponse.json({ error: "Integration not found." }, { status: 404 });
  }

  const config = parseJson<Record<string, unknown>>(integration.configJson, {});
  const valid = validateConnectorConfig(integration.type, config);
  if (!valid.valid) {
    await db.integration.update({
      where: { id },
      data: {
        status: IntegrationStatus.NEEDS_CONFIGURATION,
        lastError: valid.message,
      },
    });

    return NextResponse.json({ error: valid.message }, { status: 400 });
  }

  try {
    const payload = await fetchConnectorData(integration.type, config);

    const snapshot = await db.dataSnapshot.create({
      data: {
        integrationId: integration.id,
        payloadJson: JSON.stringify(payload),
      },
    });

    const updated = await db.integration.update({
      where: { id },
      data: {
        status: IntegrationStatus.CONNECTED,
        lastError: null,
        lastSyncedAt: snapshot.fetchedAt,
      },
    });

    return NextResponse.json({
      integration: updated,
      snapshot: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected refresh error.";
    await db.integration.update({
      where: { id },
      data: {
        status: IntegrationStatus.ERROR,
        lastError: message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
