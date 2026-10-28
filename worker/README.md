# Personal Work OS — read-only Notion API

This Worker is a **server-side read-only adapter** for the existing Tasks Tracker. It does not create, update, archive, or delete Notion records. It deliberately has no write route. Do not expose the Notion token in the browser or commit any secrets.

## Required Worker secrets

Set these under **Worker → Settings → Variables and Secrets**:

- `APP_ACCESS_KEY`: long random secret used to authorize this single-user app's requests.
- `NOTION_API_KEY`: secret token for a Notion internal integration with read-content capability.
- `NOTION_DATA_SOURCE_ID`: `1fd4bebd-e186-80be-91d8-000b71cdb176`

The integration must be explicitly shared with the existing **Tasks Tracker** database in Notion. Use a read-only integration; do not grant update/insert capabilities for this phase.

## Deployment outline (free-tier, no billing change)

1. Create a Cloudflare Worker on the Free plan. Do not upgrade to a paid plan or enable billing.
2. Upload `worker/src/index.mjs` as the Worker entry point, using `worker/wrangler.toml` for the non-secret settings.
3. Add the three secrets listed above using the Cloudflare dashboard's Secrets UI. Never paste the Notion API key into GitHub, this repository, the app settings, or chat.
4. Deploy the Worker and note its `https://<worker-name>.<account>.workers.dev` URL.
5. The app's Settings page must be configured with that HTTPS Worker URL and the same `APP_ACCESS_KEY`. The key is a bearer credential; keep it private and use only in the app you control.
6. Confirm `GET /api/health` returns `configured: true`, then load the Tasks Tracker from the app. The endpoint only returns task metadata needed for prioritization.

### Routes

- `GET /api/health`: configuration status; no secrets are returned.
- `GET /api/tasks?limit=50`: requires `Authorization: Bearer <APP_ACCESS_KEY>`, returns a bounded read-only projection of the existing Tasks Tracker.

The API restricts browser CORS to the GitHub Pages origin, but **CORS is not authentication**. The bearer key is still required. Never treat the URL or CORS check as a secret. Keep the key out of screenshots and public issues.

## Current boundaries

- The Worker is not deployed until you create it in your Cloudflare account and set secrets.
- This read-only adapter is separate from the GitHub Pages front-end.
- AI classification is not enabled.
- There are no Notion write endpoints. Write actions remain approval-gated and must be designed and tested separately.
- Do not publish task data in the public repository or add a scheduled action that commits private task data into this repo.

## Local tests

Run `node --test worker/test/*.test.mjs` from the repository root. These tests mock Notion's HTTP API; they do not prove that the live Worker or a real Notion integration has been configured.
