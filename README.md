# Personal Work OS

Phone-first static web app for task capture, prioritization, and daily planning.

## Deploy to GitHub Pages

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the site whenever changes are pushed to `main`.
4. When the workflow completes successfully, the site URL should be:
   https://dendosha112.github.io/personal-work-os/

## Add to iPhone Home Screen

1. Open the HTTPS site in **Safari**.
2. Tap **Share**.
3. Select **Add to Home Screen** and then **Add**.
4. Launch it from the new Home Screen icon.

## Current limitations

- Tasks are stored in the browser's local storage on this device.
- There is no live Notion connection or cross-device sync yet.
- The app shell can cache for offline opening after the first successful HTTPS visit, but offline task data remains local to this browser.
- Do not store secrets, access tokens, or sensitive client information in this public repository.
