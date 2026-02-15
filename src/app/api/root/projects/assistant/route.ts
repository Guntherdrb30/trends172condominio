import { NextResponse } from "next/server";
import { z } from "zod";

import { requirePlatformRoot } from "@/server/auth/guards";
import { getTenantContext } from "@/server/tenant/context";

const askAssistantSchema = z.object({
  brief: z.string().min(12).max(8000),
});

const distributionSuggestionSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.enum(["APARTMENT", "HOUSE", "COMMERCIAL_LOCAL", "OFFICE", "PARKING", "STORAGE", "OTHER"]),
  description: z.string().max(500).optional(),
  bedrooms: z.number().int().min(0).max(12).optional(),
  bathrooms: z.number().int().min(0).max(12).optional(),
  parkingSpots: z.number().int().min(0).max(20).optional(),
  areaM2: z.number().positive(),
  basePrice: z.number().positive(),
  quantity: z.number().int().positive().max(1000),
});

const amenitySuggestionSchema = z.object({
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
  sizeM2: z.number().positive().optional(),
});

const assistantSuggestionSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(120),
  description: z.string().max(2000),
  propertyKind: z.enum(["CONDOMINIUM", "RESIDENTIAL", "COMMERCIAL", "MIXED"]),
  inventoryMode: z.enum(["APARTMENTS", "HOUSES", "COMMERCIAL_UNITS", "MIXED"]),
  operationModel: z.enum(["FOR_SALE", "FOR_RENT", "MIXED"]),
  totalUnits: z.number().int().positive().max(10000),
  totalFloors: z.number().int().positive().max(200),
  towerCount: z.number().int().positive().max(50),
  unitDistributions: z.array(distributionSuggestionSchema).min(1).max(100),
  amenities: z.array(amenitySuggestionSchema).max(100),
  recommendations: z.array(z.string().min(4).max(200)).max(20),
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

function extractJsonObject(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return raw.slice(start, end + 1);
}

function heuristicSuggestion(brief: string): z.infer<typeof assistantSuggestionSchema> {
  const normalized = brief.toLowerCase();
  const isCommercial =
    normalized.includes("comercial") || normalized.includes("commercial") || normalized.includes("centro comercial");
  const isMixed =
    normalized.includes("mixto") || normalized.includes("mixed") || (isCommercial && normalized.includes("residencial"));
  const name =
    brief.match(/proyecto\s+([a-z0-9\s-]{3,60})/i)?.[1]?.trim() ??
    (isCommercial ? "Centro Comercial Prime" : "Condominio Prime");
  const slug = toSlug(name) || "proyecto-prime";
  const propertyKind = isMixed ? "MIXED" : isCommercial ? "COMMERCIAL" : "CONDOMINIUM";
  const inventoryMode = isMixed ? "MIXED" : isCommercial ? "COMMERCIAL_UNITS" : "APARTMENTS";

  const unitDistributions = isCommercial
    ? [
        {
          name: "Local Tipo A",
          category: "COMMERCIAL_LOCAL" as const,
          description: "Frente principal",
          areaM2: 55,
          basePrice: 185000,
          quantity: 14,
        },
        {
          name: "Local Tipo B",
          category: "COMMERCIAL_LOCAL" as const,
          description: "Corredor interno",
          areaM2: 38,
          basePrice: 126000,
          quantity: 22,
        },
      ]
    : [
        {
          name: "Apartamento 2H",
          category: "APARTMENT" as const,
          bedrooms: 2,
          bathrooms: 2,
          parkingSpots: 1,
          description: "Distribucion familiar",
          areaM2: 92,
          basePrice: 210000,
          quantity: 36,
        },
        {
          name: "Apartamento 3H",
          category: "APARTMENT" as const,
          bedrooms: 3,
          bathrooms: 2,
          parkingSpots: 2,
          description: "Distribucion premium",
          areaM2: 128,
          basePrice: 285000,
          quantity: 24,
        },
      ];

  const totalUnits = unitDistributions.reduce((acc, item) => acc + item.quantity, 0);

  return {
    name,
    slug,
    description: isCommercial
      ? "Proyecto comercial con locales de alto flujo, amenities y zonas de soporte operativo."
      : "Proyecto residencial con amenidades integrales, enfoque comercial y experiencia digital completa.",
    propertyKind,
    inventoryMode,
    operationModel: "FOR_SALE",
    totalUnits,
    totalFloors: isCommercial ? 4 : 16,
    towerCount: isCommercial ? 1 : 2,
    unitDistributions,
    amenities: isCommercial
      ? [
          { name: "Plaza de comidas", category: "COMMERCIAL", description: "Zona food hall", sizeM2: 320 },
          { name: "Estacionamiento visitantes", category: "PARKING", sizeM2: 1200 },
          { name: "Area de eventos", category: "SOCIAL_AREA", sizeM2: 180 },
        ]
      : [
          { name: "Gimnasio", category: "GYM", sizeM2: 140 },
          { name: "Piscina", category: "POOL", sizeM2: 220 },
          { name: "Parrilleras", category: "BBQ", sizeM2: 95 },
          { name: "Cowork", category: "COWORK", sizeM2: 120 },
          { name: "Area infantil", category: "KIDS", sizeM2: 80 },
        ],
    recommendations: [
      "Define pricing por piso o ubicacion para mejorar conversion.",
      "Configura tour en video y hero images de alta calidad desde el inicio.",
      "Invita un ADMIN y un SELLER antes de abrir self-signup.",
    ],
  };
}

async function callOpenAi(brief: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      input: [
        {
          role: "system",
          content:
            "You are a real-estate project setup assistant for a multi-tenant SaaS. Return ONLY valid JSON. No markdown.",
        },
        {
          role: "user",
          content: `Generate a detailed project bootstrap suggestion from this brief: ${brief}.

Return JSON with exact keys:
name, slug, description, propertyKind, inventoryMode, operationModel, totalUnits, totalFloors, towerCount, unitDistributions, amenities, recommendations.

Allowed enums:
propertyKind: CONDOMINIUM | RESIDENTIAL | COMMERCIAL | MIXED
inventoryMode: APARTMENTS | HOUSES | COMMERCIAL_UNITS | MIXED
operationModel: FOR_SALE | FOR_RENT | MIXED

unitDistributions[].category: APARTMENT | HOUSE | COMMERCIAL_LOCAL | OFFICE | PARKING | STORAGE | OTHER
amenities[].category: GYM | SOCIAL_AREA | BBQ | POOL | COWORK | KIDS | SPORT | PARKING | COMMERCIAL | OTHER`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as { output_text?: string };
  return data.output_text ?? null;
}

export async function POST(request: Request) {
  try {
    await requirePlatformRoot(await getTenantContext());
    const payload = askAssistantSchema.parse(await request.json());

    const aiRaw = await callOpenAi(payload.brief);
    if (aiRaw) {
      const jsonCandidate = extractJsonObject(aiRaw);
      if (jsonCandidate) {
        try {
          const parsed = assistantSuggestionSchema.parse(JSON.parse(jsonCandidate));
          return NextResponse.json({ ok: true, source: "ai", suggestion: parsed });
        } catch {
          // Falls back to deterministic suggestion when model output is malformed.
        }
      }
    }

    return NextResponse.json({
      ok: true,
      source: "heuristic",
      suggestion: heuristicSuggestion(payload.brief),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
