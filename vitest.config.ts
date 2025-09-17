import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@extension': path.resolve(__dirname, './extension'),
      '@common': path.resolve(__dirname, './common'),
      '@dashboard': path.resolve(__dirname, './dashboard'),
    },
  },
})