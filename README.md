# chrome-extensions

Chrome extensions by [maimon33](https://github.com/maimon33).

---

## Extensions

### Profile Guardian

> Protect the Chrome profile for novice users.

Silently blocks notification spam, permission requests (geolocation, camera, push), and alerts you when new extensions are installed. Weekly digest of everything that was blocked, with a one-click whitelist for trusted sites.

| | |
|---|---|
| Folder | [`profile-guardian/`](./profile-guardian) |
| Latest release | *(not yet released — run the workflow to publish v1.0.0)* |
| Install | Download zip → unzip → `chrome://extensions` → Developer mode → Load unpacked |

---

### Trufo

> Create and share encrypted secrets from the browser.

Companion extension for [trufo.maimons.dev](https://trufo.maimons.dev). Lets you generate and share encrypted secrets directly from any page without leaving the browser.

| | |
|---|---|
| Folder | [`trufo/`](./trufo) |
| Latest release | [trufo-v1.0.1](https://github.com/maimon33/chrome-extensions/releases/tag/trufo-v1.0.1) |
| All releases | [trufo-v1.0.0](https://github.com/maimon33/chrome-extensions/releases/tag/trufo-v1.0.0) · [trufo-v1.0.1](https://github.com/maimon33/chrome-extensions/releases/tag/trufo-v1.0.1) |
| Install | Download zip → unzip → `chrome://extensions` → Developer mode → Load unpacked |

---

## Installing an extension (unpacked)

Until published to the Chrome Web Store, install manually:

1. Go to the [Releases](https://github.com/maimon33/chrome-extensions/releases) page
2. Download the `.zip` for the extension you want
3. Unzip it to a folder
4. Open Chrome → `chrome://extensions` → enable **Developer mode** (top right)
5. Click **Load unpacked** → select the unzipped folder

---

## Development

Each extension is self-contained in its own folder. To work on one locally:

```bash
cd profile-guardian   # or trufo
npm install
npm run icons         # generate PNG icons from SVG source
node scripts/build.js # validate all manifest-referenced files exist
```

Then load the folder as an unpacked extension in Chrome.

## Releases & CI

Builds and releases are handled by a reusable workflow in [maimon33/infra](https://github.com/maimon33/infra).

| Trigger | What happens |
|---|---|
| Push to `main` touching an extension folder | Builds, bumps patch version, creates release |
| Manual dispatch (Actions tab) | Choose extension + bump level (patch/minor/major) |
| Pull request | Builds only, no release |

To cut a release manually:
**Actions** → `Chrome Extensions — Build & Release` → **Run workflow** → pick extension + bump.
