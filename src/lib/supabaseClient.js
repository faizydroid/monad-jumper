import { createClient } from '@supabase/supabase-js';
import { createSecureSupabase } from '../middleware/sessionValidation';

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

// Create the Supabase client with secure configuration
const supabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      headers: {
        'x-client-info': 'doodle-jump-game'
      }
    },
    // Set strict security options
    db: {
      schema: 'public'
    }
  }
);

// For debugging, flag when initialized
console.debug('Supabase client initialized with URL:', supabaseUrl);

// Create a secure wrapper around the Supabase client using our middleware
let secureSupabase;
try {
  // Attempt to create secure Supabase client
  secureSupabase = createSecureSupabase(supabaseClient);
  console.log('Secure Supabase client created successfully');
} catch (error) {
  // Fallback to regular client if secure version fails
  console.error('Failed to create secure Supabase client, using regular client as fallback:', error);
  secureSupabase = supabaseClient;
}

// Export the best available client
export const supabase = secureSupabase;

// For debugging, add a flag to see if this file gets imported
if (typeof window !== 'undefined') {
  window.__SUPABASE_CLIENT_INITIALIZED = true;
}

// Export original client for cases where we need direct access
export const originalClient = supabaseClient; 