# Personal Work OS — read-only Notion API

This Worker is a **server-side read-only adapter** for the existing Tasks Tracker. It does not create, update, archive, or delete Notion records. It deliberately has no write route. Do not expose the Notion token in the browser or commit any secrets.

## Runtime configuration

Already configured as non-secret values in `wrangler.toml`:
- `API_ALLOWED_ORIGIN`: `https://dendosha112.github.io`
- `NOTION_DATA_SOURCE_ID`: the existing Tasks Tracker data source ID, `1fd4bebd-e186-80be-91d8-000b71cdb176`

Add these two values as **Cloudflare Worker Secrets** under **Settings → Variables and Secrets**:
- `APP_ACCESS_KEY`: high-entropy random key for authorizing this single-user app.
- `NOTION_API_KEY`: Notion internal integration token with read-content capability only.

The integration must be explicitly shared with the existing **Tasks Tracker** database in Notion. Do not grant update, insert, or delete capabilities for this phase.

## Deploy from iPhone

Follow [DEPLOY_ON_IPHONE.md](./DEPLOY_ON_IPHONE.md). It uses Cloudflare Workers Builds to deploy directly from this GitHub repo, with `worker` as the project root and `npx wrangler deploy` as the command. Select the free plan and do not enable billing. Ensure the Cloudflare Worker name exactly matches `personal-work-os-readonly-api` in `wrangler.toml`.

Official deployment guide: https://developers.cloudflare.com/workers/ci-cd/builds/

## Routes

- `GET /api/health`: configuration status; no secrets are returned.
- `GET /api/tasks?limit=50`: requires `Authorization: Bearer <APP_ACCESS_KEY>`, returns a bounded read-only projection of the existing Tasks Tracker.

The API restricts browser CORS to the GitHub Pages origin, but **CORS is not authentication**. Anyone with the bearer key can access task metadata from another HTTP client, so keep it private and high entropy. Rotate it if exposed. Never treat the Worker URL or CORS check as a secret.

## Current boundaries

- The Worker is not live until it is deployed in your Cloudflare account and both secrets are set.
- The GitHub Pages frontend is deployed separately.
- AI classification is not enabled.
- There are no Notion write endpoints. Do not add writes until read-only retrieval, authorization, and data mapping have been verified.
- Do not publish task data in the public repository or add a scheduled action that commits private task data into this repo.

## Tests

Run `node --test worker/test/*.test.mjs` from the repository root. Tests mock Notion's HTTP API; they do not prove that a live Worker or real Notion integration has been configured.
