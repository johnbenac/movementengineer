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

  function indexIssues(issues) {
    const map = new Map();
    (issues || []).forEach(issue => {
      const key = issueKey(issue);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(issue);
    });
    return map;
  }

  function diffValidationReports(legacyIssues = [], modelIssues = []) {
    const legacyMap = indexIssues(legacyIssues);
    const modelMap = indexIssues(modelIssues);
    const onlyLegacy = [];
    const onlyModel = [];
    const both = [];

    legacyMap.forEach((legacyList, key) => {
      const modelList = modelMap.get(key);
      if (modelList && modelList.length) {
        const legacyIssue = legacyList.shift();
        const modelIssue = modelList.shift();
        both.push({ legacy: legacyIssue, model: modelIssue });
        if (legacyList.length === 0) {
          legacyMap.delete(key);
        }
        if (modelList.length === 0) {
          modelMap.delete(key);
        }
      }
    });

    legacyMap.forEach(list => {
      onlyLegacy.push(...list);
    });
    modelMap.forEach(list => {
      onlyModel.push(...list);
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
    return `legacy=${diff.summary.legacyCount} model=${diff.summary.modelCount} ` +
      `onlyLegacy=${diff.summary.onlyLegacy} onlyModel=${diff.summary.onlyModel}`;
  }

  const ValidationDiff = {
    diffValidationReports,
    formatValidationDiff,
    issueKey
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationDiff;
  }
  if (globalScope) {
    globalScope.ValidationDiff = ValidationDiff;
  }
})();
