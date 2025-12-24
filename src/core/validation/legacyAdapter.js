(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getValidationTypes() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  const validationTypes = getValidationTypes();

  function normalizeLegacyIssues(legacyIssues) {
    if (!legacyIssues) return [];
    if (Array.isArray(legacyIssues)) {
      return legacyIssues.map(issue => {
        if (issue && issue.source === 'legacy') return issue;
        if (issue && typeof issue === 'object') {
          return validationTypes.createIssue({
            source: 'legacy',
            severity: issue.severity || 'error',
            code: issue.code || 'LEGACY_ERROR',
            collection: issue.collection,
            recordId: issue.recordId || issue.id,
            fieldPath: issue.fieldPath || issue.field,
            message: issue.message || String(issue)
          });
        }
        return validationTypes.createIssue({
          source: 'legacy',
          severity: 'error',
          code: 'LEGACY_ERROR',
          collection: 'unknown',
          message: String(issue)
        });
      });
    }

    if (legacyIssues instanceof Error) {
      return [
        validationTypes.createIssue({
          source: 'legacy',
          severity: 'error',
          code: 'LEGACY_ERROR',
          collection: 'unknown',
          message: legacyIssues.message
        })
      ];
    }

    if (typeof legacyIssues === 'string') {
      return [
        validationTypes.createIssue({
          source: 'legacy',
          severity: 'error',
          code: 'LEGACY_ERROR',
          collection: 'unknown',
          message: legacyIssues
        })
      ];
    }

    return [];
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
