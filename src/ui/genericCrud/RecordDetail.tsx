import {
  getBodyField,
  getOrderedFieldNames,
  getRecordTitle,
  resolveFieldKind,
  resolveRefCollectionName
} from './genericCrudHelpers.ts';

function renderValue({ value, fieldDef, model, snapshot, isBodyField }) {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  const kindInfo = resolveFieldKind(fieldDef, { isBodyField });

  if (kindInfo.kind === 'array') {
    const items = Array.isArray(value) ? value : [];
    if (!items.length) return '—';
    return items
      .map(item =>
        renderValue({
          value: item,
          fieldDef: kindInfo.items?.kind === 'ref' ? { ref: kindInfo.items.ref } : null,
          model,
          snapshot
        })
      )
      .join(', ');
  }

  if (kindInfo.kind === 'ref') {
    const collectionName = resolveRefCollectionName(kindInfo.ref, model);
    const options = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
    const match = options.find(item => item?.id === value);
    return getRecordTitle(match, model?.collections?.[collectionName]) || value;
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function RecordDetail({ record, collectionDef, model, snapshot, onEdit, onDelete }) {
  const wrapper = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'generic-crud-detail-header';

  const title = document.createElement('h3');
  title.textContent = getRecordTitle(record, collectionDef) || 'Record';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', () => onEdit());
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.className = 'danger';
  deleteButton.addEventListener('click', () => onDelete());
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  header.appendChild(actions);

  wrapper.appendChild(header);

  const bodyField = getBodyField(collectionDef);
  const fields = getOrderedFieldNames(collectionDef);
  const grid = document.createElement('div');
  grid.className = 'item-detail-grid';

  fields.forEach(fieldName => {
    const fieldDef = collectionDef?.fields?.[fieldName];
    const row = document.createElement('div');
    row.className = 'item-detail-row';

    const label = document.createElement('div');
    label.className = 'item-detail-label';
    label.textContent = fieldName;

    const value = document.createElement('div');
    value.className = 'item-detail-value';
    value.textContent = renderValue({
      value: record?.[fieldName],
      fieldDef,
      model,
      snapshot,
      isBodyField: fieldName === bodyField
    });

    row.appendChild(label);
    row.appendChild(value);
    grid.appendChild(row);
  });

  wrapper.appendChild(grid);
  return wrapper;
}
