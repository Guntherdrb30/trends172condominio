import { prisma } from "@/server/db";

export async function getTranslationMap(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  locale: string;
}) {
  const rows = await prisma.translation.findMany({
    where: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      locale: input.locale.toLowerCase(),
    },
    select: {
      field: true,
      value: true,
    },
  });

  return new Map(rows.map((row) => [row.field, row.value]));
}

export async function getTranslatedField(input: {
  tenantId: string;
  entityType: string;
  entityId: string;
  field: string;
  locale: string;
  fallback?: string | null;
}) {
  const row = await prisma.translation.findFirst({
    where: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      field: input.field,
      locale: input.locale.toLowerCase(),
    },
    select: {
      value: true,
    },
  });

  return row?.value ?? input.fallback ?? null;
}

