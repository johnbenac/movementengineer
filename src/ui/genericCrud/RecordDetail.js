import {
  getBodyField,
  getOrderedFieldNames,
  getRecordTitle,
  resolveFieldKind,
  resolveRefCollectionName
} from './genericCrudHelpers.js';

function renderValue({ value, fieldDef, model, snapshot, nodeIndex, isBodyField }) {
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
          snapshot,
          nodeIndex
        })
      )
      .join(', ');
  }

  if (kindInfo.kind === 'ref') {
    if (kindInfo.ref === '*' && nodeIndex?.get) {
      const node = nodeIndex.get(value);
      return node?.title || value;
    }
    const collectionName = resolveRefCollectionName(kindInfo.ref, model);
    if (nodeIndex?.get) {
      const node = nodeIndex.get(value);
      if (node?.collectionName === collectionName) {
        return node.title || value;
      }
    }
    const options = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
    const match = options.find(item => item?.id === value);
    return getRecordTitle(match, model?.collections?.[collectionName]) || value;
  }

  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function RecordDetail({ record, collectionDef, model, snapshot, nodeIndex, onEdit, onDelete }) {
  const wrapper = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'generic-crud-detail-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'generic-crud-detail-title';

  const title = document.createElement('h3');
  title.textContent = getRecordTitle(record, collectionDef) || 'Record';
  titleGroup.appendChild(title);

  if (record?.id) {
    const idPill = document.createElement('span');
    idPill.className = 'code-pill';
    idPill.textContent = record.id;
    titleGroup.appendChild(idPill);
  }

  header.appendChild(titleGroup);

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
  grid.className = 'generic-crud-detail-grid';

  fields.forEach(fieldName => {
    const fieldDef = collectionDef?.fields?.[fieldName];
    const row = document.createElement('div');
    row.className = 'generic-crud-detail-row';

    const label = document.createElement('div');
    label.className = 'generic-crud-detail-label';
    label.textContent = fieldName;

    const value = document.createElement('div');
    value.className = 'generic-crud-detail-value';
    value.textContent = renderValue({
      value: record?.[fieldName],
      fieldDef,
      model,
      snapshot,
      nodeIndex,
      isBodyField: fieldName === bodyField
    });

    row.appendChild(label);
    row.appendChild(value);
    grid.appendChild(row);
  });

  wrapper.appendChild(grid);
  return wrapper;
}
