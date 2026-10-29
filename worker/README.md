# Personal Work OS — read-only Notion API

This Worker is a **server-side read-only adapter** for the existing Tasks Tracker. It does not create, update, archive, or delete Notion records. It deliberately has no write route. Do not expose the Notion token in the browser or commit any secrets.

## Runtime configuration

Already configured as non-secret values in `wrangler.toml`:
- `API_ALLOWED_ORIGINS`: `https://dendosha112.github.io,https://personal-work-os-3mr.pages.dev`
- `NOTION_DATA_SOURCE_ID`: the existing Tasks Tracker data source ID, `1fd4bebd-e186-80be-91d8-000b71cdb176`

Add these two values as **Cloudflare Worker Secrets** under **Settings → Variables and Secrets**:
- `APP_ACCESS_KEY`: high-entropy random key for authorizing this single-user app.
- `NOTION_API_KEY`: Notion internal integration token with read-content capability only.

The integration must be explicitly shared with the existing **Tasks Tracker** database in Notion. Do not grant update, insert, or delete capabilities for this phase.

## Deploy from iPhone

Follow [DEPLOY_ON_IPHONE.md](./DEPLOY_ON_IPHONE.md). The Cloudflare Git build runs from the repository root and uses the root `wrangler.jsonc`, which explicitly sets `main` to `worker/src/index.mjs` and bundles the frontend assets. Leave the build command empty and use `npx wrangler deploy`. Select the free plan and do not enable billing.

Official deployment guide: https://developers.cloudflare.com/workers/ci-cd/builds/

## Routes

- `GET /api/health`: configuration status; no secrets are returned.
- `GET /api/tasks?limit=50`: requires `Authorization: Bearer <APP_ACCESS_KEY>`, returns a bounded read-only projection of the existing Tasks Tracker.

The API restricts browser CORS to the configured GitHub Pages and Cloudflare Pages origins, but **CORS is not authentication**. Anyone with the bearer key can access task metadata from another HTTP client, so keep it private and high entropy. Rotate it if exposed. Never treat the Worker URL or CORS check as a secret.

## Current boundaries

- The Worker is deployed separately from GitHub Pages. The root `wrangler.jsonc` configures the existing read-only Notion adapter and the `AI` binding.
- The frontend can be reached through GitHub Pages (`https://dendosha112.github.io/personal-work-os/`) or Cloudflare Pages (`https://personal-work-os-3mr.pages.dev/`).
- `POST /api/classify` uses Cloudflare Workers AI to label a request with a route category. It requires the same `APP_ACCESS_KEY`, accepts at most 4,000 characters, and never runs tools or changes Notion. If the AI binding is not deployed or inference fails, the frontend records a rule-based fallback instead of claiming AI succeeded.
- AI requests use Cloudflare's daily free allocation when available; the Free plan may reject further inference after the 10,000-Neuron daily allocation is exhausted. No provider API key is required for the native binding, and no paid plan should be enabled for this setup.
- There are no Notion write endpoints. Do not add writes until read-only retrieval, authorization, AI behavior, and data mapping have been verified.
- Do not publish task data in the public repository or add a scheduled action that commits private task data into this repo.

## Tests

Run `node --test worker/test/*.test.mjs` from the repository root. Tests mock Notion's HTTP API; they do not prove that a live Worker or real Notion integration has been configured.
