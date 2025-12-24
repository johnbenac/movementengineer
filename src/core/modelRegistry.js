/* modelRegistry.js
 *
 * Canonical data model registry for Movement Engineer.
 */

'use strict';

const DEFAULT_SPEC_VERSION = '2.3';

function loadModelV2_3() {
  let model = null;
  if (typeof require === 'function') {
    model = require('../models/dataModel.v2_3.js');
  } else if (typeof globalThis !== 'undefined') {
    model = globalThis.DATA_MODEL_V2_3 || null;
  }
  return model;
}

function assertModelShape(model) {
  if (
    !model ||
    typeof model.specVersion !== 'string' ||
    !model.collections ||
    typeof model.collections !== 'object' ||
    Array.isArray(model.collections)
  ) {
    throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
  }
}

function normalizeModel(model) {
  assertModelShape(model);
  const collections = {};
  Object.entries(model.collections).forEach(([key, def]) => {
    if (!def || typeof def !== 'object' || Array.isArray(def) || !def.fields || typeof def.fields !== 'object') {
      throw new Error('dataModel.v2_3 must export { specVersion, collections: { … } }');
    }
    collections[key] = {
      ...(def || {}),
      collectionName: def?.collectionName || key
    };
  });

  const normalized = {
    specVersion: model.specVersion,
    enums: model.enums || undefined,
    collections,
    collectionOrder: model.collectionOrder || model.collectionsOrder || undefined
  };

  Object.freeze(normalized.collections);
  Object.freeze(normalized);

  return normalized;
}

const modelV2_3 = normalizeModel(loadModelV2_3());
const modelsByVersion = new Map([[modelV2_3.specVersion, modelV2_3]]);

function getModel(specVersion = DEFAULT_SPEC_VERSION) {
  const version = specVersion || DEFAULT_SPEC_VERSION;
  const model = modelsByVersion.get(version);
  if (!model) {
    throw new Error(`Unsupported specVersion: ${version}`);
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
