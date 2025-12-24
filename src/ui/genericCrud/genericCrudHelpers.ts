const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

export function getCollectionSnapshotKey(collectionDef, model) {
  if (!collectionDef) return null;
  if (collectionDef.collectionName) return collectionDef.collectionName;
  if (collectionDef.collection) return collectionDef.collection;
  if (collectionDef.typeName && model?.collections) {
    const match = Object.values(model.collections).find(
      def => def?.typeName === collectionDef.typeName
    );
    return match?.collectionName || null;
  }
  return null;
}

export function resolveRefCollectionName(ref, model) {
  if (!ref || !model?.collections) return null;
  if (model.collections[ref]) return ref;
  const match = Object.values(model.collections).find(
    def => def?.typeName === ref || def?.collectionName === ref
  );
  return match?.collectionName || null;
}

export function listCollections(model) {
  if (!model?.collections) return [];
  if (Array.isArray(model.collectionOrder)) return model.collectionOrder.slice();
  return Object.keys(model.collections).sort();
}

export function getRecordTitle(record, collectionDef) {
  if (!record) return '';
  const titleField =
    collectionDef?.display?.titleField ||
    collectionDef?.ui?.display?.titleField ||
    collectionDef?.ui?.titleField ||
    null;
  const candidates = [
    titleField,
    'title',
    'name',
    'label',
    'shortText',
    'text',
    'summary'
  ].filter(Boolean);

  for (const field of candidates) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return record.id || '';
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return { ...value };
    }
  }
  return value;
}

function generateId() {
  const cryptoObj = globalScope?.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeDefaultRecord(collectionDef) {
  const fields = collectionDef?.fields || {};
  const record = {};

  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (!fieldDef || fieldDef.default === undefined) return;
    record[fieldName] = cloneDefault(fieldDef.default);
  });

  if (!record.id) {
    record.id = generateId();
  }

  Object.entries(record).forEach(([fieldName, value]) => {
    if (value === '<id>') {
      record[fieldName] = record.id;
    }
  });

  return record;
}

export function coerceInputValue(fieldDef, rawValue) {
  if (!fieldDef) return rawValue;
  if (rawValue === undefined) return undefined;

  if (rawValue === '' || rawValue === null) {
    if (fieldDef.nullable) return null;
    if (!fieldDef.required) return undefined;
    return undefined;
  }

  const type = fieldDef.type || 'string';
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
  const fieldNames = Object.keys(fields);
  const uiOrder =
    collectionDef?.ui?.order ||
    collectionDef?.ui?.fieldsOrder ||
    collectionDef?.ui?.fieldOrder ||
    null;

  if (Array.isArray(uiOrder) && uiOrder.length) {
    const ordered = [];
    const seen = new Set();
    uiOrder.forEach(name => {
      if (fields[name] && !seen.has(name)) {
        ordered.push(name);
        seen.add(name);
      }
    });
    fieldNames
      .filter(name => !seen.has(name))
      .sort()
      .forEach(name => ordered.push(name));
    return ordered;
  }

  const hasId = fieldNames.includes('id');
  const required = fieldNames.filter(
    name => name !== 'id' && fields[name]?.required
  );
  const optional = fieldNames.filter(
    name => name !== 'id' && !fields[name]?.required
  );

  required.sort();
  optional.sort();

  return [
    ...(hasId ? ['id'] : []),
    ...required,
    ...optional
  ];
}

export function getBodyFieldName(collectionDef) {
  const serialization = collectionDef?.serialization || {};
  if (serialization.bodyField) return serialization.bodyField;
  const fieldEntries = Object.entries(collectionDef?.fields || {});
  const bodyFields = fieldEntries
    .filter(([, def]) => def?.body === true)
    .map(([name]) => name);
  if (bodyFields.length > 1) {
    return bodyFields[0];
  }
  return bodyFields[0] || null;
}

export function isMarkdownField(fieldName, fieldDef, collectionDef) {
  if (!fieldDef) return false;
  if (fieldDef.ui?.widget === 'markdown') return true;
  const bodyField = getBodyFieldName(collectionDef);
  return bodyField === fieldName || fieldDef.body === true;
}

export function getEnumValues(fieldDef, model) {
  if (!fieldDef || !model?.enums) return null;
  const enumName = fieldDef.enum || fieldDef.ui?.enum || fieldDef.items?.enum || null;
  if (!enumName) return null;
  return model.enums[enumName] || null;
}

export function getRequiredFieldIssues(record, collectionDef) {
  const issues = [];
  const fields = collectionDef?.fields || {};

  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    if (!fieldDef?.required) return;
    const value = record?.[fieldName];
    if (value === undefined || value === null) {
      issues.push({
        fieldPath: fieldName,
        message: `Missing required field ${fieldName}.`
      });
      return;
    }
    if (typeof value === 'string' && !value.trim()) {
      issues.push({
        fieldPath: fieldName,
        message: `Field ${fieldName} cannot be empty.`
      });
    }
    if (Array.isArray(value) && value.length === 0) {
      issues.push({
        fieldPath: fieldName,
        message: `Field ${fieldName} must contain at least one item.`
      });
    }
  });

  return issues;
}
