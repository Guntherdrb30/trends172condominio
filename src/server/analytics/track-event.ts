import { z } from "zod";
import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db";
import type { DalContext } from "@/server/dal/context";
import { assertTenantContext } from "@/server/dal/context";

const trackEventSchema = z.object({
  event: z.string().min(1),
  path: z.string().optional(),
  referrer: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackEventInput = z.input<typeof trackEventSchema>;

export async function trackEvent(ctx: DalContext, input: TrackEventInput) {
  assertTenantContext(ctx);
  const payload = trackEventSchema.parse(input);

  return prisma.analyticsEvent.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      event: payload.event,
      path: payload.path,
      referrer: payload.referrer,
      metadata: payload.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
