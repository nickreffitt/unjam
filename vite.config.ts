import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './extension',
  build: {
    outDir: '../dist/extension'
  },
  resolve: {
    alias: {
      '@extension': path.resolve(__dirname, './extension'),
      '@common': path.resolve(__dirname, './common'),
    },
  },
})