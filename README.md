# chrome-extensions

Chrome extensions by [maimon33](https://github.com/maimon33).

## Extensions

| Extension | Latest | Download | Description |
|---|---|---|---|
| [Profile Guardian](./profile-guardian) | v1.0.0 | [profile-guardian-v1.0.0](https://github.com/maimon33/chrome-extensions/releases/tag/profile-guardian-v1.0.0) | Blocks notification spam and permission requests. Keeps Chrome safe for novice users. |
| [Trufo](./trufo) | v1.0.2 | [trufo-v1.0.2](https://github.com/maimon33/chrome-extensions/releases/tag/trufo-v1.0.2) | Create and share encrypted secrets from the browser via [trufo.maimons.dev](https://trufo.maimons.dev). |

## Installing (unpacked)

Until published to the Chrome Web Store:

1. Click the **Download** link above for the extension you want
2. Unzip the downloaded file
3. Open Chrome → `chrome://extensions` → enable **Developer mode** (top right)
4. Click **Load unpacked** → select the unzipped folder

## Development

```bash
cd profile-guardian   # or trufo
npm install
npm run icons         # generate PNG icons
node scripts/build.js # validate manifest references
```

Load the folder as an unpacked extension in Chrome.

## CI / Releases

Builds are handled by a reusable workflow in [maimon33/infra](https://github.com/maimon33/infra).
The table above is updated automatically after every release.

| Trigger | What happens |
|---|---|
| Push to `main` touching an extension folder | Patch bump + release |
| Manual dispatch (Actions tab) | Choose extension + bump level |
| Pull request | Build only, no release |
