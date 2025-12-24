import {
  getBodyFieldName,
  getFieldGroup,
  getFieldLabel,
  getFieldOrder,
  getRecordTitle,
  resolveRefCollectionName
} from './genericCrudHelpers.ts';

function formatScalar(value) {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  return String(value);
}

function formatRefValue(value, refCollectionName, snapshot, model) {
  if (!value) return '—';
  const records = Array.isArray(snapshot?.[refCollectionName]) ? snapshot[refCollectionName] : [];
  const collectionDef = model?.collections?.[refCollectionName] || null;
  const record = records.find(item => item?.id === value);
  const title = getRecordTitle(record, collectionDef);
  return title ? `${title} (${value})` : value;
}

function renderFieldValue({ fieldDef, fieldName, value, model, snapshot, collectionDef }) {
  const type = fieldDef?.type || 'string';
  const bodyField = getBodyFieldName(collectionDef);
  const isMarkdown =
    fieldDef?.ui?.widget === 'markdown' || fieldDef?.widget === 'markdown' || fieldName === bodyField;

  if (type === 'array') {
    const itemsDef = fieldDef.items || {};
    const itemsRef = itemsDef.ref;
    const arrayValue = Array.isArray(value) ? value : [];
    if (itemsRef) {
      const refCollectionName = resolveRefCollectionName(itemsRef, model);
      return arrayValue.length
        ? arrayValue.map(item => formatRefValue(item, refCollectionName, snapshot, model)).join(', ')
        : '—';
    }
    return arrayValue.length ? arrayValue.map(formatScalar).join(', ') : '—';
  }

  if (fieldDef?.ref) {
    const refCollectionName = resolveRefCollectionName(fieldDef.ref, model);
    return formatRefValue(value, refCollectionName, snapshot, model);
  }

  if (isMarkdown) {
    return value ? String(value) : '—';
  }

  return formatScalar(value);
}

export function renderRecordDetail({ collectionDef, record, model, snapshot, onEdit, onDelete }) {
  const wrapper = document.createElement('div');

  if (!collectionDef) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Select a collection';
    wrapper.appendChild(empty);
    return wrapper;
  }

  if (!record) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Select a record';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const heading = document.createElement('div');
  heading.className = 'generic-crud-pane-header';
  const title = document.createElement('span');
  title.textContent = getRecordTitle(record, collectionDef) || record?.id || 'Record';
  const actions = document.createElement('div');
  actions.className = 'generic-crud-pane-actions';
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => onEdit());
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => onDelete());
  actions.append(editBtn, deleteBtn);
  heading.append(title, actions);
  wrapper.appendChild(heading);

  const bodyField = getBodyFieldName(collectionDef);
  const fields = getFieldOrder(collectionDef);
  let currentGroup = null;

  fields.forEach(fieldName => {
    const fieldDef = collectionDef.fields?.[fieldName];
    if (!fieldDef) return;
    const group = getFieldGroup(fieldDef);
    if (group && group !== currentGroup) {
      currentGroup = group;
      const groupHeading = document.createElement('h4');
      groupHeading.className = 'generic-crud-group';
      groupHeading.textContent = group;
      wrapper.appendChild(groupHeading);
    }
    if (!group && currentGroup) {
      currentGroup = null;
    }

    const row = document.createElement('div');
    row.className = 'generic-crud-detail-row';
    const label = document.createElement('div');
    label.className = 'generic-crud-detail-label';
    label.textContent = getFieldLabel(fieldName, fieldDef);
    const valueEl = document.createElement('div');
    valueEl.className = fieldName === bodyField ? 'generic-crud-detail-body' : 'generic-crud-detail-value';
    valueEl.textContent = renderFieldValue({
      fieldDef,
      fieldName,
      value: record?.[fieldName],
      model,
      snapshot,
      collectionDef
    });
    row.append(label, valueEl);
    wrapper.appendChild(row);
  });

  return wrapper;
}
