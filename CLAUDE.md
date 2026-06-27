# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Wear Impressive — single-tenant fork of eTommerce

This project is a **standalone build of the Wear Impressive storefront + vendor
dashboard**, forked from the eTommerce SaaS platform on **2026-04-28**.
The platform repo lives at `e:\nas\eTommerce\` (commit `39ca874` on branch
`staging`, pushed to https://github.com/EngineersTech/eTommerce). The two
projects are independent now — changes to one don't propagate to the other.

If you (Claude or any other assistant) just opened this folder, **read this
file first** before assuming things about the codebase. The structure looks
like the eTommerce platform but isn't: SaaS-platform routes have been
deleted, the storefront is flattened to root, and the store handle is
hardcoded.

---

## What this project is for

The platform owner is delivering Wear Impressive — a Bangladeshi fashion
brand selling premium denim cargos and rib-cotton t-shirts — as a
**self-hosted single-tenant deployment**. Wear Impressive's developer
will eventually upload this to their own host (cPanel with Node.js
support, or any Node 20+ + PHP 8.2+ + MySQL stack).

The platform itself (eTommerce) keeps running as multi-tenant SaaS and
is unaffected.

## Tenant identity

- **Store name**: Wear Impressive
- **Handle**: `wi`
- **Store ID** in the database: `1` (live MySQL) / `17` (local SQLite seed)
- **Owner email** (vendor login): `owner@wearimpressive.com`
- **Owner password**: `[SET_VIA_ENV]` (local) / `[SET_VIA_ENV]` (live)
- **Phone / WhatsApp**: `+8801993008596`
- **Address**: Uttarkhan, Dhaka, Bangladesh, 1230
- **Primary color**: `#2596be` (teal)
- **Currency**: BDT
- **Languages**: EN + BN (bilingual storefront)

---

## What changed vs the eTommerce platform

### Frontend (`frontend/app/`)

| Folder / file | Status | Notes |
|---|---|---|
| `(auth)/` | **kept** | Vendor login + register (used by WI's owner to log into the dashboard) |
| `(storefront)/` | **NEW** — flattened from `shops/[handle]/*` | Customer storefront — serves at `/`, `/products`, `/cart`, etc. |
| `dashboard/` | **kept** | Vendor admin dashboard. Sidebar already pruned of SaaS-only menus (`frontend/components/dashboard/sidebar.tsx`) |
| `admin/` | **deleted** | Was the eTommerce SaaS super-admin (manage all tenants) |
| `onboarding/` | **deleted** | Was the new-vendor signup wizard |
| `store/[[...path]]/` | **deleted** | Custom-domain catch-all from the platform |
| `page.tsx` (root) | **deleted** | Was the eTommerce SaaS marketing landing page |
| `layout.tsx` (root) | **kept** | App shell — globals, providers, language context |

### Hardcoded tenant identity

These two files anchor the single-tenant nature of the build. **Do not
re-introduce multi-tenant resolution code** — there's only ever one
store here.

- **`frontend/lib/api/storefront-context.ts`** — `getStoreHandle()`
  returns the constant `TENANT_HANDLE = 'wi'`. The original
  multi-tenant code (subdomain detection, URL parsing, localStorage
  override, env var fallback) is gone. The constant is at the top of
  the file in plain sight; change it if you ever repoint this build at
  a different store.

- **`frontend/lib/use-shop-base.ts`** — `useShopBase()` and `shopBase()`
  both return `''`. The original code returned `/shops/<handle>` from
  `useParams()`; we keep the function for API parity so call sites
  don't need to change, but the prefix is empty now.

### URL builders that were rewritten

- **`frontend/components/dashboard/topnav.tsx`** — "View Store" link
  goes to `/`, not `/shops/<handle>`.
- **`frontend/app/dashboard/page.tsx`** — same.
- **`frontend/app/(storefront)/layout.tsx`** — the `resolveUrl()` helper
  inside the storefront layout now strips legacy `/shops/<handle>` and
  `/store` prefixes from any saved menu rows so old data still resolves
  to root-relative URLs.

### Backend (`backend/`)

**Untouched so far.** The backend still runs the multi-tenant
`ResolveStoreMiddleware` which reads the `X-Store-Handle: wi` header
sent by every storefront API call. This works correctly because the
frontend hardcoded handle is `wi`. We could strip the multi-tenant
middleware entirely (since there's only one store) but kept it — less
diff, easier to verify nothing broke.

If you ever do strip multi-tenant on the backend:
1. Replace `$this->currentStore($request)` calls with a hardcoded
   `Store::find(17)` (or whatever store ID this build represents).
2. Remove the `ResolveStoreMiddleware` from the route groups that use it.
3. Drop `$store_id` filters from queries — they all filter to the same
   store anyway.

Don't bother unless there's a real reason; the header-based resolution
adds zero runtime cost and keeps the diff against the platform smaller.

### What stayed identical

- The Laravel app itself (controllers, models, migrations, services).
- The Next.js shared utilities (themes, UI components, i18n, format
  helpers, Bangladesh-locations dataset).
- The DB schema and the SQLite seed data — `database/database.sqlite`
  has all of WI's products, customers (real + demo), orders, settings,
  shipping zones, etc.
- The `backend/storage/app/public/stores/17/` folder with all uploaded
  assets (logo, hero SVGs, payment proofs).

---

## Commands

### Frontend (`frontend/`)

```bash
npm run dev          # dev server → http://localhost:3000
npm run build        # production build → .next/
npm run lint         # ESLint (eslint.config.mjs)
npm run test:e2e     # Playwright E2E (requires both servers running)
npm run test:e2e:ui  # Playwright with interactive UI
```

### Backend (`backend/`)

```bash
php artisan serve                    # API server → http://localhost:8000
php artisan test                     # all tests (in-memory SQLite)
php artisan test --filter=TestName   # single test class or method
php artisan migrate                  # run migrations against database.sqlite
php artisan storage:link             # symlink storage/app/public → public/storage
```

Backend tests run against an in-memory SQLite DB (`phpunit.xml` sets `DB_DATABASE=:memory:`), so they don't touch `database.sqlite`.

### Deploy

```bash
git push origin main           # triggers GitHub Actions → build + rsync + pm2 restart
# Manual trigger: GitHub UI → Actions → "Deploy → wearimpressive.com" → Run workflow
```

`deploy.py` is a legacy SFTP script from the old cPanel setup — no longer used.

---

## How to run locally

```bash
# Terminal 1 — backend
cd backend && php artisan serve     # → http://localhost:8000

# Terminal 2 — frontend
cd frontend && npm run dev          # → http://localhost:3000
```

The storefront opens at `http://localhost:3000/` (no `/shops/wi`
prefix). Sign into the vendor dashboard at
`http://localhost:3000/login` with `owner@wearimpressive.com` /
`[SET_VIA_ENV]`.

## How to build for production

```bash
cd frontend && npm run build

cd backend
composer install --no-dev --optimize-autoloader
php artisan config:cache
php artisan route:cache
```

The deployment target is **Node.js + PHP cPanel hosting**. The host
needs:
- PHP 8.2+ (Laravel 11 requirement)
- MySQL 8.0 or MariaDB 10.6+
- Node.js 20+ via the cPanel "Setup Node.js App" feature
- Apache rewrite rules to point Laravel at `public/index.php`

A README for the deploying developer is **not yet written** — see TODO.

---

## Live server — wearimpressive.com

**Host**: VPS at `[YOUR_VPS_IP]`
**SSH user**: `[YOUR_SSH_USER]`
**SSH key secret**: `[YOUR_SSH_KEY_SECRET]` (stored in GitHub Actions secrets)
**Process manager**: PM2 — app name `wearimpressive-storefront`

### Server file layout

```
/var/www/wearimpressive/
├── frontend/
│   ├── .next/          ← built output (rsynced by CI)
│   ├── public/         ← static assets (rsynced by CI)
│   ├── server.js       ← Node.js entry point (rsynced by CI)
│   └── node_modules/   ← installed on server
└── backend/
    ├── .env            ← NOT deployed (excluded from rsync)
    ├── storage/        ← NOT deployed (excluded — preserves uploads)
    └── vendor/         ← NOT deployed (excluded)
```

### How deploy works (GitHub Actions)

Push to `main` (touching `frontend/**` or `backend/**`) triggers `.github/workflows/deploy-production.yml`:

1. `npm ci` + `npm run build` with `NEXT_PUBLIC_API_URL=https://wearimpressive.com/api`
2. rsync `frontend/.next/` → VPS (excludes `cache/` and `trace/`)
3. rsync `frontend/public/` → VPS
4. scp `frontend/server.js` → VPS
5. rsync `backend/` → VPS (excludes `.env`, `storage/`, `vendor/`, `node_modules/`)
6. `pm2 restart wearimpressive-storefront && pm2 save`

**Manual trigger**: GitHub UI → Actions → Deploy → Run workflow.

### Backend (API)

Laravel at `/var/www/wearimpressive/backend/`. Frontend calls it at
`https://wearimpressive.com/api` (proxied at the nginx/Apache level).
The `.env` on the server is **not** in the repo — edit directly on VPS or
via cPanel file manager if needed.

---

## Frontend architecture

### Data fetching

All API calls go through `frontend/lib/api/client.ts` (axios instance) with base URL from `NEXT_PUBLIC_API_URL`. Typed service functions live in `frontend/lib/api/services/` — one file per domain (`vendor-products.ts`, `storefront.ts`, `customer-auth.ts`, etc.). Components call these via **TanStack Query** (`useQuery` / `useMutation`).

### API token routing

`client.ts` inspects the request URL prefix to pick the right Bearer token:

| URL prefix | Token used |
|---|---|
| `/vendor/…` | `etommerce_vendor_token` |
| `/customer/…`, `/store/…` | `etommerce_customer_token` |
| `/staff/…` | `etommerce_staff_token` |
| `/admin/…` | `etommerce_super_admin_token` |

Guest cart requests (no customer token) also get `X-Cart-Token` injected by `installStorefrontInterceptor()` in `storefront-context.ts`. The cart token is a random string persisted to localStorage under key `etommerce_cart_token`.

### i18n

`frontend/lib/i18n/translations.ts` exports a nested `{ en: {…}, bn: {…} }` object. `frontend/lib/i18n/context.tsx` exports `LanguageProvider` (wraps the app) and `useLang()` hook which returns `{ lang, setLang, t }`.

- **Default language is Bangla (`bn`)** — saved to `localStorage` key `et-lang`.
- Every customer-facing string must exist in **both** `en` and `bn` inside `translations.ts`.
- Consume with `const { t } = useLang();` then `t.sectionKey.stringKey`.
- When BN is active, `--font-sans` CSS var switches to `'Li Ador Noirrit', 'Hind Siliguri', sans-serif` globally.

---

## CMS pages (added post-fork)

Vendor-editable static pages (e.g. `/about`) live outside the hardcoded
storefront routes:

- **Backend**: `CmsPage` model + migration
  `2026_04_18_124008_create_cms_pages_table.php`. Two controllers —
  `Api/Vendor/CmsPageController.php` (CRUD from the dashboard) and
  `Api/Storefront/CmsPageController.php` (public read by slug).
- **Frontend dashboard**: `frontend/app/dashboard/content/pages/` —
  list (`page.tsx`), create (`new/page.tsx`), edit (`[id]/page.tsx`).
  Service calls in `frontend/lib/api/services/vendor-content.ts`.
- Storefront pages render dynamically by slug; `/about` is the first
  page built this way. New CMS pages are seeded on deploy (see
  `deploy-production.yml` — runs a seeder step after migrate).

## SMS notifications (added post-fork)

Order-confirmed SMS via Gennet iSMS (Bangla):

- `backend/app/Services/Sms/GennetSmsService.php` — sends the SMS.
- `backend/app/Listeners/SendOrderConfirmedSms.php` — fires on the
  order-confirmed event.
- `backend/app/Models/SmsLog.php` — delivery log per attempt.

---

## Open work / TODO

1. **Write a deployment README** for the WI dev. Cover:
   - PHP / MySQL / Node version requirements
   - Environment files (`.env` for Laravel, `.env.local` for Next.js)
   - Database setup (import the `database.sqlite` schema → MySQL)
   - File-storage symlink (`php artisan storage:link`)
   - cPanel "Setup Node.js App" walkthrough
   - SSL + custom domain configuration

2. **Optional backend strip.** Remove multi-tenant middleware /
   `store_id` filters if a future maintainer prefers cleaner code over
   smaller diffs. Not required for the build to work.

---

## Conventions to follow when editing this project

- **Don't reintroduce multi-tenant code.** There's one store. If you
  catch yourself writing `params.handle` or building `/shops/<handle>`
  URLs, stop — it's a leftover pattern.
- **Storefront URLs are root-relative.** `<Link href="/products">` not
  `<Link href={`${__sb}/products`}>`. The `__sb` / `useShopBase()`
  pattern was retained for diff-minimisation, but `__sb` is now `''`
  — it's effectively a no-op.
- **Bilingual UI is non-negotiable.** Every customer-facing page must
  switch between EN and BN via `t.*` translations in
  `frontend/lib/i18n/translations.ts`. The Bangla font (`Li Ador
  Noirrit`, fallback `Hind Siliguri`) is wired through CSS vars.
- **Store the platform's commits as reference.** When in doubt about a
  pattern, look at `e:\nas\eTommerce\` — same files, multi-tenant
  version. If you change something here that should also flow back to
  the platform, mention it to the owner so they can port the patch.
- **Wear Impressive's brand colour is `#2596be`** — used for header
  hover, footer background, social-icon contrast.

---

## File map of the most important changes

```
wear-impressive/
├── frontend/
│   ├── app/
│   │   ├── (auth)/                            ← vendor login (kept)
│   │   ├── (storefront)/                      ← NEW: storefront at root
│   │   │   ├── layout.tsx                     ← header + footer (URL resolver fixed)
│   │   │   ├── page.tsx                       ← storefront home
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── account/                       ← customer dashboard
│   │   │   └── order-confirmation/
│   │   │   └── dashboard/content/pages/           ← CMS pages dashboard (added post-fork)
│   ├── dashboard/                         ← vendor admin (sidebar pruned of SaaS menus)
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   └── storefront-context.ts          ← TENANT_HANDLE = 'wi' (single-tenant)
│   │   └── use-shop-base.ts                   ← returns '' (no prefix)
│   └── components/
│       └── dashboard/
│           └── topnav.tsx                     ← "View Store" → /
├── backend/                                   ← untouched, multi-tenant code still works
│   ├── database/
│   │   └── database.sqlite                    ← WI's full data, store_id=17
│   └── storage/app/public/stores/17/          ← logos, hero SVGs, etc.
├── package.json (frontend)
├── composer.json (backend)
└── CLAUDE.md                                  ← you are here
```
