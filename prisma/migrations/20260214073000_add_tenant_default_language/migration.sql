DO $$
BEGIN
  CREATE TYPE "AppLanguage" AS ENUM ('ES', 'EN', 'PT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Tenant"
ADD COLUMN IF NOT EXISTS "defaultLanguage" "AppLanguage" NOT NULL DEFAULT 'ES';

