import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Custom plugin to handle routing
const customRoutingPlugin = (): Plugin => {
  return {
    name: 'custom-routing',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // Handle /ext route and sub-routes
        if (req.url === '/ext' || req.url === '/ext/' || (req.url && req.url.startsWith('/ext/'))) {
          req.url = '/index.html'
        }
        // Handle /app route and sub-routes
        else if (req.url === '/app' || req.url === '/app/' || (req.url && req.url.startsWith('/app/'))) {
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
  },
})