import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: 3000,
      open: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': env,
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        onwarn(warning, warn) {
          if (warning.code === 'MISSING_EXPORT') return;
          warn(warning);
        },
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'wagmi-vendor': ['wagmi', '@rainbow-me/rainbowkit'],
          }
        }
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: process.env.NODE_ENV !== 'production',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
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
      esbuildOptions: {
        target: 'es2020'
      }
    },
    publicDir: 'public',
  }
}) 