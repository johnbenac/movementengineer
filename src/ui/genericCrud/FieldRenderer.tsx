import {
  coerceInputValue,
  getFieldLabel,
  resolveEnumValues,
  resolveRefCollectionName,
  getRecordTitle
} from './genericCrudHelpers.ts';

function createInputRow(labelText) {
  const row = document.createElement('div');
  row.className = 'form-row';
  const label = document.createElement('label');
  label.textContent = labelText;
  row.appendChild(label);
  return { row, label };
}

function renderError(row, error) {
  if (!error) return;
  const err = document.createElement('div');
  err.className = 'validation-error';
  err.textContent = error;
  row.appendChild(err);
}

function renderPrimitiveArray({ row, fieldDef, value, onChange, fieldId }) {
  const itemType = fieldDef.items?.type || 'string';
  const input = document.createElement('textarea');
  input.rows = 2;
  if (fieldId) input.id = fieldId;
  input.value = Array.isArray(value) ? value.join(', ') : '';
  input.placeholder = 'Comma-separated values';
  input.addEventListener('input', event => {
    const raw = event.target.value;
    if (!raw.trim()) {
      onChange(fieldDef?.nullable ? null : undefined);
      return;
    }
    const parts = raw
      .split(',')
      .map(part => part.trim())
      .filter(part => part.length > 0);
    if (itemType === 'number') {
      const parsed = parts.map(part => Number(part)).filter(num => Number.isFinite(num));
      onChange(parsed);
      return;
    }
    onChange(parts);
  });
  row.appendChild(input);
}

function renderRefSelect({ row, fieldDef, value, onChange, model, snapshot, fieldId }) {
  const collectionName = resolveRefCollectionName(fieldDef, model);
  const select = document.createElement('select');
  if (fieldId) select.id = fieldId;
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '—';
  select.appendChild(emptyOption);

  const records = collectionName ? snapshot?.[collectionName] || [] : [];
  const collectionDef = collectionName ? model?.collections?.[collectionName] : null;
  records.forEach(record => {
    const option = document.createElement('option');
    option.value = record.id;
    option.textContent = getRecordTitle(record, collectionDef);
    select.appendChild(option);
  });

  select.value = value || '';
  select.addEventListener('change', event => {
    const next = event.target.value;
    if (!next) {
      onChange(fieldDef?.nullable ? null : undefined);
      return;
    }
    onChange(next);
  });

  row.appendChild(select);
}

function renderRefArray({ row, fieldDef, value, onChange, model, snapshot, fieldId }) {
  const collectionName = resolveRefCollectionName(fieldDef, model);
  const records = collectionName ? snapshot?.[collectionName] || [] : [];
  const collectionDef = collectionName ? model?.collections?.[collectionName] : null;
  const ids = Array.isArray(value) ? value.slice() : [];

  const list = document.createElement('div');
  list.className = 'chip-row';
  if (fieldId) list.dataset.field = fieldId;

  const emit = next => {
    if (!next.length) {
      onChange(fieldDef?.nullable ? null : undefined);
      return;
    }
    onChange(next);
  };

  ids.forEach((id, index) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const record = records.find(item => item?.id === id);
    chip.textContent = record ? getRecordTitle(record, collectionDef) : id;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      const next = ids.filter((_, i) => i !== index);
      emit(next);
    });
    chip.appendChild(remove);
    list.appendChild(chip);
  });

  const controls = document.createElement('div');
  controls.className = 'inline-actions';
  const select = document.createElement('select');
  records.forEach(record => {
    const option = document.createElement('option');
    option.value = record.id;
    option.textContent = getRecordTitle(record, collectionDef);
    select.appendChild(option);
  });
  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.textContent = 'Add';
  addButton.addEventListener('click', () => {
    const nextId = select.value;
    if (!nextId) return;
    emit([...ids, nextId]);
  });

  controls.appendChild(select);
  controls.appendChild(addButton);

  row.appendChild(list);
  row.appendChild(controls);
}

export function FieldRenderer({
  fieldName,
  fieldDef,
  value,
  onChange,
  error,
  model,
  snapshot,
  bodyField
}) {
  const labelText = getFieldLabel(fieldName, fieldDef);
  const { row, label } = createInputRow(labelText);

  if (fieldName) {
    label.htmlFor = `generic-field-${fieldName}`;
  }

  const fieldType = fieldDef?.type || 'string';
  const enumValues = resolveEnumValues(fieldDef, model);
  const isBodyField = bodyField && fieldName === bodyField;
  const isMarkdown = fieldDef?.ui?.widget === 'markdown' || isBodyField;
  const isRef = !!fieldDef?.ref;

  const fieldId = fieldName ? `generic-field-${fieldName}` : null;
  if (fieldId) {
    label.htmlFor = fieldId;
  }

  if (fieldType === 'array') {
    const isRefArray = !!fieldDef?.items?.ref;
    if (isRefArray) {
      renderRefArray({ row, fieldDef, value, onChange, model, snapshot, fieldId });
    } else {
      renderPrimitiveArray({ row, fieldDef, value, onChange, fieldId });
    }
    renderError(row, error);
    return row;
  }

  if (isRef) {
    renderRefSelect({ row, fieldDef, value, onChange, model, snapshot, fieldId });
    renderError(row, error);
    return row;
  }

  if (enumValues) {
    const select = document.createElement('select');
    if (fieldId) select.id = fieldId;
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '—';
    select.appendChild(emptyOption);
    enumValues.forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      select.appendChild(option);
    });
    select.value = value ?? '';
    select.addEventListener('change', event => {
      const next = event.target.value;
      onChange(next ? next : fieldDef?.nullable ? null : undefined);
    });
    row.appendChild(select);
    renderError(row, error);
    return row;
  }

  if (fieldType === 'boolean') {
    const input = document.createElement('input');
    if (fieldId) input.id = fieldId;
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', event => onChange(Boolean(event.target.checked)));
    row.appendChild(input);
    renderError(row, error);
    return row;
  }

  if (fieldType === 'number') {
    const input = document.createElement('input');
    if (fieldId) input.id = fieldId;
    input.type = 'number';
    if (value !== null && value !== undefined) input.value = String(value);
    input.addEventListener('input', event => {
      const next = coerceInputValue(fieldDef, event.target.value);
      onChange(next);
    });
    row.appendChild(input);
    renderError(row, error);
    return row;
  }

  const input = isMarkdown ? document.createElement('textarea') : document.createElement('input');
  if (fieldId) input.id = fieldId;
  if (!isMarkdown) input.type = 'text';
  if (isMarkdown) input.rows = 6;
  input.value = value ?? '';
  input.addEventListener('input', event => {
    const next = coerceInputValue(fieldDef, event.target.value);
    onChange(next);
  });
  row.appendChild(input);
  renderError(row, error);
  return row;
}
