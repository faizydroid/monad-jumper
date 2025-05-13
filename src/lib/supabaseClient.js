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

// Create a secure wrapper around the Supabase client
export const supabase = createSecureSupabaseWrapper(supabaseClient);

// This function creates a secure wrapper around the Supabase client
// to enforce session token validation for sensitive operations
function createSecureSupabaseWrapper(client) {
  // Keep a reference to original methods
  const originalFrom = client.from.bind(client);

  // Create a wrapper with the same API but which routes score and jump operations to our proxy
  const secureClient = {
    ...client,
    
    // Override the from method to add validation
    from: (table) => {
      // Get the original builder
      const builder = originalFrom(table);
      
      // Get secure methods with validation for sensitive tables
      if (table === 'scores' || table === 'jumps') {
        return createSecureTableMethods(builder, table);
      }
      
      // For non-sensitive tables, return original builder
      return builder;
    }
  };
  
  return secureClient;
}

// Create secure methods for sensitive tables
function createSecureTableMethods(builder, tableName) {
  // Store original methods
  const originalInsert = builder.insert.bind(builder);
  const originalUpdate = builder.update.bind(builder);
  const originalUpsert = builder.upsert.bind(builder);
  
  // Return a modified builder with secure methods
  return {
    ...builder,
    
    // Override insert method
    insert: (data, options = {}) => {
      // For sensitive tables, we require validation through our proxy
      console.log(`Secure insert for ${tableName}:`, data);
      
      // Extract session token from headers or data
      const sessionToken = options?.headers?.['x-game-session-token'] || 
                          (data?.session_token);
      
      if (!sessionToken) {
        console.error(`No session token provided for ${tableName} insert`);
        throw new Error(`Session token required for ${tableName} operations`);
      }
      
      // Route through our proxy with validation
      return fetch('/api/proxy/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-session-token': sessionToken
        },
        credentials: 'include',
        body: JSON.stringify({
          action: tableName,
          method: 'POST',
          data: data
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(error.message || 'Failed to validate operation');
          });
        }
        return response.json();
      }).then(validationResult => {
        // If validation passed, proceed with original operation
        if (validationResult.validated) {
          return originalInsert(data, options);
        }
        throw new Error('Validation failed');
      });
    },
    
    // Override update method
    update: (data, options = {}) => {
      // Same validation approach for updates
      console.log(`Secure update for ${tableName}:`, data);
      
      // Extract session token from headers or data
      const sessionToken = options?.headers?.['x-game-session-token'] || 
                          (data?.session_token);
      
      if (!sessionToken) {
        console.error(`No session token provided for ${tableName} update`);
        throw new Error(`Session token required for ${tableName} operations`);
      }
      
      // Route through our proxy with validation
      return fetch('/api/proxy/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-session-token': sessionToken
        },
        credentials: 'include',
        body: JSON.stringify({
          action: tableName,
          method: 'PUT',
          data: data
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(error.message || 'Failed to validate operation');
          });
        }
        return response.json();
      }).then(validationResult => {
        // If validation passed, proceed with original operation
        if (validationResult.validated) {
          return originalUpdate(data, options);
        }
        throw new Error('Validation failed');
      });
    },
    
    // Override upsert method
    upsert: (data, options = {}) => {
      // Same validation approach for upserts
      console.log(`Secure upsert for ${tableName}:`, data);
      
      // Extract session token from headers or data
      const sessionToken = options?.headers?.['x-game-session-token'] || 
                          (data?.session_token);
      
      if (!sessionToken) {
        console.error(`No session token provided for ${tableName} upsert`);
        throw new Error(`Session token required for ${tableName} operations`);
      }
      
      // Route through our proxy with validation
      return fetch('/api/proxy/supabase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-game-session-token': sessionToken
        },
        credentials: 'include',
        body: JSON.stringify({
          action: tableName,
          method: 'PUT',
          data: data
        })
      }).then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw new Error(error.message || 'Failed to validate operation');
          });
        }
        return response.json();
      }).then(validationResult => {
        // If validation passed, proceed with original operation
        if (validationResult.validated) {
          return originalUpsert(data, options);
        }
        throw new Error('Validation failed');
      });
    },
    
    // Keep original methods for read operations
    select: builder.select.bind(builder),
    count: builder.count.bind(builder),
    single: builder.single.bind(builder),
    maybeSingle: builder.maybeSingle.bind(builder)
  };
}

// For debugging, add a flag to see if this file gets imported
window.__SUPABASE_CLIENT_INITIALIZED = true;

// Apply session validation middleware
console.log('Applying session validation middleware...');
export const originalClient = supabaseClient; 