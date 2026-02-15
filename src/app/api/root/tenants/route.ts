import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { getTenantContext } from "@/server/tenant/context";

const createTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  defaultLanguage: z.enum(["ES", "EN", "PT"]).optional(),
  whatsappNumber: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

export async function GET() {
  try {
    await requirePlatformRoot(await getTenantContext());
    const tenants = await prisma.tenant.findMany({
      include: {
        domains: true,
      },
      orderBy: [{ type: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ ok: true, tenants });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list tenants";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requirePlatformRoot(await getTenantContext());
    const payload = createTenantSchema.parse(await request.json());
    const tenant = await prisma.tenant.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        type: "CUSTOMER",
        selfSignupEnabled: true,
        defaultLanguage: payload.defaultLanguage ?? "ES",
        whatsappNumber: payload.whatsappNumber,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      },
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.tenant.created",
      entityType: "Tenant",
      entityId: tenant.id,
      metadata: payload,
    });

    return NextResponse.json({ ok: true, tenant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create tenant";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
