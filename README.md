# Security Best Practices

## Environment Variables

This application uses environment variables to manage sensitive configuration. To properly secure your deployment:

1. **Never commit sensitive values to your repository**
   - Create a `.env.local` file locally (it's already in `.gitignore`)
   - Keep your `.env.example` file with placeholder values for documentation

2. **Naming convention for client-safe variables**
   - Only variables prefixed with `VITE_PUBLIC_` will be exposed to the browser
   - All other variables are kept server-side and not included in the build

3. **Required Environment Variables**
   ```
   # Public variables (safe to expose to client)
   VITE_PUBLIC_APP_NAME="JumpNads"
   VITE_PUBLIC_CHAIN_ID=10143
   VITE_PUBLIC_NETWORK_NAME="Monad Testnet"

   # Private variables (not exposed to client)
   VITE_PROJECT_ID=your_wallet_connect_project_id_here
   VITE_RPC_URL=your_rpc_url_here
   VITE_REACT_APP_SUPABASE_URL=your_supabase_url_here
   VITE_REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_REACT_APP_GAME_CONTRACT_ADDRESS=your_game_contract_address_here
   ```

4. **API Key Security**
   - API keys should NEVER be exposed to the client
   - Handle API requests through a backend service or serverless functions
   - Use environment variables that don't start with `VITE_` for server-only configurations

5. **Building for Production**
   - The production build will automatically:
     - Strip out any non-public environment variables
     - Remove console logs
     - Disable source maps
     - Minify all code

## Additional Security Measures

- Use a Web3 wallet for authentication rather than passwords
- Implement rate limiting on your backend APIs
- Keep all dependencies updated to patch security vulnerabilities
- Use HTTPS for all API calls and website hosting
