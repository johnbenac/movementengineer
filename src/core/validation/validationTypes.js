(function () {
  'use strict';

  function createSummary(issues) {
    const summary = {
      errors: 0,
      warnings: 0,
      byCode: {},
      byCollection: {}
    };

    (issues || []).forEach(issue => {
      if (issue?.severity === 'warning') {
        summary.warnings += 1;
      } else {
        summary.errors += 1;
      }
      const code = issue?.code || 'UNKNOWN';
      summary.byCode[code] = (summary.byCode[code] || 0) + 1;
      const collection = issue?.collection || 'unknown';
      summary.byCollection[collection] = (summary.byCollection[collection] || 0) + 1;
    });

    return summary;
  }

  function createReport(source, issues) {
    return {
      source,
      issues: issues || [],
      summary: createSummary(issues)
    };
  }

  const ValidationTypes = {
    createSummary,
    createReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationTypes;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.validationTypes = ValidationTypes;
  }
})();
