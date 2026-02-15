-- CreateEnum
CREATE TYPE "public"."TenantType" AS ENUM ('PLATFORM', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "public"."InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."PageKind" AS ENUM ('HOME', 'AVAILABILITY', 'TYPOLOGY', 'AMENITY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."PageVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."Tenant" ADD COLUMN     "featureFlags" JSONB,
ADD COLUMN     "headerVideoAssetId" TEXT,
ADD COLUMN     "headerVideoUrl" TEXT,
ADD COLUMN     "isPlatform" BOOLEAN,
ADD COLUMN     "selfSignupEnabled" BOOLEAN DEFAULT true,
ADD COLUMN     "supportedLocales" TEXT[] DEFAULT ARRAY['es', 'en']::TEXT[],
ADD COLUMN     "type" "public"."TenantType";

-- AlterTable
ALTER TABLE "public"."Domain" ADD COLUMN     "allowClientSignup" BOOLEAN DEFAULT true,
ADD COLUMN     "normalizedHost" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "locale" "public"."AppLanguage" DEFAULT 'ES';

-- AlterTable
ALTER TABLE "public"."Membership" ADD COLUMN     "inviteTokenId" TEXT,
ADD COLUMN     "invitedById" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Asset" ADD COLUMN     "blockId" TEXT,
ADD COLUMN     "pageId" TEXT,
ADD COLUMN     "pageVersionId" TEXT;

-- CreateTable
CREATE TABLE "public"."InviteToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "acceptedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ThemeSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fontPrimary" TEXT,
    "fontSecondary" TEXT,
    "headerVideoAssetId" TEXT,
    "headerImageAssetId" TEXT,
    "buttonRadius" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThemeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteNavigation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "draftItems" JSONB,
    "publishedItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteNavigation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Page" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "public"."PageKind",
    "title" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "currentDraftVersionId" TEXT,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PageVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "public"."PageVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "createdById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Translation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_tokenHash_key" ON "public"."InviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "InviteToken_tenantId_status_expiresAt_idx" ON "public"."InviteToken"("tenantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "InviteToken_tenantId_email_idx" ON "public"."InviteToken"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ThemeSettings_tenantId_key" ON "public"."ThemeSettings"("tenantId");

-- CreateIndex
CREATE INDEX "SiteNavigation_tenantId_locale_idx" ON "public"."SiteNavigation"("tenantId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SiteNavigation_tenantId_locale_key" ON "public"."SiteNavigation"("tenantId", "locale");

-- CreateIndex
CREATE INDEX "Page_tenantId_kind_idx" ON "public"."Page"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Page_tenantId_slug_key" ON "public"."Page"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "PageVersion_tenantId_pageId_status_idx" ON "public"."PageVersion"("tenantId", "pageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PageVersion_pageId_versionNumber_key" ON "public"."PageVersion"("pageId", "versionNumber");

-- CreateIndex
CREATE INDEX "Translation_tenantId_entityType_entityId_idx" ON "public"."Translation"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Translation_tenantId_locale_idx" ON "public"."Translation"("tenantId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_tenantId_entityType_entityId_field_locale_key" ON "public"."Translation"("tenantId", "entityType", "entityId", "field", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_normalizedHost_key" ON "public"."Domain"("normalizedHost");

-- CreateIndex
CREATE INDEX "Domain_normalizedHost_idx" ON "public"."Domain"("normalizedHost");

-- CreateIndex
CREATE INDEX "Membership_tenantId_isActive_role_idx" ON "public"."Membership"("tenantId", "isActive", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_inviteTokenId_key" ON "public"."Membership"("inviteTokenId");

-- CreateIndex
CREATE INDEX "Asset_tenantId_pageId_pageVersionId_idx" ON "public"."Asset"("tenantId", "pageId", "pageVersionId");

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Membership" ADD CONSTRAINT "Membership_inviteTokenId_fkey" FOREIGN KEY ("inviteTokenId") REFERENCES "public"."InviteToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Asset" ADD CONSTRAINT "Asset_pageVersionId_fkey" FOREIGN KEY ("pageVersionId") REFERENCES "public"."PageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteToken" ADD CONSTRAINT "InviteToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteToken" ADD CONSTRAINT "InviteToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InviteToken" ADD CONSTRAINT "InviteToken_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ThemeSettings" ADD CONSTRAINT "ThemeSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SiteNavigation" ADD CONSTRAINT "SiteNavigation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_currentDraftVersionId_fkey" FOREIGN KEY ("currentDraftVersionId") REFERENCES "public"."PageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Page" ADD CONSTRAINT "Page_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "public"."PageVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageVersion" ADD CONSTRAINT "PageVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageVersion" ADD CONSTRAINT "PageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "public"."Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PageVersion" ADD CONSTRAINT "PageVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Translation" ADD CONSTRAINT "Translation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

