'use strict';

const API = 'https://trufo.maimons.dev';
const AUTH_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function getAuth() {
  const data = await chrome.storage.local.get(['trufo_email', 'trufo_secret', 'trufo_expiry']);
  if (data.trufo_email && data.trufo_secret && data.trufo_expiry > Date.now()) {
    return { email: data.trufo_email, secret: data.trufo_secret };
  }
  return null;
}

async function saveAuth(email, secret) {
  await chrome.storage.local.set({
    trufo_email: email,
    trufo_secret: secret,
    trufo_expiry: Date.now() + AUTH_DURATION_MS,
  });
}

async function clearAuth() {
  await chrome.storage.local.remove(['trufo_email', 'trufo_secret', 'trufo_expiry']);
}

async function savePendingEmail(email) {
  await chrome.storage.local.set({ trufo_pending_email: email });
}

async function getPendingEmail() {
  const data = await chrome.storage.local.get('trufo_pending_email');
  return data.trufo_pending_email || null;
}

async function clearPendingEmail() {
  await chrome.storage.local.remove('trufo_pending_email');
}

// ─── View switching ───────────────────────────────────────────────────────────

function showView(id) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function setAuthStatus(text) {
  document.getElementById('auth-status').textContent = text;
}

function showSignOut(show) {
  document.getElementById('btn-signout').classList.toggle('hidden', !show);
}

// ─── Error helpers ────────────────────────────────────────────────────────────

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.add('hidden');
}

// ─── API calls ────────────────────────────────────────────────────────────────

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function showCodeSection(email) {
  document.getElementById('auth-email').value = email;
  document.getElementById('code-section').classList.remove('hidden');
  document.getElementById('auth-code').focus();
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

document.getElementById('btn-send-code').addEventListener('click', async () => {
  clearError('auth-error');
  const email = document.getElementById('auth-email').value.trim();
  if (!email) return showError('auth-error', 'Please enter your email.');

  const btn = document.getElementById('btn-send-code');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    const data = await apiPost('/api/validate-email', { email });
    if (data.error) {
      showError('auth-error', data.error);
    } else {
      await savePendingEmail(email);
      showCodeSection(email);
    }
  } catch {
    showError('auth-error', 'Network error. Check your connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Code';
  }
});

document.getElementById('btn-verify').addEventListener('click', async () => {
  clearError('auth-error');
  const email = document.getElementById('auth-email').value.trim();
  const code = document.getElementById('auth-code').value.trim();
  if (!code) return showError('auth-error', 'Enter the verification code.');

  const btn = document.getElementById('btn-verify');
  btn.disabled = true;
  btn.textContent = 'Verifying…';

  try {
    const data = await apiPost('/api/verify-code', { email, code });
    if (data.error || !data.verified) {
      showError('auth-error', data.error || 'Verification failed.');
    } else {
      await saveAuth(email, data.userSecret);
      await clearPendingEmail();
      enterCreateView(email);
    }
  } catch {
    showError('auth-error', 'Network error. Check your connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify';
  }
});

// ─── Create flow ──────────────────────────────────────────────────────────────

function enterCreateView(email) {
  setAuthStatus(email);
  showSignOut(true);
  showView('view-create');
  document.getElementById('obj-name').focus();
}

document.getElementById('btn-create').addEventListener('click', async () => {
  clearError('create-error');

  const auth = await getAuth();
  if (!auth) {
    await clearAuth();
    showView('view-auth');
    return;
  }

  const name = document.getElementById('obj-name').value.trim();
  const content = document.getElementById('obj-content').value.trim();
  const ttlHours = parseFloat(document.getElementById('obj-ttl').value);
  const oneTimeAccess = document.getElementById('obj-onetime').checked;

  if (!name) return showError('create-error', 'Name is required.');
  if (!content) return showError('create-error', 'Content is required.');

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  try {
    const data = await apiPost('/api/objects', {
      name,
      type: 'string',
      pathType: 'string',
      content,
      ttlHours,
      oneTimeAccess,
      ownerEmail: auth.email,
      secret: auth.secret,
    });

    if (data.error) {
      showError('create-error', data.error);
    } else {
      const token = data.object?.token;
      const accessUrl = `${API}/access/${name}?token=${token}`;
      document.getElementById('result-url').textContent = accessUrl;
      document.getElementById('result-url').dataset.url = accessUrl;
      showView('view-result');
    }
  } catch {
    showError('create-error', 'Network error. Check your connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Secret';
  }
});

// ─── Result view ──────────────────────────────────────────────────────────────

document.getElementById('btn-copy').addEventListener('click', async () => {
  const url = document.getElementById('result-url').dataset.url;
  const btn = document.getElementById('btn-copy');
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '⧉';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
});

document.getElementById('btn-another').addEventListener('click', () => {
  document.getElementById('obj-name').value = '';
  document.getElementById('obj-content').value = '';
  document.getElementById('obj-onetime').checked = false;
  clearError('create-error');
  showView('view-create');
  document.getElementById('obj-name').focus();
});

// ─── Sign out ─────────────────────────────────────────────────────────────────

document.getElementById('btn-signout').addEventListener('click', async () => {
  await clearAuth();
  await clearPendingEmail();
  setAuthStatus('');
  showSignOut(false);
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-code').value = '';
  document.getElementById('code-section').classList.add('hidden');
  clearError('auth-error');
  showView('view-auth');
});

// ─── Init ─────────────────────────────────────────────────────────────────────

(async () => {
  const auth = await getAuth();
  if (auth) {
    enterCreateView(auth.email);
    return;
  }

  const pendingEmail = await getPendingEmail();
  if (pendingEmail) {
    showView('view-auth');
    showCodeSection(pendingEmail);
    return;
  }

  showView('view-auth');
})();
