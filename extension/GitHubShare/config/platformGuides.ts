import { type PlatformGuide } from '@common/types';

export const PLATFORM_GUIDES: PlatformGuide[] = [
  {
    platformName: 'Lovable',
    urlPattern: /^https:\/\/lovable\.dev\/projects\/([^\/\?]+)/,
    extractProjectId: (url) => {
      const match = url.match(/^https:\/\/lovable\.dev\/projects\/([^\/\?]+)/);
      return match ? match[1] : null;
    },
    slides: [
      {
        title: 'Find your GitHub repository',
        description: 'Lovable stores your code in a GitHub repository',
        steps: [
          'Click the Settings icon in the top-right corner',
          'Select "Project Settings" from the dropdown',
          'Find the "GitHub Repository" section',
          'Copy the repository URL (e.g., https://github.com/username/repo-name)'
        ]
      }
    ]
  },
  {
    platformName: 'Replit',
    urlPattern: /^https:\/\/replit\.com\/@([^\/]+)\/([^\/\?]+)/,
    extractProjectId: (url) => {
      const match = url.match(/^https:\/\/replit\.com\/@([^\/]+)\/([^\/\?]+)/);
      return match ? `${match[1]}/${match[2]}` : null;
    },
    slides: [
      {
        title: 'Connect your GitHub repository',
        description: 'Link your Replit project to GitHub',
        steps: [
          'Click on the "Version Control" icon in the left sidebar',
          'Select "Connect to GitHub"',
          'Authorize Replit to access your GitHub account',
          'Copy the repository URL shown after connection'
        ]
      }
    ]
  },
  {
    platformName: 'Base44',
    urlPattern: /^https:\/\/app\.base44\.com\/apps\/([^\/\?]+)/,
    extractProjectId: (url) => {
      const match = url.match(/^https:\/\/app\.base44\.com\/apps\/([^\/\?]+)/);
      return match ? match[1] : null;
    },
    slides: [
      {
        title: 'Locate your GitHub repository',
        description: 'Base44 projects are backed by GitHub repositories',
        steps: [
          'Open your project settings',
          'Navigate to the "Integrations" tab',
          'Find the "GitHub Repository" section',
          'Copy the repository URL displayed'
        ]
      }
    ]
  },
  {
    platformName: 'Bolt.new',
    urlPattern: /^https:\/\/bolt\.new\/~\/(sb1-[^\/\?]+)/,
    extractProjectId: (url) => {
      const match = url.match(/^https:\/\/bolt\.new\/~\/(sb1-[^\/\?]+)/);
      return match ? match[1] : null;
    },
    slides: [
      {
        title: 'Export to GitHub',
        description: 'Bolt.new can export your project to GitHub',
        steps: [
          'Click on the "Export" button in the top toolbar',
          'Select "Push to GitHub"',
          'Follow the prompts to create or select a repository',
          'Copy the repository URL after export completes'
        ]
      }
    ]
  },
  {
    platformName: 'v0.dev',
    urlPattern: /^https:\/\/v0\.app\/chat\/([^\/\?]+)/,
    extractProjectId: (url) => {
      const match = url.match(/^https:\/\/v0\.app\/chat\/([^\/\?]+)/);
      return match ? match[1] : null;
    },
    slides: [
      {
        title: 'Find your v0 project repository',
        description: 'v0.dev projects can be synced with GitHub',
        steps: [
          'Open your project dashboard',
          'Click on "Settings" in the navigation',
          'Scroll to the "GitHub Integration" section',
          'Copy the repository URL if already connected, or connect your GitHub account first'
        ]
      }
    ]
  }
];
