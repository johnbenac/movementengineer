(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  function getValidationTypes() {
    if (isNode()) {
      return require('./validationTypes');
    }
    return globalScope?.ValidationTypes || null;
  }

  const { Severity, Source } = getValidationTypes() || {
    Severity: { ERROR: 'error', WARNING: 'warning' },
    Source: { LEGACY: 'legacy', MODEL: 'model' }
  };

  function normalizeEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
      return {
        source: Source.LEGACY,
        severity: Severity.ERROR,
        code: 'LEGACY_ERROR',
        message: entry
      };
    }
    if (entry instanceof Error) {
      return {
        source: Source.LEGACY,
        severity: Severity.ERROR,
        code: 'LEGACY_ERROR',
        message: entry.message || String(entry)
      };
    }
    if (typeof entry === 'object') {
      return {
        source: Source.LEGACY,
        severity: entry.severity || Severity.ERROR,
        code: entry.code || 'LEGACY_ERROR',
        collection: entry.collection || entry.collectionName,
        recordId: entry.recordId || entry.id,
        fieldPath: entry.fieldPath || entry.field,
        message: entry.message || 'Legacy validation issue.',
        expected: entry.expected,
        actual: entry.actual,
        meta: entry.meta
      };
    }
    return {
      source: Source.LEGACY,
      severity: Severity.ERROR,
      code: 'LEGACY_ERROR',
      message: String(entry)
    };
  }

  function normalizeLegacyIssues(legacyErrors) {
    if (!legacyErrors) return [];
    if (!Array.isArray(legacyErrors)) {
      const normalized = normalizeEntry(legacyErrors);
      return normalized ? [normalized] : [];
    }
    return legacyErrors
      .map(entry => normalizeEntry(entry))
      .filter(Boolean);
  }

  const LegacyValidationAdapter = { normalizeLegacyIssues };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacyValidationAdapter;
  }
  if (globalScope) {
    globalScope.LegacyValidationAdapter = LegacyValidationAdapter;
  }
})();
