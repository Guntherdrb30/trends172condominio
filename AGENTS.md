# Condo Sales OS - Repository Guide

## Stack
- Next.js App Router + TypeScript (strict)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth)
- Tailwind + shadcn/ui patterns
- Vercel Blob for document storage metadata and upload flow
- OpenAI API via secured internal AI gateway tools

## Commands
- `npm run dev`: start local development server
- `npm run build`: production build
- `npm run lint`: ESLint checks
- `npm run test`: smoke and security-oriented tests
- `npm run prisma:generate`: Prisma client generation
- `npm run prisma:migrate`: apply local migrations
- `npm run prisma:seed`: seed demo tenant data

## Conventions
- TypeScript strict only; no `any` without explicit justification.
- Input validation with `zod` at API boundaries.
- Server-side business logic lives in `src/server/*`.
- Route handlers are thin adapters and call services/DAL.
- UI primitives in `src/components/ui`, features in `src/components/*`.
- Prefer server components; use client components only when needed.
- Keep tenant-aware code explicit: pass tenant context in function signatures.

## Multi-tenant Security Checklist
- Every business query must include `tenantId`.
- Reject requests when tenant resolution fails.
- Never expose sensitive assets directly; use signed short-lived URLs.
- No direct LLM-to-DB access. AI endpoints can only use allowed tools.
- Log critical actions and sensitive-document access in `AuditLog`.
- Enforce role checks (`CLIENT`, `SELLER`, `ADMIN`, `ROOT`) before mutations.
- Privileged admin operations require short-lived privileged verification.

