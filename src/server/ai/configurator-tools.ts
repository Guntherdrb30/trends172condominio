import { z } from "zod";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import {
  createPageDraft,
  publishPage,
  setNavigation,
  setThemeSettings,
  updatePageDraftSections,
} from "@/server/services/site-builder.service";

const setThemeSchema = z.object({
  fontPrimary: z.string().optional(),
  fontSecondary: z.string().optional(),
  headerVideoAssetId: z.string().cuid().optional(),
  headerImageAssetId: z.string().cuid().optional(),
  buttonRadius: z.string().optional(),
  settings: z.unknown().optional(),
});

const setNavigationSchema = z.object({
  locale: z.enum(["es", "en"]).default("es"),
  draftItems: z.unknown().optional(),
  publishedItems: z.unknown().optional(),
});

const createPageDraftSchema = z.object({
  slug: z.string().min(1),
  kind: z.enum(["HOME", "AVAILABILITY", "TYPOLOGY", "AMENITY", "CUSTOM"]).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  template: z.enum(["blank", "home", "availability"]).optional(),
});

const updateSectionsSchema = z.object({
  slug: z.string().min(1),
  sections: z.unknown(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const setSeoSchema = z.object({
  slug: z.string().min(1),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const attachAssetSchema = z.object({
  assetId: z.string().cuid(),
  pageSlug: z.string().min(1),
  blockId: z.string().optional(),
});

const publishPageSchema = z.object({
  slug: z.string().min(1),
});

export const configuratorToolNames = [
  "setThemeSettings",
  "setNavigation",
  "createPageDraft",
  "updatePageDraftSections",
  "setSeo",
  "attachAssetToBlock",
  "publishPage",
] as const;

export type ConfiguratorToolName = (typeof configuratorToolNames)[number];

export async function executeConfiguratorTool(
  ctx: DalContext,
  toolName: ConfiguratorToolName,
  input: unknown,
) {
  switch (toolName) {
    case "setThemeSettings":
      return setThemeSettings(ctx, setThemeSchema.parse(input));
    case "setNavigation":
      return setNavigation(ctx, setNavigationSchema.parse(input));
    case "createPageDraft":
      return createPageDraft(ctx, createPageDraftSchema.parse(input));
    case "updatePageDraftSections":
      return updatePageDraftSections(ctx, updateSectionsSchema.parse(input));
    case "setSeo": {
      const payload = setSeoSchema.parse(input);
      return updatePageDraftSections(ctx, {
        slug: payload.slug,
        sections: undefined,
        seoTitle: payload.seoTitle,
        seoDescription: payload.seoDescription,
      });
    }
    case "attachAssetToBlock": {
      const payload = attachAssetSchema.parse(input);
      const page = await prisma.page.findFirst({
        where: {
          tenantId: ctx.tenantId,
          slug: payload.pageSlug,
        },
        select: {
          id: true,
          currentDraftVersionId: true,
        },
      });
      if (!page) {
        throw new Error("Page not found.");
      }
      const updated = await prisma.asset.updateMany({
        where: {
          id: payload.assetId,
          tenantId: ctx.tenantId,
        },
        data: {
          pageId: page.id,
          pageVersionId: page.currentDraftVersionId,
          blockId: payload.blockId,
        },
      });
      if (updated.count === 0) {
        throw new Error("Asset not found in target tenant.");
      }
      return prisma.asset.findUnique({
        where: {
          id: payload.assetId,
        },
      });
    }
    case "publishPage":
      return publishPage(ctx, publishPageSchema.parse(input));
    default:
      throw new Error("Unsupported configurator tool.");
  }
}
