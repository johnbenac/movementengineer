/* modelRegistry.js
 *
 * Central registry for data model definitions.
 */

(function () {
  'use strict';

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;

  function isNode() {
    return typeof module !== 'undefined' && !!module.exports;
  }

  const DEFAULT_SPEC_VERSION = '2.3';

  const model_v2_3 = isNode()
    ? require('../models/dataModel.v2_3.js')
    : globalScope.DATA_MODEL_V2_3;

  function assertValidModel(model) {
    if (
      !model ||
      typeof model !== 'object' ||
      typeof model.specVersion !== 'string' ||
      !model.collections ||
      typeof model.collections !== 'object' ||
      Array.isArray(model.collections)
    ) {
      throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
    }
  }

  function normalizeModel(rawModel) {
    assertValidModel(rawModel);
    const collections = {};
    Object.entries(rawModel.collections).forEach(([key, def]) => {
      const normalizedDef = def && typeof def === 'object' ? { ...def } : {};
      if (!normalizedDef.collectionName) normalizedDef.collectionName = key;
      if (!normalizedDef.fields) normalizedDef.fields = {};
      collections[key] = normalizedDef;
    });
    const normalized = {
      specVersion: rawModel.specVersion,
      enums: rawModel.enums,
      collections,
      collectionOrder: rawModel.collectionOrder || rawModel.collectionsOrder || null
    };
    Object.freeze(collections);
    Object.freeze(normalized);
    return normalized;
  }

  const MODELS = {
    [DEFAULT_SPEC_VERSION]: normalizeModel(model_v2_3?.default || model_v2_3)
  };

  function getModel(specVersion = DEFAULT_SPEC_VERSION) {
    const model = MODELS[specVersion];
    if (!model) {
      throw new Error(`Unsupported spec version: ${specVersion}`);
    }
    return model;
  }

  function listCollections(specVersion = DEFAULT_SPEC_VERSION) {
    const model = getModel(specVersion);
    if (Array.isArray(model.collectionOrder) && model.collectionOrder.length > 0) {
      return [...model.collectionOrder];
    }
    return Object.keys(model.collections).sort();
  }

  function getCollection(collectionName, specVersion = DEFAULT_SPEC_VERSION) {
    const model = getModel(specVersion);
    return model.collections[collectionName] || null;
  }

  const api = {
    DEFAULT_SPEC_VERSION,
    getModel,
    listCollections,
    getCollection
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.ModelRegistry = api;
  }
})();
