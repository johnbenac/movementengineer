import { FieldRenderer } from './FieldRenderer.tsx';
import {
  getBodyField,
  getOrderedFieldNames,
  getRecordTitle,
  groupFields
} from './genericCrudHelpers.ts';

function buildErrorMap(errors) {
  const map = new Map();
  (errors || []).forEach(error => {
    if (!error?.fieldPath) return;
    if (!map.has(error.fieldPath)) {
      map.set(error.fieldPath, error.message || 'Invalid value');
    }
  });
  return map;
}

export function renderRecordEditor({
  container,
  collectionDef,
  draft,
  mode,
  errors,
  onChange,
  onSave,
  onCancel,
  model,
  snapshot
}) {
  container.textContent = '';

  const header = document.createElement('div');
  header.className = 'pane-header';
  const heading = document.createElement('div');
  heading.className = 'section-heading small';
  heading.textContent =
    mode === 'create'
      ? `New ${collectionDef?.typeName || collectionDef?.collectionName || 'record'}`
      : `Edit ${getRecordTitle(draft, collectionDef)}`;
  header.appendChild(heading);

  container.appendChild(header);

  if (!collectionDef) return;

  const errorMap = buildErrorMap(errors);
  if (errors && errors.length) {
    const summary = document.createElement('div');
    summary.className = 'validation-summary';
    const count = errors.length;
    const title = document.createElement('div');
    title.textContent = `Fix ${count} issue${count === 1 ? '' : 's'}`;
    summary.appendChild(title);
    const list = document.createElement('ul');
    errors.forEach(err => {
      const item = document.createElement('li');
      const fieldPath = err.fieldPath ? `${err.fieldPath}: ` : '';
      item.textContent = `${fieldPath}${err.message || 'Invalid value'}`;
      list.appendChild(item);
    });
    summary.appendChild(list);
    container.appendChild(summary);
  }

  const bodyField = getBodyField(collectionDef);
  const orderedFields = getOrderedFieldNames(collectionDef);
  const { groups, ungrouped } = groupFields(orderedFields, collectionDef);

  const form = document.createElement('div');
  form.className = 'generic-crud-form';

  const renderField = fieldName => {
    const fieldDef = collectionDef.fields?.[fieldName];
    if (!fieldDef) return;
    const fieldRow = FieldRenderer({
      fieldName,
      fieldDef,
      value: draft?.[fieldName],
      onChange: nextValue => onChange?.(fieldName, nextValue),
      error: errorMap.get(fieldName),
      model,
      snapshot,
      bodyField
    });
    form.appendChild(fieldRow);
  };

  ungrouped.forEach(renderField);

  groups.forEach((fieldNames, groupName) => {
    const groupHeader = document.createElement('div');
    groupHeader.className = 'section-heading small';
    groupHeader.textContent = groupName;
    form.appendChild(groupHeader);
    fieldNames.forEach(renderField);
  });

  container.appendChild(form);

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  saveButton.disabled = errors && errors.length > 0;
  saveButton.addEventListener('click', () => onSave?.());
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => onCancel?.());
  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  container.appendChild(actions);
}
