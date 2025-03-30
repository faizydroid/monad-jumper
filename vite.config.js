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
      cssCodeSplit: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            wagmi: ['wagmi', '@wagmi/core'],
            rainbow: ['@rainbow-me/rainbowkit'],
          },
        },
        onwarn(warning, warn) {
          if (warning.code === 'MISSING_EXPORT') return;
          warn(warning);
        }
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