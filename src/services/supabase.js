import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://atiumxglieipioqmnrbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NJ2yaoVO_uGHY41_GiavdQ_66XVbaVD';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
