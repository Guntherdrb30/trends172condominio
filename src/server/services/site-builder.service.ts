import { PageKind, PageVersionStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";
import { getTranslationMap } from "@/server/services/translation.service";

type PageDraftInput = {
  slug: string;
  kind?: PageKind;
  title?: string;
  description?: string;
  template?: "blank" | "home" | "availability";
};

function defaultSections(template: PageDraftInput["template"]) {
  if (template === "home") {
    return [
      {
        id: "hero-1",
        type: "hero",
        props: {
          title: "Vive el lujo con control total.",
          subtitle: "Condo Sales OS 2026",
          ctaLabel: "Ver masterplan",
          ctaHref: "/availability",
        },
      },
    ];
  }
  if (template === "availability") {
    return [
      {
        id: "masterplan-1",
        type: "masterplan",
        props: {
          title: "Masterplan",
        },
      },
    ];
  }
  return [];
}

export async function listPages(ctx: DalContext) {
  assertTenantContext(ctx);
  return prisma.page.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      currentDraftVersion: true,
      publishedVersion: true,
      _count: {
        select: {
          versions: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });
}

export async function getPublishedPage(input: {
  tenantId: string;
  slug: string;
  locale?: string;
}) {
  const page = await prisma.page.findFirst({
    where: {
      tenantId: input.tenantId,
      slug: input.slug,
    },
    include: {
      publishedVersion: true,
      currentDraftVersion: true,
    },
  });
  if (!page) return null;

  const version = page.publishedVersion ?? page.currentDraftVersion;
  if (!version) return null;

  const locale = (input.locale ?? "es").toLowerCase();
  const [pageTranslations, versionTranslations] = await Promise.all([
    getTranslationMap({
      tenantId: input.tenantId,
      entityType: "Page",
      entityId: page.id,
      locale,
    }),
    getTranslationMap({
      tenantId: input.tenantId,
      entityType: "PageVersion",
      entityId: version.id,
      locale,
    }),
  ]);

  return {
    page,
    version,
    title: pageTranslations.get("title") ?? page.title,
    description: pageTranslations.get("description") ?? page.description,
    seoTitle: versionTranslations.get("seoTitle") ?? version.seoTitle,
    seoDescription: versionTranslations.get("seoDescription") ?? version.seoDescription,
  };
}

export async function createPageDraft(ctx: DalContext, input: PageDraftInput) {
  assertTenantContext(ctx);
  const slug = input.slug.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    let page = await tx.page.findFirst({
      where: { tenantId: ctx.tenantId, slug },
    });

    if (!page) {
      page = await tx.page.create({
        data: {
          tenantId: ctx.tenantId,
          slug,
          kind: input.kind,
          title: input.title,
          description: input.description,
        },
      });
    }

    const lastVersion = await tx.pageVersion.findFirst({
      where: { tenantId: ctx.tenantId, pageId: page.id },
      orderBy: { versionNumber: "desc" },
      select: { versionNumber: true },
    });

    const draft = await tx.pageVersion.create({
      data: {
        tenantId: ctx.tenantId,
        pageId: page.id,
        versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
        status: PageVersionStatus.DRAFT,
        sections: defaultSections(input.template),
        createdById: ctx.userId,
      },
    });

    await tx.page.update({
      where: { id: page.id },
      data: {
        currentDraftVersionId: draft.id,
      },
    });

    return draft;
  });
}

export async function updatePageDraftSections(
  ctx: DalContext,
  input: {
    slug: string;
    sections: unknown;
    title?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
  },
) {
  assertTenantContext(ctx);

  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({
      where: { tenantId: ctx.tenantId, slug: input.slug },
      select: { id: true, currentDraftVersionId: true },
    });
    if (!page?.currentDraftVersionId) {
      throw new Error("No draft version found for this page.");
    }

    const draft = await tx.pageVersion.update({
      where: { id: page.currentDraftVersionId },
      data: {
        sections: (input.sections ?? undefined) as Prisma.InputJsonValue | undefined,
        seoTitle: input.seoTitle,
        seoDescription: input.seoDescription,
      },
    });

    await tx.page.update({
      where: { id: page.id },
      data: {
        title: input.title,
        description: input.description,
      },
    });

    return draft;
  });
}

export async function publishPage(ctx: DalContext, input: { slug: string }) {
  assertTenantContext(ctx);
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({
      where: { tenantId: ctx.tenantId, slug: input.slug },
      select: { id: true, currentDraftVersionId: true },
    });
    if (!page?.currentDraftVersionId) {
      throw new Error("No draft available to publish.");
    }

    const published = await tx.pageVersion.update({
      where: { id: page.currentDraftVersionId },
      data: {
        status: PageVersionStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await tx.page.update({
      where: { id: page.id },
      data: {
        publishedVersionId: published.id,
      },
    });

    return published;
  });
}

export async function rollbackPage(ctx: DalContext, input: { slug: string; versionNumber: number }) {
  assertTenantContext(ctx);
  return prisma.$transaction(async (tx) => {
    const page = await tx.page.findFirst({
      where: { tenantId: ctx.tenantId, slug: input.slug },
      select: { id: true },
    });
    if (!page) {
      throw new Error("Page not found.");
    }

    const version = await tx.pageVersion.findFirst({
      where: {
        tenantId: ctx.tenantId,
        pageId: page.id,
        versionNumber: input.versionNumber,
      },
    });
    if (!version) {
      throw new Error("Requested version not found.");
    }

    await tx.page.update({
      where: { id: page.id },
      data: {
        publishedVersionId: version.id,
      },
    });

    await tx.pageVersion.update({
      where: { id: version.id },
      data: {
        status: PageVersionStatus.PUBLISHED,
      },
    });

    return version;
  });
}

export async function setNavigation(
  ctx: DalContext,
  input: {
    locale: string;
    draftItems?: unknown;
    publishedItems?: unknown;
  },
) {
  assertTenantContext(ctx);
  return prisma.siteNavigation.upsert({
    where: {
      tenantId_locale: {
        tenantId: ctx.tenantId,
        locale: input.locale.toLowerCase(),
      },
    },
    update: {
      draftItems: (input.draftItems ?? undefined) as Prisma.InputJsonValue | undefined,
      publishedItems: (input.publishedItems ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    create: {
      tenantId: ctx.tenantId,
      locale: input.locale.toLowerCase(),
      draftItems: (input.draftItems ?? undefined) as Prisma.InputJsonValue | undefined,
      publishedItems: (input.publishedItems ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function setThemeSettings(
  ctx: DalContext,
  input: {
    fontPrimary?: string;
    fontSecondary?: string;
    headerVideoAssetId?: string;
    headerImageAssetId?: string;
    buttonRadius?: string;
    settings?: unknown;
  },
) {
  assertTenantContext(ctx);
  return prisma.themeSettings.upsert({
    where: {
      tenantId: ctx.tenantId,
    },
    update: {
      fontPrimary: input.fontPrimary,
      fontSecondary: input.fontSecondary,
      headerVideoAssetId: input.headerVideoAssetId,
      headerImageAssetId: input.headerImageAssetId,
      buttonRadius: input.buttonRadius,
      settings: (input.settings ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    create: {
      tenantId: ctx.tenantId,
      fontPrimary: input.fontPrimary,
      fontSecondary: input.fontSecondary,
      headerVideoAssetId: input.headerVideoAssetId,
      headerImageAssetId: input.headerImageAssetId,
      buttonRadius: input.buttonRadius,
      settings: (input.settings ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
