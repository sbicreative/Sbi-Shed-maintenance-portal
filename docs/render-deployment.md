# Render deployment (free Web Service)

This repository is ready to run as a Render Node/Express Web Service. The included `render.yaml` selects Render's free plan, runs `npm ci`, starts the app with `npm start`, and checks `/health`.

## Before the demo

1. Push the `codex/render-deploy` branch to GitHub.
2. In Render, choose **New > Blueprint** and connect the GitHub repository. The blueprint pins the service to `codex/render-deploy` in Render's Singapore region.
3. Confirm that the service plan is **Free**. Do not add a paid disk or paid database.
4. Supply the four environment variables listed in `.env.example`. Use the existing Supabase project URLs and anon/publishable keys only; never put a service-role key in Render or the browser.
5. Deploy and wait for `/health` to report HTTP 200.

The source retains the existing anon/publishable values as compatibility fallbacks, so omitting the variables does not move, seed, reset, or modify either Supabase project. Environment values take precedence when provided.

## Verification

Run locally with:

```powershell
npm ci
npm test
npm start
```

After deployment, check:

- `/health` returns `{ "status": "ok" }`.
- `/` redirects to `/portal.html`.
- Login, role dashboards, tracking, schedule forms, static assets, and installable PWA behavior load over HTTPS.
- Read-only API calls return expected existing records.
- Perform write-flow demo checks only with intentional demo records; deployment itself never seeds or changes Supabase.

## Free-tier behavior

Render may spin down an idle free service, so the first request can be slower. This app keeps durable operational data in the existing Supabase projects; it does not depend on Render's ephemeral filesystem for those records. Files committed under `public/uploads` remain available as static assets, but new runtime filesystem writes would not be durable.

## Dependency audit note

As of 2 August 2026, `npm audit --omit=dev` reports a moderate advisory in `tar` through the legacy `sqlite3` toolchain and high-severity advisories in `xlsx@0.18.5`. The `tar` advisory has an update available; the npm registry reports no fix for `xlsx`. Neither package is used to serve ordinary portal/API requests, but workbook import files must remain trusted. Review replacement or upgrade options after the demo rather than applying an untested dependency migration immediately before it.
