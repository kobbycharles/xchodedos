// js/auth.js — Authentication & Role-Based Routing

const SUPABASE_URL      = 'https://kgbqjcataatpfpxfvkpc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYnFqY2F0YWF0cGZweGZ2a3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDk5ODksImV4cCI6MjA5NzYyNTk4OX0.qJ8qiYWxNGLRXM6QRByNdnawsOSOirVQ3azi--DLSrM';

const ROLE_ROUTES = {
  driver:                'pages/driver/dashboard.html',
  relationship_officer:  'pages/officer/dashboard.html',
  super_admin:           'pages/admin/dashboard.html',
  lead:                  'pages/lead/status.html',
};

// Used by index.html inline script — also exported for other pages
async function getSession() {
  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await db.auth.getSession();
  return { db, session };
}

async function redirectByRole() {
  const { db, session } = await getSession();
  if (!session) { window.location.href = '/index.html'; return; }
  const { data } = await db.from('profiles').select('role').eq('id', session.user.id).single();
  if (data?.role) window.location.href = '/' + (ROLE_ROUTES[data.role] || 'index.html');
}
