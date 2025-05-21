import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  // Filter out sensitive env vars for client-side code
  // This creates a safe subset of environment variables
  const safeEnv = {};
  for (const key in env) {
    // Only expose non-sensitive environment variables to the client
    if (key.startsWith('VITE_PUBLIC_')) {
      safeEnv[key] = env[key];
    }
  }
  
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
      host: '0.0.0.0',
      proxy: {
        // Add proxy for the Supabase API endpoint
        '/api/proxy/supabase': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        },
        // Add proxy for register-session-token endpoint
        '/api/register-session-token': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },
    css: {
      preprocessorOptions: {
        css: {
          charset: false
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Add canvas alias to use our fallback
        'canvas': path.resolve(__dirname, './src/canvasFallback.js'),
      },
    },
    define: {
      // Only expose safe env variables to the client
      'process.env': safeEnv,
      'import.meta.env': JSON.stringify({
        ...safeEnv,
        MODE: mode,
        DEV: mode === 'development',
        PROD: mode === 'production',
      }),
      'globalThis.b_': '{}',
      'window.b_': '{}',
    },
    build: {
      outDir: 'dist',
      // Disable rollup native binary usage
      rollupOptions: {
        external: [],
        input: {
          main: resolve(__dirname, './index.html'),
        },
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            wagmi: ['wagmi', '@rainbow-me/rainbowkit']
          }
        }
      },
      // Simplify build configuration to reduce errors
      assetsInlineLimit: 4096,
      minify: 'esbuild', // Use esbuild instead of terser
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@rainbow-me/rainbowkit',
        'wagmi',
        '@tanstack/react-query',
        'viem',
        'ethers',
      ],
      exclude: ['public/js/*'],
    },
    publicDir: 'public',
  }
}) 