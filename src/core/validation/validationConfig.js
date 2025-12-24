(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  function getEnvValue(name) {
    if (isNode() && typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    if (globalScope && Object.prototype.hasOwnProperty.call(globalScope, name)) {
      return globalScope[name];
    }
    return undefined;
  }

  function parseBoolean(value) {
    if (value === true) return true;
    if (value === false) return false;
    if (value === undefined || value === null) return false;
    const normalized = String(value).toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  function parseNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function getValidationConfig() {
    return {
      shadowEnabled: parseBoolean(getEnvValue('ME_MODEL_VALIDATION_SHADOW')),
      maxIssues: parseNumber(getEnvValue('ME_MODEL_VALIDATION_MAX_ISSUES'), 500),
      logExamples: parseNumber(getEnvValue('ME_MODEL_VALIDATION_LOG_EXAMPLES'), 20)
    };
  }

  const ValidationConfig = { getValidationConfig };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationConfig;
  }
  if (globalScope) {
    globalScope.ValidationConfig = ValidationConfig;
  }
})();
