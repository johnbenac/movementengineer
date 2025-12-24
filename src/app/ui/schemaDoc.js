import DATA_MODEL_V2_3 from '../../models/dataModel.v2_3.js';

export function getModelForSnapshot() {
  return DATA_MODEL_V2_3;
}

function dedupeReferenceFields(fields) {
  const seen = new Set();
  return fields.filter(entry => {
    if (!entry.field || !entry.target) return false;
    const key = `${entry.field}:${entry.target}:${entry.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getCollectionDoc(model, collectionName) {
  const collection = model?.collections?.[collectionName];
  if (!collection) return null;

  const { serialization, fields } = collection;
  const frontMatterFields = Array.isArray(serialization?.frontMatterFields)
    ? serialization.frontMatterFields
    : [];
  const bodyField = serialization?.bodyField || null;

  const fieldsInOrder = [...frontMatterFields];
  if (bodyField && !fieldsInOrder.includes(bodyField)) {
    fieldsInOrder.push(bodyField);
  }

  const requiredKeys = Object.entries(fields || {})
    .filter(([, info]) => info?.required)
    .map(([key]) => key);

  const referenceFields = [];
  Object.entries(fields || {}).forEach(([fieldName, info]) => {
    if (collectionName === 'notes' && fieldName === 'targetId') {
      referenceFields.push({ field: fieldName, target: '(polymorphic via targetType)', kind: 'poly' });
      return;
    }
    if (info?.ref) {
      referenceFields.push({
        field: fieldName,
        target: info.ref,
        kind: info.type === 'array' ? 'many' : 'one'
      });
    }
    if (info?.type === 'array' && info?.items?.ref) {
      referenceFields.push({
        field: fieldName,
        target: info.items.ref,
        kind: 'many'
      });
    }
  });

  const enumsUsed = Array.from(
    new Set(
      Object.values(fields || {})
        .flatMap(info => [info?.enum, info?.items?.enum])
        .filter(Boolean)
    )
  );

  return {
    collectionName,
    typeName: collection.typeName,
    description: collection.description,
    requiredKeys,
    bodyField,
    frontMatterFields,
    referenceFields: dedupeReferenceFields(referenceFields),
    fieldsInOrder,
    enumsUsed,
    fields,
    serialization
  };
}
