(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function runShadowValidation({ snapshot, model, legacyIssues = [], options = {} }) {
    const { validateDataset } = getModelValidatorModule();
    const { diffValidationReports, formatValidationDiff } = getValidationDiffModule();

    const modelReport = validateDataset(snapshot, model, {
      model,
      maxIssues: options.maxIssues,
      mode: options.mode || 'shadow'
    });

    const diff = diffValidationReports(legacyIssues, modelReport.issues);

    if (options.log !== false) {
      const summary = formatValidationDiff(diff);
      const maxExamples = options.logExamples ?? 20;
      console.groupCollapsed(`[Model Validation Shadow] ${summary}`);
      console.log('Only legacy (top):', diff.onlyLegacy.slice(0, maxExamples));
      console.log('Only model (top):', diff.onlyModel.slice(0, maxExamples));
      console.groupEnd();
    }

    return { modelReport, diff };
  }

  function getModelValidatorModule() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./modelValidator');
    }
    return globalScope?.ModelValidator || {};
  }

  function getValidationDiffModule() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationDiff');
    }
    return globalScope?.ValidationDiff || {};
  }

  const api = {
    runShadowValidation
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ShadowValidation = api;
  }
})();
