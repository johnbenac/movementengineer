import { getCollectionDoc, getModelForSnapshot } from './schemaDoc.js';
import { getBodyField } from '../../ui/genericCrud/genericCrudHelpers.js';

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

const SYSTEM_FIELDS = new Set(['id', '_id', 'createdAt', 'updatedAt', 'movementId']);
const LONG_TEXT_FIELD_NAMES = ['summary', 'description', 'details', 'content', 'body', 'notes', 'text', 'context'];
const TITLE_FIELD_CANDIDATES = ['name', 'title', 'label', 'summary'];

const warnedFallbacks = new Set();

function warnOnce(key, message) {
  if (warnedFallbacks.has(key)) return;
  warnedFallbacks.add(key);
  console.warn(message);
}

function getSnapshot(ctx) {
  return ctx?.store?.getState?.()?.snapshot || ctx?.getState?.()?.snapshot || null;
}

function getModel(ctx) {
  const snapshot = getSnapshot(ctx);
  return getModelForSnapshot(snapshot);
}

function getCollection(ctx, collectionName) {
  const model = getModel(ctx);
  return model?.collections?.[collectionName] || null;
}

function humanizeFieldName(name) {
  return String(name || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function resolveDisplayField(collectionDef, key) {
  if (!collectionDef) return null;
  return (
    collectionDef.ui?.[key] ||
    collectionDef.display?.[key] ||
    (key === 'titleField' ? collectionDef.ui?.displayField : null)
  );
}

function pickFirstReasonableStringField(collectionDef, exclude = new Set()) {
  const fields = collectionDef?.fields || {};
  for (const candidate of TITLE_FIELD_CANDIDATES) {
    if (exclude.has(candidate)) continue;
    if (fields[candidate] && fields[candidate].type === 'string') return candidate;
  }
  return null;
}

function resolveTitleField(collectionDef) {
  return resolveDisplayField(collectionDef, 'titleField') || pickFirstReasonableStringField(collectionDef);
}

function resolveSubtitleField(collectionDef, titleField) {
  const subtitleField = resolveDisplayField(collectionDef, 'subtitleField');
  if (subtitleField && subtitleField !== titleField) return subtitleField;
  const next = pickFirstReasonableStringField(collectionDef, new Set([titleField].filter(Boolean)));
  if (next && next !== titleField) return next;
  return null;
}

function buildLegacyPreviewMap(collectionName) {
  const entries = LEGACY_PREVIEW_FIELDS[collectionName] || [];
  const map = new Map();
  entries.forEach(entry => {
    if (!entry?.key) return;
    map.set(entry.key, entry);
  });
  return map;
}

function isLongTextField(fieldName, fieldDef, bodyField) {
  if (fieldName === bodyField) return true;
  if (fieldDef?.ui?.widget === 'markdown') return true;
  return LONG_TEXT_FIELD_NAMES.includes(fieldName);
}

function inferPreviewFieldType(fieldName, fieldDef, collectionDef) {
  const bodyField = getBodyField(collectionDef);
  if (fieldDef?.type === 'array') {
    if (fieldDef.items?.ref) return { type: 'idList', ref: fieldDef.items.ref };
    return { type: 'chips' };
  }
  if (fieldDef?.ref) return { type: 'id', ref: fieldDef.ref };
  if (fieldDef?.type === 'boolean') return { type: 'boolean' };
  if (fieldDef?.type === 'string') {
    if (fieldName === 'uri' || fieldName === 'url') return { type: 'link' };
    if (isLongTextField(fieldName, fieldDef, bodyField)) return { type: 'paragraph' };
  }
  return { type: undefined };
}

function buildPreviewFieldConfig(collectionName, fieldName, collectionDef, legacyMap) {
  if (legacyMap?.has(fieldName)) {
    const legacy = legacyMap.get(fieldName);
    return { ...legacy };
  }
  const fieldDef = collectionDef?.fields?.[fieldName] || null;
  const typeInfo = inferPreviewFieldType(fieldName, fieldDef, collectionDef);
  const base = {
    label: humanizeFieldName(fieldName),
    key: fieldName
  };
  if (typeInfo.type) base.type = typeInfo.type;
  if (typeInfo.ref) base.ref = typeInfo.ref;
  return base;
}

function derivePreviewFieldsFromModel(collectionDef) {
  if (!collectionDef) return [];
  const fields = collectionDef.fields || {};
  const bodyField = getBodyField(collectionDef);
  const titleField = resolveTitleField(collectionDef);
  const subtitleField = resolveSubtitleField(collectionDef, titleField);
  const ordered = Array.isArray(collectionDef.serialization?.frontMatterFields)
    ? collectionDef.serialization.frontMatterFields.slice()
    : Object.keys(fields).sort();
  if (bodyField && !ordered.includes(bodyField)) ordered.push(bodyField);

  const selected = [];
  if (titleField) selected.push(titleField);
  if (subtitleField && subtitleField !== titleField) selected.push(subtitleField);

  const remaining = ordered.filter(name => !selected.includes(name));
  for (const fieldName of remaining) {
    if (selected.length >= 1 + 1 + 3) break;
    if (SYSTEM_FIELDS.has(fieldName)) continue;
    const fieldDef = fields[fieldName];
    if (!fieldDef) continue;
    if (fieldDef.type === 'object') continue;
    if (fieldDef.type === 'array' && !fieldDef.items?.ref) continue;
    if (fieldDef.type === 'string' && isLongTextField(fieldName, fieldDef, bodyField)) continue;
    selected.push(fieldName);
  }

  return selected.filter(Boolean);
}

export function getCollectionUi(ctx, collectionName) {
  return getCollection(ctx, collectionName)?.ui || {};
}

export function getTitleField(ctx, collectionName) {
  const collectionDef = getCollection(ctx, collectionName);
  return resolveTitleField(collectionDef);
}

export function getSubtitleField(ctx, collectionName) {
  const collectionDef = getCollection(ctx, collectionName);
  const titleField = resolveTitleField(collectionDef);
  return resolveSubtitleField(collectionDef, titleField);
}

export function getPreviewFields(ctx, collectionName) {
  const collectionDef = getCollection(ctx, collectionName);
  if (!collectionDef) return [];
  const legacyMap = buildLegacyPreviewMap(collectionName);
  const uiPreviewFields = collectionDef.ui?.previewFields;
  let fieldNames = Array.isArray(uiPreviewFields) && uiPreviewFields.length ? uiPreviewFields.slice() : [];

  if (!fieldNames.length) {
    const derived = derivePreviewFieldsFromModel(collectionDef);
    if (derived.length) {
      warnOnce(
        `preview-derived:${collectionName}`,
        `[model-ui] Using derived preview fields for collection "${collectionName}". Add ui.previewFields to the model.`
      );
      fieldNames = derived;
    }
  }

  if (!fieldNames.length && LEGACY_PREVIEW_FIELDS[collectionName]) {
    warnOnce(
      `preview-legacy:${collectionName}`,
      `[model-ui] Using legacy PREVIEW_FIELDS fallback for collection "${collectionName}". Add ui.previewFields to the model.`
    );
    return LEGACY_PREVIEW_FIELDS[collectionName].map(entry => ({ ...entry }));
  }

  if (!fieldNames.length) return [];
  return fieldNames.map(fieldName => buildPreviewFieldConfig(collectionName, fieldName, collectionDef, legacyMap));
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || null;
}

function getMarkdownLoader(ctx) {
  return ctx?.services?.MarkdownDatasetLoader || window.MarkdownDatasetLoader || null;
}

function getCollectionsWithMovementId(ctx) {
  const DomainService = getDomainService(ctx);
  return DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || new Set();
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
  const DomainService = getDomainService(ctx);
  const loader = getMarkdownLoader(ctx);

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

  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);

  const requiredKeys = new Set(['id']);
  if (collectionsWithMovementId.has(collectionName)) requiredKeys.add('movementId');

  const labelCandidates = ['name', 'title', 'shortText', 'text'];
  const labelKey = labelCandidates.find(k => expectedKeys.has(k));
  if (collectionName === 'movements') requiredKeys.add('name');
  else if (collectionName === 'notes') {
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

export function getSchemaGuide(ctx, collectionName, movementId) {
  const model = getModel(ctx);
  const guide = getCollectionDoc(model, collectionName);
  if (guide) return guide;
  const legacy = deriveLegacySchemaGuide(ctx, collectionName, movementId);
  if (legacy) {
    warnOnce(
      `schema-legacy:${collectionName}`,
      `[model-ui] Using legacy schema guide for "${collectionName}". Add field definitions to the model.`
    );
    return legacy;
  }
  return {
    unknown: true,
    expectedKeys: [],
    requiredKeys: [],
    referenceFields: [],
    bodyField: null
  };
}
