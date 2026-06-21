// js/auth.js — Authentication & Role-Based Routing

import db from './supabase.js';

const ROLE_ROUTES = {
  driver:                'pages/driver/dashboard.html',
  relationship_officer:  'pages/officer/dashboard.html',
  super_admin:           'pages/admin/dashboard.html',
  lead:                  'pages/lead/status.html',
};

// ─── Login ────────────────────────────────────────────────────
export async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await redirectByRole();
  return data;
}

// ─── Logout ───────────────────────────────────────────────────
export async function logout() {
  await db.auth.signOut();
  window.location.href = '/index.html';
}

// ─── Get current session ──────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

// ─── Get current user profile ─────────────────────────────────
export async function getCurrentProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;
  return data;
}

// ─── Redirect based on role ───────────────────────────────────
export async function redirectByRole() {
  const profile = await getCurrentProfile();
  if (!profile) { window.location.href = '/index.html'; return; }
  const route = ROLE_ROUTES[profile.role] || '/index.html';
  window.location.href = '/' + route;
}

// ─── Guard: protect a page, redirect if not authed / wrong role ─
export async function requireRole(...allowedRoles) {
  const session = await getSession();
  if (!session) { window.location.href = '/index.html'; return null; }

  const profile = await getCurrentProfile();
  if (!profile || !allowedRoles.includes(profile.role)) {
    window.location.href = '/index.html';
    return null;
  }
  return profile;
}

// ─── Listen for auth changes ──────────────────────────────────
export function onAuthChange(callback) {
  db.auth.onAuthStateChange((_event, session) => callback(session));
}
