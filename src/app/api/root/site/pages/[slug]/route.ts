import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { updatePageDraftSections } from "@/server/services/site-builder.service";
import { getTenantContext } from "@/server/tenant/context";

const updatePageSchema = z.object({
  sections: z.unknown(),
  title: z.string().optional(),
  description: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  translations: z
    .object({
      es: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          seoTitle: z.string().optional(),
          seoDescription: z.string().optional(),
        })
        .optional(),
      en: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          seoTitle: z.string().optional(),
          seoDescription: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

async function getBuilderContext() {
  const ctx = await getTenantContext();
  requireRole(ctx, ["ROOT"]);
  const scoped = await resolveScopedTenantId({
    role: ctx.role,
    tenantId: ctx.tenantId,
    userId: ctx.userId,
  });
  const dalCtx: DalContext = {
    tenantId: scoped.targetTenantId,
    userId: ctx.userId,
    role: ctx.role,
    privileged: ctx.privileged,
  };
  return { ctx, dalCtx };
}

type RouteParams = {
  params: Promise<{ slug: string }>;
};

async function upsertTranslation(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  locale: "es" | "en";
  field: string;
  value?: string;
}) {
  if (!input.value) return;
  await prisma.translation.upsert({
    where: {
      tenantId_entityType_entityId_field_locale: {
        tenantId: input.tenantId,
        entityType: input.entityType,
        entityId: input.entityId,
        field: input.field,
        locale: input.locale,
      },
    },
    update: {
      value: input.value,
    },
    create: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      locale: input.locale,
      value: input.value,
    },
  });
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { dalCtx } = await getBuilderContext();
    const { slug } = await params;
    const page = await prisma.page.findFirst({
      where: {
        tenantId: dalCtx.tenantId,
        slug,
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
        },
        currentDraftVersion: true,
        publishedVersion: true,
      },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch page";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { ctx, dalCtx } = await getBuilderContext();
    const { slug } = await params;
    const payload = updatePageSchema.parse(await request.json());
    const draft = await updatePageDraftSections(dalCtx, {
      slug,
      sections: payload.sections,
      title: payload.title,
      description: payload.description,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
    });

    const page = await prisma.page.findFirst({
      where: { tenantId: dalCtx.tenantId, slug },
      select: { id: true },
    });

    if (page && payload.translations) {
      for (const locale of ["es", "en"] as const) {
        const entry = payload.translations[locale];
        if (!entry) continue;
        await Promise.all([
          upsertTranslation({
            tenantId: dalCtx.tenantId,
            entityType: "Page",
            entityId: page.id,
            locale,
            field: "title",
            value: entry.title,
          }),
          upsertTranslation({
            tenantId: dalCtx.tenantId,
            entityType: "Page",
            entityId: page.id,
            locale,
            field: "description",
            value: entry.description,
          }),
          upsertTranslation({
            tenantId: dalCtx.tenantId,
            entityType: "PageVersion",
            entityId: draft.id,
            locale,
            field: "seoTitle",
            value: entry.seoTitle,
          }),
          upsertTranslation({
            tenantId: dalCtx.tenantId,
            entityType: "PageVersion",
            entityId: draft.id,
            locale,
            field: "seoDescription",
            value: entry.seoDescription,
          }),
        ]);
      }
    }

    await writeAuditLog(
      {
        tenantId: dalCtx.tenantId,
        userId: ctx.userId,
        role: ctx.role,
        privileged: ctx.privileged,
      },
      {
        action: "root.site.page_draft.updated",
        entityType: "PageVersion",
        entityId: draft.id,
      },
    );

    return NextResponse.json({ ok: true, draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update page draft";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

