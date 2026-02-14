type DemoUnitStatus = "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";

export const demoTenant = {
  name: "Articimento Premium",
  slug: "articimento-premium",
  whatsapp: "+1 305 555 0123",
  seoTitle: "Condo Sales OS | Articimento Premium",
  seoDescription:
    "Masterplan interactivo, tipologias premium, amenities de alto nivel y dashboards multi-tenant para venta de condominios.",
};

export const demoTypologies = [
  {
    id: "typ-a",
    slug: "aurora-2br",
    name: "Aurora 2BR",
    areaM2: 98,
    bedrooms: 2,
    bathrooms: 2,
    basePrice: 289000,
    description: "Tipologia funcional con terraza panoramica y acabados premium.",
    media: ["/next.svg", "/globe.svg"],
  },
  {
    id: "typ-b",
    slug: "zenith-3br",
    name: "Zenith 3BR",
    areaM2: 132,
    bedrooms: 3,
    bathrooms: 3,
    basePrice: 379000,
    description: "Distribucion abierta tipo social + suite principal con walk-in closet.",
    media: ["/vercel.svg", "/window.svg"],
  },
];

export const demoAmenities = [
  {
    slug: "sky-lounge",
    title: "Sky Lounge",
    description: "Terraza panoramica con estaciones gourmet y vista 360.",
    dimensionsM2: 240,
    media: ["/globe.svg", "/window.svg"],
  },
  {
    slug: "wellness-spa",
    title: "Wellness Spa",
    description: "Circuito de hidroterapia, sauna seca y salas de recuperacion.",
    dimensionsM2: 180,
    media: ["/file.svg", "/next.svg"],
  },
];

export const demoUnits: Array<{
  id: string;
  slug: string;
  code: string;
  typologySlug: string;
  typologyName: string;
  areaM2: number;
  price: number;
  floor: number;
  status: DemoUnitStatus;
  x: number;
  y: number;
  polygon: string;
  view: string;
}> = [
  {
    id: "unit-01",
    slug: "a1-0101",
    code: "A1-0101",
    typologySlug: "aurora-2br",
    typologyName: "Aurora 2BR",
    areaM2: 98,
    price: 289000,
    floor: 1,
    status: "AVAILABLE",
    x: 12,
    y: 35,
    polygon: "8,30 24,30 24,42 8,42",
    view: "Garden",
  },
  {
    id: "unit-02",
    slug: "a1-0202",
    code: "A1-0202",
    typologySlug: "aurora-2br",
    typologyName: "Aurora 2BR",
    areaM2: 98,
    price: 295000,
    floor: 2,
    status: "RESERVED",
    x: 28,
    y: 35,
    polygon: "26,30 42,30 42,42 26,42",
    view: "Pool",
  },
  {
    id: "unit-03",
    slug: "b2-0801",
    code: "B2-0801",
    typologySlug: "zenith-3br",
    typologyName: "Zenith 3BR",
    areaM2: 132,
    price: 389000,
    floor: 8,
    status: "SOLD",
    x: 47,
    y: 28,
    polygon: "45,22 62,22 62,35 45,35",
    view: "Ocean",
  },
  {
    id: "unit-04",
    slug: "b2-0901",
    code: "B2-0901",
    typologySlug: "zenith-3br",
    typologyName: "Zenith 3BR",
    areaM2: 132,
    price: 399000,
    floor: 9,
    status: "BLOCKED",
    x: 66,
    y: 20,
    polygon: "64,16 80,16 80,30 64,30",
    view: "Skyline",
  },
];

export const demoFunnel = {
  view_home: 1200,
  view_unit: 640,
  start_reservation: 118,
  complete_reservation: 42,
  schedule_appointment: 89,
};
