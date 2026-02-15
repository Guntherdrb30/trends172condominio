"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type PageSummary = {
  id: string;
  slug: string;
  kind: string | null;
  title: string | null;
  description: string | null;
  currentDraftVersion: { id: string; versionNumber: number } | null;
  publishedVersion: { id: string; versionNumber: number } | null;
  _count: { versions: number };
};

type PageDetail = {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  currentDraftVersion: {
    id: string;
    sections: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
  } | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
  }>;
};

type TranslationDraft = {
  es: { title: string; description: string; seoTitle: string; seoDescription: string };
  en: { title: string; description: string; seoTitle: string; seoDescription: string };
};

const emptyTranslations: TranslationDraft = {
  es: { title: "", description: "", seoTitle: "", seoDescription: "" },
  en: { title: "", description: "", seoTitle: "", seoDescription: "" },
};

export function SiteBuilderConsole() {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [detail, setDetail] = useState<PageDetail | null>(null);
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageTemplate, setNewPageTemplate] = useState<"blank" | "home" | "availability">("home");
  const [sectionsJson, setSectionsJson] = useState("[]");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [translations, setTranslations] = useState<TranslationDraft>(emptyTranslations);
  const [rollbackVersion, setRollbackVersion] = useState("");
  const [status, setStatus] = useState("");

  const request = useCallback(async <T,>(url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    const data = (await response.json()) as T & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    return data;
  }, []);

  const loadPages = useCallback(async () => {
    const data = await request<{ pages: PageSummary[] }>("/api/root/site/pages");
    setPages(data.pages);
    if (!selectedSlug && data.pages[0]) {
      setSelectedSlug(data.pages[0].slug);
    }
  }, [request, selectedSlug]);

  const loadDetail = useCallback(async (slug: string) => {
    const data = await request<{ page: PageDetail }>(`/api/root/site/pages/${slug}`);
    setDetail(data.page);
    setTitle(data.page.title ?? "");
    setDescription(data.page.description ?? "");
    setSeoTitle(data.page.currentDraftVersion?.seoTitle ?? "");
    setSeoDescription(data.page.currentDraftVersion?.seoDescription ?? "");
    setSectionsJson(
      JSON.stringify(data.page.currentDraftVersion?.sections ?? [], null, 2),
    );
    setTranslations(emptyTranslations);
  }, [request]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPages().catch((error: unknown) =>
      setStatus(error instanceof Error ? error.message : "Error"),
    );
  }, [loadPages]);

  useEffect(() => {
    if (!selectedSlug) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetail(selectedSlug).catch((error: unknown) =>
      setStatus(error instanceof Error ? error.message : "Error"),
    );
  }, [loadDetail, selectedSlug]);

  const orderedVersions = useMemo(
    () => detail?.versions ?? [],
    [detail?.versions],
  );

  async function createDraftPage() {
    if (!newPageSlug.trim()) return;
    await request("/api/root/site/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newPageSlug.trim(),
        template: newPageTemplate,
      }),
    });
    setStatus("Draft creado.");
    await loadPages();
    setSelectedSlug(newPageSlug.trim());
    setNewPageSlug("");
  }

  async function saveDraft() {
    if (!selectedSlug) return;
    let parsedSections: unknown;
    try {
      parsedSections = JSON.parse(sectionsJson);
    } catch {
      setStatus("JSON de secciones invalido.");
      return;
    }
    await request(`/api/root/site/pages/${selectedSlug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        seoTitle,
        seoDescription,
        sections: parsedSections,
        translations,
      }),
    });
    setStatus("Draft actualizado.");
    await loadDetail(selectedSlug);
  }

  async function publishDraft() {
    if (!selectedSlug) return;
    await request(`/api/root/site/pages/${selectedSlug}/publish`, {
      method: "POST",
    });
    setStatus("Pagina publicada.");
    await loadDetail(selectedSlug);
    await loadPages();
  }

  async function rollback() {
    if (!selectedSlug || !rollbackVersion) return;
    await request(`/api/root/site/pages/${selectedSlug}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNumber: Number(rollbackVersion) }),
    });
    setStatus("Rollback aplicado.");
    await loadDetail(selectedSlug);
    await loadPages();
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Paginas</h2>
        <div className="grid gap-2">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedSlug(page.slug)}
              className={`rounded-md border px-3 py-2 text-left text-sm ${
                selectedSlug === page.slug
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-slate-50 text-slate-700"
              }`}
            >
              <p className="font-medium">{page.slug}</p>
              <p className="text-xs opacity-80">
                draft v{page.currentDraftVersion?.versionNumber ?? "-"} | pub v
                {page.publishedVersion?.versionNumber ?? "-"}
              </p>
            </button>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva pagina draft</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Input
              placeholder="slug (ej: home)"
              value={newPageSlug}
              onChange={(event) => setNewPageSlug(event.target.value)}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={newPageTemplate}
              onChange={(event) =>
                setNewPageTemplate(event.target.value as "blank" | "home" | "availability")
              }
            >
              <option value="home">Template home</option>
              <option value="availability">Template availability</option>
              <option value="blank">Blank</option>
            </select>
            <Button onClick={() => void createDraftPage()}>Crear draft</Button>
          </CardContent>
        </Card>
      </aside>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Editor Draft / Publish / Versioning</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input placeholder="Titulo base" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              placeholder="Descripcion base"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Input
              placeholder="SEO title"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
            <textarea
              className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="SEO description"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />

            <div className="grid gap-3 md:grid-cols-2">
              {(["es", "en"] as const).map((locale) => (
                <div key={locale} className="rounded-md border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-medium uppercase">{locale}</p>
                  <div className="grid gap-2">
                    <Input
                      placeholder={`Title ${locale}`}
                      value={translations[locale].title}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [locale]: { ...prev[locale], title: e.target.value },
                        }))
                      }
                    />
                    <Input
                      placeholder={`Description ${locale}`}
                      value={translations[locale].description}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [locale]: { ...prev[locale], description: e.target.value },
                        }))
                      }
                    />
                    <Input
                      placeholder={`SEO title ${locale}`}
                      value={translations[locale].seoTitle}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [locale]: { ...prev[locale], seoTitle: e.target.value },
                        }))
                      }
                    />
                    <Input
                      placeholder={`SEO description ${locale}`}
                      value={translations[locale].seoDescription}
                      onChange={(e) =>
                        setTranslations((prev) => ({
                          ...prev,
                          [locale]: { ...prev[locale], seoDescription: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <textarea
              className="min-h-[280px] rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-slate-100"
              value={sectionsJson}
              onChange={(event) => setSectionsJson(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void saveDraft()}>Guardar Draft</Button>
              <Button variant="secondary" onClick={() => void publishDraft()}>
                Publicar
              </Button>
              <Input
                className="w-36"
                placeholder="Version rollback"
                value={rollbackVersion}
                onChange={(event) => setRollbackVersion(event.target.value)}
              />
              <Button variant="outline" onClick={() => void rollback()}>
                Rollback
              </Button>
              {selectedSlug ? (
                <Button asChild variant="outline">
                  <a href={`/${selectedSlug === "home" ? "" : selectedSlug}`} target="_blank" rel="noreferrer">
                    Preview Published
                  </a>
                </Button>
              ) : null}
            </div>
            {status ? <p className="text-sm text-slate-600">{status}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de versiones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {orderedVersions.map((version) => (
              <div key={version.id} className="rounded-md border border-slate-200 p-2">
                v{version.versionNumber} - {version.status} -{" "}
                {new Date(version.createdAt).toLocaleString()}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
