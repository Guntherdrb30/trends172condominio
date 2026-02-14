import { NextResponse } from "next/server";
import { z } from "zod";

import { agentProfiles, type AgentProfileId } from "@/server/ai/profiles";
import { allowedToolNames, executeAiTool } from "@/server/ai/tools";
import { requireTenantMembership } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { writeAuditLog } from "@/server/dal/audit-log";
import { createDalContext } from "@/server/dal/context";
import { getTenantContext } from "@/server/tenant/context";

const aiChatSchema = z.object({
  profile: z.enum(["sales_support", "reports", "marketing"]),
  message: z.string().min(1),
  toolCall: z
    .object({
      name: z.enum(allowedToolNames),
      input: z.unknown(),
    })
    .optional(),
});

async function callOpenAi(profile: AgentProfileId, message: string, contextPack: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "AI key is not configured. Tool execution still works in this environment.";
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `${agentProfiles[profile].prompt}\nNever claim direct DB access. Use only provided context.`,
        },
        {
          role: "user",
          content: `Context: ${JSON.stringify(contextPack)}\n\nMessage: ${message}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }

  const data = (await response.json()) as { output_text?: string };
  return data.output_text ?? "No response generated.";
}

export async function POST(request: Request) {
  try {
    const tenantCtx = await requireTenantMembership(await getTenantContext());
    const payload = aiChatSchema.parse(await request.json());
    if ((payload.profile === "reports" || payload.profile === "marketing") && !["ADMIN", "ROOT"].includes(tenantCtx.role)) {
      return NextResponse.json({ error: "Insufficient role for this AI profile" }, { status: 403 });
    }

    const dalCtx = createDalContext(tenantCtx);
    const contextPack = {
      tenantId: tenantCtx.tenantId,
      tenantSlug: tenantCtx.tenantSlug,
      role: tenantCtx.role,
      profile: payload.profile,
      allowedTools: allowedToolNames,
    };

    const toolResult = payload.toolCall
      ? await executeAiTool(dalCtx, payload.toolCall.name, payload.toolCall.input)
      : null;

    const assistantResponse = payload.toolCall
      ? `Tool ${payload.toolCall.name} executed successfully.`
      : await callOpenAi(payload.profile, payload.message, contextPack);

    await prisma.aiChatLog.create({
      data: {
        tenantId: tenantCtx.tenantId,
        userId: tenantCtx.userId,
        profile: payload.profile,
        prompt: payload.message.slice(0, 4000),
        response: JSON.stringify({
          assistantResponse,
          toolName: payload.toolCall?.name,
        }).slice(0, 4000),
        metadata: {
          toolUsed: payload.toolCall?.name ?? null,
          role: tenantCtx.role,
        },
      },
    });

    await writeAuditLog(dalCtx, {
      action: "ai.chat.executed",
      entityType: "AiChatLog",
      metadata: {
        profile: payload.profile,
        tool: payload.toolCall?.name ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      profile: payload.profile,
      response: assistantResponse,
      toolResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

