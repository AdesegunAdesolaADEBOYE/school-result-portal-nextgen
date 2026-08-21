# Deploying the backend (server/) to Render or Railway

This document outlines the manual steps to deploy the `server/` folder (Express API)
to Render (recommended) or Railway. The code already exposes a health check at
`/api/health` and includes `npm` scripts for `migrate` and `seed`.

Render (recommended)

1. Create a PostgreSQL instance on Render (or use an external Postgres provider).
2. In Render, create a **New Web Service** and connect your GitHub repo.
   - Choose branch: `improve-app` (or your preferred branch).
   - Set **Root Directory** to `server/`.
   - Build Command: `npm install`
   - Start Command: `npm run migrate && npm start` (remove `&& npm run seed` after first deploy)
3. Add environment variables in the Render service settings:
   - `DATABASE_URL` — your Postgres connection string.
   - `DATABASE_SSL` — `true` or `false`.
   - `JWT_SECRET` — a long random string.
   - `CLIENT_ORIGIN` — the frontend URL (Vercel URL once deployed).
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — optional for initial seed values.
4. Deploy and wait for the build to finish. The service will have a public URL like
   `https://school-result-portal-api.onrender.com` — combine that with `/api` for `VITE_API_URL`.

Railway

1. Create a new Railway project and add a Postgres plugin (or connect an external Postgres).
2. Add a new service that points to this GitHub repo and set the root to `server/`.
3. Configure the build/start commands as above and add the same environment variables.
4. Deploy and copy the generated service URL.

After deploy

- Health check: `GET https://<your-backend>/api/health` should return `{ ok: true }`.
- Use the backend URL to set the frontend variable `VITE_API_URL` (e.g. `https://<your-backend>/api`) in Vercel.

If you want, I can:
- Walk through the Render UI while you click, or
- Accept Render/Railway API credentials and perform a fully automated deploy (only if you provide them).
