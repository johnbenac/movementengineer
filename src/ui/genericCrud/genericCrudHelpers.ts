const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...value };
  return value;
}

export function getCollectionSnapshotKey(collectionDef, model) {
  if (!collectionDef) return null;
  if (collectionDef.collectionName) return collectionDef.collectionName;
  const typeName = collectionDef.collection || collectionDef.typeName;
  if (model?.collections?.[typeName]) return typeName;
  const registry = globalScope?.ModelRegistry;
  if (registry?.resolveCollectionName) {
    return registry.resolveCollectionName(typeName, model?.specVersion);
  }
  return typeName || null;
}

export function getBodyField(collectionDef) {
  if (!collectionDef) return null;
  const serialization = collectionDef.serialization || {};
  let bodyField = serialization.bodyField ?? null;
  if (!bodyField) {
    const fields = collectionDef.fields || {};
    const matches = Object.entries(fields)
      .filter(([, field]) => field && field.body === true)
      .map(([name]) => name);
    bodyField = matches[0] || null;
  }
  return bodyField;
}

export function getRecordTitle(record, collectionDef) {
  if (!record) return 'Untitled';
  const displayField =
    collectionDef?.ui?.display?.titleField || collectionDef?.display?.titleField || null;
  const candidates = [displayField, 'name', 'title', 'label'];
  for (const field of candidates) {
    if (!field) continue;
    const value = record[field];
    if (value !== null && value !== undefined && value !== '') return String(value);
  }
  return record.id ? String(record.id) : 'Untitled';
}

export function makeDefaultRecord(collectionDef) {
  const record = {};
  if (!collectionDef?.fields) return record;
  Object.entries(collectionDef.fields).forEach(([fieldName, fieldDef]) => {
    if (!fieldDef || fieldDef.default === undefined) return;
    record[fieldName] = cloneDefault(fieldDef.default);
  });
  return record;
}

export function coerceInputValue(fieldDef, rawValue) {
  const isEmpty = rawValue === '' || rawValue === null || rawValue === undefined;
  if (isEmpty) {
    if (fieldDef?.nullable) return null;
    return undefined;
  }

  const type = fieldDef?.type || 'string';
  if (type === 'number') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === 'boolean') {
    return Boolean(rawValue);
  }
  return rawValue;
}

export function getOrderedFieldNames(collectionDef) {
  const fields = collectionDef?.fields || {};
  const names = Object.keys(fields);
  const uiOrder = collectionDef?.ui?.order;
  if (Array.isArray(uiOrder) && uiOrder.length) {
    const seen = new Set();
    const ordered = uiOrder.filter(name => {
      if (!names.includes(name)) return false;
      seen.add(name);
      return true;
    });
    const remaining = names.filter(name => !seen.has(name)).sort();
    return [...ordered, ...remaining];
  }

  const required = names.filter(name => name !== 'id' && fields[name]?.required).sort();
  const optional = names.filter(name => name !== 'id' && !fields[name]?.required).sort();
  const ordered = [];
  if (names.includes('id')) ordered.push('id');
  return [...ordered, ...required, ...optional];
}

export function groupFields(fieldNames, collectionDef) {
  const fields = collectionDef?.fields || {};
  const groups = new Map();
  const ungrouped = [];

  fieldNames.forEach(name => {
    const group = fields[name]?.ui?.group || null;
    if (group) {
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(name);
      return;
    }
    ungrouped.push(name);
  });

  return { groups, ungrouped };
}

export function resolveEnumValues(fieldDef, model) {
  if (!fieldDef || !model) return null;
  const enumName = fieldDef.enum || fieldDef.ui?.enum || null;
  if (!enumName) return null;
  return model.enums?.[enumName] || null;
}

export function resolveRefCollectionName(fieldDef, model) {
  if (!fieldDef) return null;
  const refName = fieldDef.ref || fieldDef.items?.ref || null;
  if (!refName) return null;
  if (model?.collections?.[refName]) return refName;
  const registry = globalScope?.ModelRegistry;
  if (registry?.resolveCollectionName) {
    return registry.resolveCollectionName(refName, model?.specVersion);
  }
  return refName;
}

export function getFieldLabel(fieldName, fieldDef) {
  return fieldDef?.ui?.label || fieldDef?.label || fieldName;
}

export function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.map(item => formatValue(item)).join(', ');
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}
