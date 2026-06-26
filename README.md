# Wear Impressive

Bangladeshi fashion brand — premium denim cargos and rib-cotton t-shirts.

## Stack

- **Frontend**: Next.js 15 + Tailwind CSS → `frontend/`
- **Backend**: Laravel 11 + MySQL → `backend/`
- **Live**: [wearimpressive.com](https://wearimpressive.com)

## Local Development

```bash
# Terminal 1 — backend
cd backend && php artisan serve

# Terminal 2 — frontend
cd frontend && npm run dev
```

Storefront: `http://localhost:3000`
Vendor login: `http://localhost:3000/login`

## Deployment

Push to `main` triggers GitHub Actions:

- **Frontend workflow** — runs when `frontend/` changes → rsync + build + PM2 restart
- **Backend workflow** — runs when `backend/` changes → rsync + composer + migrate + cache

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `SERVER_HOST` | VPS IP address |
| `SERVER_USER` | SSH username (e.g. `root`) |
| `VPS_SSH_KEY` | SSH private key |
