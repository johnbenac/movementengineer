const DATA_MODEL_V2_3 = globalThis.DATA_MODEL_V2_3;
if (!DATA_MODEL_V2_3) {
  throw new Error('DATA_MODEL_V2_3 is not available on the global scope.');
}

function dedupeReferenceFields(fields) {
  const seen = new Set();
  return (fields || []).filter(ref => {
    if (!ref.field || !ref.target) return false;
    const key = `${ref.field}:${ref.target}:${ref.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getModelForSnapshot() {
  return DATA_MODEL_V2_3;
}

export function getCollectionDoc(model, collectionName) {
  const collection = model?.collections?.[collectionName];
  if (!collection) return null;

  const frontMatterFields = collection.serialization?.frontMatterFields || [];
  const bodyField = collection.serialization?.bodyField || null;
  const fieldsInOrder = [...frontMatterFields];
  if (bodyField && !fieldsInOrder.includes(bodyField)) fieldsInOrder.push(bodyField);

  const requiredKeys = Object.entries(collection.fields || {})
    .filter(([, field]) => field.required)
    .map(([name]) => name);

  if (collectionName === 'claims' && !requiredKeys.includes('text')) {
    requiredKeys.push('text');
  }

  const referenceFields = [];
  Object.entries(collection.fields || {}).forEach(([name, field]) => {
    if (!field) return;
    if (collectionName === 'notes' && name === 'targetId') {
      referenceFields.push({ field: name, target: '(polymorphic via targetType)', kind: 'poly' });
      return;
    }
    if (field.type === 'array' && field.items?.ref) {
      referenceFields.push({ field: name, target: field.items.ref, kind: 'many' });
      return;
    }
    if (field.ref) {
      referenceFields.push({ field: name, target: field.ref, kind: 'one' });
    }
  });

  const enumsUsed = new Set();
  Object.values(collection.fields || {}).forEach(field => {
    if (!field) return;
    if (field.enum) enumsUsed.add(field.enum);
    if (field.items?.enum) enumsUsed.add(field.items.enum);
    if (field.ui?.enum) enumsUsed.add(field.ui.enum);
  });

  return {
    collectionName,
    typeName: collection.typeName,
    description: collection.description,
    requiredKeys,
    requiredNotes: collectionName === 'claims'
      ? ['text is required and may be sourced from front matter or body']
      : [],
    bodyField,
    referenceFields: dedupeReferenceFields(referenceFields),
    fieldsInOrder,
    enumsUsed: Array.from(enumsUsed),
    fields: collection.fields || {},
    frontMatterFields,
    expectedKeys: Object.keys(collection.fields || {}).sort()
  };
}
