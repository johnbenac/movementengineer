const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function resolveModelRegistry() {
  return globalScope?.ModelRegistry || null;
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

export function getModelForSnapshot(snapshot) {
  const registry = resolveModelRegistry();
  const specVersion = snapshot?.specVersion || registry?.DEFAULT_SPEC_VERSION || '2.3';
  if (registry?.getModel) {
    return registry.getModel(specVersion);
  }
  return globalScope?.DATA_MODEL_V2_3 || null;
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
    if (field.type === 'array' && field.items?.ref) {
      referenceFields.push({
        field: name,
        target: field.items.ref === '*' ? 'any' : field.items.ref,
        kind: field.items.ref === '*' ? 'poly' : 'many'
      });
      return;
    }
    if (field.ref) {
      referenceFields.push({
        field: name,
        target: field.ref === '*' ? 'any' : field.ref,
        kind: field.ref === '*' ? 'poly' : 'one'
      });
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
