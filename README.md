# MONK — Workspace Platform

MONK is an early React + Vite + TypeScript workspace application foundation.

## Stack
- React 18, React Router, TypeScript and Vite
- Custom responsive dark UI with Tailwind/PostCSS tooling available
- Supabase JS client for authentication
- Cloudflare deployment planned

## Requirements
- Node.js 20.19+ or 22.12+
- npm

## Local development
```bash
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env` to enable Supabase authentication:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (Supabase publishable/anon key only)

Without these values, the application opens in local preview mode. Never expose a Supabase service-role key in browser code.

## Build
```bash
npm run build
npm run preview
```

## Current scope
- Responsive workspace dashboard
- Task creation and completion (currently local component state)
- Focus-session presentation (timer interaction is not implemented yet)
- Supabase email/password sign-in and sign-up when configured

## Important
This is an initial application foundation, not a production release. Tasks are not persisted yet; production database tables, tenant isolation, Row Level Security policies, email flows, automated tests, build verification and Cloudflare custom-domain deployment remain to be completed.
