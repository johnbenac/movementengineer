const path = require('path');
const { defineConfig } = require('@playwright/test');

const DEFAULT_BASE_URL = 'http://127.0.0.1:4173';
const ENTRY_PATH = process.env.ME_E2E_ENTRY || '/';

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  testMatch: /.*\.spec\.(ts|js)/,
  metadata: {
    entryPath: ENTRY_PATH
  },
  use: {
    headless: true,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL
  },
  webServer: {
    command: 'node tools/dev-server.js',
    url: process.env.PLAYWRIGHT_BASE_URL || DEFAULT_BASE_URL,
    reuseExistingServer: !process.env.CI
  }
});
