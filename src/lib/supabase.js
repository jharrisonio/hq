import { createClient } from '@supabase/supabase-js'

// Netlify Drop doesn't support build-time env vars, and the anon key is safe
// to expose client-side (RLS enforces per-row access) — so fall back to a
// hardcoded pair here if you deploy without a connected git repo.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
