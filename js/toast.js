// js/toast.js — Toast notifications

function toast(message, type = 'default', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:1rem;left:50%;transform:translateX(-50%);z-index:999;width:calc(100% - 2rem);max-width:420px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '✕', warning: '⚠', default: 'ℹ' };

  const el = document.createElement('div');
  el.style.cssText = 'display:flex;align-items:center;gap:.5rem;padding:.75rem 1rem;border-radius:12px;font-size:.85rem;font-weight:500;margin-bottom:.5rem;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.15);animation:toast-in .2s ease;';

  const colors = { success: '#065f46', error: '#991b1b', warning: '#92400e', default: '#111827' };
  el.style.background = colors[type] || colors.default;
  el.innerHTML = `<span>${icons[type] || icons.default}</span><span>${message}</span>`;

  // Add animation keyframes once
  if (!document.getElementById('toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent = '@keyframes toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}';
    document.head.appendChild(style);
  }

  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .2s, transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => el.remove(), 200);
  }, duration);
}
