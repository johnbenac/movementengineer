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

    const typeNameToCollectionName = {};
    Object.values(normalizedCollections).forEach(def => {
      if (def?.typeName) {
        typeNameToCollectionName[def.typeName] = def.collectionName;
      }
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
      collections: normalizedCollections,
      typeNameToCollectionName
    };

    if (collectionOrder) {
      normalized.collectionOrder = collectionOrder;
    }

    Object.freeze(normalizedCollections);
    Object.freeze(typeNameToCollectionName);
    if (normalized.collectionOrder) {
      Object.freeze(normalized.collectionOrder);
    }

    Object.defineProperty(normalized, 'getExportSchema', {
      value: collectionName => buildExportSchema(normalized, collectionName)
    });

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

  function getCollectionDef(collectionName, specVersion = DEFAULT_SPEC_VERSION) {
    return getCollection(collectionName, specVersion);
  }

  function resolveCollectionName(value, specVersion = DEFAULT_SPEC_VERSION) {
    if (!value) return null;
    const model = getModel(specVersion);
    if (model.collections[value]) return value;
    const match = Object.values(model.collections).find(
      collection => collection.collectionName === value || collection.typeName === value
    );
    return match ? match.collectionName : null;
  }

  function getCollectionNameByTypeName(typeName, specVersion = DEFAULT_SPEC_VERSION) {
    if (!typeName) return null;
    const model = getModel(specVersion);
    return model.typeNameToCollectionName?.[typeName] || null;
  }

  function getRecordLabel(collectionName, record, specVersion = DEFAULT_SPEC_VERSION) {
    if (!record) return '—';
    const collectionDef = getCollection(collectionName, specVersion);
    const titleField =
      collectionDef?.ui?.titleField ||
      collectionDef?.display?.titleField ||
      collectionDef?.ui?.displayField ||
      null;
    const subtitleField = collectionDef?.ui?.subtitleField || null;
    const title =
      (titleField && record[titleField]) ||
      record.name ||
      record.title ||
      record.label ||
      record.id ||
      '—';
    const subtitle = subtitleField && record[subtitleField] ? record[subtitleField] : null;
    return subtitle ? `${title} — ${subtitle}` : title;
  }

  // Export schema must remain behavior-identical to the legacy exporter schema.
  // Any changes here should be validated against golden export output tests.
  function buildExportSchema(model, collectionName) {
    const collection = model.collections[collectionName];
    if (!collection) return null;

    const serialization = collection.serialization || {};

    let bodyField = serialization.bodyField ?? null;
    if (!bodyField) {
      const bodyFields = Object.entries(collection.fields || {})
        .filter(([, field]) => field && field.body === true)
        .map(([name]) => name);
      if (bodyFields.length > 1) {
        throw new Error(`Multiple body fields configured for ${collectionName}`);
      }
      bodyField = bodyFields[0] || null;
    }

    const fieldDefs = collection.fields || {};
    const frontMatterFields = Array.isArray(serialization.frontMatterFields)
      ? serialization.frontMatterFields.slice()
      : Object.keys(fieldDefs).filter(fieldName => {
        if (fieldName === bodyField) return false;
        const field = fieldDefs[fieldName];
        if (field && field.export === false) return false;
        if (field && field.serialization?.omit) return false;
        return true;
      });

    return {
      collectionName: collection.collectionName || collectionName,
      frontMatterFields,
      bodyField
    };
  }

  const ModelRegistry = {
    DEFAULT_SPEC_VERSION,
    getModel,
    listCollections,
    getCollection,
    getCollectionDef,
    resolveCollectionName,
    getCollectionNameByTypeName,
    getRecordLabel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelRegistry;
  }
  if (globalScope) {
    globalScope.ModelRegistry = ModelRegistry;
  }
})();
