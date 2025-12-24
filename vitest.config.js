const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/unit/setup.js'],
    include: ['tests/unit/**/*.{test,spec}.js']
  }
});
