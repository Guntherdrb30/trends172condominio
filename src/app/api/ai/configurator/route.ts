import { NextResponse } from "next/server";
import { z } from "zod";

import {
  configuratorToolNames,
  executeConfiguratorTool,
  type ConfiguratorToolName,
} from "@/server/ai/configurator-tools";
import { requirePlatformRoot } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import type { DalContext } from "@/server/dal/context";
import { resolveScopedTenantId } from "@/server/root/target-tenant";
import { getTenantContext } from "@/server/tenant/context";

const aiConfiguratorSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(["wizard", "chat"]).default("chat"),
  toolCall: z
    .object({
      name: z.enum(configuratorToolNames),
      input: z.unknown(),
    })
    .optional(),
});

async function callOpenAi(input: {
  message: string;
  mode: "wizard" | "chat";
  targetTenantId: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "OPENAI_API_KEY no configurada. Puedes usar toolCall para ejecutar configuraciones igual.";
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
            "You are a root site configurator assistant. Ask for missing assets and settings in small steps. Never claim direct DB writes. Use internal tools only.",
        },
        {
          role: "user",
          content: `Mode: ${input.mode}\nTarget tenant: ${input.targetTenantId}\nRequest: ${input.message}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed (${response.status})`);
  }
  const data = (await response.json()) as { output_text?: string };
  return data.output_text ?? "Sin respuesta del modelo.";
}

export async function POST(request: Request) {
  try {
    const rootCtx = await requirePlatformRoot(await getTenantContext());
    const payload = aiConfiguratorSchema.parse(await request.json());
    const scoped = await resolveScopedTenantId({
      role: rootCtx.role,
      tenantId: rootCtx.tenantId,
      userId: rootCtx.userId,
    });
    const dalCtx: DalContext = {
      tenantId: scoped.targetTenantId,
      userId: rootCtx.userId,
      role: rootCtx.role,
      privileged: rootCtx.privileged,
    };

    const toolResult = payload.toolCall
      ? await executeConfiguratorTool(
          dalCtx,
          payload.toolCall.name as ConfiguratorToolName,
          payload.toolCall.input,
        )
      : null;

    const assistantResponse = payload.toolCall
      ? `Tool ${payload.toolCall.name} ejecutada correctamente.`
      : await callOpenAi({
          message: payload.message,
          mode: payload.mode,
          targetTenantId: scoped.targetTenantId,
        });

    await prisma.aiChatLog.create({
      data: {
        tenantId: scoped.targetTenantId,
        userId: rootCtx.userId,
        profile: "root_configurator",
        prompt: payload.message.slice(0, 4000),
        response: JSON.stringify({
          assistantResponse,
          toolName: payload.toolCall?.name ?? null,
        }).slice(0, 4000),
        metadata: {
          mode: payload.mode,
          tool: payload.toolCall?.name ?? null,
        },
      },
    });

    await writeAuditLog(dalCtx, {
      action: "ai.configurator.executed",
      entityType: "AiChatLog",
      metadata: {
        mode: payload.mode,
        tool: payload.toolCall?.name ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      targetTenantId: scoped.targetTenantId,
      response: assistantResponse,
      toolResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI configurator failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

