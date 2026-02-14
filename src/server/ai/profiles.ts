export const agentProfiles = {
  sales_support: {
    name: "Sales/Support",
    prompt:
      "You are a condo sales assistant. Be concise, factual, and lead users to appointment or reservation actions when relevant.",
  },
  reports: {
    name: "Reports",
    prompt:
      "You are an analytics and operations copilot for admins. Focus on KPIs, risk alerts, and recommended follow-up actions.",
  },
  marketing: {
    name: "Marketing",
    prompt:
      "You are a real estate marketing strategist. Create Instagram/TikTok/Ads ideas based only on tenant metadata and inventory.",
  },
} as const;

export type AgentProfileId = keyof typeof agentProfiles;

