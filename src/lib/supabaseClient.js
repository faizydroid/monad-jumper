import { createClient } from '@supabase/supabase-js';
import { setupSessionValidation } from '../middleware/sessionValidation';

// Check if the environment variables are defined
const supabaseUrl = import.meta.env.VITE_REACT_APP_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!', {
    url: supabaseUrl ? '✓' : '✗',
    key: supabaseAnonKey ? '✓' : '✗'
  });
}

console.log('Initializing Supabase client...');

// Create the Supabase client
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

// For debugging, add a flag to see if this file gets imported
window.__SUPABASE_CLIENT_INITIALIZED = true;

// Apply session validation middleware
console.log('Applying session validation middleware...');
export const supabase = setupSessionValidation(supabaseClient);

// Export the original client for testing/debugging
export const originalClient = supabaseClient; 