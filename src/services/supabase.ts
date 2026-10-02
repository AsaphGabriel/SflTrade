import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://atiumxglieipioqmnrbd.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NJ2yaoVO_uGHY41_GiavdQ_66XVbaVD';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
