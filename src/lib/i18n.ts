export type AppLanguage = "ES" | "EN" | "PT";

type Dictionary = {
  brandName: string;
  navMasterplan: string;
  navTypologies: string;
  navAmenities: string;
  signIn: string;
  secureAccess: string;
  email: string;
  password: string;
  invalidCredentials: string;
  signingIn: string;
  homeBadge: string;
  homeTitle: string;
  openMasterplan: string;
  goDashboard: string;
  activeFunnelToday: string;
  visitsHome: string;
  unitViews: string;
  reservationsStarted: string;
  reservationsCompleted: string;
  viewTypology: string;
  configureAmenity: string;
  interactiveMasterplan: string;
  masterplanDescription: string;
  typologies: string;
  amenities: string;
};

const dictionaries: Record<AppLanguage, Dictionary> = {
  ES: {
    brandName: "Condo Sales OS",
    navMasterplan: "Masterplan",
    navTypologies: "Tipologias",
    navAmenities: "Amenities",
    signIn: "Ingresar",
    secureAccess: "Ingreso Seguro",
    email: "Email",
    password: "Password",
    invalidCredentials: "Credenciales invalidas.",
    signingIn: "Ingresando...",
    homeBadge: "Condo Sales OS 2026",
    homeTitle: "White-label Multi-tenant para ventas de condominios premium.",
    openMasterplan: "Abrir Masterplan",
    goDashboard: "Ir a Dashboard",
    activeFunnelToday: "Funnel activo hoy",
    visitsHome: "Visitas home",
    unitViews: "Views unidad",
    reservationsStarted: "Reservas iniciadas",
    reservationsCompleted: "Reservas completadas",
    viewTypology: "Ver tipologia",
    configureAmenity: "Configurar amenity",
    interactiveMasterplan: "Masterplan interactivo",
    masterplanDescription: "Zoom, pan, filtros por estado/tipologia/precio y deep links por unidad.",
    typologies: "Tipologias",
    amenities: "Amenities",
  },
  EN: {
    brandName: "Condo Sales OS",
    navMasterplan: "Masterplan",
    navTypologies: "Typologies",
    navAmenities: "Amenities",
    signIn: "Sign in",
    secureAccess: "Secure Access",
    email: "Email",
    password: "Password",
    invalidCredentials: "Invalid credentials.",
    signingIn: "Signing in...",
    homeBadge: "Condo Sales OS 2026",
    homeTitle: "White-label Multi-tenant platform for premium condo sales.",
    openMasterplan: "Open Masterplan",
    goDashboard: "Go to Dashboard",
    activeFunnelToday: "Active funnel today",
    visitsHome: "Home visits",
    unitViews: "Unit views",
    reservationsStarted: "Reservations started",
    reservationsCompleted: "Reservations completed",
    viewTypology: "View typology",
    configureAmenity: "Configure amenity",
    interactiveMasterplan: "Interactive masterplan",
    masterplanDescription: "Zoom, pan, filters by status/typology/price and deep links by unit.",
    typologies: "Typologies",
    amenities: "Amenities",
  },
  PT: {
    brandName: "Condo Sales OS",
    navMasterplan: "Masterplan",
    navTypologies: "Tipologias",
    navAmenities: "Amenidades",
    signIn: "Entrar",
    secureAccess: "Acesso Seguro",
    email: "Email",
    password: "Senha",
    invalidCredentials: "Credenciais invalidas.",
    signingIn: "Entrando...",
    homeBadge: "Condo Sales OS 2026",
    homeTitle: "Plataforma white-label multi-tenant para vendas premium de condominios.",
    openMasterplan: "Abrir Masterplan",
    goDashboard: "Ir para Dashboard",
    activeFunnelToday: "Funil ativo hoje",
    visitsHome: "Visitas home",
    unitViews: "Visualizacoes da unidade",
    reservationsStarted: "Reservas iniciadas",
    reservationsCompleted: "Reservas concluidas",
    viewTypology: "Ver tipologia",
    configureAmenity: "Configurar amenidade",
    interactiveMasterplan: "Masterplan interativo",
    masterplanDescription: "Zoom, pan, filtros por status/tipologia/preco e deep links por unidade.",
    typologies: "Tipologias",
    amenities: "Amenidades",
  },
};

export function normalizeLanguage(value?: string | null): AppLanguage {
  if (!value) return "ES";
  const upper = value.toUpperCase();
  if (upper === "EN" || upper === "PT" || upper === "ES") return upper;
  return "ES";
}

export function getDictionary(language: AppLanguage): Dictionary {
  return dictionaries[language] ?? dictionaries.ES;
}

