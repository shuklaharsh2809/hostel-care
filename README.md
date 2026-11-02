# HostelCare

Multi-tenant hostel management for owners who run several hostels across a city.
Each hostel business signs up as an **organization** and manages its own **branches → rooms → students**, a **mess** per branch, and **invoices & payments**. One organization can never see another's data.

```
hostel-care/
├── backend/    NestJS REST API + Drizzle ORM + PostgreSQL   → http://localhost:4000/api
├── frontend/   Next.js web app for owners and wardens         → http://localhost:3000
└── package.json   convenience scripts that run both
```

The frontend never touches the database. Everything goes through the API, so a future student mobile app (or any other client) can use the same backend.

## Quick start

```bash
npm install && npm run install:all   # installs root, backend and frontend
npm run setup                        # creates the database + loads demo data
npm run dev                          # starts API (4000) and web (3000) together
```

Open http://localhost:3000 and log in with **demo@hostelcare.app / demo1234**.

Locally, no database install is needed: with `DATABASE_URL` empty, the backend uses **PGlite** (real Postgres compiled to WASM) stored in `backend/.data`. PGlite allows one process at a time, so stop the API before running `npm run setup` again.
To use a real Postgres instead: `cd backend && docker compose up -d`, set `DATABASE_URL` in `backend/.env`, then `npm run setup`.

### Environment

| File | Variable | Purpose |
|---|---|---|
| `backend/.env` | `DATABASE_URL` | Postgres URL; leave empty for local PGlite |
| | `JWT_SECRET` | Random string (32+ chars) used to sign API tokens |
| | `PORT` | API port (default 4000) |
| | `CORS_ORIGINS` | Browser origins allowed to call the API directly (future clients) |
| `frontend/.env.local` | `API_URL` | Where the API runs (default `http://localhost:4000`) |

Copy each `.env.example` to get started.

## How the pieces talk

```
Browser ──cookie(hc_token, httpOnly)──▶ Next.js server ──Bearer token──▶ NestJS API ──▶ Postgres
```

1. Login/signup posts to the Next.js server, which calls `POST /api/auth/login` and stores the returned JWT in an **httpOnly cookie**. Browser JavaScript can never read it.
2. Pages (Server Components) and form submissions (Server Actions) call the API with `Authorization: Bearer <token>` via `frontend/src/lib/api.ts`.
3. The API's global `AuthGuard` verifies the token and **reloads the user from the database on every request**, so removing a team member or changing their role applies immediately.
4. Every query is scoped by the user's `orgId` (and branch, for branch-restricted staff) in `backend/src/common/auth.ts`.

## API

All routes are under `/api` and need `Authorization: Bearer <token>` except signup, login and health. Money is **integer paise** (₹1 = 100); dates are `YYYY-MM-DD`. Errors look like `{ "statusCode": 400, "message": "Room 101 is already full (2 beds)" }`.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/signup` · `POST /auth/login` · `GET /auth/me` |
| Dashboard | `GET /dashboard` |
| Branches & rooms | `GET/POST /branches` · `GET/PATCH /branches/:id` · `POST /branches/:id/rooms` · `DELETE /rooms/:id` |
| Students | `GET /students?q&branch&status&page` · `GET /students/form-options` · `POST /students` · `GET/PATCH /students/:id` · `POST /students/:id/status` |
| Mess | `GET /mess?branch&month` · `PUT /mess/:branchId/menu` · `POST /mess/:branchId/plans` · `PATCH /mess/plans/:id` · `POST /mess/:branchId/expenses` · `DELETE /mess/expenses/:id` |
| Invoices | `GET /invoices?status&branch&q&page` · `GET /invoices/new-options` · `POST /invoices` · `GET /invoices/:id` · `POST /invoices/:id/payments` · `POST /invoices/:id/void` · `DELETE /payments/:id` · `GET /invoices/bulk-options` · `POST /invoices/bulk` |
| Team & settings (owner) | `GET/POST /team` · `DELETE /team/:id` · `GET/PATCH /organization` |

Roles: **owner** can do everything; **manager** can manage students, rooms, mess and invoices; **staff** is view-only. Managers and staff can be limited to a single branch.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| API | **NestJS 12** (ESM, TypeScript) | Clear module-per-feature structure, global auth guard, built-in Zod validation via `@Body({ schema })`. |
| Database | **PostgreSQL** + **Drizzle ORM** | Relational data with foreign keys and transactions (invoice numbering, payments). SQL migrations in `backend/drizzle/`. |
| Auth | bcrypt + JWT (`@nestjs/jwt`) | Stateless tokens that any client (web, mobile) can use. |
| Web | **Next.js 16** + React 19 + **Tailwind CSS v4** | Server-rendered pages; the API token stays on the server. |
| Hosting | API on Railway / Render / Fly / AWS; web on Vercel; Postgres on Neon / Supabase / RDS | Set the env vars above and run `npm run db:migrate --prefix backend` once against production. |

## Project layout

```
backend/
  src/main.ts                 bootstrap: /api prefix, CORS, validation pipe
  src/app.module.ts           wires controllers + global AuthGuard
  src/common/auth.ts          token → user, @Public, @CurrentUser, role & tenant scoping helpers
  src/modules/<feature>/      auth, dashboard, branches, students, mess, invoices, team
  src/lib/billing.ts          invoice creation, numbering, payment status
  src/db/schema.ts            all tables
  scripts/                    migrate + seed
frontend/
  src/lib/api.ts              server-only API client (adds token, maps errors)
  src/lib/types.ts            API response types
  src/app/(auth)/             login, signup
  src/app/app/                dashboard, branches, students, mess, invoices, team, settings
  src/components/             UI kit, forms, sidebar
  public/illustrations/       original SVG artwork (no third-party images)
```

## Scripts

| Where | Command | |
|---|---|---|
| root | `npm run dev` | API + web together |
| root | `npm run build` / `npm run typecheck` | Both projects |
| backend | `npm run setup` | Migrate + seed demo data |
| backend | `npm run db:generate` | New migration after editing `schema.ts` |
| backend | `npm run db:migrate` | Apply migrations |

## Roadmap
- UI upgrade: charts, visual room/bed map, student photos, shadcn/ui, Cmd+K search
- Student portal & mobile app (Expo) on the same API: dues, online payment, menu, complaints, leave requests
- Online payments (Razorpay / UPI) and WhatsApp/SMS reminders
- Meal opt-out with rebates, complaints/maintenance tickets, visitor log, deposit settlement on exit
