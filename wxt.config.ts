import { defineConfig } from 'wxt';
import path from 'path';

export default defineConfig({
  root: '.',
  srcDir: '.',
  outDir: '.output',
  entrypointsDir: 'entrypoints',
  publicDir: 'public',

  alias: {
    '@extension': path.resolve(__dirname, './extension'),
    '@dashboard': path.resolve(__dirname, './dashboard'),
    '@common': path.resolve(__dirname, './common'),
  },

  manifest: {
    name: 'Tickets Realtime',
    description: 'Real-time ticket management system',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab'
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Tickets Realtime'
    },
    options_page: 'options.html',
  },

  vite: () => ({
    plugins: [],
    build: {
      target: 'es2020',
    },
  }),
});