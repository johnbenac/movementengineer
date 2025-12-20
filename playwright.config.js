const path = require('path');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'e2e'),
  testMatch: /.*\.spec\.(ts|js)/,
  use: {
    headless: true,
    launchOptions: {
      args: ['--allow-file-access-from-files']
    }
  }
});
