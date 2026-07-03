// js/pwa.js — PWA installation + service worker registration

// ── Register service worker ──────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[PWA] Registered:', reg.scope);
        setInterval(() => reg.update(), 60000);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
          });
        });
      })
      .catch(err => console.warn('[PWA] SW failed:', err));
  });
}

// ── Install prompt (Android/Chrome) ──────────────────────────
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 86400000) showInstallBanner();
});

window.addEventListener('appinstalled', () => { deferredPrompt = null; removeInstallBanner(); });

function showInstallBanner() {
  if (document.getElementById('pwa-banner')) return;
  const el = document.createElement('div');
  el.id = 'pwa-banner';
  el.innerHTML = `<style>@keyframes su{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}</style>
  <div style="position:fixed;bottom:calc(64px + .75rem);left:.75rem;right:.75rem;max-width:500px;margin:0 auto;
    background:#1a56db;color:#fff;border-radius:14px;padding:.875rem 1rem;
    display:flex;align-items:center;gap:.875rem;box-shadow:0 8px 24px rgba(26,86,219,.4);
    z-index:100;animation:su .3s ease;font-family:'Inter',sans-serif;">
    <div style="width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:10px;display:grid;place-items:center;flex-shrink:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l3-4h8l3 4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2"/>
        <circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>
      </svg>
    </div>
    <div style="flex:1"><div style="font-weight:700;font-size:.9rem">Install xchodedos</div><div style="font-size:.75rem;opacity:.8">Add to home screen for quick access</div></div>
    <button id="pwa-install-btn" style="background:#fff;color:#1a56db;border:none;border-radius:8px;padding:.5rem .875rem;font-weight:700;font-size:.8rem;cursor:pointer;white-space:nowrap">Install</button>
    <button id="pwa-dismiss-btn" style="background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;padding:.25rem;line-height:0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('pwa-install-btn').onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') removeInstallBanner();
    deferredPrompt = null;
  };
  document.getElementById('pwa-dismiss-btn').onclick = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    removeInstallBanner();
  };
}

function removeInstallBanner() { document.getElementById('pwa-banner')?.remove(); }

// ── Update banner ─────────────────────────────────────────────
function showUpdateBanner() {
  if (document.getElementById('pwa-update')) return;
  const el = document.createElement('div');
  el.id = 'pwa-update';
  el.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;background:#065f46;color:#fff;
    padding:.75rem 1rem;display:flex;align-items:center;justify-content:space-between;
    gap:1rem;z-index:200;font-family:'Inter',sans-serif;font-size:.85rem;font-weight:500;">
    <span>🔄 New version available</span>
    <button onclick="window.location.reload()" style="background:#fff;color:#065f46;border:none;
      border-radius:6px;padding:.35rem .75rem;font-weight:700;font-size:.78rem;cursor:pointer">Update now</button>
  </div>`;
  document.body.appendChild(el);
}

// ── iOS install tip ───────────────────────────────────────────
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isIOS && !isStandalone && !localStorage.getItem('ios-tip-dismissed')) {
  setTimeout(() => {
    const el = document.createElement('div');
    el.id = 'ios-tip';
    el.innerHTML = `<style>@keyframes su{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}</style>
    <div style="position:fixed;bottom:calc(64px + .75rem);left:.75rem;right:.75rem;
      background:#111827;color:#fff;border-radius:14px;padding:1rem;z-index:100;
      box-shadow:0 8px 24px rgba(0,0,0,.4);font-family:'Inter',sans-serif;
      font-size:.83rem;line-height:1.6;animation:su .3s ease;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <span style="font-weight:700">📱 Install on iPhone</span>
        <button onclick="localStorage.setItem('ios-tip-dismissed','1');document.getElementById('ios-tip').remove()"
          style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:1.2rem;line-height:1">×</button>
      </div>
      Tap <strong>Share ⬆️</strong> then <strong>"Add to Home Screen"</strong> to install xchodedos.
    </div>`;
    document.body.appendChild(el);
  }, 3000);
}
