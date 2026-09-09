const SUPABASE_URL      = 'https://lhcrfsemshilnzyqoypd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3Jmc2Vtc2hpbG56eXFveXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4OTM2ODUsImV4cCI6MjEwNDQ2OTY4NX0.bPqqrijUXEfvrB9mTbkPiicAcEbeMsDgO-STfo4Btjw';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default db;
