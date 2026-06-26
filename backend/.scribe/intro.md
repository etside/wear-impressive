# Introduction

Multi-tenant e-commerce SaaS API. Supports vendor, staff, customer, and super-admin auth via Laravel Sanctum.

<aside>
    <strong>Base URL</strong>: <code>http://localhost:8000</code>
</aside>

    eTommerce exposes four route groups:

    - **`/api/vendor/*`** — authenticated vendor dashboard (Bearer token obtained via `POST /api/vendor/login`).
    - **`/api/staff/*`** — store-staff portal.
    - **`/api/customer/*`** — authenticated customer account area (requires store context).
    - **`/api/store/*`** — public storefront (requires store context via subdomain OR `X-Store-Handle` header in dev).
    - **`/api/admin/*`** — platform super-admin (Bearer token from `POST /api/admin/login`).
    - **`/api/webhooks/*`** — inbound webhook callbacks from payment / courier gateways.

    **Multi-tenancy:** storefront and customer routes resolve the target store from (a) `*.{APP_DOMAIN}` subdomain, (b) a matching `custom_domain`, or (c) an `X-Store-Handle` header (dev only).

    **Response envelope:** every endpoint returns `{success: bool, message: string, data: any, errors?: object}`.

