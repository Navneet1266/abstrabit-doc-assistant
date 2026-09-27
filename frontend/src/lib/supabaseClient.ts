import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loudly at startup rather than producing confusing runtime errors
  // deep in an auth call.
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY - copy frontend/.env.example to frontend/.env and fill them in.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')
