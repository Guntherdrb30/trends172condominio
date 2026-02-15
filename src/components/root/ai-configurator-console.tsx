"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const tools = [
  "setThemeSettings",
  "setNavigation",
  "createPageDraft",
  "updatePageDraftSections",
  "setSeo",
  "attachAssetToBlock",
  "publishPage",
] as const;

export function AiConfiguratorConsole() {
  const [mode, setMode] = useState<"wizard" | "chat">("wizard");
  const [message, setMessage] = useState(
    "Quiero configurar home y availability para un proyecto premium moderno.",
  );
  const [selectedTool, setSelectedTool] = useState<string>("");
  const [toolInputJson, setToolInputJson] = useState("{}");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function execute() {
    setLoading(true);
    try {
      const body: {
        mode: "wizard" | "chat";
        message: string;
        toolCall?: { name: string; input: unknown };
      } = { mode, message };
      if (selectedTool) {
        body.toolCall = {
          name: selectedTool,
          input: JSON.parse(toolInputJson),
        };
      }
      const response = await fetch("/api/ai/configurator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as {
        error?: string;
        response?: string;
        toolResult?: unknown;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setResult(
        JSON.stringify(
          {
            response: data.response,
            toolResult: data.toolResult,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Configurator Agent (ROOT)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={mode === "wizard" ? "default" : "outline"}
              onClick={() => setMode("wizard")}
            >
              Wizard
            </Button>
            <Button
              variant={mode === "chat" ? "default" : "outline"}
              onClick={() => setMode("chat")}
            >
              Chat
            </Button>
          </div>
          <Input value={message} onChange={(event) => setMessage(event.target.value)} />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={selectedTool}
            onChange={(event) => setSelectedTool(event.target.value)}
          >
            <option value="">Sin tool call (solo chat)</option>
            {tools.map((tool) => (
              <option key={tool} value={tool}>
                {tool}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-40 rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-100"
            value={toolInputJson}
            onChange={(event) => setToolInputJson(event.target.value)}
          />
          <Button onClick={() => void execute()} disabled={loading}>
            {loading ? "Procesando..." : "Ejecutar agente"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salida</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
            {result || "Sin salida aun"}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

