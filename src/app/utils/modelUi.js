import { getCollectionDoc, getModelForSnapshot } from '../ui/schemaDoc.js';

const LEGACY_PREVIEW_FIELDS = {
  entities: [
    { label: 'Kind', key: 'kind' },
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Summary', key: 'summary', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  practices: [
    { label: 'Kind', key: 'kind' },
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Frequency', key: 'frequency' },
    { label: 'Public', key: 'isPublic', type: 'boolean' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Involved entities', key: 'involvedEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Instructions texts', key: 'instructionsTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  events: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Recurrence', key: 'recurrence' },
    { label: 'Timing rule', key: 'timingRule' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Main practices', key: 'mainPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Readings', key: 'readingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' }
  ],
  rules: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'Details', key: 'details', type: 'paragraph' },
    { label: 'Applies to', key: 'appliesTo', type: 'chips', facet: 'appliesTo', scope: 'rules' },
    { label: 'Domain', key: 'domain', type: 'chips', facet: 'domain', scope: 'rules' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Supporting texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
    { label: 'Related practices', key: 'relatedPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' }
  ],
  claims: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Category', key: 'category' },
    { label: 'Text', key: 'text', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag', scope: 'claims' },
    { label: 'About entities', key: 'aboutEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Source texts', key: 'sourceTextIds', type: 'idList', ref: 'texts' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  textCollections: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Root texts', key: 'rootTextIds', type: 'idList', ref: 'texts' }
  ],
  texts: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Label', key: 'label' },
    { label: 'Parent text', key: 'parentId', type: 'id', ref: 'texts' },
    { label: 'Content', key: 'content', type: 'paragraph' },
    { label: 'Main function', key: 'mainFunction' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Mentions entities', key: 'mentionsEntityIds', type: 'idList', ref: 'entities' }
  ],
  media: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'URI', key: 'uri', type: 'link' },
    { label: 'Title', key: 'title' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Linked entities', key: 'linkedEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Linked practices', key: 'linkedPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Linked events', key: 'linkedEventIds', type: 'idList', ref: 'events' },
    { label: 'Linked texts', key: 'linkedTextIds', type: 'idList', ref: 'texts' }
  ],
  notes: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Target type', key: 'targetType' },
    { label: 'Target', key: 'targetId' },
    { label: 'Author', key: 'author' },
    { label: 'Context', key: 'context', type: 'paragraph' },
    { label: 'Body', key: 'body', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' }
  ]
};

const warnedLegacyPreview = new Set();
const warnedLegacySchema = new Set();

const SYSTEM_FIELDS = new Set(['id', '_id', 'createdAt', 'updatedAt', 'movementId']);
const LONG_TEXT_FIELDS = new Set(['content', 'body', 'markdown', 'details']);
const STRING_FIELD_PREFERENCES = ['name', 'title', 'label', 'summary'];

function getState(ctx) {
  return ctx?.store?.getState?.() || ctx?.getState?.() || {};
}

function getModel(ctx) {
  const snapshot = getState(ctx)?.snapshot || null;
  return getModelForSnapshot(snapshot);
}

function getCollection(ctx, collectionName) {
  const model = getModel(ctx);
  return model?.collections?.[collectionName] || null;
}

function getFieldOrder(collection) {
  const uiOrder = collection?.ui?.fieldOrder;
  if (Array.isArray(uiOrder) && uiOrder.length) return uiOrder.slice();
  const frontMatter = collection?.serialization?.frontMatterFields || [];
  const bodyField = collection?.serialization?.bodyField || null;
  const fieldsInOrder = frontMatter.slice();
  if (bodyField && !fieldsInOrder.includes(bodyField)) fieldsInOrder.push(bodyField);
  if (fieldsInOrder.length) return fieldsInOrder;
  return Object.keys(collection?.fields || {}).sort();
}

function resolveDisplayField(collection, key) {
  return (
    collection?.ui?.[key] ||
    collection?.display?.[key] ||
    (key === 'titleField' ? collection?.ui?.displayField : null) ||
    null
  );
}

function isReasonableStringField(fieldName, fieldDef) {
  if (!fieldDef) return false;
  if (fieldDef.type !== 'string') return false;
  return STRING_FIELD_PREFERENCES.includes(fieldName);
}

function derivePreviewFieldsFromModel(collection) {
  if (!collection) return [];
  const fields = collection.fields || {};
  const orderedFields = getFieldOrder(collection);
  const resolvedTitle = resolveDisplayField(collection, 'titleField');
  const resolvedSubtitle = resolveDisplayField(collection, 'subtitleField');

  const selected = [];
  const addField = fieldName => {
    if (!fieldName || !fields[fieldName] || selected.includes(fieldName)) return;
    selected.push(fieldName);
  };

  if (resolvedTitle) {
    addField(resolvedTitle);
  } else {
    const fallbackTitle = STRING_FIELD_PREFERENCES.find(name => isReasonableStringField(name, fields[name]));
    addField(fallbackTitle);
  }

  if (resolvedSubtitle) {
    addField(resolvedSubtitle);
  }

  const candidates = orderedFields.filter(name => !selected.includes(name));
  const extras = [];
  candidates.forEach(name => {
    if (extras.length >= 3) return;
    if (SYSTEM_FIELDS.has(name)) return;
    const fieldDef = fields[name];
    if (!fieldDef) return;
    if (LONG_TEXT_FIELDS.has(name)) return;
    if (fieldDef.type === 'array') {
      const itemsType = fieldDef.items?.type || null;
      if (!itemsType) return;
      if (itemsType !== 'string' && !fieldDef.items?.enum) return;
      if (!/tag/i.test(name) && !fieldDef.items?.enum) return;
      extras.push(name);
      return;
    }
    if (fieldDef.type === 'object') return;
    extras.push(name);
  });

  return selected.concat(extras);
}

function formatLabel(fieldName) {
  if (!fieldName) return '';
  const withSpaces = fieldName
    .replace(/Ids$/u, ' IDs')
    .replace(/Id$/u, ' ID')
    .replace(/([a-z])([A-Z])/gu, '$1 $2');
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function resolvePreviewType(fieldName, fieldDef) {
  if (!fieldDef) return null;
  if (fieldName === 'uri' || fieldName === 'url') return 'link';
  if (fieldDef.ui?.widget === 'markdown') return 'paragraph';
  if (fieldDef.type === 'boolean') return 'boolean';
  if (fieldDef.type === 'array') {
    if (fieldDef.items?.ref) return 'idList';
    return 'chips';
  }
  if (fieldDef.ref) return 'id';
  if (fieldDef.type === 'string' && LONG_TEXT_FIELDS.has(fieldName)) return 'paragraph';
  return null;
}

function resolveFacetConfig(collectionName, fieldName) {
  if (fieldName === 'tags') {
    return collectionName === 'claims'
      ? { facet: 'tag', scope: 'claims' }
      : { facet: 'tag' };
  }
  if (fieldName === 'sourcesOfTruth') return { facet: 'sourceOfTruth' };
  if (collectionName === 'rules' && fieldName === 'appliesTo') {
    return { facet: 'appliesTo', scope: 'rules' };
  }
  if (collectionName === 'rules' && fieldName === 'domain') {
    return { facet: 'domain', scope: 'rules' };
  }
  return null;
}

function buildPreviewFieldConfig(collectionName, collection, fieldName) {
  const fieldDef = collection?.fields?.[fieldName] || null;
  const type = resolvePreviewType(fieldName, fieldDef);
  const ref = fieldDef?.ref || fieldDef?.items?.ref || null;
  const facet = resolveFacetConfig(collectionName, fieldName);
  return {
    label: formatLabel(fieldName),
    key: fieldName,
    ...(type ? { type } : {}),
    ...(ref ? { ref } : {}),
    ...(facet || {})
  };
}

function resolvePreviewFieldNames(collection) {
  const previewFields = collection?.ui?.previewFields;
  if (Array.isArray(previewFields) && previewFields.length) return previewFields.slice();
  return derivePreviewFieldsFromModel(collection);
}

function warnLegacyPreview(collectionName) {
  if (warnedLegacyPreview.has(collectionName)) return;
  warnedLegacyPreview.add(collectionName);
  console.warn(
    `[model-ui] Using legacy PREVIEW_FIELDS fallback for collection "${collectionName}". Add ui.previewFields to the model.`
  );
}

function warnLegacySchema(collectionName) {
  if (warnedLegacySchema.has(collectionName)) return;
  warnedLegacySchema.add(collectionName);
  console.warn(
    `[model-ui] Using legacy schema guide for "${collectionName}". Add field definitions to the model.`
  );
}

function inferTargetCollectionFromField(field) {
  if (!field) return null;
  if (field === 'parentId') return 'texts';
  if (/TextIds$/.test(field) || field === 'rootTextIds') return 'texts';
  if (/EntityIds$/.test(field)) return 'entities';
  if (/PracticeIds$/.test(field)) return 'practices';
  if (/ClaimIds$/.test(field)) return 'claims';
  if (/EventIds$/.test(field)) return 'events';
  return null;
}

function dedupeRefFields(fields) {
  const seen = new Set();
  return (fields || [])
    .filter(f => f.field && f.target)
    .filter(f => {
      const key = `${f.field}:${f.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function deriveLegacySchemaGuide(ctx, collectionName, movementId) {
  const DomainService = ctx?.services?.DomainService;
  const loader = ctx?.services?.MarkdownDatasetLoader || window.MarkdownDatasetLoader || null;

  let skeleton = {};
  try {
    skeleton = DomainService?.createSkeletonItem
      ? DomainService.createSkeletonItem(collectionName, movementId || 'mov-placeholder')
      : {};
  } catch {
    skeleton = {};
  }

  const expectedKeys = new Set(Object.keys(skeleton || {}));

  (LEGACY_PREVIEW_FIELDS[collectionName] || []).forEach(f => expectedKeys.add(f.key));

  const collectionsWithMovementId =
    DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || new Set();

  const requiredKeys = new Set(['id']);
  if (collectionsWithMovementId.has(collectionName)) requiredKeys.add('movementId');

  const labelCandidates = ['name', 'title', 'shortText', 'text'];
  const labelKey = labelCandidates.find(k => expectedKeys.has(k));
  if (collectionName === 'movements') requiredKeys.add('name');
  else if (collectionName === 'notes') {
    requiredKeys.add('targetType');
    requiredKeys.add('targetId');
  } else if (collectionName === 'media') {
    requiredKeys.add('kind');
    requiredKeys.add('uri');
  } else if (labelKey) {
    requiredKeys.add(labelKey);
  }

  const refFields = [];

  (LEGACY_PREVIEW_FIELDS[collectionName] || []).forEach(f => {
    if ((f.type === 'id' || f.type === 'idList') && f.ref) {
      refFields.push({ field: f.key, target: f.ref });
    }
  });

  const refRuleFields = loader?.COLLECTION_REFERENCE_RULES?.[collectionName] || [];
  refRuleFields.forEach(field => {
    refFields.push({ field, target: inferTargetCollectionFromField(field) });
  });

  if (collectionName === 'texts') {
    refFields.push({ field: 'parentId', target: 'texts' });
  }

  const model = getModel(ctx);
  const schema = model?.getExportSchema?.(collectionName) || null;
  const bodyField = schema?.bodyField || null;

  return {
    expectedKeys: Array.from(expectedKeys).sort(),
    requiredKeys: Array.from(requiredKeys),
    referenceFields: dedupeRefFields(refFields),
    bodyField
  };
}

export function getCollectionUi(ctx, collectionName) {
  return getCollection(ctx, collectionName)?.ui || {};
}

export function getTitleField(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  return resolveDisplayField(collection, 'titleField');
}

export function getSubtitleField(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  return resolveDisplayField(collection, 'subtitleField');
}

export function getPreviewFields(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  const previewFields = resolvePreviewFieldNames(collection);
  if (previewFields.length) {
    return previewFields
      .map(field => (typeof field === 'string' ? field : field?.key))
      .filter(Boolean)
      .map(fieldName => buildPreviewFieldConfig(collectionName, collection, fieldName));
  }

  const legacy = LEGACY_PREVIEW_FIELDS[collectionName];
  if (legacy) {
    warnLegacyPreview(collectionName);
    return legacy;
  }
  return [];
}

export function getSchemaGuide(ctx, collectionName) {
  const guide = getCollectionDoc(getModel(ctx), collectionName);
  if (guide) return guide;
  warnLegacySchema(collectionName);
  return deriveLegacySchemaGuide(ctx, collectionName, getState(ctx)?.currentMovementId);
}
