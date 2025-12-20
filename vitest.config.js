const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    include: ['src/app/**/*.test.js']
  }
});
