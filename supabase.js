// js/supabase.js
// Replace the values below with your actual Supabase project credentials
// Found in: Supabase Dashboard → Project Settings → API

const SUPABASE_URL = 'https://kgbqjcataatpfpxfvkpc.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnYnFqY2F0YWF0cGZweGZ2a3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNDk5ODksImV4cCI6MjA5NzYyNTk4OX0.qJ8qiYWxNGLRXM6QRByNdnawsOSOirVQ3azi--DLSrM';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default db;
