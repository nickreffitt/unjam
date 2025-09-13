import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './dashboard',
  build: {
    outDir: '../dist/dashboard'
  },
  server: {
    port: 5174, // Different port from extension
    historyApiFallback: true, // Enable history API fallback for React Router
  },
  resolve: {
    alias: {
      '@dashboard': path.resolve(__dirname, './dashboard'),
      '@common': path.resolve(__dirname, './common'),
    },
  },
})