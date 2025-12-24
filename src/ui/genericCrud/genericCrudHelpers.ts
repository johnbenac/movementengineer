const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return JSON.parse(JSON.stringify(value));
  return value;
}

export function getCollectionSnapshotKey(collectionDef, model) {
  if (!collectionDef) return null;
  if (collectionDef.collectionName) return collectionDef.collectionName;
  const registry = getModelRegistry();
  if (registry?.resolveCollectionName) {
    return registry.resolveCollectionName(
      collectionDef.typeName || collectionDef.collection || collectionDef.name,
      model?.specVersion
    );
  }
  return collectionDef.collection || collectionDef.typeName || null;
}

export function getRecordTitle(record, collectionDef) {
  if (!record) return '';
  const titleField =
    collectionDef?.display?.titleField ||
    collectionDef?.ui?.titleField ||
    collectionDef?.ui?.title;
  if (titleField && record[titleField]) return String(record[titleField]);
  if (record.name) return String(record.name);
  if (record.title) return String(record.title);
  if (record.label) return String(record.label);
  if (record.shortName) return String(record.shortName);
  return record.id ? String(record.id) : '';
}

export function getBodyFieldName(collectionDef) {
  if (!collectionDef) return null;
  const serialization = collectionDef.serialization || {};
  if (serialization.bodyField) return serialization.bodyField;
  const bodyFields = Object.entries(collectionDef.fields || {})
    .filter(([, fieldDef]) => fieldDef?.body)
    .map(([name]) => name);
  if (bodyFields.length > 0) return bodyFields[0];
  return null;
}

export function makeDefaultRecord(collectionDef, options = {}) {
  const record = {};
  const fields = collectionDef?.fields || {};
  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef && fieldDef.default !== undefined) {
      record[fieldName] = cloneDefault(fieldDef.default);
    }
  });

  if (options.currentMovementId && fields.movementId && record.movementId === undefined) {
    record.movementId = options.currentMovementId;
  }

  return record;
}

export function applyIdDefaults(record, collectionDef) {
  const fields = collectionDef?.fields || {};
  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef?.default === '<id>' && record?.id) {
      record[fieldName] = record.id;
    }
  });
}

export function createRecordId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function coerceInputValue(fieldDef, rawValue) {
  if (rawValue === '') {
    if (fieldDef?.nullable) return null;
    if (fieldDef?.required) return undefined;
    return undefined;
  }
  const type = fieldDef?.type || 'string';
  if (type === 'number') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === 'boolean') {
    if (typeof rawValue === 'boolean') return rawValue;
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
  }
  return rawValue;
}

export function getFieldOrder(collectionDef) {
  const fields = collectionDef?.fields || {};
  const fieldNames = Object.keys(fields);
  const ordered = [];
  const uiOrder = Array.isArray(collectionDef?.ui?.order)
    ? collectionDef.ui.order.filter(name => fieldNames.includes(name))
    : [];
  uiOrder.forEach(name => {
    if (!ordered.includes(name)) ordered.push(name);
  });

  const remaining = fieldNames.filter(name => !ordered.includes(name));
  remaining.sort((a, b) => a.localeCompare(b));

  const required = remaining.filter(name => fields[name]?.required && name !== 'id').sort();
  const optional = remaining.filter(name => !fields[name]?.required && name !== 'id').sort();

  if (!ordered.includes('id') && fieldNames.includes('id')) ordered.unshift('id');
  ordered.push(...required, ...optional);

  return ordered;
}

export function getFieldLabel(fieldName, fieldDef) {
  return fieldDef?.label || fieldDef?.title || fieldDef?.ui?.label || fieldName;
}

export function resolveRefCollectionName(ref, model) {
  if (!ref) return null;
  const registry = getModelRegistry();
  if (registry?.resolveCollectionName) {
    return registry.resolveCollectionName(ref, model?.specVersion);
  }
  if (model?.collections?.[ref]) return ref;
  const match = Object.values(model?.collections || {}).find(
    entry => entry.collectionName === ref || entry.typeName === ref
  );
  return match?.collectionName || null;
}

export function getFieldGroup(fieldDef) {
  return fieldDef?.ui?.group || fieldDef?.group || null;
}
