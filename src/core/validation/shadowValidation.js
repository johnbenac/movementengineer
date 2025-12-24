(function () {
  'use strict';

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  const modelValidator = isNode()
    ? require('./modelValidator')
    : globalThis?.MovementEngineerValidation?.modelValidator;
  const validationDiff = isNode()
    ? require('./validationDiff')
    : globalThis?.MovementEngineerValidation?.validationDiff;

  function logValidationDiff(diff, options = {}) {
    if (!diff) return;
    const maxExamples = options.maxExamples ?? 20;
    const summaryText = validationDiff?.formatValidationDiff
      ? validationDiff.formatValidationDiff(diff)
      : `legacy=${diff.summary?.legacyCount ?? 0} model=${diff.summary?.modelCount ?? 0}`;

    if (typeof console === 'undefined') return;
    if (console.groupCollapsed) {
      console.groupCollapsed(`[Model Validation Shadow] ${summaryText}`);
      console.log('Only legacy (top examples):', diff.onlyLegacy.slice(0, maxExamples));
      console.log('Only model (top examples):', diff.onlyModel.slice(0, maxExamples));
      console.groupEnd();
    } else {
      console.log(`[Model Validation Shadow] ${summaryText}`);
      console.log('Only legacy (top examples):', diff.onlyLegacy.slice(0, maxExamples));
      console.log('Only model (top examples):', diff.onlyModel.slice(0, maxExamples));
    }
  }

  function runShadowValidation({ snapshot, model, legacyIssues, options = {} }) {
    if (!modelValidator?.validateDataset || !validationDiff?.diffValidationReports) {
      return { modelReport: null, diff: null };
    }
    const modelReport = modelValidator.validateDataset(snapshot, model, {
      model,
      maxIssues: options.maxIssues,
      mode: options.mode || 'shadow'
    });

    const diff = validationDiff.diffValidationReports(legacyIssues || [], modelReport.issues || []);
    logValidationDiff(diff, { maxExamples: options.maxLogExamples });

    return { modelReport, diff };
  }

  const ShadowValidation = {
    runShadowValidation,
    logValidationDiff
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShadowValidation;
  }

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;
  if (globalScope) {
    const namespace = (globalScope.MovementEngineerValidation =
      globalScope.MovementEngineerValidation || {});
    namespace.shadowValidation = ShadowValidation;
  }
})();
