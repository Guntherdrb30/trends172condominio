import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { normalizeHost } from "@/server/tenant/normalize-host";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { getTenantContext } from "@/server/tenant/context";

const createDomainSchema = z.object({
  tenantId: z.string().cuid(),
  host: z.string().min(1),
  isPrimary: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requirePlatformRoot(await getTenantContext());
    const payload = createDomainSchema.parse(await request.json());
    const normalizedHost = normalizeHost(payload.host);
    const domain = await prisma.domain.create({
      data: {
        tenantId: payload.tenantId,
        host: normalizedHost,
        normalizedHost,
        isPrimary: payload.isPrimary ?? false,
        allowClientSignup: true,
      },
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.domain.created",
      entityType: "Domain",
      entityId: domain.id,
      metadata: payload,
    });

    return NextResponse.json({ ok: true, domain });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create domain";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
