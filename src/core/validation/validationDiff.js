(function () {
  'use strict';

  function getIssueKey(issue) {
    const collection = issue?.collection || 'unknown';
    const recordId = issue?.recordId || '?';
    const fieldPath = issue?.fieldPath || '__record__';
    const code = issue?.code || 'UNKNOWN';
    return `${collection}::${recordId}::${fieldPath}::${code}`;
  }

  function diffValidationReports(legacyIssues, modelIssues) {
    const legacyList = Array.isArray(legacyIssues) ? legacyIssues : [];
    const modelList = Array.isArray(modelIssues) ? modelIssues : [];
    const legacyMap = new Map();

    legacyList.forEach(issue => {
      legacyMap.set(getIssueKey(issue), issue);
    });

    const onlyModel = [];
    const both = [];

    modelList.forEach(issue => {
      const key = getIssueKey(issue);
      if (legacyMap.has(key)) {
        both.push({ legacy: legacyMap.get(key), model: issue });
        legacyMap.delete(key);
      } else {
        onlyModel.push(issue);
      }
    });

    const onlyLegacy = Array.from(legacyMap.values());

    return {
      onlyLegacy,
      onlyModel,
      both,
      summary: {
        legacyCount: legacyList.length,
        modelCount: modelList.length,
        onlyLegacy: onlyLegacy.length,
        onlyModel: onlyModel.length
      }
    };
  }

  function formatValidationDiff(diff) {
    if (!diff) return '';
    const { summary } = diff;
    return `legacy=${summary.legacyCount} model=${summary.modelCount} onlyLegacy=${summary.onlyLegacy} onlyModel=${summary.onlyModel}`;
  }

  const ValidationDiff = {
    getIssueKey,
    diffValidationReports,
    formatValidationDiff
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationDiff;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.validationDiff = ValidationDiff;
  }
})();
