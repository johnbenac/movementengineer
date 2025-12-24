(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  function getModelValidator() {
    if (isNode()) {
      return require('./modelValidator');
    }
    return globalScope?.ModelValidator || null;
  }

  function getValidationDiff() {
    if (isNode()) {
      return require('./validationDiff');
    }
    return globalScope?.ValidationDiff || null;
  }

  function logValidationDiff(diff, options = {}) {
    const maxExamples = Number.isFinite(options.maxExamples) ? options.maxExamples : 20;
    const summaryText =
      `legacy=${diff.summary.legacyCount} model=${diff.summary.modelCount} ` +
      `onlyLegacy=${diff.summary.onlyLegacy} onlyModel=${diff.summary.onlyModel}`;

    if (typeof console === 'undefined') return;
    if (console.groupCollapsed) {
      console.groupCollapsed(`[Model Validation Shadow] ${summaryText}`);
    } else {
      console.log(`[Model Validation Shadow] ${summaryText}`);
    }
    console.log('Only legacy (top examples):', diff.onlyLegacy.slice(0, maxExamples));
    console.log('Only model (top examples):', diff.onlyModel.slice(0, maxExamples));
    if (console.groupEnd) {
      console.groupEnd();
    }
  }

  function runShadowValidation({ snapshot, model, legacyIssues, options = {} }) {
    const modelValidator = getModelValidator();
    const diffModule = getValidationDiff();
    if (!modelValidator?.validateDataset || !diffModule?.diffValidationReports) {
      return null;
    }

    const modelReport = modelValidator.validateDataset(snapshot, model, {
      model,
      maxIssues: options.maxIssues,
      mode: 'shadow'
    });

    const diff = diffModule.diffValidationReports(legacyIssues || [], modelReport.issues || []);
    logValidationDiff(diff, { maxExamples: options.logExamples });

    return { modelReport, diff };
  }

  const ShadowValidation = { runShadowValidation, logValidationDiff };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShadowValidation;
  }
  if (globalScope) {
    globalScope.ShadowValidation = ShadowValidation;
  }
})();
