import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const backendUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: false,
      allowedHosts: ['localhost', '127.0.0.1', '.vercel.run'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          // SECURITY: Require HTTPS in production. Only disable for localhost development.
          secure: process.env.NODE_ENV === 'production' || !backendUrl.includes('localhost'),
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          // Enable cookie forwarding between backend and frontend
          cookieDomainRewrite: {
            '*': ''
          }
        },
      },
    },
  }
})
