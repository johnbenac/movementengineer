(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  const ValidationTypes = {
    Severity: {
      ERROR: 'error',
      WARNING: 'warning'
    },
    Source: {
      LEGACY: 'legacy',
      MODEL: 'model'
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationTypes;
  }
  if (globalScope) {
    globalScope.ValidationTypes = ValidationTypes;
  }
})();
