(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function readEnvValue(name) {
    if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
      return process.env[name];
    }
    if (globalScope && globalScope[name] !== undefined) {
      return globalScope[name];
    }
    return undefined;
  }

  function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value !== 'string') return false;
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  function parseNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function getValidationSettings() {
    const shadowEnabled = parseBoolean(readEnvValue('ME_MODEL_VALIDATION_SHADOW'));
    const maxIssues = parseNumber(readEnvValue('ME_MODEL_VALIDATION_MAX_ISSUES'), 500);
    const logExamples = parseNumber(readEnvValue('ME_MODEL_VALIDATION_LOG_EXAMPLES'), 20);

    return {
      shadowEnabled,
      maxIssues,
      logExamples
    };
  }

  const api = {
    getValidationSettings
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ValidationConfig = api;
  }
})();
