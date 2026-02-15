import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { normalizeHost } from "@/server/tenant/normalize-host";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { setRootTargetTenant } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const distributionSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(["APARTMENT", "HOUSE", "COMMERCIAL_LOCAL", "OFFICE", "PARKING", "STORAGE", "OTHER"]),
  description: z.string().max(500).optional(),
  bedrooms: z.coerce.number().int().min(0).max(12).optional(),
  bathrooms: z.coerce.number().int().min(0).max(12).optional(),
  parkingSpots: z.coerce.number().int().min(0).max(20).optional(),
  areaM2: z.coerce.number().positive(),
  basePrice: z.coerce.number().positive(),
  quantity: z.coerce.number().int().positive().max(1000),
});

const amenitySchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum([
    "GYM",
    "SOCIAL_AREA",
    "BBQ",
    "POOL",
    "COWORK",
    "KIDS",
    "SPORT",
    "PARKING",
    "COMMERCIAL",
    "OTHER",
  ]),
  description: z.string().max(500).optional(),
  sizeM2: z.coerce.number().positive().optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).optional(),
  propertyKind: z.enum(["CONDOMINIUM", "RESIDENTIAL", "COMMERCIAL", "MIXED"]),
  inventoryMode: z.enum(["APARTMENTS", "HOUSES", "COMMERCIAL_UNITS", "MIXED"]),
  operationModel: z.enum(["FOR_SALE", "FOR_RENT", "MIXED"]).default("FOR_SALE"),
  totalUnits: z.coerce.number().int().positive().max(10000),
  totalFloors: z.coerce.number().int().positive().max(200).default(1),
  towerCount: z.coerce.number().int().positive().max(50).default(1),
  lotAreaM2: z.coerce.number().positive().optional(),
  builtAreaM2: z.coerce.number().positive().optional(),
  address: z.string().max(220).optional(),
  city: z.string().max(120).optional(),
  country: z.string().max(120).optional(),
  logoUrl: z.string().url().optional(),
  heroImages: z.array(z.string().url()).max(20).optional(),
  heroVideoUrl: z.string().url().optional(),
  primaryColor: z.string().max(40).optional(),
  secondaryColor: z.string().max(40).optional(),
  defaultLanguage: z.enum(["ES", "EN", "PT"]).default("ES"),
  supportedLocales: z.array(z.enum(["es", "en", "pt"])).min(1).max(3).default(["es", "en"]),
  domainHost: z.string().min(1).max(180).optional(),
  selfSignupEnabled: z.boolean().default(true),
  reservationTtlHours: z.coerce.number().int().min(1).max(168).default(48),
  sellerCommissionPct: z.coerce.number().min(0).max(30).default(3),
  platformFeePct: z.coerce.number().min(0).max(10).default(2),
  unitDistributions: z.array(distributionSchema).min(1).max(100),
  amenities: z.array(amenitySchema).max(100).default([]),
});

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let attempt = 2;
  while (used.has(`${base}-${attempt}`)) {
    attempt += 1;
  }
  const candidate = `${base}-${attempt}`;
  used.add(candidate);
  return candidate;
}

function amenityTypeName(category: z.infer<typeof amenitySchema>["category"]) {
  switch (category) {
    case "GYM":
      return "Gimnasio";
    case "SOCIAL_AREA":
      return "Area social";
    case "BBQ":
      return "Parrillera";
    case "POOL":
      return "Piscina";
    case "COWORK":
      return "Cowork";
    case "KIDS":
      return "Area infantil";
    case "SPORT":
      return "Area deportiva";
    case "PARKING":
      return "Estacionamientos";
    case "COMMERCIAL":
      return "Locales comerciales";
    default:
      return "Amenidades";
  }
}

export async function POST(request: Request) {
  try {
    const rootCtx = await requirePlatformRoot(await getTenantContext());
    const payload = createProjectSchema.parse(await request.json());

    const requestedSlug = toSlug(payload.slug ?? payload.name);
    const baseSlug = requestedSlug || `project-${Date.now()}`;
    const existingCount = await prisma.tenant.count({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
    });
    const tenantSlug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;
    const normalizedDomainHost = payload.domainHost ? normalizeHost(payload.domainHost) : "";
    const plannedUnits = payload.unitDistributions.reduce((acc, item) => acc + item.quantity, 0);

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.name,
          slug: tenantSlug,
          type: "CUSTOMER",
          isPlatform: false,
          selfSignupEnabled: payload.selfSignupEnabled,
          supportedLocales: payload.supportedLocales,
          headerVideoUrl: payload.heroVideoUrl,
          featureFlags: {
            projectProfile: {
              propertyKind: payload.propertyKind,
              inventoryMode: payload.inventoryMode,
              operationModel: payload.operationModel,
              totalUnits: payload.totalUnits,
              plannedUnits,
              totalFloors: payload.totalFloors,
              towerCount: payload.towerCount,
              lotAreaM2: payload.lotAreaM2 ?? null,
              builtAreaM2: payload.builtAreaM2 ?? null,
              address: payload.address ?? null,
              city: payload.city ?? null,
              country: payload.country ?? null,
              heroImages: payload.heroImages ?? [],
            },
          },
          defaultLanguage: payload.defaultLanguage,
          logoUrl: payload.logoUrl,
          primaryColor: payload.primaryColor ?? "#0f172a",
          secondaryColor: payload.secondaryColor ?? "#0ea5e9",
          heroTitle: payload.name,
          heroSubtitle: payload.description,
          seoTitle: payload.name,
          seoDescription: payload.description,
          reservationTtlHours: payload.reservationTtlHours,
          platformFeePct: payload.platformFeePct,
          sellerCommissionPct: payload.sellerCommissionPct,
          domains: normalizedDomainHost
            ? {
                create: [
                  {
                    host: normalizedDomainHost,
                    normalizedHost: normalizedDomainHost,
                    isPrimary: true,
                    allowClientSignup: payload.selfSignupEnabled,
                  },
                ],
              }
            : undefined,
        },
      });

      const building = await tx.building.create({
        data: {
          tenantId: tenant.id,
          name: `${payload.name} - Edificio Principal`,
          slug: "edificio-principal",
        },
      });

      const towers = await Promise.all(
        Array.from({ length: payload.towerCount }).map((_, index) =>
          tx.tower.create({
            data: {
              tenantId: tenant.id,
              buildingId: building.id,
              name: `Torre ${index + 1}`,
              code: `T${index + 1}`,
            },
          }),
        ),
      );

      const floors = await Promise.all(
        towers.flatMap((tower) =>
          Array.from({ length: payload.totalFloors }).map((_, floorIndex) =>
            tx.floor.create({
              data: {
                tenantId: tenant.id,
                towerId: tower.id,
                number: floorIndex + 1,
              },
            }),
          ),
        ),
      );

      const typologySlugSet = new Set<string>();
      const typologies = await Promise.all(
        payload.unitDistributions.map((distribution) =>
          tx.typology.create({
            data: {
              tenantId: tenant.id,
              name: distribution.name,
              slug: uniqueSlug(toSlug(distribution.name) || `tipo-${Date.now()}`, typologySlugSet),
              description: distribution.description,
              areaM2: distribution.areaM2,
              bedrooms: distribution.bedrooms,
              bathrooms: distribution.bathrooms,
              parkingSpots: distribution.parkingSpots,
              basePrice: distribution.basePrice,
              isPublished: true,
            },
          }),
        ),
      );

      const floorsByTower = new Map<string, typeof floors>();
      for (const floor of floors) {
        const current = floorsByTower.get(floor.towerId) ?? [];
        current.push(floor);
        floorsByTower.set(floor.towerId, current);
      }
      if (floors.length === 0) {
        throw new Error("Unable to create floor structure for project.");
      }

      const towerFloorCursor = new Map<string, number>();
      const unitRows: Array<{
        tenantId: string;
        buildingId: string;
        towerId: string;
        floorId: string;
        typologyId: string;
        code: string;
        slug: string;
        areaM2: number;
        price: number;
        view?: string;
        status: "AVAILABLE";
      }> = [];

      let unitCounter = 1;
      for (let typologyIndex = 0; typologyIndex < typologies.length; typologyIndex += 1) {
        const typology = typologies[typologyIndex];
        const distribution = payload.unitDistributions[typologyIndex];
        for (let idx = 0; idx < distribution.quantity; idx += 1) {
          const tower = towers[(unitCounter - 1) % towers.length];
          const towerFloors = floorsByTower.get(tower.id) ?? [];
          const currentCursor = towerFloorCursor.get(tower.id) ?? 0;
          const floor = towerFloors[currentCursor % Math.max(1, towerFloors.length)];
          const resolvedFloor = floor ?? towerFloors[0] ?? floors[0];
          if (!resolvedFloor) {
            throw new Error("Unable to assign unit floor.");
          }
          towerFloorCursor.set(tower.id, currentCursor + 1);

          const code = `${tower.code}-${String(unitCounter).padStart(4, "0")}`;
          unitRows.push({
            tenantId: tenant.id,
            buildingId: building.id,
            towerId: tower.id,
            floorId: resolvedFloor.id,
            typologyId: typology.id,
            code,
            slug: code.toLowerCase(),
            areaM2: distribution.areaM2,
            price: distribution.basePrice,
            view: payload.propertyKind === "COMMERCIAL" ? "Commercial" : "City",
            status: "AVAILABLE",
          });
          unitCounter += 1;
        }
      }

      if (unitRows.length > 0) {
        await tx.unit.createMany({
          data: unitRows,
        });
      }

      const amenityTypeByCategory = new Map<string, { id: string }>();
      for (const amenity of payload.amenities) {
        const key = amenity.category;
        if (!amenityTypeByCategory.has(key)) {
          const createdType = await tx.amenityType.create({
            data: {
              tenantId: tenant.id,
              name: amenityTypeName(amenity.category),
              slug: toSlug(amenityTypeName(amenity.category)),
              description: amenity.description,
            },
          });
          amenityTypeByCategory.set(key, { id: createdType.id });
        }
      }

      const amenitySlugSet = new Set<string>();
      for (const amenity of payload.amenities) {
        const type = amenityTypeByCategory.get(amenity.category);
        if (!type) continue;
        await tx.amenityInstance.create({
          data: {
            tenantId: tenant.id,
            amenityTypeId: type.id,
            title: amenity.name,
            slug: uniqueSlug(toSlug(amenity.name), amenitySlugSet),
            description: amenity.description,
            dimensionsM2: amenity.sizeM2,
          },
        });
      }

      const home = await tx.page.create({
        data: {
          tenantId: tenant.id,
          slug: "home",
          kind: "HOME",
          title: payload.name,
          description: payload.description,
        },
      });

      const homeVersion = await tx.pageVersion.create({
        data: {
          tenantId: tenant.id,
          pageId: home.id,
          versionNumber: 1,
          status: "PUBLISHED",
          createdById: rootCtx.userId,
          publishedAt: new Date(),
          sections: [
            {
              id: "hero",
              type: "hero",
              props: {
                title: payload.name,
                subtitle: payload.description ?? "Proyecto residencial premium",
                ctaLabel: "Ver disponibilidad",
                ctaHref: "/availability",
              },
            },
          ],
          seoTitle: payload.name,
          seoDescription: payload.description,
        },
      });

      await tx.page.update({
        where: { id: home.id },
        data: {
          currentDraftVersionId: homeVersion.id,
          publishedVersionId: homeVersion.id,
        },
      });

      const availability = await tx.page.create({
        data: {
          tenantId: tenant.id,
          slug: "availability",
          kind: "AVAILABILITY",
          title: "Disponibilidad",
          description: "Inventario y masterplan",
        },
      });

      const availabilityVersion = await tx.pageVersion.create({
        data: {
          tenantId: tenant.id,
          pageId: availability.id,
          versionNumber: 1,
          status: "PUBLISHED",
          createdById: rootCtx.userId,
          publishedAt: new Date(),
          sections: [
            {
              id: "masterplan",
              type: "masterplan",
              props: {
                title: "Masterplan",
              },
            },
          ],
        },
      });

      await tx.page.update({
        where: { id: availability.id },
        data: {
          currentDraftVersionId: availabilityVersion.id,
          publishedVersionId: availabilityVersion.id,
        },
      });

      await tx.siteNavigation.upsert({
        where: {
          tenantId_locale: {
            tenantId: tenant.id,
            locale: "es",
          },
        },
        update: {
          draftItems: [
            { label: "Inicio", href: "/" },
            { label: "Disponibilidad", href: "/availability" },
          ],
          publishedItems: [
            { label: "Inicio", href: "/" },
            { label: "Disponibilidad", href: "/availability" },
          ],
        },
        create: {
          tenantId: tenant.id,
          locale: "es",
          draftItems: [
            { label: "Inicio", href: "/" },
            { label: "Disponibilidad", href: "/availability" },
          ],
          publishedItems: [
            { label: "Inicio", href: "/" },
            { label: "Disponibilidad", href: "/availability" },
          ],
        },
      });

      await tx.themeSettings.upsert({
        where: {
          tenantId: tenant.id,
        },
        update: {
          headerVideoAssetId: null,
          headerImageAssetId: null,
          settings: {
            heroImages: payload.heroImages ?? [],
          },
        },
        create: {
          tenantId: tenant.id,
          headerVideoAssetId: null,
          headerImageAssetId: null,
          settings: {
            heroImages: payload.heroImages ?? [],
          },
        },
      });

      return {
        tenant,
        unitsCreated: unitRows.length,
        typologiesCreated: typologies.length,
        amenitiesCreated: payload.amenities.length,
        domainCreated: Boolean(normalizedDomainHost),
        plannedUnits,
      };
    });

    await setRootTargetTenant(rootCtx.userId, created.tenant.id);

    await writeAuditLog(createDalContext(rootCtx), {
      action: "root.project.bootstrap.created",
      entityType: "Tenant",
      entityId: created.tenant.id,
      metadata: {
        slug: created.tenant.slug,
        propertyKind: payload.propertyKind,
        inventoryMode: payload.inventoryMode,
        operationModel: payload.operationModel,
        unitsCreated: created.unitsCreated,
        typologiesCreated: created.typologiesCreated,
        amenitiesCreated: created.amenitiesCreated,
        domain: normalizedDomainHost || null,
        requestedUnits: payload.totalUnits,
        plannedUnits: created.plannedUnits,
      },
    });

    return NextResponse.json({
      ok: true,
      tenantId: created.tenant.id,
      tenantSlug: created.tenant.slug,
      unitsCreated: created.unitsCreated,
      typologiesCreated: created.typologiesCreated,
      amenitiesCreated: created.amenitiesCreated,
      domainCreated: created.domainCreated,
      warning:
        payload.totalUnits !== created.plannedUnits
          ? `totalUnits=${payload.totalUnits} y distribuciones=${created.plannedUnits}. Se crearon ${created.plannedUnits} unidades segun distribuciones.`
          : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to bootstrap project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
