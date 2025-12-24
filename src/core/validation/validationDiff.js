(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function issueKey(issue) {
    const recordId = issue.recordId || '?';
    const fieldPath = issue.fieldPath || '__record__';
    return `${issue.collection}::${recordId}::${fieldPath}::${issue.code}`;
  }

  function buildIssueBuckets(issues) {
    const buckets = new Map();
    issues.forEach(issue => {
      const key = issueKey(issue);
      if (!buckets.has(key)) {
        buckets.set(key, []);
      }
      buckets.get(key).push(issue);
    });
    return buckets;
  }

  function diffValidationReports(legacyIssues, modelIssues) {
    const legacyBuckets = buildIssueBuckets(legacyIssues || []);
    const modelBuckets = buildIssueBuckets(modelIssues || []);

    const onlyLegacy = [];
    const onlyModel = [];
    const both = [];

    legacyBuckets.forEach((legacyList, key) => {
      const modelList = modelBuckets.get(key) || [];
      if (modelList.length) {
        const matchCount = Math.min(legacyList.length, modelList.length);
        for (let i = 0; i < matchCount; i += 1) {
          both.push({ legacy: legacyList[i], model: modelList[i] });
        }
        if (legacyList.length > matchCount) {
          onlyLegacy.push(...legacyList.slice(matchCount));
        }
        if (modelList.length > matchCount) {
          onlyModel.push(...modelList.slice(matchCount));
        }
        modelBuckets.delete(key);
      } else {
        onlyLegacy.push(...legacyList);
      }
    });

    modelBuckets.forEach(modelList => {
      onlyModel.push(...modelList);
    });

    return {
      onlyLegacy,
      onlyModel,
      both,
      summary: {
        legacyCount: legacyIssues ? legacyIssues.length : 0,
        modelCount: modelIssues ? modelIssues.length : 0,
        onlyLegacy: onlyLegacy.length,
        onlyModel: onlyModel.length
      }
    };
  }

  function formatValidationDiff(diff) {
    if (!diff) return '';
    return `legacy=${diff.summary.legacyCount} model=${diff.summary.modelCount} onlyLegacy=${diff.summary.onlyLegacy} onlyModel=${diff.summary.onlyModel}`;
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
