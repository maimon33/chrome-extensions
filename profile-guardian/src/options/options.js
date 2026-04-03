'use strict';

const PERMISSION_ICONS = {
  notifications: '🔔',
  geolocation: '📍',
  camera: '📷',
  microphone: '🎤',
  push: '📨',
};

// ── Tab navigation ────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function permBadge(perm) {
  const icon = PERMISSION_ICONS[perm] || '🔒';
  const cls = PERMISSION_ICONS[perm] ? perm : 'other';
  return `<span class="perm-badge ${cls}">${icon} ${perm}</span>`;
}

// ── History ───────────────────────────────────────────────────────────────────

let allLog = [];

function renderHistory(log) {
  const tbody = document.getElementById('history-body');
  if (log.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty">No blocked requests yet.</td></tr>';
    return;
  }

  tbody.innerHTML = log.map((e) => `
    <tr>
      <td>${permBadge(e.permission)}</td>
      <td title="${e.url}">${e.domain}</td>
      <td>${formatDate(e.timestamp)}</td>
      <td>
        <button class="btn-ghost btn-trust" data-domain="${e.domain}">Trust Domain</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-trust').forEach((btn) => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'ADD_WHITELIST', domain: btn.dataset.domain }, () => {
        loadAll();
        showTab('whitelist');
      });
    });
  });
}

document.getElementById('filter-permission').addEventListener('change', (e) => {
  const val = e.target.value;
  renderHistory(val ? allLog.filter((entry) => entry.permission === val) : allLog);
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (!confirm('Clear all blocked request history?')) return;
  chrome.runtime.sendMessage({ type: 'CLEAR_LOG' }, loadAll);
});

// ── Extensions ────────────────────────────────────────────────────────────────

function renderExtensions(extensions) {
  const list = document.getElementById('ext-list');
  if (extensions.length === 0) {
    list.innerHTML = '<li class="empty">No new extensions detected.</li>';
    return;
  }

  list.innerHTML = extensions.map((ext) => `
    <li>
      <div class="ext-info">
        <div class="ext-name">${escapeHtml(ext.name)}</div>
        <div class="ext-meta">v${escapeHtml(ext.version)} · ${ext.type} · detected ${formatDate(ext.installedAt)}</div>
      </div>
    </li>
  `).join('');
}

// ── Whitelist ─────────────────────────────────────────────────────────────────

function renderWhitelist(whitelist) {
  const list = document.getElementById('whitelist-list');
  if (whitelist.length === 0) {
    list.innerHTML = '<li class="empty">No trusted domains yet.</li>';
    return;
  }

  list.innerHTML = whitelist.map((domain) => `
    <li>
      <span>${escapeHtml(domain)}</span>
      <button class="btn-ghost btn-remove-domain" data-domain="${escapeHtml(domain)}">Remove</button>
    </li>
  `).join('');

  list.querySelectorAll('.btn-remove-domain').forEach((btn) => {
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'REMOVE_WHITELIST', domain: btn.dataset.domain }, loadAll);
    });
  });
}

document.getElementById('whitelist-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('whitelist-input');
  const domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
  if (!domain) return;
  chrome.runtime.sendMessage({ type: 'ADD_WHITELIST', domain }, loadAll);
  input.value = '';
});

// ── Settings ──────────────────────────────────────────────────────────────────

function renderSettings(settings) {
  document.getElementById('s-notifications').checked = settings.blockNotifications ?? true;
  document.getElementById('s-geolocation').checked   = settings.blockGeolocation ?? true;
  document.getElementById('s-camera').checked        = settings.blockCamera ?? false;
  document.getElementById('s-microphone').checked    = settings.blockMicrophone ?? false;
  document.getElementById('s-push').checked          = settings.blockPush ?? true;
  document.getElementById('s-trackExt').checked      = settings.trackNewExtensions ?? true;
  document.getElementById('s-weeklySummary').checked = settings.weeklySummary ?? true;
  document.getElementById('s-summaryDay').value      = settings.summaryDayOfWeek ?? 0;
}

document.getElementById('btn-save-settings').addEventListener('click', () => {
  const settings = {
    blockNotifications: document.getElementById('s-notifications').checked,
    blockGeolocation:   document.getElementById('s-geolocation').checked,
    blockCamera:        document.getElementById('s-camera').checked,
    blockMicrophone:    document.getElementById('s-microphone').checked,
    blockPush:          document.getElementById('s-push').checked,
    trackNewExtensions: document.getElementById('s-trackExt').checked,
    weeklySummary:      document.getElementById('s-weeklySummary').checked,
    summaryDayOfWeek:   parseInt(document.getElementById('s-summaryDay').value, 10),
  };

  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, () => {
    const status = document.getElementById('save-status');
    status.textContent = 'Saved!';
    setTimeout(() => (status.textContent = ''), 2000);
  });
});

// ── Load everything ───────────────────────────────────────────────────────────

function showTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${name}`));
}

function loadAll() {
  chrome.runtime.sendMessage({ type: 'GET_LOG' }, ({ log = [], extensions = [] }) => {
    allLog = log;
    renderHistory(log);
    renderExtensions(extensions);
  });

  chrome.storage.local.get('whitelist', (data) => {
    renderWhitelist(data.whitelist || []);
  });

  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, renderSettings);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadAll();
