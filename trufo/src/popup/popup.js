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
  const data = await res.json();
  // API Gateway can return the Lambda proxy envelope instead of the body directly.
  // Detect and unwrap: {statusCode, headers, body: '<json string>'}
  if (data && typeof data.body === 'string' && (data.statusCode !== undefined || data.headers)) {
    try { return JSON.parse(data.body); } catch {}
  }
  return data;
}

// ─── Type selector ────────────────────────────────────────────────────────────

const BOOL_HINTS = {
  boolean: 'Stored as true/false. Value is fixed after creation.',
  toggle:  'Auto-flips between true and false on every access.',
};

let boolValue = 'false';

document.getElementById('obj-type').addEventListener('change', function () {
  const type = this.value;
  const isString = type === 'string';
  document.getElementById('content-string').classList.toggle('hidden', !isString);
  document.getElementById('content-bool').classList.toggle('hidden', isString);
  document.getElementById('bool-hint').textContent = isString ? '' : BOOL_HINTS[type];
});

document.getElementById('bool-false').addEventListener('click', () => setBoolValue('false'));
document.getElementById('bool-true').addEventListener('click',  () => setBoolValue('true'));

function setBoolValue(val) {
  boolValue = val;
  document.getElementById('bool-false').classList.toggle('active', val === 'false');
  document.getElementById('bool-true').classList.toggle('active',  val === 'true');
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

function showCodeSection(email) {
  document.getElementById('auth-email').value = email;
  document.getElementById('code-section').classList.remove('hidden');
  document.getElementById('auth-code').focus();
}

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
  const type = document.getElementById('obj-type').value;
  const oneTimeAccess = document.getElementById('obj-onetime').checked;
  const ttlHours = parseFloat(document.getElementById('obj-ttl').value);

  const content = type === 'string'
    ? document.getElementById('obj-content').value.trim()
    : boolValue;

  if (!name) return showError('create-error', 'Name is required.');
  if (type === 'string' && !content) return showError('create-error', 'Content is required.');

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.textContent = 'Creating…';

  try {
    const data = await apiPost('/api/objects', {
      name,
      type,
      pathType: type,
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
      const accessSecret = data.object?.accessSecret;
      if (!token || !accessSecret) {
        showError('create-error', 'Unexpected response from server. Object may have been created — check My Secrets.');
        return;
      }
      const accessUrl  = `${API}/access/${token}?secret=${accessSecret}`;
      const curlCmd    = `curl "${API}/api/access/${token}?secret=${accessSecret}&raw=true"`;

      document.getElementById('result-url').textContent  = accessUrl;
      document.getElementById('result-url').dataset.val  = accessUrl;
      document.getElementById('result-curl').textContent = curlCmd;
      document.getElementById('result-curl').dataset.val = curlCmd;
      showView('view-result');
    }
  } catch {
    showError('create-error', 'Network error. Check your connection.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Secret';
  }
});

// ─── Copy buttons ─────────────────────────────────────────────────────────────

function makeCopyButton(btnId, sourceId) {
  document.getElementById(btnId).addEventListener('click', async () => {
    const text = document.getElementById(sourceId).dataset.val;
    const btn  = document.getElementById(btnId);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    btn.textContent = '✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '⧉'; btn.classList.remove('copied'); }, 2000);
  });
}

makeCopyButton('btn-copy-url',  'result-url');
makeCopyButton('btn-copy-curl', 'result-curl');

// ─── Create another ───────────────────────────────────────────────────────────

document.getElementById('btn-another').addEventListener('click', () => {
  document.getElementById('obj-name').value = '';
  document.getElementById('obj-content').value = '';
  document.getElementById('obj-onetime').checked = false;
  document.getElementById('obj-type').value = 'string';
  document.getElementById('content-string').classList.remove('hidden');
  document.getElementById('content-bool').classList.add('hidden');
  setBoolValue('false');
  clearError('create-error');
  showView('view-create');
  document.getElementById('obj-name').focus();
});

// ─── Sign out ─────────────────────────────────────────────────────────────────

document.getElementById('btn-signout').addEventListener('click', async () => {
  await clearAuth();
  await clearPendingEmail();
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
