/**
 * Profile Guardian - Background Service Worker
 * Handles:
 *  - Logging blocked permission requests
 *  - Detecting new extension installs
 *  - Weekly summary notifications
 *  - Badge counter
 */

const STORAGE_KEY_LOG = 'blockedLog';
const STORAGE_KEY_EXT = 'newExtensions';
const STORAGE_KEY_SETTINGS = 'settings';
const STORAGE_KEY_WHITELIST = 'whitelist';
const MAX_LOG_ENTRIES = 500;

// ── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  blockNotifications: true,
  blockGeolocation: true,
  blockCamera: false,
  blockMicrophone: false,
  blockPush: true,
  trackNewExtensions: true,
  weeklySummary: true,
  summaryDayOfWeek: 0, // Sunday
};

// ── Init ──────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({
      [STORAGE_KEY_SETTINGS]: DEFAULT_SETTINGS,
      [STORAGE_KEY_LOG]: [],
      [STORAGE_KEY_EXT]: [],
      [STORAGE_KEY_WHITELIST]: [],
    });
    scheduleWeeklySummary();
    showWelcomeNotification();
  } else if (details.reason === 'update') {
    // Merge any new default settings without overwriting existing ones
    const { [STORAGE_KEY_SETTINGS]: current } = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
    await chrome.storage.local.set({
      [STORAGE_KEY_SETTINGS]: { ...DEFAULT_SETTINGS, ...(current || {}) },
    });
    scheduleWeeklySummary();
  }
});

chrome.runtime.onStartup.addListener(() => {
  scheduleWeeklySummary();
});

// ── Message handler ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PERMISSION_BLOCKED') {
    handleBlockedPermission(message.payload).then(() => sendResponse({ ok: true }));
    return true; // keep channel open for async
  }

  if (message.type === 'GET_LOG') {
    chrome.storage.local.get([STORAGE_KEY_LOG, STORAGE_KEY_EXT], (data) => {
      sendResponse({
        log: data[STORAGE_KEY_LOG] || [],
        extensions: data[STORAGE_KEY_EXT] || [],
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_LOG') {
    chrome.storage.local.set({ [STORAGE_KEY_LOG]: [] }, () => {
      updateBadge(0);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'ADD_WHITELIST') {
    addToWhitelist(message.domain).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'REMOVE_WHITELIST') {
    removeFromWhitelist(message.domain).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(STORAGE_KEY_SETTINGS, (data) => {
      sendResponse(data[STORAGE_KEY_SETTINGS] || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ [STORAGE_KEY_SETTINGS]: message.settings }, () => {
      scheduleWeeklySummary(); // reschedule in case day changed
      sendResponse({ ok: true });
    });
    return true;
  }
});

// ── Block handling ────────────────────────────────────────────────────────────

async function handleBlockedPermission(payload) {
  const { [STORAGE_KEY_SETTINGS]: settings } = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  const s = settings || DEFAULT_SETTINGS;

  // Respect per-type setting
  const shouldLog = {
    notifications: s.blockNotifications,
    geolocation: s.blockGeolocation,
    camera: s.blockCamera,
    microphone: s.blockMicrophone,
    push: s.blockPush,
  }[payload.permission] ?? true;

  if (!shouldLog) return;

  const { [STORAGE_KEY_LOG]: log = [] } = await chrome.storage.local.get(STORAGE_KEY_LOG);

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...payload,
    status: 'blocked',
  };

  const updated = [entry, ...log].slice(0, MAX_LOG_ENTRIES);
  await chrome.storage.local.set({ [STORAGE_KEY_LOG]: updated });

  updateBadge(updated.filter((e) => e.status === 'blocked').length);
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function updateBadge(count) {
  const text = count > 0 ? (count > 99 ? '99+' : String(count)) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#e53e3e' });
}

// ── Extension install detection ───────────────────────────────────────────────

chrome.management.onInstalled.addListener(async (info) => {
  if (info.id === chrome.runtime.id) return; // ignore self

  const { [STORAGE_KEY_SETTINGS]: settings } = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  if (!(settings?.trackNewExtensions ?? true)) return;

  const { [STORAGE_KEY_EXT]: list = [] } = await chrome.storage.local.get(STORAGE_KEY_EXT);

  const entry = {
    id: info.id,
    name: info.name,
    version: info.version,
    type: info.type,
    installedAt: Date.now(),
    reviewed: false,
  };

  await chrome.storage.local.set({ [STORAGE_KEY_EXT]: [entry, ...list].slice(0, 50) });

  // Show alert notification
  chrome.notifications.create(`ext-${info.id}`, {
    type: 'basic',
    iconUrl: '../../../icons/icon48.png',
    title: 'New Extension Installed',
    message: `"${info.name}" was just added to Chrome. Review it in Profile Guardian.`,
    priority: 2,
  });
});

chrome.management.onUninstalled.addListener(async (id) => {
  const { [STORAGE_KEY_EXT]: list = [] } = await chrome.storage.local.get(STORAGE_KEY_EXT);
  await chrome.storage.local.set({
    [STORAGE_KEY_EXT]: list.filter((e) => e.id !== id),
  });
});

// ── Weekly summary ────────────────────────────────────────────────────────────

async function scheduleWeeklySummary() {
  await chrome.alarms.clear('weeklySummary');

  const { [STORAGE_KEY_SETTINGS]: settings } = await chrome.storage.local.get(STORAGE_KEY_SETTINGS);
  if (!(settings?.weeklySummary ?? true)) return;

  const targetDay = settings?.summaryDayOfWeek ?? 0; // 0=Sunday
  const now = new Date();
  const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(9, 0, 0, 0); // 9 AM

  chrome.alarms.create('weeklySummary', {
    when: next.getTime(),
    periodInMinutes: 7 * 24 * 60,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'weeklySummary') return;

  const { [STORAGE_KEY_LOG]: log = [] } = await chrome.storage.local.get(STORAGE_KEY_LOG);
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = log.filter((e) => e.timestamp >= oneWeekAgo);

  if (recent.length === 0) return;

  const counts = recent.reduce((acc, e) => {
    acc[e.permission] = (acc[e.permission] || 0) + 1;
    return acc;
  }, {});

  const summary = Object.entries(counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  chrome.notifications.create('weeklySummary', {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Profile Guardian — Weekly Summary`,
    message: `Blocked ${recent.length} requests this week. ${summary}. Click to review.`,
    priority: 1,
    buttons: [{ title: 'Review Now' }],
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'weeklySummary' || notificationId.startsWith('ext-')) {
    chrome.runtime.openOptionsPage();
  }
});

chrome.notifications.onButtonClicked.addListener((notificationId) => {
  if (notificationId === 'weeklySummary') {
    chrome.runtime.openOptionsPage();
  }
});

// ── Whitelist helpers ─────────────────────────────────────────────────────────

async function addToWhitelist(domain) {
  const { [STORAGE_KEY_WHITELIST]: list = [] } = await chrome.storage.local.get(STORAGE_KEY_WHITELIST);
  if (!list.includes(domain)) {
    await chrome.storage.local.set({ [STORAGE_KEY_WHITELIST]: [...list, domain] });
  }
}

async function removeFromWhitelist(domain) {
  const { [STORAGE_KEY_WHITELIST]: list = [] } = await chrome.storage.local.get(STORAGE_KEY_WHITELIST);
  await chrome.storage.local.set({
    [STORAGE_KEY_WHITELIST]: list.filter((d) => d !== domain),
  });
}

// ── Welcome notification ──────────────────────────────────────────────────────

function showWelcomeNotification() {
  chrome.notifications.create('welcome', {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Profile Guardian is active',
    message: 'Notification & permission requests are now blocked. Click the icon to manage settings.',
    priority: 1,
  });
}
