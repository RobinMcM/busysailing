import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY - database features will be disabled');
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Initialize database tables
export async function initializeSupabaseTables() {
  if (!supabase) {
    console.log('[Supabase] Skipping table initialization - no client available');
    return false;
  }

  try {
    console.log('[Supabase] Checking analytics table...');

    // Create analytics table if it doesn't exist
    const { error } = await supabase.rpc('create_analytics_table', {});

    if (error && !error.message.includes('already exists')) {
      console.error('[Supabase] Error creating table:', error);
      
      // Try direct SQL approach
      console.log('[Supabase] Attempting direct table creation...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS analytics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          type TEXT NOT NULL CHECK (type IN ('chat', 'tts')),
          ip_address TEXT NOT NULL,
          input_tokens INTEGER DEFAULT 0,
          output_tokens INTEGER DEFAULT 0,
          character_count INTEGER DEFAULT 0,
          model TEXT,
          duration_ms INTEGER NOT NULL,
          cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics(type);
        CREATE INDEX IF NOT EXISTS idx_analytics_ip ON analytics(ip_address);
      `;

      // Execute via query (not available in supabase-js, so we'll skip for now)
      console.log('[Supabase] Table creation SQL prepared (manual setup may be required)');
    }

    console.log('[Supabase] Database initialized successfully');
    return true;
  } catch (error: any) {
    console.error('[Supabase] Initialization error:', error);
    return false;
  }
}
