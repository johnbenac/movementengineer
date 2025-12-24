(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function normalizeLegacyIssues(legacyErrors) {
    if (!legacyErrors) return [];
    const list = Array.isArray(legacyErrors) ? legacyErrors : [legacyErrors];
    return list.map(error => {
      if (typeof error === 'string') {
        return {
          source: 'legacy',
          severity: 'error',
          code: 'LEGACY_ERROR',
          collection: 'unknown',
          message: error
        };
      }
      if (error instanceof Error) {
        return {
          source: 'legacy',
          severity: 'error',
          code: 'LEGACY_ERROR',
          collection: 'unknown',
          message: error.message || String(error)
        };
      }
      const collection = error.collection || error.collectionName || 'unknown';
      const recordId = error.recordId || error.id;
      const fieldPath = error.fieldPath || error.field || error.path;
      return {
        source: 'legacy',
        severity: error.severity || 'error',
        code: error.code || 'LEGACY_ERROR',
        collection,
        recordId,
        fieldPath,
        message: error.message || String(error)
      };
    });
  }

  const api = {
    normalizeLegacyIssues
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.LegacyValidationAdapter = api;
  }
})();
