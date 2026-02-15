import { HeroCarousel } from "@/components/marketplace/hero-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketplaceSnapshot } from "@/server/services/marketplace.service";

function fallbackImage(seed: string) {
  const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = ["#0f172a", "#1f2937", "#334155", "#4b5563", "#1d4ed8", "#155e75", "#78350f"];
  return `linear-gradient(130deg, ${palette[hash % palette.length]} 0%, #0b1220 75%)`;
}

export function PremiumMarketplaceHome({ snapshot }: { snapshot: MarketplaceSnapshot }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_8%_8%,rgba(233,217,186,.55)_0,rgba(248,245,239,.85)_40%,#f6f8fc_100%)]">
      <main className="mx-auto max-w-[1360px] space-y-10 px-4 pb-16 pt-8 sm:px-6 lg:px-10">
        <HeroCarousel items={snapshot.hero} />

        <section id="projects" className="scroll-mt-24 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d6850]">Portfolio</p>
              <h2 className="font-serif text-3xl text-[#12192d] md:text-4xl">Proyectos Premium Disponibles</h2>
            </div>
            <p className="max-w-xl text-sm text-[#4f5c74]">
              Selecciona un proyecto para abrir su dominio y explorar inventario, tipologias y experiencias digitales.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {snapshot.projects.map((project) => (
              <Card
                key={project.tenantId}
                className="overflow-hidden border-[#d8deea] bg-white/90 shadow-[0_22px_44px_-28px_rgba(15,23,42,.45)]"
              >
                <div
                  className="h-44 w-full"
                  style={{
                    background: project.heroImageUrl
                      ? undefined
                      : fallbackImage(project.tenantSlug),
                  }}
                >
                  {project.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.heroImageUrl} alt={project.tenantName} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <CardHeader className="space-y-3">
                  <CardTitle className="font-serif text-2xl text-[#111a2e]">{project.tenantName}</CardTitle>
                  <p className="text-sm text-[#5a667b]">
                    {project.seoDescription ?? "Proyecto de alto valor con experiencia comercial premium."}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-[#edf2fb] px-3 py-1 text-[#304569]">{project.typologyCount} tipologias</span>
                    <span className="rounded-full bg-[#f8efe0] px-3 py-1 text-[#7a5220]">{project.amenityCount} amenidades</span>
                  </div>
                  <Button asChild className="w-full bg-[#111a2e] text-white hover:bg-[#1f2a44]">
                    <a href={project.projectUrl} target="_blank" rel="noreferrer">
                      Entrar al proyecto
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="amenity-spots" className="scroll-mt-24 space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d6850]">Amenity Ads</p>
              <h3 className="font-serif text-3xl text-[#12192d] md:text-4xl">Amenidades Destacadas</h3>
            </div>
            <p className="max-w-xl text-sm text-[#4f5c74]">
              Espacios premium promocionados para reforzar diferenciacion y conversion comercial.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {snapshot.amenities.map((amenity) => (
              <article key={amenity.amenityId} className="overflow-hidden rounded-3xl border border-[#dbe2ee] bg-white shadow-sm">
                <div
                  className="h-40 w-full"
                  style={{
                    background: amenity.imageUrl ? undefined : fallbackImage(amenity.amenitySlug),
                  }}
                >
                  {amenity.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={amenity.imageUrl} alt={amenity.amenityTitle} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6d7c96]">{amenity.tenantName}</p>
                  <h4 className="font-serif text-2xl text-[#111a2e]">{amenity.amenityTitle}</h4>
                  <p className="text-sm text-[#57657d]">{amenity.description ?? "Amenidad premium del proyecto."}</p>
                  <Button asChild variant="outline" className="mt-2 border-[#24334f] text-[#24334f] hover:bg-[#f0f4fb]">
                    <a href={amenity.amenityUrl} target="_blank" rel="noreferrer">
                      Ver detalle
                    </a>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          id="partners"
          className="scroll-mt-24 rounded-[2rem] border border-[#d7c4a4] bg-[linear-gradient(140deg,#0f172a_0%,#1e293b_62%,#334155_100%)] p-8 text-[#f8efe2] md:p-12"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-[#d7b37d]">Partners</p>
          <h4 className="mt-2 max-w-3xl font-serif text-3xl leading-tight md:text-5xl">{snapshot.settings.contactHeadline}</h4>
          <p className="mt-4 max-w-2xl text-sm text-[#ebdcc1] md:text-base">{snapshot.settings.contactBody}</p>
          <div className="mt-6">
            <Button asChild className="bg-[#d7b37d] text-[#1f1709] hover:bg-[#c79c5f]">
              <a href={snapshot.settings.contactCtaHref}>{snapshot.settings.contactCtaLabel}</a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
