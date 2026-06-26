# Authenticating requests

To authenticate requests, include an **`Authorization`** header with the value **`"Bearer {YOUR_BEARER_TOKEN}"`**.

All authenticated endpoints are marked with a `requires authentication` badge in the documentation below.

    Tokens come from one of four login endpoints:
    - `POST /api/vendor/login` — vendor dashboard
    - `POST /api/staff/login` — staff portal
    - `POST /api/customer/login` — customer account (send `X-Store-Handle` header)
    - `POST /api/admin/login` — platform super-admin

    Pass the returned `token` as `Authorization: Bearer <token>` on authenticated requests.
    Storefront + customer routes additionally need a store context — set `X-Store-Handle: your-store-handle` when not hitting a real subdomain.
