import { getCollectionDoc, getModelForSnapshot } from './schemaDoc.js';

const PREVIEW_FIELDS = {
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

const previewFallbackWarned = new Set();
const previewDerivedWarned = new Set();
const schemaFallbackWarned = new Set();

function warnOnce(bucket, message) {
  if (bucket.has(message)) return;
  bucket.add(message);
  console.warn(message);
}

function getSnapshot(ctx) {
  return ctx?.store?.getState?.()?.snapshot || ctx?.snapshot || null;
}

function getModel(ctx) {
  return getModelForSnapshot(getSnapshot(ctx));
}

function getCollection(ctx, collectionName) {
  const model = getModel(ctx);
  return model?.collections?.[collectionName] || null;
}

function isStringField(fieldDef) {
  const type = fieldDef?.type || 'string';
  return type === 'string';
}

function resolveHeuristicField(fields, candidates) {
  return candidates.find(name => fields[name] && isStringField(fields[name])) || null;
}

function resolveTitleFieldFromCollection(collection) {
  if (!collection) return null;
  const ui = collection.ui || {};
  const display = collection.display || {};
  if (ui.titleField) return ui.titleField;
  if (display.titleField) return display.titleField;
  return resolveHeuristicField(collection.fields || {}, ['name', 'title', 'label', 'summary', 'shortText', 'text']);
}

function resolveSubtitleFieldFromCollection(collection) {
  if (!collection) return null;
  const ui = collection.ui || {};
  const display = collection.display || {};
  if (ui.subtitleField) return ui.subtitleField;
  if (display.subtitleField) return display.subtitleField;
  return resolveHeuristicField(collection.fields || {}, ['type', 'kind', 'category', 'status']);
}

function isSystemField(fieldName) {
  return ['id', '_id', 'createdAt', 'updatedAt', 'movementId'].includes(fieldName);
}

function isLongTextField(fieldName, fieldDef) {
  if (fieldDef?.body) return true;
  if (fieldDef?.ui?.widget === 'markdown') return true;
  if (['summary', 'description', 'details', 'notes', 'context', 'body', 'content', 'text'].includes(fieldName)) {
    return true;
  }
  return /(markdown)$/i.test(fieldName);
}

function isTagsField(fieldName) {
  return fieldName === 'tags' || /tags$/i.test(fieldName);
}

function getOrderedFieldNames(collection) {
  if (!collection) return [];
  const ui = collection.ui || {};
  const fields = collection.fields || {};
  if (Array.isArray(ui.fieldOrder) && ui.fieldOrder.length) {
    return ui.fieldOrder.filter(name => name in fields);
  }
  const frontMatterFields = collection.serialization?.frontMatterFields || [];
  const ordered = frontMatterFields.slice();
  const bodyField = collection.serialization?.bodyField;
  if (bodyField && !ordered.includes(bodyField)) ordered.push(bodyField);
  const extras = Object.keys(fields).filter(name => !ordered.includes(name));
  return ordered.concat(extras);
}

function derivePreviewFieldsFromModel(collection) {
  if (!collection) return [];
  const fields = collection.fields || {};
  const titleField = resolveTitleFieldFromCollection(collection);
  const subtitleField = resolveSubtitleFieldFromCollection(collection);
  const seen = new Set();
  const result = [];

  if (titleField && fields[titleField]) {
    result.push(titleField);
    seen.add(titleField);
  }

  if (subtitleField && fields[subtitleField] && !seen.has(subtitleField)) {
    result.push(subtitleField);
    seen.add(subtitleField);
  }

  const ordered = getOrderedFieldNames(collection);
  const extraFields = [];
  ordered.forEach(fieldName => {
    if (seen.has(fieldName)) return;
    if (isSystemField(fieldName)) return;
    const fieldDef = fields[fieldName];
    if (!fieldDef) return;
    if (fieldDef.type === 'object') return;
    if (fieldDef.type === 'array' && !isTagsField(fieldName)) return;
    if (isLongTextField(fieldName, fieldDef)) return;
    if (!isStringField(fieldDef) && fieldDef.type !== 'boolean' && !fieldDef.enum && fieldDef.type !== 'array') {
      return;
    }
    extraFields.push(fieldName);
  });

  result.push(...extraFields.slice(0, 3));
  return result;
}

function normalizePreviewFieldList(fields) {
  const deduped = [];
  const seen = new Set();
  (fields || []).forEach(field => {
    const key = typeof field === 'string' ? field : field?.key;
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(field);
  });
  return deduped;
}

function titleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatPreviewLabel(fieldName) {
  if (!fieldName) return '';
  if (fieldName.endsWith('Ids')) {
    const trimmed = fieldName.slice(0, -3);
    const base = titleCase(trimmed);
    if (base.endsWith('y')) return `${base.slice(0, -1)}ies`;
    return base.endsWith('s') ? base : `${base}s`;
  }
  if (fieldName.endsWith('Id')) {
    const trimmed = fieldName.slice(0, -2);
    return titleCase(trimmed);
  }
  return titleCase(fieldName);
}

function resolvePreviewFieldType(fieldName, fieldDef) {
  if (!fieldDef) return {};
  if (fieldName === 'uri' || fieldDef.format === 'uri') {
    return { type: 'link' };
  }
  if (fieldDef.ref) {
    return { type: 'id', ref: fieldDef.ref };
  }
  if (fieldDef.type === 'array') {
    if (fieldDef.items?.ref) {
      return { type: 'idList', ref: fieldDef.items.ref };
    }
    return { type: 'chips' };
  }
  if (fieldDef.type === 'boolean') {
    return { type: 'boolean' };
  }
  if (isLongTextField(fieldName, fieldDef)) {
    return { type: 'paragraph' };
  }
  return {};
}

function resolveFacetHints(collectionName, fieldName, fieldDef) {
  if (!fieldDef || fieldDef.type !== 'array' || fieldDef.items?.ref) return {};
  if (fieldName === 'tags') {
    return { facet: 'tag', scope: collectionName === 'claims' ? 'claims' : undefined };
  }
  if (fieldName === 'sourcesOfTruth') {
    return { facet: 'sourceOfTruth' };
  }
  if (fieldName === 'appliesTo') {
    return { facet: 'appliesTo', scope: 'rules' };
  }
  if (fieldName === 'domain') {
    return { facet: 'domain', scope: 'rules' };
  }
  return {};
}

function buildPreviewFieldConfig(collectionName, fieldName, fieldDef) {
  return {
    label: fieldDef?.ui?.label || fieldDef?.label || formatPreviewLabel(fieldName),
    key: fieldName,
    ...resolvePreviewFieldType(fieldName, fieldDef),
    ...resolveFacetHints(collectionName, fieldName, fieldDef)
  };
}

function normalizePreviewFieldsFromModel(collectionName, collection, fields) {
  const fieldDefs = collection?.fields || {};
  const normalized = normalizePreviewFieldList(fields);
  return normalized.map(field =>
    typeof field === 'string'
      ? buildPreviewFieldConfig(collectionName, field, fieldDefs[field])
      : field
  );
}

function getCollectionsWithMovementId(ctx) {
  const DomainService = ctx?.services?.DomainService;
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
  const DomainService = ctx?.services?.DomainService;
  const loader =
    ctx?.services?.MarkdownDatasetLoader ||
    (typeof window !== 'undefined' ? window.MarkdownDatasetLoader : null);

  let skeleton = {};
  try {
    skeleton = DomainService?.createSkeletonItem
      ? DomainService.createSkeletonItem(collectionName, movementId || 'mov-placeholder')
      : {};
  } catch {
    skeleton = {};
  }

  const expectedKeys = new Set(Object.keys(skeleton || {}));

  (PREVIEW_FIELDS[collectionName] || []).forEach(f => expectedKeys.add(f.key));

  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);

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

  (PREVIEW_FIELDS[collectionName] || []).forEach(f => {
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

function buildFieldSummaries(collection, model) {
  const fields = collection?.fields || {};
  return Object.entries(fields).map(([name, field]) => {
    let type = field?.type || 'string';
    let refTarget = field?.ref || null;
    if (type === 'array' && field?.items?.ref) {
      type = 'ref';
      refTarget = field.items.ref;
    } else if (field?.ref) {
      type = 'ref';
    } else if (field?.enum || field?.ui?.enum) {
      type = 'enum';
    }
    const enumName = field?.enum || field?.items?.enum || field?.ui?.enum || null;
    const enumValues = enumName && model?.enums ? model.enums[enumName] : null;
    return {
      name,
      type,
      required: Boolean(field?.required),
      nullable: Boolean(field?.nullable),
      refTarget,
      enumValues: Array.isArray(enumValues) ? enumValues : null
    };
  });
}

export function getCollectionUi(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  return collection?.ui || {};
}

export function getTitleField(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  return resolveTitleFieldFromCollection(collection);
}

export function getSubtitleField(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  return resolveSubtitleFieldFromCollection(collection);
}

export function getPreviewFields(ctx, collectionName) {
  const collection = getCollection(ctx, collectionName);
  if (!collection) return [];
  const uiPreviewFields = collection.ui?.previewFields || null;
  if (Array.isArray(uiPreviewFields) && uiPreviewFields.length) {
    return normalizePreviewFieldsFromModel(collectionName, collection, uiPreviewFields);
  }

  const derived = derivePreviewFieldsFromModel(collection);
  if (derived.length) {
    warnOnce(
      previewDerivedWarned,
      `[model-ui] Using derived preview fields for collection "${collectionName}". Add ui.previewFields to the model.`
    );
    return normalizePreviewFieldsFromModel(collectionName, collection, derived);
  }

  const legacy = PREVIEW_FIELDS[collectionName];
  if (legacy) {
    warnOnce(
      previewFallbackWarned,
      `[model-ui] Using legacy PREVIEW_FIELDS fallback for collection "${collectionName}". Add ui.previewFields to the model.`
    );
    return legacy;
  }

  return [];
}

export function getSchemaGuide(ctx, collectionName, movementId) {
  const model = getModel(ctx);
  const guide = getCollectionDoc(model, collectionName);
  if (guide) {
    return {
      ...guide,
      fieldSummaries: buildFieldSummaries(model?.collections?.[collectionName], model)
    };
  }

  warnOnce(
    schemaFallbackWarned,
    `[model-ui] Using legacy schema guide for "${collectionName}". Add field definitions to the model.`
  );
  const legacyGuide = deriveLegacySchemaGuide(ctx, collectionName, movementId);
  return legacyGuide || {
    expectedKeys: [],
    requiredKeys: [],
    referenceFields: [],
    bodyField: null
  };
}
