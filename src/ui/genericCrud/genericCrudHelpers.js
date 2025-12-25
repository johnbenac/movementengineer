const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...value };
  return value;
}

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

export function getCollectionSnapshotKey(collectionDef, model) {
  if (!collectionDef) return null;
  if (collectionDef.collectionName) return collectionDef.collectionName;
  const registry = getModelRegistry();
  const typeName = collectionDef.typeName || collectionDef.collection || collectionDef.name;
  if (registry?.resolveCollectionName && typeName) {
    return registry.resolveCollectionName(typeName, model?.specVersion) || typeName;
  }
  return typeName || null;
}

export function resolveRefCollectionName(ref, model) {
  if (!ref) return null;
  const registry = getModelRegistry();
  if (registry?.resolveCollectionName) {
    return registry.resolveCollectionName(ref, model?.specVersion);
  }
  if (model?.collections?.[ref]) return ref;
  const match = Object.values(model?.collections || {}).find(
    entry => entry?.collectionName === ref || entry?.typeName === ref
  );
  return match?.collectionName || null;
}

export function getCollectionLabel(collectionDef, collectionKey) {
  return (
    collectionDef?.ui?.label ||
    collectionDef?.label ||
    collectionDef?.display?.label ||
    collectionDef?.typeName ||
    collectionKey
  );
}

export function getRecordTitle(record, collectionDef) {
  if (!record) return '—';
  const titleField =
    collectionDef?.display?.titleField ||
    collectionDef?.ui?.titleField ||
    collectionDef?.ui?.displayField ||
    null;
  if (titleField && record[titleField]) return record[titleField];
  return record.name || record.title || record.label || record.id || '—';
}

export function getBodyField(collectionDef) {
  if (!collectionDef) return null;
  if (collectionDef.serialization?.bodyField) return collectionDef.serialization.bodyField;
  const bodyFields = Object.entries(collectionDef.fields || {})
    .filter(([, field]) => field?.body === true)
    .map(([name]) => name);
  return bodyFields[0] || null;
}

export function makeDefaultRecord(collectionDef) {
  const fields = collectionDef?.fields || {};
  const record = {};

  Object.entries(fields).forEach(([name, fieldDef]) => {
    if (!fieldDef) return;
    if (Object.prototype.hasOwnProperty.call(fieldDef, 'default')) {
      record[name] = cloneDefault(fieldDef.default);
    }
  });

  if (!record.id) {
    const idField = fields.id || null;
    record.id = generateId(idField);
  }

  Object.entries(fields).forEach(([name, fieldDef]) => {
    if (!fieldDef) return;
    if (record[name] === '<id>' && record.id) {
      record[name] = record.id;
    }
  });

  return record;
}

export function generateId(fieldDef) {
  if (fieldDef?.default && typeof fieldDef.default === 'function') {
    return fieldDef.default();
  }
  if (fieldDef?.generate && typeof fieldDef.generate === 'function') {
    return fieldDef.generate();
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function coerceInputValue(fieldDef, rawValue) {
  const isEmptyString = rawValue === '' || rawValue === null || rawValue === undefined;
  const nullable = fieldDef?.nullable === true;
  if (isEmptyString) {
    return nullable ? null : undefined;
  }

  const type = fieldDef?.type || 'string';
  if (type === 'number') {
    const num = Number(rawValue);
    return Number.isFinite(num) ? num : undefined;
  }
  if (type === 'boolean') {
    return Boolean(rawValue);
  }
  return rawValue;
}

export function getOrderedFieldNames(collectionDef) {
  if (!collectionDef) return [];
  const fields = collectionDef.fields || {};
  const order = collectionDef.ui?.fieldOrder || collectionDef.ui?.order;
  if (Array.isArray(order) && order.length) {
    return order.filter(name => name in fields);
  }

  const required = [];
  const optional = [];
  Object.entries(fields).forEach(([name, fieldDef]) => {
    if (name === 'id') return;
    if (fieldDef?.required) required.push(name);
    else optional.push(name);
  });
  required.sort();
  optional.sort();

  const names = [];
  if (fields.id) names.push('id');
  return names.concat(required, optional);
}

export function resolveFieldKind(fieldDef, { isBodyField } = {}) {
  if (!fieldDef) return { kind: 'string' };
  if (isBodyField || fieldDef.ui?.widget === 'markdown') {
    return { kind: 'markdown' };
  }
  const type = fieldDef.type || 'string';
  if (type === 'array') {
    const itemType = fieldDef.items?.type || 'string';
    if (fieldDef.items?.ref) {
      return { kind: 'array', items: { kind: 'ref', ref: fieldDef.items.ref } };
    }
    if (fieldDef.items?.enum || fieldDef.items?.ui?.enum) {
      return { kind: 'array', items: { kind: 'enum' } };
    }
    return { kind: 'array', items: { kind: itemType } };
  }
  if (fieldDef.ref) return { kind: 'ref', ref: fieldDef.ref };
  if (fieldDef.enum || fieldDef.ui?.enum) return { kind: 'enum' };
  return { kind: type };
}

export function resolveEnumValues(fieldDef, model) {
  if (!fieldDef || !model?.enums) return [];
  const enumName = fieldDef.enum || fieldDef.ui?.enum || null;
  if (!enumName) return [];
  const values = model.enums[enumName];
  return Array.isArray(values) ? values : [];
}
