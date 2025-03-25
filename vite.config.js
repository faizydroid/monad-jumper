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
        '@reown/appkit': '/node_modules/@reown/appkit/dist/index.js',
        '@reown/appkit-adapter-wagmi': '/node_modules/@reown/appkit-adapter-wagmi/dist/index.js'
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
        '@reown/appkit',
        '@reown/appkit-adapter-wagmi'
      ],
      exclude: ['public/js/*'],
    },
    publicDir: 'public',
  }
}) 