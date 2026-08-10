// js/notifications.js — Notification bell + unread counter
// Plain global script. Include with <script src="/js/notifications.js"></script>
// after the Supabase client (`db`) has been created on the page.
//
// Usage: call initNotificationBell(userId, 'bellContainerId') once the
// user's profile is loaded. It renders a bell icon with an unread badge
// into the target element, fetches the initial count, and subscribes to
// realtime inserts so the badge updates live without a refresh.

async function initNotificationBell(userId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <button id="notifBellBtn" style="position:relative;background:none;border:none;cursor:pointer;padding:.4rem;display:flex;align-items:center">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span id="notifBadge" style="display:none;position:absolute;top:-2px;right:-2px;background:#dc2626;color:#fff;font-size:.62rem;font-weight:700;line-height:1;min-width:16px;height:16px;border-radius:99px;display:flex;align-items:center;justify-content:center;padding:0 3px"></span>
    </button>
    <div id="notifPanel" style="display:none;position:fixed;max-width:calc(100vw - 24px);width:320px;max-height:70vh;overflow-y:auto;background:#fff;border:1px solid var(--border,#e5e7eb);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:200">
      <div style="padding:.75rem;border-bottom:1px solid var(--border,#e5e7eb);display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;font-size:.85rem">Notifications</span>
        <button id="notifMarkAllBtn" style="background:none;border:none;color:var(--brand,#1a56db);font-size:.72rem;font-weight:600;cursor:pointer">Mark all read</button>
      </div>
      <div id="notifList"></div>
    </div>`;
  container.style.position = 'relative';

  const badge = document.getElementById('notifBadge');
  const panel = document.getElementById('notifPanel');

  async function refreshCount() {
    const { count } = await db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false);
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }

  async function loadList() {
    const { data } = await db.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending:false }).limit(20);
    const list = document.getElementById('notifList');
    if (!data || !data.length) { list.innerHTML = `<div style="padding:1.5rem;text-align:center;font-size:.8rem;color:#9ca3af">No notifications yet.</div>`; return; }
    list.innerHTML = data.map(n => `
      <a href="${n.url||'#'}" onclick="markNotifRead('${n.id}')" style="display:block;padding:.7rem .875rem;text-decoration:none;color:inherit;border-bottom:1px solid #f3f4f6;${n.read?'opacity:.55':'background:#f5f8ff'}">
        <div style="font-size:.8rem;font-weight:700;color:#111827">${n.title}</div>
        <div style="font-size:.76rem;color:#4b5563;margin-top:.15rem">${n.body}</div>
        <div style="font-size:.65rem;color:#9ca3af;margin-top:.3rem">${new Date(n.created_at).toLocaleString()}</div>
      </a>`).join('');
  }

  window.markNotifRead = async (id) => {
    await db.from('notifications').update({ read:true }).eq('id', id);
    refreshCount();
  };

  document.getElementById('notifBellBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const opening = panel.style.display === 'none';
    if (opening) {
      const rect = document.getElementById('notifBellBtn').getBoundingClientRect();
      panel.style.top = Math.round(rect.bottom + 8) + 'px';
      panel.style.right = Math.round(window.innerWidth - rect.right) + 'px';
      panel.style.left = 'auto';
    }
    panel.style.display = opening ? 'block' : 'none';
    if (opening) await loadList();
  });
  document.addEventListener('click', (e) => { if (!container.contains(e.target)) panel.style.display = 'none'; });

  document.getElementById('notifMarkAllBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await db.from('notifications').update({ read:true }).eq('user_id', userId).eq('read', false);
    await refreshCount();
    await loadList();
  });

  await refreshCount();

  // Live updates: bump the badge instantly when a new notification lands.
  db.channel('notifications-' + userId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
      refreshCount();
      if (panel.style.display !== 'none') loadList();
    })
    .subscribe();
}
