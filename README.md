# Condo Sales OS SaaS Skeleton (2026)

White-label multi-tenant SaaS for premium condo sales built with Next.js App Router, TypeScript, PostgreSQL, Prisma, Auth.js, Vercel Blob, analytics, and AI gateway tools.

## Tech stack
- Next.js 16 + App Router + TypeScript strict
- Tailwind + shadcn/ui-style components
- Prisma ORM + PostgreSQL
- Auth.js (`next-auth`) with credentials login
- Vercel Blob metadata/upload flow + signed access URLs
- AI gateway endpoint with secure internal tools

## Quick start (local)
1. Install dependencies:
```bash
npm install
```
2. Create env file:
```bash
cp .env.example .env
```
3. Update `.env` values:
- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `BLOB_READ_WRITE_TOKEN`
- `OPENAI_API_KEY`
- `ROOT_MASTER_KEY`

4. Start PostgreSQL (Docker):
```bash
npm run db:up
```
Use this local `DATABASE_URL` if needed:
`postgresql://condo:condo@localhost:5432/condo_sales_os?schema=public`

5. Create DB schema:
```bash
npm run prisma:migrate
```
6. Seed demo data:
```bash
npm run prisma:seed
```
7. Run app:
```bash
npm run dev
```

## Scripts
- `npm run dev`: local dev server
- `npm run build`: production build (webpack mode)
- `npm run lint`: eslint checks
- `npm run test`: smoke + tenant-guard tests
- `npm run prisma:generate`: prisma client generation
- `npm run prisma:migrate`: migrations
- `npm run prisma:seed`: demo tenant data
- `npm run db:up`: starts local PostgreSQL with Docker
- `npm run db:down`: stops local PostgreSQL container

## Demo credentials (local only)
- `root@articimento.local` / `root123`
- `admin@articimento.local` / `admin123`
- `seller@articimento.local` / `seller123`
- `client@articimento.local` / `client123`

## Platform / Root model (Option B)
- Seed creates tenant `PLATFORM` and tenant demo `CUSTOMER` (`Articimento Premium`).
- `ROOT` membership exists only in `PLATFORM`.
- `/app/root` uses persistent `targetTenantId` selector via secure httpOnly cookie.
- Root builder APIs resolve and enforce this `targetTenantId`.

## Invite + signup model
- `ADMIN` and `SELLER`: invite-only.
  - `POST /api/root/invites`
  - `POST /api/auth/accept-invite`
  - UI: `/invite/accept`
- `CLIENT`: self-signup by domain.
  - `POST /api/auth/signup`
  - UI: `/signup`
  - Controlled by `Tenant.selfSignupEnabled` + `Domain.allowClientSignup`.

## Site Builder (Draft / Publish / Versioning)
- Prisma models: `Page`, `PageVersion`, `ThemeSettings`, `SiteNavigation`, `Translation`.
- Root pages:
  - `/app/root/site`
  - `/app/root/ai-configurator`
- Root builder APIs:
  - `GET/POST /api/root/site/pages`
  - `GET/PATCH /api/root/site/pages/[slug]`
  - `POST /api/root/site/pages/[slug]/publish`
  - `POST /api/root/site/pages/[slug]/rollback`
  - `GET/POST /api/root/site/theme`
  - `GET/POST /api/root/site/navigation`
- Public renderer reads published page versions for `/` and `/availability`.

## Multi-tenant notes
- Tenant is resolved by `Host` header via `Domain` table.
- Middleware normalizes host (`www`, `staging`, ports).
- DAL context is mandatory and rejects missing `tenantId`.
- Every business query in services filters by `tenantId`.
- Generic `Translation` table supports ES/EN fallback to base fields.

## Security model
- RBAC roles: `CLIENT`, `SELLER`, `ADMIN`, `ROOT`.
- Privileged mode endpoint: `POST /api/root/verify` with `ROOT_MASTER_KEY`.
- Sensitive assets are private by design and must be accessed via signed URL:
  - `POST /api/blob/upload`
  - `GET /api/blob/signed-url?assetId=...`
  - `GET /api/blob/access?token=...`
- Audit log tracks critical actions and signed asset access.
- AI endpoint never executes raw DB queries from prompts; only internal tools.

## Functional routes
- Public:
  - `/`
  - `/availability`
  - `/typologies/[slug]`
  - `/amenities/[slug]`
- Auth:
  - `/login`
  - `/signup`
  - `/invite/accept`
- Dashboards:
  - `/app/client`
  - `/app/seller`
  - `/app/admin`
  - `/app/root`
  - `/app/root/configurator`
  - `/app/root/site`
  - `/app/root/ai-configurator`

## Migration note
- Incremental migration added:
  - `prisma/migrations/20260215143000_platform_sitebuilder_i18n/migration.sql`
- If CLI cannot reach DB, run these commands in your own terminal/environment:
```bash
npx prisma migrate deploy
npx prisma generate
```

## Deployment notes (Vercel)
- Add all env vars in Vercel Project Settings.
- Ensure GitHub app has access to desired repos.
- Use Postgres production URL in `DATABASE_URL`.
- Configure host/domain records in `Domain` table per tenant.
