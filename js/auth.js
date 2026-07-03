// js/auth.js — Authentication & Role-Based Routing

import db from '/js/supabase.js';

const ROLE_ROUTES = {
  driver:                '/pages/driver/dashboard.html',
  relationship_officer:  '/pages/officer/dashboard.html',
  super_admin:           '/pages/admin/dashboard.html',
  lead:                  '/pages/lead/status.html',
};

// Returns the signed-in user's profile row, or null if not signed in
// or the profile can't be loaded.
export async function getCurrentProfile() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('getCurrentProfile error:', error);
    return null;
  }
  return data;
}

// Ensures the signed-in user has the given role.
// - No session          -> redirect to login
// - Wrong role           -> redirect to their correct dashboard
// - Matches              -> returns the profile
export async function requireRole(role) {
  const profile = await getCurrentProfile();

  if (!profile) {
    window.location.href = '/index.html';
    return null;
  }
  if (profile.role !== role) {
    window.location.href = ROLE_ROUTES[profile.role] || '/index.html';
    return null;
  }
  return profile;
}

// Signs the current user out and returns to login.
export async function logout() {
  await db.auth.signOut();
  window.location.href = '/index.html';
}

// Sends an already-signed-in user to the dashboard matching their role.
// Used by index.html after a successful login / on load.
export async function redirectByRole() {
  const profile = await getCurrentProfile();
  if (profile?.role) {
    window.location.href = ROLE_ROUTES[profile.role] || '/index.html';
  }
}
