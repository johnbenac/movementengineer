(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  const model_v2_3 = (() => {
    if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
      return require('../models/dataModel.v2_3.js');
    }
    return globalScope?.DATA_MODEL_V2_3 || null;
  })();

  function assertValidModel(model) {
    if (!model || typeof model !== 'object' || Array.isArray(model)) {
      throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
    }
    if (typeof model.specVersion !== 'string' || !model.specVersion) {
      throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
    }
    if (!model.collections || typeof model.collections !== 'object' || Array.isArray(model.collections)) {
      throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
    }
    Object.entries(model.collections).forEach(([, def]) => {
      if (!def || typeof def !== 'object' || Array.isArray(def)) {
        throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
      }
      if (!def.fields || typeof def.fields !== 'object' || Array.isArray(def.fields)) {
        throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
      }
    });
  }

  function normalizeModel(model) {
    assertValidModel(model);
    const normalizedCollections = {};
    Object.entries(model.collections).forEach(([key, def]) => {
      const collectionName = def.collectionName || key;
      normalizedCollections[collectionName] = {
        ...def,
        collectionName
      };
    });

    const collectionOrder = Array.isArray(model.collectionOrder)
      ? model.collectionOrder.slice()
      : Array.isArray(model.collectionsOrder)
        ? model.collectionsOrder.slice()
        : null;

    const normalized = {
      ...model,
      specVersion: model.specVersion,
      enums: model.enums || {},
      collections: normalizedCollections
    };

    if (collectionOrder) {
      normalized.collectionOrder = collectionOrder;
    }

    Object.freeze(normalizedCollections);
    if (normalized.collectionOrder) {
      Object.freeze(normalized.collectionOrder);
    }
    return Object.freeze(normalized);
  }

  const DEFAULT_SPEC_VERSION = '2.3';

  const MODEL_MAP = {
    '2.3': normalizeModel(model_v2_3)
  };

  function getModel(specVersion = DEFAULT_SPEC_VERSION) {
    const key = specVersion || DEFAULT_SPEC_VERSION;
    const model = MODEL_MAP[key];
    if (!model) {
      throw new Error(`Unsupported specVersion: ${specVersion}`);
    }
    return model;
  }

  function listCollections(specVersion = DEFAULT_SPEC_VERSION) {
    const model = getModel(specVersion);
    if (Array.isArray(model.collectionOrder)) {
      return model.collectionOrder.slice();
    }
    return Object.keys(model.collections).sort();
  }

  function getCollection(collectionName, specVersion = DEFAULT_SPEC_VERSION) {
    const model = getModel(specVersion);
    return model.collections[collectionName] || null;
  }

  const ModelRegistry = {
    DEFAULT_SPEC_VERSION,
    getModel,
    listCollections,
    getCollection
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelRegistry;
  }
  if (globalScope) {
    globalScope.ModelRegistry = ModelRegistry;
  }
})();
