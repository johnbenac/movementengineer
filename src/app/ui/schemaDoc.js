import DATA_MODEL_V2_3 from '../../models/dataModel.v2_3.js';

function dedupeRefFields(fields) {
  const seen = new Set();
  return (fields || []).filter(field => {
    const key = `${field.field}:${field.target}:${field.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getModelForSnapshot(snapshot) {
  return DATA_MODEL_V2_3;
}

export function getCollectionDoc(model, collectionName) {
  const collection = model?.collections?.[collectionName] || null;
  if (!collection) return null;

  const frontMatterFields = collection.serialization?.frontMatterFields || [];
  const bodyField = collection.serialization?.bodyField || null;
  const fieldsInOrder = [...frontMatterFields];
  if (bodyField && !fieldsInOrder.includes(bodyField)) {
    fieldsInOrder.push(bodyField);
  }

  const fields = collection.fields || {};
  const requiredKeys = Object.entries(fields)
    .filter(([, def]) => def?.required)
    .map(([name]) => name);

  if (collectionName === 'claims' && !requiredKeys.includes('text')) {
    requiredKeys.push('text');
  }

  const referenceFields = [];
  Object.entries(fields).forEach(([name, def]) => {
    if (collectionName === 'notes' && name === 'targetId') return;
    const target = def?.items?.ref || def?.ref || null;
    if (!target) return;
    const kind = def.type === 'array' ? 'many' : 'one';
    referenceFields.push({ field: name, target, kind });
  });

  if (collectionName === 'notes') {
    referenceFields.push({
      field: 'targetId',
      target: '(polymorphic via targetType)',
      kind: 'poly'
    });
  }

  const enumsUsed = Array.from(
    new Set(Object.values(fields).map(def => def.enum).filter(Boolean))
  );

  return {
    collectionName,
    typeName: collection.typeName,
    description: collection.description,
    requiredKeys,
    bodyField,
    referenceFields: dedupeRefFields(referenceFields),
    fieldsInOrder,
    enumsUsed,
    fields,
    serialization: collection.serialization
  };
}
