/**
 * Profile Guardian - Bridge (ISOLATED world)
 * Listens for CustomEvents dispatched by blocker.js (MAIN world)
 * and forwards them to the background service worker.
 * Also checks per-domain whitelist before forwarding.
 */
(function () {
  'use strict';

  const GUARDIAN_EVENT = '__pg_blocked';
  let whitelist = [];

  // Load whitelist once at startup
  chrome.storage.local.get('whitelist', (data) => {
    whitelist = data.whitelist || [];
  });

  // Keep whitelist in sync if the user updates it while browsing
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.whitelist) {
      whitelist = changes.whitelist.newValue || [];
    }
  });

  window.addEventListener(GUARDIAN_EVENT, (event) => {
    const detail = event.detail;
    if (!detail) return;

    const domain = detail.domain || new URL(detail.url).hostname;

    // Check if domain is whitelisted
    if (whitelist.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return; // silently allow
    }

    chrome.runtime.sendMessage({
      type: 'PERMISSION_BLOCKED',
      payload: {
        permission: detail.permission,
        url: detail.url,
        domain,
        timestamp: detail.timestamp || Date.now(),
        method: detail.method || null,
      },
    });
  });
})();
