(function () {
  'use strict';

  function normaliseArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function toMessage(value) {
    if (typeof value === 'string') return value;
    if (value && typeof value.message === 'string') return value.message;
    return 'Legacy validation error.';
  }

  function normalizeLegacyIssues(legacyErrors) {
    const items = normaliseArray(legacyErrors);
    return items.map(item => {
      const isString = typeof item === 'string';
      const collection = !isString && item.collection ? item.collection : 'unknown';
      const recordId = !isString && (item.recordId || item.id) ? item.recordId || item.id : undefined;
      const fieldPath = !isString && (item.field || item.fieldPath) ? item.field || item.fieldPath : undefined;
      const code = !isString && item.code ? item.code : 'LEGACY_ERROR';
      const message = toMessage(item);

      return {
        source: 'legacy',
        severity: 'error',
        code,
        collection,
        recordId,
        fieldPath,
        message,
        expected: !isString ? item.expected : undefined,
        actual: !isString ? item.actual : undefined,
        meta: !isString && item.meta ? item.meta : undefined
      };
    });
  }

  const LegacyAdapter = {
    normalizeLegacyIssues
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegacyAdapter;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.legacyAdapter = LegacyAdapter;
  }
})();
