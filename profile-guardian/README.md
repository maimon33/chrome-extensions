# Profile Guardian

A Chrome extension that silently blocks unwanted permission requests and protects the browser profile for novice users.

## What it does

- **Blocks notification permission prompts** — the #1 source of browser spam/hijacking
- **Blocks geolocation, push, and optionally camera/microphone requests**
- **Detects new extension installs** and alerts you immediately
- **Weekly digest notification** — summary of what was blocked, with a link to review
- **Per-domain whitelist** — trusted sites can be approved in one click from the history view
- **Zero config for the end user** — install and forget

## Architecture

```
manifest.json              MV3 manifest
src/
  background/
    service-worker.js      Logging, alarms, extension detection, weekly summary
  content/
    blocker.js             Runs in MAIN world — overrides Notification, geolocation, etc.
    bridge.js              Runs in ISOLATED world — relays events to service worker
  popup/
    popup.html/js/css      Quick stats + recent blocks
  options/
    options.html/js/css    Full history, whitelist, extension log, settings
icons/                     Generated PNGs (run npm run icons)
scripts/
  generate-icons.js        Generates PNG icons via Sharp
  build.js                 Validates all manifest-referenced files exist
  zip.js                   Packages extension for Web Store upload
```

## Local development

```bash
npm install          # installs sharp + archiver
npm run icons        # generates icons/icon16.png, icon48.png, icon128.png
node scripts/build.js  # validates all files are in place
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this folder

## Build & release

```bash
npm run release      # generates icons + validates + zips to dist/
```

The `.zip` in `dist/` is what you upload to the Chrome Web Store.

GitHub Actions will build and attach the zip automatically on every push to `main` and on version tags (`v1.0.0`).

## Publishing to the Chrome Web Store

1. Create a developer account at [chromewebstore.google.com/developer](https://chromewebstore.google.com/developer) ($5 one-time fee)
2. Run `npm run release` locally or grab the artifact from CI
3. Go to **Developer Dashboard → Add new item**
4. Upload the `.zip`
5. Fill in:
   - Store listing (name, description, screenshots — at least 1280×800 or 640×400)
   - Category: **Productivity**
   - Privacy: declare which permissions you use and why (storage, notifications, alarms, management, tabs, host_permissions)
6. Submit for review (usually 1–3 business days for new extensions)

### Permissions justification (for review)

| Permission | Why |
|---|---|
| `storage` | Saves blocked request log, settings, whitelist |
| `notifications` | Weekly summary digest |
| `alarms` | Schedules the weekly summary |
| `management` | Detects newly installed extensions |
| `tabs` | Opens options page from notifications |
| `host_permissions: <all_urls>` | Content script must run on every site to intercept permission APIs |

## Suggested future features

- [ ] Export log as CSV
- [ ] Lock settings with a PIN (prevent novice users from disabling)
- [ ] Dark mode UI
- [ ] Block clipboard API abuse (`navigator.clipboard.writeText`)
- [ ] Block `window.open` popups
- [ ] Monthly stats view with charts
- [ ] Family/managed profile mode (harder block via enterprise policy)
