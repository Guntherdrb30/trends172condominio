import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { createDalContext } from "@/server/dal/context";
import { writeAuditLog } from "@/server/dal/audit-log";
import {
  createPrivilegedToken,
  getPrivilegedCookieName,
  getPrivilegedTtlSeconds,
} from "@/server/security/privileged-mode";
import { getTenantContext } from "@/server/tenant/context";

const verifyRootSchema = z.object({
  masterKey: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    requireRole(ctx, ["ADMIN", "ROOT"]);

    const body = verifyRootSchema.parse(await request.json());
    const rootKey = process.env.ROOT_MASTER_KEY;
    if (!rootKey || body.masterKey !== rootKey) {
      return NextResponse.json({ error: "Invalid root key" }, { status: 401 });
    }

    const token = createPrivilegedToken(ctx.userId, ctx.tenantId);
    const cookieStore = await cookies();
    cookieStore.set(getPrivilegedCookieName(), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getPrivilegedTtlSeconds(),
      path: "/",
    });

    await writeAuditLog(createDalContext(ctx), {
      action: "root.privileged.verify",
      entityType: "session",
      metadata: {
        ttlSeconds: getPrivilegedTtlSeconds(),
      },
    });

    return NextResponse.json({
      ok: true,
      privilegedUntil: Date.now() + getPrivilegedTtlSeconds() * 1000,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}

