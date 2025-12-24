(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function buildSummary(issues) {
    return issues.reduce(
      (summary, issue) => {
        if (issue.severity === 'warning') {
          summary.warnings += 1;
        } else {
          summary.errors += 1;
        }
        summary.byCode[issue.code] = (summary.byCode[issue.code] || 0) + 1;
        summary.byCollection[issue.collection] = (summary.byCollection[issue.collection] || 0) + 1;
        return summary;
      },
      {
        errors: 0,
        warnings: 0,
        byCode: {},
        byCollection: {}
      }
    );
  }

  function createValidationReport(source, issues) {
    return {
      source,
      issues,
      summary: buildSummary(issues)
    };
  }

  const api = {
    buildSummary,
    createValidationReport
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ValidationTypes = api;
  }
})();
