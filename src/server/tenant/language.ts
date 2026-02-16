import { type AppLanguage } from "@/lib/i18n";

export async function getTenantLanguage(): Promise<AppLanguage> {
  // Spanish is the system-wide primary language.
  return "ES";
}
