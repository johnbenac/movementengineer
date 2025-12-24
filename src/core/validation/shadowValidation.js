(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function getModelValidator() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./modelValidator');
    }
    return globalScope?.ModelValidator || null;
  }

  function getValidationDiff() {
    if (typeof module !== 'undefined' && module.exports) {
      return require('./validationDiff');
    }
    return globalScope?.ValidationDiff || null;
  }

  const modelValidator = getModelValidator();
  const validationDiff = getValidationDiff();

  function logValidationDiff(diff, options = {}) {
    if (!diff || !validationDiff) return;
    const maxExamples = Number.isFinite(options.maxExamples) ? options.maxExamples : 20;
    const header = validationDiff.formatValidationDiff(diff);
    if (typeof console === 'undefined' || !console.groupCollapsed) return;

    console.groupCollapsed(header);
    if (diff.onlyLegacy.length) {
      console.log('Only legacy (top):', diff.onlyLegacy.slice(0, maxExamples));
    }
    if (diff.onlyModel.length) {
      console.log('Only model (top):', diff.onlyModel.slice(0, maxExamples));
    }
    console.groupEnd();
  }

  function runShadowValidation({ snapshot, model, legacyIssues, options = {} }) {
    if (!modelValidator || !validationDiff) return { modelReport: null, diff: null };
    const modelReport = modelValidator.validateDataset(snapshot, model, {
      model,
      maxIssues: options.maxIssues,
      mode: options.mode || 'shadow'
    });
    const diff = validationDiff.diffValidationReports(legacyIssues || [], modelReport.issues || []);

    if (options.logExamples !== false) {
      logValidationDiff(diff, { maxExamples: options.logExamples });
    }

    return { modelReport, diff };
  }

  const api = {
    runShadowValidation,
    logValidationDiff
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.ShadowValidation = api;
  }
})();
