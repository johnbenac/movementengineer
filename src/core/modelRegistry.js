(function () {
  'use strict';

  const DEFAULT_SPEC_VERSION = '2.3';
  const ERROR_MESSAGE = 'dataModel.v2_3 must export { specVersion, collections: { … } }';

  function isPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function normaliseModel(model) {
    if (!model || typeof model.specVersion !== 'string' || !isPlainObject(model.collections)) {
      throw new Error(ERROR_MESSAGE);
    }

    const collectionOrder = Array.isArray(model.collectionOrder)
      ? [...model.collectionOrder]
      : Array.isArray(model.collectionsOrder)
        ? [...model.collectionsOrder]
        : null;

    const collections = {};
    Object.keys(model.collections).forEach(key => {
      const definition = model.collections[key] || {};
      const collectionName = definition.collectionName || key;
      collections[key] = { ...definition, collectionName };
    });

    const normalised = {
      specVersion: model.specVersion,
      enums: model.enums,
      notes: model.notes,
      normalization: model.normalization,
      collections: Object.freeze(collections),
      collectionOrder: collectionOrder || undefined
    };

    return Object.freeze(normalised);
  }

  const model_v2_3 =
    typeof module !== 'undefined' && module.exports
      ? require('../models/dataModel.v2_3.js')
      : globalThis.DATA_MODEL_V2_3;

  if (!model_v2_3) {
    throw new Error(ERROR_MESSAGE);
  }
  const normalisedModels = new Map();
  normalisedModels.set('2.3', normaliseModel(model_v2_3));

  function getModel(specVersion = DEFAULT_SPEC_VERSION) {
    const resolved = specVersion || DEFAULT_SPEC_VERSION;
    const model = normalisedModels.get(resolved);
    if (!model) {
      throw new Error(`Unsupported specVersion: ${resolved}`);
    }
    return model;
  }

  function listCollections(specVersion = DEFAULT_SPEC_VERSION) {
    const model = getModel(specVersion);
    if (Array.isArray(model.collectionOrder)) {
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

  if (typeof globalThis !== 'undefined') {
    globalThis.ModelRegistry = api;
  }
})();
