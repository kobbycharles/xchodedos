// js/push.js — Push notification subscription flow
// Plain global script. Include with <script src="/js/push.js"></script>
// after the Supabase client (`db`) has been created on the page.

// Public key only — safe to be in client code. The matching private
// key lives only in the Edge Function's environment secrets.
const VAPID_PUBLIC_KEY = 'BPtbJszRr0pjAVl_ncQoLwQafEn4OvSudOiINjEI7n0NEOaLnmSsPKhgozx9bgR61AarDGKacCK19UuMhOLuNwc';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

// Call this after the user is signed in. Shows a small prompt banner
// asking permission — does NOT trigger the native browser prompt
// silently, so it doesn't look surprising or spammy.
async function initPushPrompt(userId, bannerElementId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  if (Notification.permission === 'denied') return; // respect a prior "no"

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — make sure it's saved (covers the case of a
    // fresh login on a device that was already subscribed).
    await savePushSubscription(userId, existing);
    return;
  }

  if (Notification.permission === 'granted') {
    await subscribeToPush(userId, reg);
    return;
  }

  // Not yet asked — show a friendly banner instead of the native
  // prompt firing out of nowhere.
  const bannerEl = document.getElementById(bannerElementId);
  if (!bannerEl) return;
  bannerEl.innerHTML = `
    <div style="background:var(--brand-light,#e8eeff);border:1px solid #c7d7fb;border-radius:12px;padding:.875rem 1rem;margin-bottom:1rem;display:flex;gap:.75rem;align-items:center">
      <span style="font-size:1.2rem;line-height:1">🔔</span>
      <div style="flex:1;font-size:.8rem;color:var(--gray-700,#374151)">Turn on notifications for payment and maintenance reminders.</div>
      <button id="enablePushBtn" style="background:var(--brand,#1a56db);color:#fff;border:none;border-radius:8px;padding:.4rem .75rem;font-size:.78rem;font-weight:600;white-space:nowrap">Enable</button>
    </div>`;
  document.getElementById('enablePushBtn').addEventListener('click', async () => {
    const permission = await Notification.requestPermission();
    bannerEl.innerHTML = '';
    if (permission === 'granted') await subscribeToPush(userId, reg);
  });
}

async function subscribeToPush(userId, reg) {
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await savePushSubscription(userId, sub);
  } catch (err) {
    console.warn('[push] subscribe failed:', err);
  }
}

async function savePushSubscription(userId, sub) {
  const json = sub.toJSON();
  try {
    // `db` is expected to already exist as a global on the page (each
    // page creates its own Supabase client the same way toast()/etc. do).
    await db.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
    }, { onConflict: 'endpoint' });
  } catch (err) {
    console.warn('[push] failed to save subscription:', err);
  }
}
