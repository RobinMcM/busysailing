import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY - database features will be disabled');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Check if analytics table exists
export async function initializeSupabaseTables() {
  if (!supabase) {
    console.log('[Supabase] Skipping table initialization - no client available');
    return false;
  }

  try {
    console.log('[Supabase] Checking if analytics table exists...');

    // Try to query the table to check if it exists
    const { error } = await supabase
      .from('analytics')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.warn('[Supabase] ⚠️  Analytics table does not exist!');
        console.warn('[Supabase] Please run the SQL from deployment/supabase-schema.sql in your Supabase SQL Editor');
        console.warn('[Supabase] Visit: https://supabase.com/dashboard/project/_/sql');
        return false;
      }
      console.error('[Supabase] Error checking table:', error);
      return false;
    }

    console.log('[Supabase] ✓ Analytics table exists and is accessible');
    return true;
  } catch (error: any) {
    console.error('[Supabase] Initialization error:', error);
    return false;
  }
}
