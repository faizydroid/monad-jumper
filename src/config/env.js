export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_REACT_APP_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY,
  PROJECT_ID: import.meta.env.VITE_PROJECT_ID,
  WALLET_CONNECT_PROJECT_ID: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
};

// Validate environment variables
Object.entries(ENV).forEach(([key, value]) => {
  if (!value) {
    console.error(`Missing environment variable: ${key}`);
  }
}); 