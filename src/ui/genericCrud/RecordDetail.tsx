import {
  formatValue,
  getBodyField,
  getFieldLabel,
  getOrderedFieldNames,
  getRecordTitle,
  groupFields
} from './genericCrudHelpers.ts';

function renderFieldRow(fieldName, fieldDef, record, bodyField) {
  const row = document.createElement('div');
  row.className = 'form-row';

  const label = document.createElement('label');
  label.textContent = getFieldLabel(fieldName, fieldDef);
  row.appendChild(label);

  const value = record?.[fieldName];
  const isBody = bodyField && fieldName === bodyField;
  const content = document.createElement(isBody ? 'pre' : 'span');
  if (isBody) content.className = 'markdown-output';
  content.textContent = formatValue(value);
  row.appendChild(content);

  return row;
}

export function renderRecordDetail({
  container,
  collectionDef,
  record,
  onEdit,
  onDelete
}) {
  container.textContent = '';

  if (!collectionDef) {
    const placeholder = document.createElement('div');
    placeholder.className = 'muted';
    placeholder.textContent = 'Select a collection';
    container.appendChild(placeholder);
    return;
  }

  if (!record) {
    const placeholder = document.createElement('div');
    placeholder.className = 'muted';
    placeholder.textContent = 'Select a record';
    container.appendChild(placeholder);
    return;
  }

  const header = document.createElement('div');
  header.className = 'pane-header';
  const heading = document.createElement('div');
  heading.className = 'section-heading small';
  heading.textContent = getRecordTitle(record, collectionDef);
  header.appendChild(heading);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edit';
  editButton.addEventListener('click', () => onEdit?.());
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';
  deleteButton.className = 'danger';
  deleteButton.addEventListener('click', () => onDelete?.());
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  header.appendChild(actions);

  container.appendChild(header);

  const bodyField = getBodyField(collectionDef);
  const orderedFields = getOrderedFieldNames(collectionDef);
  const { groups, ungrouped } = groupFields(orderedFields, collectionDef);

  ungrouped.forEach(fieldName => {
    const fieldDef = collectionDef.fields?.[fieldName];
    if (!fieldDef) return;
    container.appendChild(renderFieldRow(fieldName, fieldDef, record, bodyField));
  });

  groups.forEach((fieldNames, groupName) => {
    const groupHeader = document.createElement('div');
    groupHeader.className = 'section-heading small';
    groupHeader.textContent = groupName;
    container.appendChild(groupHeader);
    fieldNames.forEach(fieldName => {
      const fieldDef = collectionDef.fields?.[fieldName];
      if (!fieldDef) return;
      container.appendChild(renderFieldRow(fieldName, fieldDef, record, bodyField));
    });
  });
}
