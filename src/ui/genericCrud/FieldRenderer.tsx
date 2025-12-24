import {
  coerceInputValue,
  getRecordTitle,
  getBodyFieldName,
  resolveRefCollectionName
} from './genericCrudHelpers.ts';

function buildEnumOptions(fieldDef, model) {
  if (Array.isArray(fieldDef?.values)) return fieldDef.values;
  if (fieldDef?.enum && model?.enums?.[fieldDef.enum]) {
    return model.enums[fieldDef.enum];
  }
  return [];
}

function buildRefOptions(refCollectionName, snapshot, model) {
  const records = Array.isArray(snapshot?.[refCollectionName]) ? snapshot[refCollectionName] : [];
  const collectionDef = model?.collections?.[refCollectionName] || null;
  return records.map(record => ({
    id: record?.id,
    label: getRecordTitle(record, collectionDef) || record?.id
  }));
}

function shouldAllowEmpty(fieldDef) {
  return !fieldDef?.required || fieldDef?.nullable;
}

function coerceEmptyValue(fieldDef) {
  if (fieldDef?.nullable) return null;
  if (!fieldDef?.required) return undefined;
  return undefined;
}

function coerceArrayEmptyValue(fieldDef) {
  if (fieldDef?.nullable) return null;
  if (fieldDef?.required) return undefined;
  return undefined;
}

export function renderFieldInput({
  fieldDef,
  fieldName,
  value,
  onChange,
  error,
  model,
  snapshot,
  collectionDef
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'generic-crud-field';

  const bodyField = getBodyFieldName(collectionDef);
  const isMarkdown =
    fieldDef?.ui?.widget === 'markdown' || fieldDef?.widget === 'markdown' || fieldName === bodyField;
  const type = fieldDef?.type || 'string';
  const isArray = type === 'array';
  const isEnum = !!fieldDef?.enum;
  const isRef = !!fieldDef?.ref;

  if (isArray) {
    const itemsDef = fieldDef.items || {};
    const itemsRef = itemsDef.ref;
    const itemsType = itemsDef.type || 'string';
    const arrayValue = Array.isArray(value) ? value : [];

    if (itemsRef) {
      const refCollectionName = resolveRefCollectionName(itemsRef, model);
      const options = buildRefOptions(refCollectionName, snapshot, model);

      const list = document.createElement('div');
      list.className = 'generic-crud-array-list';

      arrayValue.forEach(itemId => {
        const row = document.createElement('div');
        row.className = 'generic-crud-array-item';
        const label = options.find(opt => opt.id === itemId)?.label || itemId || '—';
        const text = document.createElement('span');
        text.textContent = label;
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
          const next = arrayValue.filter(id => id !== itemId);
          onChange(next.length ? next : coerceArrayEmptyValue(fieldDef));
        });
        row.append(text, removeBtn);
        list.appendChild(row);
      });

      const addRow = document.createElement('div');
      addRow.className = 'generic-crud-array-add';
      const select = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Select…';
      select.appendChild(empty);
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.id;
        opt.textContent = option.label;
        select.appendChild(opt);
      });
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = 'Add';
      addBtn.addEventListener('click', () => {
        const nextId = select.value;
        if (!nextId) return;
        if (arrayValue.includes(nextId)) return;
        const next = [...arrayValue, nextId];
        onChange(next);
        select.value = '';
      });
      addRow.append(select, addBtn);

      wrapper.append(list, addRow);
    } else if (itemsType === 'number') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Comma-separated numbers';
      input.value = arrayValue.join(', ');
      input.addEventListener('input', () => {
        const raw = input.value.trim();
        if (!raw) {
          onChange(coerceArrayEmptyValue(fieldDef));
          return;
        }
        const parts = raw
          .split(',')
          .map(part => Number(part.trim()))
          .filter(value => Number.isFinite(value));
        onChange(parts.length ? parts : coerceArrayEmptyValue(fieldDef));
      });
      wrapper.appendChild(input);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Comma-separated values';
      input.value = arrayValue.join(', ');
      input.addEventListener('input', () => {
        const raw = input.value.trim();
        if (!raw) {
          onChange(coerceArrayEmptyValue(fieldDef));
          return;
        }
        const parts = raw
          .split(',')
          .map(part => part.trim())
          .filter(Boolean);
        onChange(parts.length ? parts : coerceArrayEmptyValue(fieldDef));
      });
      wrapper.appendChild(input);
    }
  } else if (isEnum) {
    const select = document.createElement('select');
    if (shouldAllowEmpty(fieldDef)) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '—';
      select.appendChild(empty);
    }
    buildEnumOptions(fieldDef, model).forEach(option => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      select.appendChild(opt);
    });
    select.value = value ?? '';
    select.addEventListener('change', () => {
      if (select.value === '') {
        onChange(coerceEmptyValue(fieldDef));
      } else {
        onChange(select.value);
      }
    });
    wrapper.appendChild(select);
  } else if (isRef) {
    const refCollectionName = resolveRefCollectionName(fieldDef.ref, model);
    const select = document.createElement('select');
    const options = buildRefOptions(refCollectionName, snapshot, model);
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    select.appendChild(empty);
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.id;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    select.value = value ?? '';
    select.addEventListener('change', () => {
      if (select.value === '') {
        onChange(coerceEmptyValue(fieldDef));
      } else {
        onChange(select.value);
      }
    });
    wrapper.appendChild(select);
  } else if (type === 'boolean') {
    const select = document.createElement('select');
    if (shouldAllowEmpty(fieldDef)) {
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = '—';
      select.appendChild(empty);
    }
    const trueOpt = document.createElement('option');
    trueOpt.value = 'true';
    trueOpt.textContent = 'True';
    const falseOpt = document.createElement('option');
    falseOpt.value = 'false';
    falseOpt.textContent = 'False';
    select.append(trueOpt, falseOpt);
    select.value = value === true ? 'true' : value === false ? 'false' : '';
    select.addEventListener('change', () => {
      if (select.value === '') {
        onChange(coerceEmptyValue(fieldDef));
      } else {
        onChange(coerceInputValue(fieldDef, select.value));
      }
    });
    wrapper.appendChild(select);
  } else if (type === 'number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value ?? '';
    input.addEventListener('input', () => {
      onChange(coerceInputValue(fieldDef, input.value));
    });
    wrapper.appendChild(input);
  } else if (isMarkdown) {
    const textarea = document.createElement('textarea');
    textarea.rows = 10;
    textarea.value = value ?? '';
    textarea.addEventListener('input', () => {
      onChange(coerceInputValue(fieldDef, textarea.value));
    });
    wrapper.appendChild(textarea);
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    input.addEventListener('input', () => {
      onChange(coerceInputValue(fieldDef, input.value));
    });
    wrapper.appendChild(input);
  }

  if (error) {
    const errorEl = document.createElement('div');
    errorEl.className = 'generic-crud-error';
    errorEl.textContent = error;
    wrapper.appendChild(errorEl);
  }

  return wrapper;
}
