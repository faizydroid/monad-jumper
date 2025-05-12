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
      host: '0.0.0.0'
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
      sourcemap: mode === 'development', // Only generate sourcemaps in development
      target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      rollupOptions: {
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
      assetsInlineLimit: 4096,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production', // Remove console logs in production
          unsafe: false,
          unsafe_arrows: false,
          unsafe_comps: false,
          unsafe_Function: false,
          unsafe_math: false,
          unsafe_methods: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          unsafe_undefined: false,
        },
      },
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