import {
  coerceInputValue,
  getRecordTitle,
  resolveEnumValues,
  resolveFieldKind,
  resolveRefCollectionName
} from './genericCrudHelpers.js';

function createLabeledError(message) {
  if (!message) return null;
  const el = document.createElement('div');
  el.className = 'generic-crud-field-error';
  el.textContent = message;
  return el;
}

function buildSelectOption(value, label) {
  const opt = document.createElement('option');
  opt.value = value ?? '';
  opt.textContent = label ?? String(value ?? '');
  return opt;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function removeUndefined(items) {
  return items.filter(item => item !== undefined);
}

function resolveRefOptions({ ref, model, snapshot }) {
  const collectionName = resolveRefCollectionName(ref, model);
  const list = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
  const collectionDef = collectionName ? model?.collections?.[collectionName] : null;
  return {
    collectionName,
    options: list,
    collectionDef
  };
}

export function FieldRenderer({
  fieldDef,
  value,
  onChange,
  error,
  fieldName,
  model,
  snapshot,
  isBodyField
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'generic-crud-field-input';

  const kindInfo = resolveFieldKind(fieldDef, { isBodyField });
  const kind = kindInfo.kind;
  let control = null;

  if (kind === 'markdown') {
    const textarea = document.createElement('textarea');
    textarea.rows = 6;
    textarea.value = value ?? '';
    textarea.addEventListener('input', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = textarea;
  } else if (kind === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', event => {
      onChange(event.target.checked);
    });
    control = input;
  } else if (kind === 'number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value ?? '';
    input.addEventListener('input', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = input;
  } else if (kind === 'enum') {
    const select = document.createElement('select');
    select.appendChild(buildSelectOption('', '—'));
    resolveEnumValues(fieldDef, model).forEach(enumValue => {
      select.appendChild(buildSelectOption(enumValue, enumValue));
    });
    select.value = value ?? '';
    select.addEventListener('change', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = select;
  } else if (kind === 'ref') {
    const select = document.createElement('select');
    select.appendChild(buildSelectOption('', '—'));
    const { options, collectionDef } = resolveRefOptions({ ref: kindInfo.ref, model, snapshot });
    options.forEach(option => {
      const label = getRecordTitle(option, collectionDef) || option.id;
      select.appendChild(buildSelectOption(option.id, label));
    });
    select.value = value ?? '';
    select.addEventListener('change', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = select;
  } else if (kind === 'array') {
    const itemsWrapper = document.createElement('div');
    itemsWrapper.className = 'generic-crud-array';
    let currentItems = normalizeArray(value);
    const itemKind = kindInfo.items?.kind || 'string';

    function updateArray(nextItems) {
      const cleaned = removeUndefined(nextItems);
      const finalValue = cleaned.length ? cleaned : coerceInputValue(fieldDef, '');
      onChange(finalValue);
      currentItems = normalizeArray(finalValue);
      renderItems();
    }

    function renderItemRow(itemValue, index) {
      const row = document.createElement('div');
      row.className = 'generic-crud-array-row';

      if (itemKind === 'ref') {
        const select = document.createElement('select');
        select.appendChild(buildSelectOption('', '—'));
        const { options, collectionDef } = resolveRefOptions({ ref: kindInfo.items.ref, model, snapshot });
        options.forEach(option => {
          const label = getRecordTitle(option, collectionDef) || option.id;
          select.appendChild(buildSelectOption(option.id, label));
        });
        select.value = itemValue ?? '';
        select.addEventListener('change', event => {
          const next = currentItems.slice();
          next[index] = event.target.value || undefined;
          updateArray(next);
        });
        row.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = itemKind === 'number' ? 'number' : 'text';
        input.value = itemValue ?? '';
        input.addEventListener('input', event => {
          const next = currentItems.slice();
          const raw = event.target.value;
          if (itemKind === 'number') {
            next[index] = raw === '' ? undefined : Number(raw);
          } else {
            next[index] = raw;
          }
          updateArray(next);
        });
        row.appendChild(input);
      }

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', () => {
        const next = currentItems.filter((_, idx) => idx !== index);
        updateArray(next);
      });
      row.appendChild(removeButton);

      itemsWrapper.appendChild(row);
    }

    function renderItems() {
      itemsWrapper.innerHTML = '';
      currentItems.forEach(renderItemRow);

      const addRow = document.createElement('div');
      addRow.className = 'generic-crud-array-row';
      if (itemKind === 'ref') {
        const select = document.createElement('select');
        select.appendChild(buildSelectOption('', '—'));
        const { options, collectionDef } = resolveRefOptions({ ref: kindInfo.items.ref, model, snapshot });
        options.forEach(option => {
          const label = getRecordTitle(option, collectionDef) || option.id;
          select.appendChild(buildSelectOption(option.id, label));
        });
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.textContent = 'Add';
        addButton.addEventListener('click', () => {
          if (!select.value) return;
          updateArray(currentItems.concat(select.value));
        });
        addRow.appendChild(select);
        addRow.appendChild(addButton);
      } else {
        const input = document.createElement('input');
        input.type = itemKind === 'number' ? 'number' : 'text';
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.textContent = 'Add';
        addButton.addEventListener('click', () => {
          if (!input.value) return;
          const nextValue = itemKind === 'number' ? Number(input.value) : input.value;
          if (itemKind === 'number' && !Number.isFinite(nextValue)) return;
          updateArray(currentItems.concat(nextValue));
          input.value = '';
        });
        addRow.appendChild(input);
        addRow.appendChild(addButton);
      }
      itemsWrapper.appendChild(addRow);
    }

    renderItems();
    control = itemsWrapper;
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value ?? '';
    input.addEventListener('input', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = input;
  }

  if (control) {
    wrapper.appendChild(control);
  }

  const errorEl = createLabeledError(error);
  if (errorEl) wrapper.appendChild(errorEl);

  return wrapper;
}
