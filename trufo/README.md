# Trufo — Chrome Extension

Create and share encrypted secrets from any tab without leaving your browser.

The extension talks directly to [trufo.maimons.dev](https://trufo.maimons.dev) — your auth session is stored locally for up to 30 days so you're never more than two clicks away from sharing a secret.

## Features

- **Quick create** — name, content, TTL, and optional one-time access from a compact popup
- **Persistent auth** — sign in once, stay signed in for up to 30 days per browser profile
- **Copy to clipboard** — access URL is ready to paste the moment the secret is created
- **Open Trufo** — one-click jump to the full manage page for viewing and deleting secrets

## How it works

1. Click the Trufo icon in your toolbar
2. Enter your email — a verification code is sent via [trufo.maimons.dev](https://trufo.maimons.dev)
3. Enter the code — you're signed in for 30 days
4. Fill in a name, paste your secret, pick an expiry → **Create Secret**
5. Copy the access URL and share it

## Installation

### From a GitHub Release (recommended)

1. Download the latest `trufo-vX.X.X.zip` from [Releases](https://github.com/maimon33/chrome-extensions/releases)
2. Unzip it
3. Open `chrome://extensions` in Chrome
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** and select the unzipped folder

### From source

```bash
git clone https://github.com/maimon33/chrome-extensions.git
cd chrome-extensions/trufo
npm install
npm run icons   # generates icons/icon*.png
```

Then load the `trufo/` folder as an unpacked extension in `chrome://extensions`.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Stores your email and auth token locally (never sent anywhere except trufo.maimons.dev) |
| `host_permissions: trufo.maimons.dev` | Makes API calls to create and verify secrets |

## Backend

This extension is a thin client for the open-source [trufo](https://github.com/maimon33/trufo) service — a serverless encrypted object store built on AWS Lambda and S3. You can self-host your own instance and point the extension at it by changing the `API` constant in `src/popup/popup.js`.

## Build & Release

```bash
npm run build    # generate icons + validate
npm run zip      # outputs dist/trufo-vX.X.X.zip
```

CI runs on every push to `trufo/**`. A GitHub Release is published automatically when a tag matching `trufo-v*` is pushed:

```bash
git tag trufo-v1.0.0 && git push origin trufo-v1.0.0
```
