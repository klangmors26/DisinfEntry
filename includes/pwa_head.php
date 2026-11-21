<?php
/**
 * Mobile-app <head> tags: web app manifest, icons, theme colour and iOS/Android
 * "add to home screen" metadata. Included by every page shell (app pages and the
 * sign-in pages) so the console can be installed from any of them.
 */

declare(strict_types=1);
?>
<meta name="theme-color" content="#0d7a5f">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="DisinfEntry">
<meta name="application-name" content="DisinfEntry">
<meta name="format-detection" content="telephone=no">
<?php /* use-credentials: browsers fetch the manifest without cookies by default, and hosts with a
   cookie-based browser check (InfinityFree's aes.js) then answer with an HTML challenge page,
   which makes the app impossible to install. Same-origin, so this only adds our own cookies. */ ?>
<link rel="manifest" href="<?= url('manifest.json') ?>" crossorigin="use-credentials">
<link rel="icon" type="image/png" sizes="32x32" href="<?= url('assets/icons/favicon-32.png') ?>">
<link rel="apple-touch-icon" href="<?= url('assets/icons/apple-touch-icon.png') ?>">
<meta name="sw-url" content="<?= e(url('sw.js')) ?>">
<script>
/* Light / Dark / Auto theme. Inline and in <head> so the page is drawn in the right
   theme from the first frame (no white flash). Preference is per device (localStorage);
   "auto" follows the phone/computer setting. UI wiring lives in assets/js/pwa.js. */
(function () {
  var KEY = 'disinf_theme', root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var printing = false;
  function pref() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; }
    catch (e) { return 'auto'; }
  }
  function resolved() { var p = pref(); return p === 'auto' ? (mq.matches ? 'dark' : 'light') : p; }
  function apply() {
    var t = printing ? 'light' : resolved();
    root.setAttribute('data-bs-theme', t);
    root.setAttribute('data-theme-pref', pref());
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#0b4d3d' : '#0d7a5f');
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t, pref: pref() } }));
  }
  window.DisinfTheme = {
    pref: pref,
    current: resolved,
    set: function (p) {
      try { if (p === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch (e) {}
      apply();
    }
  };
  if (mq.addEventListener) mq.addEventListener('change', function () { if (pref() === 'auto') apply(); });
  // Reports and logs always print on white paper.
  window.addEventListener('beforeprint', function () { printing = true; apply(); });
  window.addEventListener('afterprint', function () { printing = false; apply(); });
  apply();
})();
</script>
<script src="<?= asset_url('assets/js/pwa.js') ?>" defer></script>
