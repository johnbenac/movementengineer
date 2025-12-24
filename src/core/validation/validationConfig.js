(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function readEnvValue(key) {
    if (typeof process !== 'undefined' && process.env && Object.prototype.hasOwnProperty.call(process.env, key)) {
      return process.env[key];
    }
    if (globalScope && Object.prototype.hasOwnProperty.call(globalScope, key)) {
      return globalScope[key];
    }
    return undefined;
  }

  function readBoolean(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  function readNumber(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function getModelValidationShadowConfig() {
    return {
      enabled: readBoolean(readEnvValue('ME_MODEL_VALIDATION_SHADOW')),
      maxIssues: readNumber(readEnvValue('ME_MODEL_VALIDATION_MAX_ISSUES'), 500),
      logExamples: readNumber(readEnvValue('ME_MODEL_VALIDATION_LOG_EXAMPLES'), 20)
    };
  }

  const api = {
    getModelValidationShadowConfig
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ValidationConfig = api;
  }
})();
