import { createClient } from '@supabase/supabase-js';

// Check if the environment variables are defined
const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!', {
    url: supabaseUrl ? '✓' : '✗',
    key: supabaseAnonKey ? '✓' : '✗'
  });
}

console.log('Initializing Supabase client with anon key only...');

// Create the Supabase client with anon key (restricted permissions)
const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true
    },
    global: {
      headers: {
        'x-client-info': 'doodle-jump-game'
      }
    }
  }
);

// For debugging, add a flag to indicate this is the anon key client
supabaseClient.isAnonKeyClient = true;

export const supabase = supabaseClient;

export default supabase; 