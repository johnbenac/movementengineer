import DATA_MODEL_V2_3 from '../../models/dataModel.v2_3.js';

export function getModelForSnapshot() {
  return DATA_MODEL_V2_3;
}

function dedupeReferenceFields(fields) {
  const seen = new Set();
  return fields.filter(ref => {
    const key = `${ref.field}:${ref.target}:${ref.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildReferenceFields(collectionName, fields) {
  const refs = [];
  Object.entries(fields || {}).forEach(([fieldName, fieldDef]) => {
    if (!fieldDef) return;
    if (collectionName === 'notes' && fieldName === 'targetId') {
      refs.push({ field: fieldName, target: '(polymorphic via targetType)', kind: 'poly' });
      return;
    }
    const target = fieldDef.ref || fieldDef.items?.ref;
    if (!target) return;
    const kind = fieldDef.type === 'array' || fieldDef.items ? 'many' : 'one';
    refs.push({ field: fieldName, target, kind });
  });
  return dedupeReferenceFields(refs);
}

function buildFieldsInOrder(serialization, fields) {
  const frontMatterFields = serialization?.frontMatterFields || [];
  const ordered = [...frontMatterFields];
  const bodyField = serialization?.bodyField;
  if (bodyField && !ordered.includes(bodyField)) ordered.push(bodyField);
  Object.keys(fields || {}).forEach(fieldName => {
    if (!ordered.includes(fieldName)) ordered.push(fieldName);
  });
  return ordered;
}

function buildRequiredKeys(collectionName, fields) {
  const required = Object.entries(fields || {})
    .filter(([, fieldDef]) => fieldDef?.required)
    .map(([fieldName]) => fieldName);
  if (collectionName === 'claims' && !required.includes('text')) required.push('text');
  return required;
}

export function getCollectionDoc(model, collectionName) {
  const collection = model?.collections?.[collectionName];
  if (!collection) return null;

  const fieldsInOrder = buildFieldsInOrder(collection.serialization, collection.fields);
  const requiredKeys = buildRequiredKeys(collectionName, collection.fields);
  const referenceFields = buildReferenceFields(collectionName, collection.fields);
  const enumsUsed = Array.from(
    new Set(
      Object.values(collection.fields || {})
        .map(fieldDef => fieldDef?.enum)
        .filter(Boolean)
    )
  );

  return {
    collectionName: collection.collectionName,
    typeName: collection.typeName,
    description: collection.description,
    requiredKeys,
    requiredNotes:
      collectionName === 'claims'
        ? 'text is required and may come from front matter or body on import.'
        : null,
    bodyField: collection.serialization?.bodyField || null,
    referenceFields,
    fieldsInOrder,
    enumsUsed,
    fields: collection.fields,
    serialization: collection.serialization,
    constraints: collection.constraints || [],
    noteTargetType: model?.notes?.targetType || null
  };
}
