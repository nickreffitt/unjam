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
    name: 'Unjam',
    description: 'Fix your code instantly',
    version: '1.0.0',
    permissions: [
      'storage',
      'activeTab',
      'scripting',
      'tabs'
    ],
    host_permissions: [
      'http://localhost/*',
      'https://unjam.nickreffitt.com/*',
      'https://lovable.dev/*',
      'https://replit.com/*',
      'https://app.base44.com/*',
      'https://bolt.new/*',
      'https://v0.app/*'
    ],
    action: {
      default_popup: 'popup.html',
      default_title: 'Unjam'
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