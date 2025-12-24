(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function issueKey(issue) {
    const collection = issue?.collection || 'unknown';
    const recordId = issue?.recordId || '?';
    const fieldPath = issue?.fieldPath || '__record__';
    const code = issue?.code || 'UNKNOWN';
    return `${collection}::${recordId}::${fieldPath}::${code}`;
  }

  function diffValidationReports(legacyIssues = [], modelIssues = []) {
    const legacyMap = new Map();
    legacyIssues.forEach(issue => legacyMap.set(issueKey(issue), issue));
    const modelMap = new Map();
    modelIssues.forEach(issue => modelMap.set(issueKey(issue), issue));

    const onlyLegacy = [];
    const onlyModel = [];
    const both = [];

    legacyMap.forEach((issue, key) => {
      if (modelMap.has(key)) {
        both.push({ legacy: issue, model: modelMap.get(key) });
      } else {
        onlyLegacy.push(issue);
      }
    });

    modelMap.forEach((issue, key) => {
      if (!legacyMap.has(key)) {
        onlyModel.push(issue);
      }
    });

    return {
      onlyLegacy,
      onlyModel,
      both,
      summary: {
        legacyCount: legacyIssues.length,
        modelCount: modelIssues.length,
        onlyLegacy: onlyLegacy.length,
        onlyModel: onlyModel.length
      }
    };
  }

  function formatValidationDiff(diff) {
    if (!diff) return '';
    return (
      `[Model Validation Shadow] legacy=${diff.summary.legacyCount} ` +
      `model=${diff.summary.modelCount} onlyLegacy=${diff.summary.onlyLegacy} ` +
      `onlyModel=${diff.summary.onlyModel}`
    );
  }

  const api = {
    diffValidationReports,
    formatValidationDiff,
    issueKey
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ValidationDiff = api;
  }
})();
