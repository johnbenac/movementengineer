const path = require('path');
const { defineConfig } = require('@playwright/test');

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  testMatch: /.*\.spec\.(ts|js)/,
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL
  },
  webServer: {
    command: 'node scripts/dev-server.js',
    url: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,
    reuseExistingServer: !process.env.CI
  }
});
