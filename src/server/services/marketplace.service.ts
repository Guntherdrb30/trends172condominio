import { z } from "zod";

import { prisma } from "@/server/db";

const marketplaceSettingsSchema = z.object({
  heroTypologyIds: z.array(z.string().cuid()).max(10).default([]),
  sponsoredHeroTypologyIds: z.array(z.string().cuid()).max(10).default([]),
  amenitySpotIds: z.array(z.string().cuid()).max(12).default([]),
  contactHeadline: z.string().max(180).default("Contactanos para publicar tu proyecto premium"),
  contactBody: z
    .string()
    .max(360)
    .default("Impulsa ventas, inventario y cobros en un solo sistema para propiedades de alto valor."),
  contactCtaLabel: z.string().max(80).default("Quiero vender con Condo Sales OS"),
  contactCtaHref: z.string().max(220).default("/login"),
});

export type MarketplaceSettings = z.infer<typeof marketplaceSettingsSchema>;

export type MarketplaceHeroItem = {
  typologyId: string;
  typologyName: string;
  typologySlug: string;
  areaM2: number | null;
  basePrice: number | null;
  imageUrl: string | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  projectUrl: string;
  typologyUrl: string;
  sponsored: boolean;
};

export type MarketplaceProjectCard = {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  seoDescription: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  typologyCount: number;
  amenityCount: number;
  projectUrl: string;
};

export type MarketplaceAmenitySpot = {
  amenityId: string;
  amenityTitle: string;
  amenitySlug: string;
  description: string | null;
  imageUrl: string | null;
  tenantId: string;
  tenantName: string;
  projectUrl: string;
  amenityUrl: string;
};

export type MarketplaceSnapshot = {
  settings: MarketplaceSettings;
  hero: MarketplaceHeroItem[];
  projects: MarketplaceProjectCard[];
  amenities: MarketplaceAmenitySpot[];
};

function asNumber(value: unknown) {
  if (!value || typeof value !== "object" || !("toNumber" in value)) {
    return null;
  }
  const decimal = value as { toNumber: () => number };
  return decimal.toNumber();
}

function makeProjectUrl(host: string | null | undefined) {
  if (!host) return "#";
  const normalized = host.trim().toLowerCase();
  if (!normalized) return "#";
  const protocol = normalized.includes("localhost") || normalized.includes("127.0.0.1") ? "http" : "https";
  return `${protocol}://${normalized}`;
}

function parseMarketplaceSettings(rawFeatureFlags: unknown): MarketplaceSettings {
  if (!rawFeatureFlags || typeof rawFeatureFlags !== "object") {
    return marketplaceSettingsSchema.parse({});
  }
  const flags = rawFeatureFlags as Record<string, unknown>;
  const marketplace = flags.marketplace;
  return marketplaceSettingsSchema.parse(marketplace ?? {});
}

export async function getPlatformTenantId() {
  const platform = await prisma.tenant.findFirst({
    where: {
      OR: [{ type: "PLATFORM" }, { isPlatform: true }],
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
  return platform?.id ?? null;
}

export async function getMarketplaceSettings() {
  const platformTenantId = await getPlatformTenantId();
  if (!platformTenantId) {
    return marketplaceSettingsSchema.parse({});
  }

  const tenant = await prisma.tenant.findUnique({
    where: {
      id: platformTenantId,
    },
    select: {
      featureFlags: true,
    },
  });

  return parseMarketplaceSettings(tenant?.featureFlags);
}

export async function getMarketplaceSnapshot(): Promise<MarketplaceSnapshot> {
  const [settings, tenants] = await Promise.all([
    getMarketplaceSettings(),
    prisma.tenant.findMany({
      where: {
        OR: [{ type: "CUSTOMER" }, { type: null, isPlatform: { not: true } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        seoDescription: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        domains: {
          select: {
            host: true,
            isPrimary: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        typologies: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            areaM2: true,
            basePrice: true,
            media: {
              select: {
                url: true,
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              take: 1,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 120,
        },
        amenityInstances: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            media: {
              select: {
                url: true,
              },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              take: 1,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 120,
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 80,
    }),
  ]);

  const typologies = tenants.flatMap((tenant) => {
    const domainHost = tenant.domains[0]?.host ?? null;
    const projectUrl = makeProjectUrl(domainHost);
    return tenant.typologies.map((typology) => ({
      typologyId: typology.id,
      typologyName: typology.name,
      typologySlug: typology.slug,
      areaM2: asNumber(typology.areaM2),
      basePrice: asNumber(typology.basePrice),
      imageUrl: typology.media[0]?.url ?? null,
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      projectUrl,
      typologyUrl: projectUrl === "#" ? "#" : `${projectUrl}/typologies/${typology.slug}`,
    }));
  });

  const typologyById = new Map(typologies.map((item) => [item.typologyId, item]));
  const sponsoredSet = new Set(settings.sponsoredHeroTypologyIds);

  const configuredHero = settings.heroTypologyIds
    .map((id) => typologyById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 10);

  const fallbackHero = [...typologies]
    .sort((a, b) => (b.basePrice ?? 0) - (a.basePrice ?? 0))
    .slice(0, 10);

  const hero = (configuredHero.length > 0 ? configuredHero : fallbackHero).map((item) => ({
    ...item,
    sponsored: sponsoredSet.has(item.typologyId),
  }));

  const amenityRows = tenants.flatMap((tenant) => {
    const domainHost = tenant.domains[0]?.host ?? null;
    const projectUrl = makeProjectUrl(domainHost);
    return tenant.amenityInstances.map((amenity) => ({
      amenityId: amenity.id,
      amenityTitle: amenity.title,
      amenitySlug: amenity.slug,
      description: amenity.description ?? null,
      imageUrl: amenity.media[0]?.url ?? null,
      tenantId: tenant.id,
      tenantName: tenant.name,
      projectUrl,
      amenityUrl: projectUrl === "#" ? "#" : `${projectUrl}/amenities/${amenity.slug}`,
    }));
  });

  const amenityById = new Map(amenityRows.map((item) => [item.amenityId, item]));
  const configuredAmenitySpots = settings.amenitySpotIds
    .map((id) => amenityById.get(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 6);

  const amenities = (configuredAmenitySpots.length > 0 ? configuredAmenitySpots : amenityRows.slice(0, 6)).map(
    (item) => item,
  );

  const projects = tenants.map((tenant) => {
    const domainHost = tenant.domains[0]?.host ?? null;
    const projectUrl = makeProjectUrl(domainHost);
    const heroImage = tenant.typologies.find((typology) => typology.media[0]?.url)?.media[0]?.url ?? null;
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      seoDescription: tenant.seoDescription ?? null,
      logoUrl: tenant.logoUrl ?? null,
      heroImageUrl: heroImage,
      primaryColor: tenant.primaryColor ?? null,
      secondaryColor: tenant.secondaryColor ?? null,
      typologyCount: tenant.typologies.length,
      amenityCount: tenant.amenityInstances.length,
      projectUrl,
    };
  });

  return {
    settings,
    hero,
    projects,
    amenities,
  };
}

export async function getMarketplaceCandidates() {
  const [typologies, amenities] = await Promise.all([
    prisma.typology.findMany({
      where: {
        isPublished: true,
        tenant: {
          OR: [{ type: "CUSTOMER" }, { type: null, isPlatform: { not: true } }],
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        areaM2: true,
        basePrice: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
          },
        },
        media: {
          select: {
            url: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
      orderBy: [{ tenant: { name: "asc" } }, { name: "asc" }],
      take: 800,
    }),
    prisma.amenityInstance.findMany({
      where: {
        tenant: {
          OR: [{ type: "CUSTOMER" }, { type: null, isPlatform: { not: true } }],
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        tenantId: true,
        tenant: {
          select: {
            name: true,
          },
        },
        media: {
          select: {
            url: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          take: 1,
        },
      },
      orderBy: [{ tenant: { name: "asc" } }, { title: "asc" }],
      take: 800,
    }),
  ]);

  return {
    typologies: typologies.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      areaM2: asNumber(row.areaM2),
      basePrice: asNumber(row.basePrice),
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      imageUrl: row.media[0]?.url ?? null,
    })),
    amenities: amenities.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      tenantId: row.tenantId,
      tenantName: row.tenant.name,
      imageUrl: row.media[0]?.url ?? null,
    })),
  };
}

export const marketplaceSettingsInputSchema = marketplaceSettingsSchema.superRefine((value, ctx) => {
  const heroSet = new Set(value.heroTypologyIds);
  for (const sponsoredId of value.sponsoredHeroTypologyIds) {
    if (!heroSet.has(sponsoredId)) {
      ctx.addIssue({
        code: "custom",
        message: "Sponsored hero properties must be selected in hero list.",
      });
      break;
    }
  }
});
