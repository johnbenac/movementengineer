(function () {
  'use strict';

  function createIssue(values) {
    return {
      source: values.source,
      severity: values.severity,
      code: values.code,
      collection: values.collection,
      recordId: values.recordId,
      fieldPath: values.fieldPath,
      message: values.message,
      expected: values.expected,
      actual: values.actual,
      meta: values.meta
    };
  }

  function buildSummary(issues) {
    const summary = {
      errors: 0,
      warnings: 0,
      byCode: {},
      byCollection: {}
    };

    (issues || []).forEach(issue => {
      if (!issue) return;
      if (issue.severity === 'warning') {
        summary.warnings += 1;
      } else {
        summary.errors += 1;
      }
      if (issue.code) {
        summary.byCode[issue.code] = (summary.byCode[issue.code] || 0) + 1;
      }
      if (issue.collection) {
        summary.byCollection[issue.collection] = (summary.byCollection[issue.collection] || 0) + 1;
      }
    });

    return summary;
  }

  const ValidationTypes = {
    createIssue,
    buildSummary
  };

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationTypes;
  }
  if (globalScope) {
    globalScope.ValidationTypes = ValidationTypes;
  }
})();
