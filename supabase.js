// ════════════════════════════════════════════════════════════
// js/supabase.js — Supabase client configuration
//
// HOW TO SET UP:
// 1. Go to https://supabase.com and open your project
// 2. Click Settings (gear icon) → API
// 3. Copy "Project URL" → paste as SUPABASE_URL below
// 4. Copy "anon / public" key → paste as SUPABASE_ANON_KEY below
// 5. Save, push to GitHub, Vercel will redeploy automatically
// ════════════════════════════════════════════════════════════

const SUPABASE_URL      = https://kgbqjcataatpfpxfvkpc.supabase.co/rest/v1/;
const SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYnFqY2F0YWF0cGZweGZ2a3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDk5ODksImV4cCI6MjA5NzYyNTk4OX0.qJ8qiYWxNGLRXM6QRByNdnawsOSOirVQ3azi--DLSrM;

// Do not edit below this line
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default db;
