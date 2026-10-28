# Connect Personal Work OS to Notion from iPhone

This procedure deploys only a read-only Notion adapter. It does not require a computer or Terminal.

## A. Create the Notion integration token

1. Open Notion's integrations settings: https://www.notion.so/profile/integrations
2. Create a new **internal integration** named `Personal Work OS Read Only`.
3. Grant read-content access only. Do **not** grant update, insert, or delete capabilities.
4. Copy the generated integration secret. Keep it in your password manager temporarily; do not send it in ChatGPT and do not paste it into GitHub.
5. Open the existing Tasks Tracker database in Notion, open its sharing/connections controls, and invite/connect the `Personal Work OS Read Only` integration. Verify it is explicitly shared with that database.

## B. Deploy the Worker from GitHub

1. Open the Cloudflare dashboard: https://dash.cloudflare.com/
2. Go to **Workers & Pages → Create application → Connect to Git** (the exact wording can vary).
3. Authorize Cloudflare to access your GitHub repository and choose `Dendosha112/personal-work-os`, branch `main`.
4. Keep the project's root directory at the repository root (`.`). A root-level `wrangler.jsonc` now points to `worker/src/index.mjs` and configures the static site assets, so do not change the root directory to `worker`.
5. Use the existing Worker name `personal-work-os`, which your deployment log shows is already created. The name matches the root `wrangler.jsonc`. Leave the build command empty and use `npx wrangler deploy` as the deploy command.
6. Choose the Free plan. Do not enable paid features or configure billing.
7. Deploy. Cloudflare should provide a URL such as `https://personal-work-os.<your-account>.workers.dev`.

Cloudflare's official instructions: https://developers.cloudflare.com/workers/ci-cd/builds/

## C. Add two runtime secrets in Cloudflare

In **Workers & Pages → personal-work-os → Settings → Variables and Secrets**, add the following as **Secret**, not plain-text variables:

- `APP_ACCESS_KEY`: generate a long random value (at least 32 random bytes) using your password manager's password generator. Do not reuse your GitHub or Notion passwords.
- `NOTION_API_KEY`: the internal integration secret generated in step A.

The data source ID and both allowed website origins are already configured in `worker/wrangler.toml` and are not secret values. Save and deploy after adding the secrets.

Official secret guidance: https://developers.cloudflare.com/workers/configuration/secrets/

## D. Verify before connecting the app

1. Open `https://<your-worker>.workers.dev/api/health` in Safari. It should return JSON with `"ok": true`, `"mode": "read-only"`, and `"configured": true`. It should not return any secret values.
2. If the response says `configured: false`, recheck the two Worker secrets.
3. If it returns a Notion permissions error while loading tasks, check that the integration has read-content permission and that the Tasks Tracker database was shared with that integration. Never grant write permissions to bypass a read failure.

## E. Connect the iPhone app

1. Open https://personal-work-os-3mr.pages.dev/ in Safari (the Cloudflare Pages site). The same frontend is also bundled with the Worker at https://personal-work-os.dendoshakarasu.workers.dev/.
2. Go to **More → Connections & safety → Read-only Notion connection**.
3. Enter `https://personal-work-os.dendoshakarasu.workers.dev` as the Worker URL and the `APP_ACCESS_KEY` you set in Cloudflare (not the Notion API key).
4. Tap **Test & load tasks**.
5. In **Priority & daily plan**, use **Refresh from Notion**. Task cards link back to the original Notion records.

The Worker access key is stored only in the current browser session; the Worker URL is saved on the device. If Safari clears the session key, enter the key again. The Notion API token is only stored as a Cloudflare secret and never goes into the public GitHub repository or browser.

## Boundaries

- The endpoint is read-only and has no create/update/delete routes.
- Tasks loaded into the app are a view of the existing Tasks Tracker, not a second Notion database.
- AI model-backed classification and write actions are not enabled.
- The Worker still needs to be deployed in your Cloudflare account and the two secrets configured before the live connection can work.
