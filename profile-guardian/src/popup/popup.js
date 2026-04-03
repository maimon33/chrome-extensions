'use strict';

const PERMISSION_ICONS = {
  notifications: '🔔',
  geolocation: '📍',
  camera: '📷',
  microphone: '🎤',
  push: '📨',
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

chrome.runtime.sendMessage({ type: 'GET_LOG' }, ({ log = [], extensions = [] }) => {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekCount = log.filter((e) => e.timestamp >= oneWeekAgo).length;
  const pendingExt = extensions.filter((e) => !e.reviewed).length;

  document.getElementById('stat-total').textContent = log.length;
  document.getElementById('stat-week').textContent = weekCount;
  document.getElementById('stat-ext').textContent = pendingExt;

  const list = document.getElementById('recent-list');
  const recent = log.slice(0, 8);

  if (recent.length === 0) return;

  list.innerHTML = '';
  recent.forEach((entry) => {
    const li = document.createElement('li');
    const icon = PERMISSION_ICONS[entry.permission] || '🔒';
    const permClass = PERMISSION_ICONS[entry.permission] ? entry.permission : 'other';

    li.innerHTML = `
      <span class="perm-icon ${permClass}">${icon}</span>
      <span class="recent-domain" title="${entry.domain}">${entry.domain}</span>
      <span class="recent-time">${timeAgo(entry.timestamp)}</span>
    `;
    list.appendChild(li);
  });
});

document.getElementById('btn-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
