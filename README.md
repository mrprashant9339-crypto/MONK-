# MONK — Startup Workspace Platform

MONK is a web platform foundation built with React, Vite, TypeScript, Tailwind CSS and Supabase.

## Project source

The application source package is being prepared separately. This repository is the canonical Git remote for the MONK project.

## Planned stack

- Frontend: React + Vite + TypeScript
- Styling: Tailwind CSS
- Authentication and database: Supabase
- Hosting: Cloudflare
- Source control: GitHub

## Environment variables

Create a local `.env` file from `.env.example` and configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never put a Supabase service-role key in browser code.

## Deployment status

Production build, Supabase schema/RLS, Cloudflare deployment and custom-domain routing must be verified before this project is considered production-ready.