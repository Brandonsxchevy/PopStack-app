# PopStack
**Pop problems. Fix fast.**

A swipe-based developer marketplace connecting non-technical users with developers.

---

## Quick start

### Prerequisites
- Node.js 20+
- Docker Desktop (for local Postgres + Redis)
- A Supabase project
- A Stripe account with Connect enabled

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/popstack.git
cd popstack
npm install
```

### 2. Start local database + Redis
```bash
docker-compose up -d
```

### 3. Set up environment variables

**API:**
```bash
cp apps/api/.env.example apps/api/.env
# Fill in your values (Supabase service role key, Stripe secret, etc.)
```

**Web:**
```bash
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase anon key and Stripe publishable key
```

### 4. Run database migrations
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start development servers
```bash
# From root — starts both web (port 3000) and API (port 3001)
npm run dev
```

- Web app: http://localhost:3000
- API: http://localhost:3001
- Swagger docs: http://localhost:3001/api/docs

---

## Project structure

```
popstack/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   │   ├── src/app/
│   │   │   ├── (user)/       # Popper routes
│   │   │   ├── (developer)/  # Stacker routes
│   │   │   └── auth/
│   │   └── src/components/
│   └── api/          # NestJS backend
│       ├── src/
│       │   ├── modules/      # Feature modules
│       │   ├── common/       # Guards, decorators
│       │   └── database/     # Prisma service
│       └── prisma/
│           └── schema.prisma # Full data model
├── packages/
│   └── shared/       # Shared types
└── docker-compose.yml
```

## Build order (recommended)

1. Auth (register / login / JWT) ✅ scaffolded
2. Question submission + fingerprinting ✅ scaffolded
3. Swipe feed ✅ scaffolded
4. Free preview response ✅ scaffolded
5. Session (paywall → accept → timer → approve)  ✅ scaffolded
6. Premium pricing proposals ✅ scaffolded
7. Contracts + multi-task jobs
8. Collaboration (invites + splits)
9. Ratings + badges
10. Inbox + threads + messages
11. Direct request links
12. Profiles
13. Retainer ($300/month)
14. Translation layer

---

## Deploying to Railway

### API service
1. Create new service in Railway → Deploy from GitHub
2. Root directory: `apps/api`
3. Add all environment variables from `.env.example`
4. Add Redis service to same Railway project
5. Set `DATABASE_URL` to your Supabase connection string

### Web service
1. Create new service → Deploy from GitHub
2. Root directory: `apps/web`
3. Add environment variables from `.env.example`
4. Set custom domain: `app.popstack.dev`

### DNS setup (Namecheap)
Add these records in Namecheap DNS:
- `app` CNAME → your Railway web service domain
- `api` CNAME → your Railway API service domain

---

## Environment variables needed

Before first run, you need:
- `SUPABASE_URL` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (secret)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase (safe to expose)
- `STRIPE_SECRET_KEY` — from Stripe dashboard (test mode first)
- `STRIPE_WEBHOOK_SECRET` — from Stripe CLI: `stripe listen --forward-to localhost:3001/api/v1/webhooks/stripe`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from Stripe dashboard
- `JWT_SECRET` — generate: `openssl rand -base64 64`
- `JWT_REFRESH_SECRET` — generate: `openssl rand -base64 64`
- `REDIS_URL` — `redis://localhost:6379` locally, Railway URL in production

---

*PopStack — Pop problems. Fix fast.*
