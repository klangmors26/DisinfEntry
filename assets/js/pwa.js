/* ============================================================
   DisinfEntry — mobile app runtime (loaded on every page, signed in or not)
   - registers the service worker (installable app + offline screen)
   - "Install app" buttons: any element with [data-pwa-install]
   - phone alerts: any element with [data-pwa-notify] toggles system
     notifications; App calls PWA.notify() for new critical alerts
   ========================================================== */

const PWA = (() => {
  const root = document.documentElement;
  const swUrl = document.querySelector('meta[name="sw-url"]')?.content;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true;   // iOS Safari

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS reports as Mac

  if (isStandalone()) root.classList.add('is-standalone');

  /* ---------------- Service worker ---------------- */

  let registration = null;
  // Service workers only run on https:// or http://localhost.
  if (swUrl && 'serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl)
        .then((reg) => { registration = reg; })
        .catch(() => { /* app still works as a normal website */ });
    });
  }

  /* ---------------- Install prompt ---------------- */

  let deferredPrompt = null;

  function refreshInstallButtons() {
    const can = !isStandalone() && (deferredPrompt !== null || isIOS);
    document.querySelectorAll('[data-pwa-install]').forEach((el) => el.classList.toggle('d-none', !can));
  }

  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();          // keep it for our own button instead of the mini-infobar
    deferredPrompt = ev;
    refreshInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    refreshInstallButtons();
    window.App?.toast?.('DisinfEntry was added to your home screen.', 'success', 'App installed');
  });

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      refreshInstallButtons();
      return;
    }
    if (isIOS) {
      window.alert(
        'To install DisinfEntry on your iPhone or iPad:\n\n' +
        '1. Open this page in Safari.\n' +
        '2. Tap the Share button (square with an arrow).\n' +
        '3. Choose "Add to Home Screen", then tap Add.'
      );
    }
  }

  /* ---------------- Phone notifications ---------------- */

  const STORE_KEY = 'disinf_phone_alerts';
  const supported = 'Notification' in window;

  function enabled() {
    if (!supported || Notification.permission !== 'granted') return false;
    try { return localStorage.getItem(STORE_KEY) !== 'off'; } catch { return true; }
  }

  function refreshNotifyToggles() {
    document.querySelectorAll('[data-pwa-notify]').forEach((el) => {
      if (!supported) { el.classList.add('d-none'); return; }
      const on = enabled();
      const icon = el.querySelector('i');
      const label = el.querySelector('[data-label]');
      if (icon) icon.className = `bi ${on ? 'bi-bell-fill' : 'bi-bell-slash'} me-2`;
      if (label) label.textContent = on ? 'Phone alerts: on' : 'Phone alerts: off';
    });
  }

  async function toggleNotifications() {
    if (!supported) return;
    if (enabled()) {
      try { localStorage.setItem(STORE_KEY, 'off'); } catch { /* storage blocked */ }
    } else {
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (perm === 'granted') {
        try { localStorage.setItem(STORE_KEY, 'on'); } catch { /* storage blocked */ }
        notify('Phone alerts are on', 'You will be alerted about high temperatures, denied entries and booth problems.', { tag: 'disinf-test' });
      } else if (perm === 'denied') {
        window.App?.toast?.('Notifications are blocked. Allow them for this site in your phone\'s browser settings.', 'warning');
      }
    }
    refreshNotifyToggles();
  }

  /** Shows a system notification (status bar / lock screen). Silently does nothing if not allowed. */
  async function notify(title, body, { url = 'notifications.php', tag = undefined, critical = false } = {}) {
    if (!enabled()) return;
    const opts = {
      body,
      tag,
      icon: new URL('assets/icons/icon-192.png', registration?.scope || document.baseURI).href,
      badge: new URL('assets/icons/favicon-32.png', registration?.scope || document.baseURI).href,
      data: { url },
      requireInteraction: critical,
      renotify: Boolean(tag),
      vibrate: critical ? [300, 120, 300, 120, 300] : [150],
    };
    try {
      // Android only shows notifications through the service worker.
      const reg = registration || (await navigator.serviceWorker?.getRegistration?.());
      if (reg) { await reg.showNotification(title, opts); return; }
      new Notification(title, opts);
    } catch { /* not allowed in this context */ }
  }

  function vibrate(pattern = [200]) {
    try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
  }

  /* ---------------- Pull to refresh ---------------- */

  // An installed app has no browser reload button or native pull-to-refresh, so add one.
  function initPullToRefresh() {
    if (!isStandalone() || !('ontouchstart' in window)) return;

    const ind = document.createElement('div');
    ind.className = 'ptr-indicator';
    ind.innerHTML = '<i class="bi bi-arrow-down"></i>';
    document.body.appendChild(ind);

    const TRIGGER = 80;
    let startY = null;
    let dist = 0;

    const blocked = () =>
      document.querySelector('.modal.show, .dropdown-menu.show, .sidebar.show') !== null;

    window.addEventListener('touchstart', (e) => {
      startY = (window.scrollY <= 0 && !blocked() && e.touches.length === 1) ? e.touches[0].clientY : null;
      dist = 0;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (startY === null) return;
      dist = Math.max(0, e.touches[0].clientY - startY);
      if (dist === 0) return;
      const pull = Math.min(dist * 0.5, TRIGGER + 20);
      ind.style.transition = 'none';
      ind.style.opacity = String(Math.min(1, pull / 40));
      ind.style.transform = `translateY(${pull - 40}px) rotate(${pull * 3}deg)`;
      ind.classList.toggle('ready', dist * 0.5 >= TRIGGER);
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (startY === null) return;
      startY = null;
      ind.style.transition = 'transform .2s, opacity .2s';
      if (dist * 0.5 >= TRIGGER) {
        ind.classList.add('spin');
        ind.style.transform = `translateY(${TRIGGER - 40}px)`;
        window.location.reload();
      } else {
        ind.style.opacity = '0';
        ind.style.transform = 'translateY(-80px)';
      }
    });
  }

  /* ---------------- Theme buttons ---------------- */

  // The theme itself is applied by the inline script in includes/pwa_head.php.
  function refreshThemeControls() {
    const T = window.DisinfTheme;
    if (!T) return;
    const dark = T.current() === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((el) => {
      const icon = el.querySelector('i');
      if (icon) icon.className = `bi ${dark ? 'bi-sun' : 'bi-moon-stars'}`;
      el.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    });
    document.querySelectorAll('[data-theme-set]').forEach((el) =>
      el.classList.toggle('active', el.dataset.themeSet === T.pref()));
  }

  document.addEventListener('themechange', refreshThemeControls);

  /* ---------------- Wiring ---------------- */

  document.addEventListener('click', (ev) => {
    const T = window.DisinfTheme;
    if (T && ev.target.closest('[data-theme-toggle]')) {
      ev.preventDefault();
      T.set(T.current() === 'dark' ? 'light' : 'dark');
    }
    const setter = ev.target.closest('[data-theme-set]');
    if (T && setter) { ev.preventDefault(); T.set(setter.dataset.themeSet); }
    if (ev.target.closest('[data-pwa-install]')) { ev.preventDefault(); install(); }
    if (ev.target.closest('[data-pwa-notify]')) { ev.preventDefault(); toggleNotifications(); }
  });

  document.addEventListener('DOMContentLoaded', () => {
    refreshInstallButtons();
    refreshNotifyToggles();
    refreshThemeControls();
    initPullToRefresh();
  });

  return { isStandalone, isIOS, install, notify, vibrate, notificationsEnabled: enabled };
})();

window.PWA = PWA;
