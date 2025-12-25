import { FieldRenderer } from '../../ui/genericCrud/FieldRenderer.js';
import { coerceInputValue } from '../../ui/genericCrud/genericCrudHelpers.js';

function titleCase(value) {
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function formatFieldLabel(fieldName, fieldDef) {
  if (!fieldName) return '';
  if (fieldDef?.ui?.label) return fieldDef.ui.label;
  if (fieldDef?.label) return fieldDef.label;
  return titleCase(fieldName);
}

export function renderModelRecordEditor(ctx, {
  collectionName,
  collectionDef,
  record,
  model,
  snapshot,
  fieldNames,
  onPatch,
  mode = 'graphSelected'
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'graph-form';
  const fields = Array.isArray(fieldNames)
    ? fieldNames.filter(name => name in (collectionDef?.fields || {}))
    : Object.keys(collectionDef?.fields || {});
  const bodyField = collectionDef?.serialization?.bodyField || null;

  fields.forEach(fieldName => {
    const fieldDef = collectionDef?.fields?.[fieldName] || {};
    const row = document.createElement('div');
    row.className = 'form-row';

    const label = document.createElement('label');
    label.textContent = formatFieldLabel(fieldName, fieldDef);
    row.appendChild(label);

    const fieldWrapper = FieldRenderer({
      fieldDef,
      fieldName,
      collectionName,
      value: record?.[fieldName],
      record,
      model,
      snapshot,
      isBodyField: fieldName === bodyField,
      error: null,
      onChange: nextValue => {
        const coerced = coerceInputValue(fieldDef, nextValue);
        onPatch({ [fieldName]: coerced });
      },
      mode
    });

    row.appendChild(fieldWrapper);
    wrapper.appendChild(row);
  });

  return wrapper;
}
