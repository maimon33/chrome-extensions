/**
 * Profile Guardian - Blocker (MAIN world)
 * Runs directly in the page's JS context to intercept permission APIs.
 * Communicates results back via CustomEvents picked up by bridge.js.
 */
(function () {
  'use strict';

  const GUARDIAN_EVENT = '__pg_blocked';

  function reportBlock(permission, extra = {}) {
    window.dispatchEvent(
      new CustomEvent(GUARDIAN_EVENT, {
        detail: {
          permission,
          url: window.location.href,
          domain: window.location.hostname,
          timestamp: Date.now(),
          ...extra,
        },
      })
    );
  }

  // ── Notifications ────────────────────────────────────────────────────────
  const _Notification = window.Notification;

  class GuardedNotification extends _Notification {
    constructor(title, options) {
      // Allow showing notifications only if already granted externally
      super(title, options);
    }

    static requestPermission(callback) {
      reportBlock('notifications');
      const result = Promise.resolve('denied');
      if (typeof callback === 'function') callback('denied');
      return result;
    }

    static get permission() {
      // Expose 'default' so sites still try (and we block), but never 'granted'
      return _Notification.permission === 'granted' ? 'granted' : 'default';
    }
  }

  // Preserve prototype chain so instanceof checks still work
  Object.setPrototypeOf(GuardedNotification, _Notification);
  Object.setPrototypeOf(GuardedNotification.prototype, _Notification.prototype);
  window.Notification = GuardedNotification;

  // ── navigator.permissions ────────────────────────────────────────────────
  if (navigator.permissions) {
    const _query = navigator.permissions.query.bind(navigator.permissions);
    navigator.permissions.query = function (descriptor) {
      // Silently pass through non-sensitive queries
      const sensitive = ['notifications', 'push', 'microphone', 'camera'];
      if (sensitive.includes(descriptor.name)) {
        reportBlock(descriptor.name, { method: 'permissions.query' });
        return Promise.resolve(
          Object.assign(Object.create(PermissionStatus.prototype), {
            state: 'denied',
            name: descriptor.name,
            onchange: null,
          })
        );
      }
      return _query(descriptor);
    };
  }

  // ── Geolocation ──────────────────────────────────────────────────────────
  if (navigator.geolocation) {
    const geoProxy = {
      getCurrentPosition(_success, error, _options) {
        reportBlock('geolocation');
        if (typeof error === 'function')
          error({ code: 1, message: 'Blocked by Profile Guardian', PERMISSION_DENIED: 1 });
      },
      watchPosition(_success, error, _options) {
        reportBlock('geolocation');
        if (typeof error === 'function')
          error({ code: 1, message: 'Blocked by Profile Guardian', PERMISSION_DENIED: 1 });
        return -1;
      },
      clearWatch() {},
    };
    try {
      Object.defineProperty(navigator, 'geolocation', {
        value: geoProxy,
        configurable: true,
        writable: false,
      });
    } catch (_) {
      // Some browsers don't allow redefining; fail silently
    }
  }

  // ── MediaDevices (camera / microphone) ───────────────────────────────────
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const _getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function (constraints) {
      if (constraints.video) reportBlock('camera');
      if (constraints.audio) reportBlock('microphone');
      return Promise.reject(
        Object.assign(new DOMException('Blocked by Profile Guardian', 'NotAllowedError'))
      );
    };
  }

  // ── Push API ─────────────────────────────────────────────────────────────
  if (window.PushManager) {
    const _subscribe = PushManager.prototype.subscribe;
    PushManager.prototype.subscribe = function (options) {
      reportBlock('push');
      return Promise.reject(new DOMException('Blocked by Profile Guardian', 'NotAllowedError'));
    };
  }
})();
