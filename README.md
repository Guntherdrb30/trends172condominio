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

If `prisma:seed` fails with `Can't reach database server at localhost:5432`, verify Docker Desktop is running and retry steps 4-6.

## Scripts
- `npm run dev`: local dev server
- `npm run build`: production build
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

## Multi-tenant notes
- Tenant is resolved by `Host` header via `Domain` table.
- Middleware normalizes host (`www`, `staging`, ports).
- DAL context is mandatory and rejects missing `tenantId`.
- Every business query in services filters by `tenantId`.
- Tenant language is configurable by ROOT (`ES`, `EN`, `PT`) and public/auth UI adapts to that selection.

## Security model
- RBAC roles: `CLIENT`, `SELLER`, `ADMIN`, `ROOT`.
- Privileged mode endpoint: `POST /api/root/verify` with `ROOT_MASTER_KEY`.
- Sensitive assets are private by design and must be accessed via signed URL:
  - `POST /api/blob/upload`
  - `GET /api/blob/signed-url?assetId=...`
  - `GET /api/blob/access?token=...`
- Audit log tracks critical actions and signed asset access.
- AI endpoint never executes raw DB queries from prompts; only internal tools:
  - `searchUnits`
  - `getTypology`
  - `createAppointment`
  - `createReservation`
  - `getReports`
  - `generateSignedAssetUrl`

## Functional routes
- Public:
  - `/`
  - `/availability`
  - `/typologies/[slug]`
  - `/amenities/[slug]`
- Auth:
  - `/login`
- Dashboards:
  - `/app/client`
  - `/app/seller`
  - `/app/admin`
  - `/app/root`
  - `/app/root/configurator`
- Core APIs:
  - `POST /api/reservations/cancel`
  - `POST /api/sales/attach-docs`

## Deployment notes (Vercel)
- Add all env vars in Vercel Project Settings.
- Ensure GitHub app has access to desired repos.
- Use Postgres production URL in `DATABASE_URL`.
- Configure host/domain records in `Domain` table per tenant.
