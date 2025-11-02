import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom plugin to handle routing
const customRoutingPlugin = (): Plugin => {
  return {
    name: 'custom-routing',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Handle /new-ticket route for customer support page
        if (req.url === '/new-ticket' || req.url === '/new-ticket/' || (req.url && req.url.startsWith('/new-ticket/'))) {
          req.url = '/index.html'
        }
        // Keep /ext for backward compatibility
        else if (req.url === '/ext' || req.url === '/ext/' || (req.url && req.url.startsWith('/ext/'))) {
          req.url = '/index.html'
        }
        // Handle root / and all dashboard routes
        else if (req.url === '/' || req.url?.startsWith('/new') || req.url?.startsWith('/active') ||
                 req.url?.startsWith('/completed') || req.url?.startsWith('/settings') ||
                 req.url?.startsWith('/auth') || req.url?.startsWith('/onboarding') ||
                 req.url?.startsWith('/buy') || req.url?.startsWith('/github')) {
          req.url = '/dashboard.html'
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), customRoutingPlugin()],
  root: './',
  build: {
    rollupOptions: {
      input: {
        extension: path.resolve(__dirname, 'index.html'),
        dashboard: path.resolve(__dirname, 'dashboard.html'),
      },
    },
    outDir: 'dist'
  },
  server: {
    port: 5175,
    host: true, // Listen on all addresses, including network
  },
  resolve: {
    alias: {
      '@extension': path.resolve(__dirname, './extension'),
      '@dashboard': path.resolve(__dirname, './dashboard'),
      '@common': path.resolve(__dirname, './common'),
    },
    dedupe: ['react', 'react-dom'],
  },
})