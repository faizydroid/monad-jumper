import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
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
        '@': resolve(__dirname, './src'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.css']
    },
    define: {
      'process.env': Object.entries(env).reduce((prev, [key, val]) => {
        return {
          ...prev,
          [key]: JSON.stringify(val)
        }
      }, {}),
      global: 'globalThis',
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: '[local]_[hash:base64:5]',
      },
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      cssCodeSplit: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
          drop_debugger: false,
        },
        format: {
          comments: false,
        },
      },
      target: 'esnext',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('wagmi') || id.includes('rainbow')) return 'vendor-web3';
              return 'vendor';
            }
          },
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.css')) {
              return 'assets/styles.[hash].css';
            }
            return 'assets/[name].[hash][extname]';
          },
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        },
      },
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      sourcemap: true,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@rainbow-me/rainbowkit',
        'wagmi',
        '@tanstack/react-query',
        'viem'
      ],
      esbuildOptions: {
        target: 'esnext',
      }
    },
    esbuild: {
      target: 'esnext',
      supported: {
        bigint: true
      }
    },
    publicDir: 'public',
  }
}) 