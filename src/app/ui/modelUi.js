import { getCollectionDoc, getModelForSnapshot } from './schemaDoc.js';

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

const warnedPreviewFallback = new Set();
const warnedSchemaFallback = new Set();

function getState(ctx) {
  return ctx?.store?.getState?.() || ctx?.getState?.() || {};
}

function getModel(ctx) {
  const snapshot = getState(ctx)?.snapshot || null;
  return getModelForSnapshot(snapshot);
}

function getCollectionDef(ctx, collectionName) {
  if (!collectionName) return null;
  const model = getModel(ctx);
  return model?.collections?.[collectionName] || null;
}

function warnOnce(set, collectionName, message) {
  if (!collectionName || set.has(collectionName)) return;
  set.add(collectionName);
  console.warn(message);
}

function isStringField(fieldDef) {
  if (!fieldDef || !fieldDef.type) return true;
  return fieldDef.type === 'string';
}

function resolveTitleFieldForPreview(collectionDef) {
  const explicit = collectionDef?.ui?.titleField || null;
  if (explicit && collectionDef?.fields?.[explicit]) return explicit;

  const displayTitle = collectionDef?.display?.titleField || null;
  if (displayTitle && collectionDef?.fields?.[displayTitle]) return displayTitle;

  const candidates = ['name', 'title', 'label', 'shortText', 'text', 'summary'];
  return candidates.find(name => {
    const fieldDef = collectionDef?.fields?.[name];
    return fieldDef && isStringField(fieldDef);
  }) || null;
}

function resolveSubtitleFieldForPreview(collectionDef, titleField) {
  const explicit = collectionDef?.ui?.subtitleField || null;
  if (explicit && explicit !== titleField && collectionDef?.fields?.[explicit]) return explicit;

  const displaySubtitle = collectionDef?.display?.subtitleField || null;
  if (displaySubtitle && displaySubtitle !== titleField && collectionDef?.fields?.[displaySubtitle]) {
    return displaySubtitle;
  }

  const candidates = ['type', 'kind', 'category', 'status', 'shortName', 'mainFunction'];
  return candidates.find(name => {
    if (name === titleField) return false;
    const fieldDef = collectionDef?.fields?.[name];
    return fieldDef && isStringField(fieldDef);
  }) || null;
}

function derivePreviewFieldsFromModel(collectionDef) {
  if (!collectionDef?.fields) return [];

  const fieldNames = Object.keys(collectionDef.fields || {});
  const titleField = resolveTitleFieldForPreview(collectionDef);
  const subtitleField = resolveSubtitleFieldForPreview(collectionDef, titleField);
  const preview = [];

  if (titleField) preview.push(titleField);
  if (subtitleField && subtitleField !== titleField) preview.push(subtitleField);

  const systemFields = new Set(['id', '_id', 'createdAt', 'updatedAt', 'movementId']);
  const longBlobNames = new Set(['content', 'body', 'markdown']);
  const bodyField = collectionDef?.serialization?.bodyField || null;

  const candidates = fieldNames
    .filter(name => !preview.includes(name))
    .filter(name => !systemFields.has(name))
    .filter(name => name !== bodyField)
    .filter(name => !longBlobNames.has(name));

  const scored = candidates
    .map(name => {
      const fieldDef = collectionDef.fields?.[name] || {};
      const type = fieldDef.type || 'string';
      const isTagField = /tags?/i.test(name);

      if (type === 'array' && !isTagField) {
        return null;
      }

      if (type === 'object') return null;

      let score = 0;
      if (type === 'boolean') score = 4;
      else if (fieldDef.enum || fieldDef.ui?.enum) score = 3;
      else if (isTagField) score = 3;
      else if (type === 'number') score = 2;
      else if (fieldDef.ref) score = 2;
      else if (type === 'string') score = 1;

      return { name, score };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });

  const extra = scored.slice(0, 3).map(entry => entry.name);
  return preview.concat(extra);
}

function normalizeFieldLabel(name) {
  if (!name) return '—';
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  const words = spaced.split(/\s+/).map(word => {
    const lower = word.toLowerCase();
    if (lower === 'id' || lower === 'ids') return lower.toUpperCase();
    if (['of', 'to', 'and', 'or', 'in', 'on', 'for'].includes(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return words.join(' ');
}

function resolveFacetConfig(collectionName, fieldName) {
  if (fieldName === 'tags') {
    return { facet: 'tag', scope: collectionName === 'claims' ? 'claims' : null };
  }
  if (fieldName === 'sourcesOfTruth') return { facet: 'sourceOfTruth', scope: null };
  if (fieldName === 'appliesTo') return { facet: 'appliesTo', scope: 'rules' };
  if (fieldName === 'domain') return { facet: 'domain', scope: 'rules' };
  return { facet: null, scope: null };
}

function resolvePreviewFieldType(collectionDef, fieldName, fieldDef) {
  if (!fieldDef) return null;
  const bodyField = collectionDef?.serialization?.bodyField || null;
  if (fieldName === bodyField || fieldDef.ui?.widget === 'markdown') return 'paragraph';
  if (fieldDef.type === 'boolean') return 'boolean';
  if (fieldDef.type === 'array') {
    if (fieldDef.items?.ref) return 'idList';
    if (fieldDef.items?.type === 'string' || fieldDef.items?.enum || fieldDef.items?.ui?.enum) {
      return 'chips';
    }
  }
  if (fieldDef.ref) return 'id';
  if (fieldDef.format === 'uri' || fieldDef.format === 'url' || fieldName === 'uri') return 'link';

  const longTextFields = ['description', 'summary', 'details', 'notes', 'context', 'body', 'content', 'text'];
  if (fieldDef.type === 'string' && longTextFields.includes(fieldName)) return 'paragraph';

  return null;
}

function buildPreviewFieldDescriptor(collectionDef, collectionName, fieldName) {
  const fieldDef = collectionDef?.fields?.[fieldName] || null;
  const label = fieldDef?.ui?.label || normalizeFieldLabel(fieldName);
  const type = resolvePreviewFieldType(collectionDef, fieldName, fieldDef);
  const descriptor = { key: fieldName, label };
  if (type) descriptor.type = type;
  if (type === 'id' && fieldDef?.ref) descriptor.ref = fieldDef.ref;
  if (type === 'idList' && fieldDef?.items?.ref) descriptor.ref = fieldDef.items.ref;
  if (type === 'chips') {
    const { facet, scope } = resolveFacetConfig(collectionName, fieldName);
    if (facet) descriptor.facet = facet;
    if (scope) descriptor.scope = scope;
  }
  return descriptor;
}

function getDomainService(ctx) {
  return ctx?.services?.DomainService || null;
}

function getMarkdownLoader(ctx) {
  return ctx?.services?.MarkdownDatasetLoader || window.MarkdownDatasetLoader || null;
}

function getCollectionsWithMovementId(ctx) {
  return getDomainService(ctx)?.COLLECTIONS_WITH_MOVEMENT_ID || new Set();
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
  return getCollectionDef(ctx, collectionName)?.ui || null;
}

export function getTitleField(ctx, collectionName) {
  const collectionDef = getCollectionDef(ctx, collectionName);
  if (!collectionDef) return null;
  const explicit = collectionDef?.ui?.titleField || collectionDef?.display?.titleField || null;
  if (explicit && collectionDef.fields?.[explicit]) return explicit;
  return resolveTitleFieldForPreview(collectionDef);
}

export function getSubtitleField(ctx, collectionName) {
  const collectionDef = getCollectionDef(ctx, collectionName);
  if (!collectionDef) return null;
  const titleField = getTitleField(ctx, collectionName);
  const explicit = collectionDef?.ui?.subtitleField || collectionDef?.display?.subtitleField || null;
  if (explicit && explicit !== titleField && collectionDef.fields?.[explicit]) return explicit;
  return resolveSubtitleFieldForPreview(collectionDef, titleField);
}

export function getPreviewFields(ctx, collectionName) {
  const collectionDef = getCollectionDef(ctx, collectionName);
  const previewFields = collectionDef?.ui?.previewFields || null;
  if (Array.isArray(previewFields) && previewFields.length) {
    return previewFields.map(fieldName =>
      buildPreviewFieldDescriptor(collectionDef, collectionName, fieldName)
    );
  }

  if (collectionDef) {
    const derived = derivePreviewFieldsFromModel(collectionDef);
    if (derived.length) {
      return derived.map(fieldName =>
        buildPreviewFieldDescriptor(collectionDef, collectionName, fieldName)
      );
    }
  }

  const legacy = LEGACY_PREVIEW_FIELDS[collectionName];
  if (legacy && legacy.length) {
    warnOnce(
      warnedPreviewFallback,
      collectionName,
      `[model-ui] Using legacy PREVIEW_FIELDS fallback for collection "${collectionName}". Add ui.previewFields to the model.`
    );
    return legacy.slice();
  }

  return [];
}

export function getSchemaGuide(ctx, collectionName, movementId) {
  const guide = getCollectionDoc(getModel(ctx), collectionName);
  if (guide) return guide;

  if (collectionName) {
    warnOnce(
      warnedSchemaFallback,
      collectionName,
      `[model-ui] Using legacy schema guide for "${collectionName}". Add field definitions to the model.`
    );
    return deriveLegacySchemaGuide(ctx, collectionName, movementId);
  }

  return {
    expectedKeys: [],
    requiredKeys: [],
    referenceFields: [],
    bodyField: null,
    fieldsInOrder: null,
    fields: null,
    frontMatterFields: []
  };
}

