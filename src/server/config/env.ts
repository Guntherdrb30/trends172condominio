import { z } from "zod";

const rawEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ROOT_MASTER_KEY: z.string().optional(),
});

const parsed = rawEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ROOT_MASTER_KEY: process.env.ROOT_MASTER_KEY,
});

export const env = {
  DATABASE_URL: parsed.DATABASE_URL ?? "",
  AUTH_SECRET: parsed.AUTH_SECRET ?? "",
  NEXTAUTH_URL: parsed.NEXTAUTH_URL ?? "http://localhost:3000",
  BLOB_READ_WRITE_TOKEN: parsed.BLOB_READ_WRITE_TOKEN ?? "",
  OPENAI_API_KEY: parsed.OPENAI_API_KEY ?? "",
  ROOT_MASTER_KEY: parsed.ROOT_MASTER_KEY ?? "",
};

export function requireEnv(name: keyof typeof env) {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

