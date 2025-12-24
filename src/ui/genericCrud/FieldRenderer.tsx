import {
  coerceInputValue,
  isMarkdownField,
  getEnumValues,
  resolveRefCollectionName,
  getRecordTitle
} from './genericCrudHelpers.ts';

function createFieldRow() {
  const row = document.createElement('div');
  row.className = 'form-row crud-field-row';
  return row;
}

function normalizeEmptyValue(fieldDef) {
  if (fieldDef?.nullable) return null;
  if (!fieldDef?.required) return undefined;
  return undefined;
}

function normalizeArrayValue(fieldDef, nextArray) {
  if (!Array.isArray(nextArray) || nextArray.length === 0) {
    return normalizeEmptyValue(fieldDef);
  }
  return nextArray;
}

function buildLabel(fieldName, fieldDef) {
  return fieldDef?.label || fieldDef?.title || fieldDef?.ui?.label || fieldName;
}

function createErrorEl(error) {
  const errorEl = document.createElement('div');
  errorEl.className = 'crud-field-error';
  if (error) {
    errorEl.textContent = error;
  }
  return errorEl;
}

export function FieldRenderer({
  fieldName,
  fieldDef,
  value,
  onChange,
  error,
  context = {}
}) {
  const row = createFieldRow();
  const label = document.createElement('label');
  label.textContent = buildLabel(fieldName, fieldDef);
  row.appendChild(label);

  const inputWrap = document.createElement('div');
  inputWrap.className = 'crud-field-input';
  row.appendChild(inputWrap);

  const errorEl = createErrorEl(error);
  row.appendChild(errorEl);

  const isMarkdown = isMarkdownField(fieldName, fieldDef, context.collectionDef);
  const fieldType = fieldDef?.type || 'string';
  const enumValues = getEnumValues(fieldDef, context.model);

  if (isMarkdown) {
    const textarea = document.createElement('textarea');
    textarea.rows = 8;
    textarea.value = value ?? '';
    textarea.addEventListener('input', () => {
      const nextValue = textarea.value;
      const coerced = coerceInputValue(fieldDef, nextValue);
      onChange?.(coerced);
    });
    inputWrap.appendChild(textarea);
    row.errorEl = errorEl;
    return row;
  }

  if (enumValues && (fieldType === 'string' || fieldType === 'enum')) {
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    select.appendChild(empty);
    enumValues.forEach(entry => {
      const option = document.createElement('option');
      option.value = entry;
      option.textContent = entry;
      select.appendChild(option);
    });
    select.value = value ?? '';
    select.addEventListener('change', () => {
      const next = select.value;
      onChange?.(next ? next : normalizeEmptyValue(fieldDef));
    });
    inputWrap.appendChild(select);
    row.errorEl = errorEl;
    return row;
  }

  if (fieldType === 'boolean') {
    if (fieldDef?.nullable) {
      const select = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '—';
      select.appendChild(empty);
      const trueOpt = document.createElement('option');
      trueOpt.value = 'true';
      trueOpt.textContent = 'True';
      const falseOpt = document.createElement('option');
      falseOpt.value = 'false';
      falseOpt.textContent = 'False';
      select.appendChild(trueOpt);
      select.appendChild(falseOpt);
      select.value = value === true ? 'true' : value === false ? 'false' : '';
      select.addEventListener('change', () => {
        if (!select.value) {
          onChange?.(normalizeEmptyValue(fieldDef));
          return;
        }
        onChange?.(select.value === 'true');
      });
      inputWrap.appendChild(select);
    } else {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(value);
      checkbox.addEventListener('change', () => {
        onChange?.(checkbox.checked);
      });
      inputWrap.appendChild(checkbox);
    }
    row.errorEl = errorEl;
    return row;
  }

  if (fieldDef?.ref && fieldType !== 'array') {
    const select = document.createElement('select');
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    select.appendChild(empty);
    const refCollection = resolveRefCollectionName(fieldDef.ref, context.model);
    const refRecords = Array.isArray(context.snapshot?.[refCollection])
      ? context.snapshot[refCollection]
      : [];
    refRecords.forEach(record => {
      const option = document.createElement('option');
      option.value = record?.id || '';
      option.textContent = getRecordTitle(record, context.model?.collections?.[refCollection]) ||
        record?.id ||
        '';
      select.appendChild(option);
    });
    select.value = value ?? '';
    select.addEventListener('change', () => {
      const next = select.value;
      onChange?.(next ? next : normalizeEmptyValue(fieldDef));
    });
    inputWrap.appendChild(select);
    row.errorEl = errorEl;
    return row;
  }

  if (fieldType === 'array') {
    const list = document.createElement('ul');
    list.className = 'crud-array-list';

    const itemsDef = fieldDef?.items || {};
    const isRefArray = !!itemsDef.ref;

    const addRow = document.createElement('div');
    addRow.className = 'crud-array-add';

    let inputEl;
    if (isRefArray) {
      inputEl = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Select…';
      inputEl.appendChild(empty);

      const refCollection = resolveRefCollectionName(itemsDef.ref, context.model);
      const refRecords = Array.isArray(context.snapshot?.[refCollection])
        ? context.snapshot[refCollection]
        : [];
      refRecords.forEach(record => {
        const option = document.createElement('option');
        option.value = record?.id || '';
        option.textContent = getRecordTitle(record, context.model?.collections?.[refCollection]) ||
          record?.id ||
          '';
        inputEl.appendChild(option);
      });
    } else {
      inputEl = document.createElement('input');
      inputEl.type = itemsDef.type === 'number' ? 'number' : 'text';
    }

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.textContent = 'Add';

    addRow.appendChild(inputEl);
    addRow.appendChild(addButton);

    let currentValue = Array.isArray(value) ? value.slice() : value;

    function updateValue(nextValue) {
      currentValue = nextValue;
      onChange?.(nextValue);
    }

    function renderItems(current) {
      list.innerHTML = '';
      const items = Array.isArray(current) ? current : [];
      items.forEach((item, index) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        if (isRefArray) {
          const refCollection = resolveRefCollectionName(itemsDef.ref, context.model);
          const refRecords = Array.isArray(context.snapshot?.[refCollection])
            ? context.snapshot[refCollection]
            : [];
          const match = refRecords.find(record => record?.id === item);
          label.textContent = getRecordTitle(match, context.model?.collections?.[refCollection]) ||
            item ||
            '';
        } else {
          label.textContent = item === undefined || item === null ? '' : String(item);
        }
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          const next = items.filter((_, idx) => idx !== index);
          const normalized = normalizeArrayValue(fieldDef, next);
          updateValue(normalized);
          renderItems(normalized || []);
        });
        li.appendChild(label);
        li.appendChild(removeButton);
        list.appendChild(li);
      });
    }

    renderItems(currentValue || []);

    addButton.addEventListener('click', () => {
      const raw = inputEl.value;
      if (!raw) return;
      const items = Array.isArray(currentValue) ? currentValue.slice() : [];
      let nextItem = raw;
      if (itemsDef.type === 'number') {
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        nextItem = parsed;
      }
      if (isRefArray) {
        nextItem = raw;
      }
      items.push(nextItem);
      const normalized = normalizeArrayValue(fieldDef, items);
      updateValue(normalized);
      if (inputEl.tagName === 'SELECT') {
        inputEl.value = '';
      } else {
        inputEl.value = '';
      }
      renderItems(normalized || []);
    });

    inputWrap.appendChild(list);
    inputWrap.appendChild(addRow);
    row.errorEl = errorEl;
    return row;
  }

  if (fieldType === 'number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value ?? '';
    input.addEventListener('input', () => {
      const nextValue = input.value;
      const coerced = coerceInputValue(fieldDef, nextValue);
      onChange?.(coerced);
    });
    inputWrap.appendChild(input);
    row.errorEl = errorEl;
    return row;
  }

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value ?? '';
  input.addEventListener('input', () => {
    const nextValue = input.value;
    const coerced = coerceInputValue(fieldDef, nextValue);
    onChange?.(coerced);
  });
  inputWrap.appendChild(input);
  row.errorEl = errorEl;
  return row;
}
