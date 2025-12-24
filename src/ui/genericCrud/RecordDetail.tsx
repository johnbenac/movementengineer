import {
  getOrderedFieldNames,
  getRecordTitle,
  resolveRefCollectionName
} from './genericCrudHelpers.ts';

function renderValue({
  value,
  fieldDef,
  fieldName,
  collectionDef,
  model,
  snapshot
}) {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  const type = fieldDef?.type || 'string';

  if (type === 'array' && Array.isArray(value)) {
    const itemsDef = fieldDef?.items || {};
    if (itemsDef.ref) {
      const refCollection = resolveRefCollectionName(itemsDef.ref, model);
      const refRecords = Array.isArray(snapshot?.[refCollection]) ? snapshot[refCollection] : [];
      return value
        .map(item => {
          const match = refRecords.find(record => record?.id === item);
          return getRecordTitle(match, model?.collections?.[refCollection]) || item;
        })
        .join(', ');
    }
    return value.join(', ');
  }

  if (fieldDef?.ref) {
    const refCollection = resolveRefCollectionName(fieldDef.ref, model);
    const refRecords = Array.isArray(snapshot?.[refCollection]) ? snapshot[refCollection] : [];
    const match = refRecords.find(record => record?.id === value);
    return getRecordTitle(match, model?.collections?.[refCollection]) || value;
  }

  if (type === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

export function createRecordDetail(container) {
  const header = document.createElement('div');
  header.className = 'pane-header';

  const title = document.createElement('div');
  title.textContent = 'Detail';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.className = 'danger';
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  header.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'crud-detail-body';

  container.appendChild(header);
  container.appendChild(body);

  let callbacks = {};

  editButton.addEventListener('click', () => {
    callbacks.onEdit?.();
  });

  deleteButton.addEventListener('click', () => {
    callbacks.onDelete?.();
  });

  function render({ collectionDef, record, model, snapshot, onEdit, onDelete }) {
    callbacks = { onEdit, onDelete };
    body.innerHTML = '';

    if (!collectionDef) {
      body.textContent = 'Select a collection.';
      editButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    if (!record) {
      body.textContent = 'Select a record.';
      editButton.disabled = true;
      deleteButton.disabled = true;
      return;
    }

    editButton.disabled = false;
    deleteButton.disabled = false;

    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.textContent = getRecordTitle(record, collectionDef) || record.id || 'Untitled';
    body.appendChild(heading);

    const fieldNames = getOrderedFieldNames(collectionDef);
    fieldNames.forEach(fieldName => {
      const fieldDef = collectionDef.fields?.[fieldName];
      const row = document.createElement('div');
      row.className = 'crud-detail-row';
      const label = document.createElement('div');
      label.className = 'crud-detail-label';
      label.textContent = fieldDef?.label || fieldDef?.ui?.label || fieldName;
      const value = document.createElement('div');
      value.className = 'crud-detail-value';
      value.textContent = renderValue({
        value: record[fieldName],
        fieldDef,
        fieldName,
        collectionDef,
        model,
        snapshot
      });
      row.appendChild(label);
      row.appendChild(value);
      body.appendChild(row);
    });
  }

  return { render };
}
