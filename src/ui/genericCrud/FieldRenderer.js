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
  if (ref === '*') {
    return { collectionName: '*', options: [], collectionDef: null };
  }
  const collectionName = resolveRefCollectionName(ref, model);
  const list = Array.isArray(snapshot?.[collectionName]) ? snapshot[collectionName] : [];
  const collectionDef = collectionName ? model?.collections?.[collectionName] : null;
  return {
    collectionName,
    options: list,
    collectionDef
  };
}

function shouldFilterByMovement({ collectionName, model, options }) {
  if (!collectionName || collectionName === 'movements') return false;
  const collectionDef = model?.collections?.[collectionName];
  if (collectionDef?.fields?.movementId) return true;
  return options.some(option => option && Object.prototype.hasOwnProperty.call(option, 'movementId'));
}

function filterOptionsByMovement({ options, record, collectionName, model }) {
  if (!record?.movementId) return options;
  if (!shouldFilterByMovement({ collectionName, model, options })) return options;
  return options.filter(option => option?.movementId === record.movementId);
}

function resolveNodeIndex(snapshot) {
  if (snapshot?.__nodeIndex) return snapshot.__nodeIndex;
  if (snapshot?.nodeIndex) return snapshot.nodeIndex;
  const ctx = typeof globalThis !== 'undefined' ? globalThis.MovementEngineer?.ctx : null;
  return ctx?.store?.getState?.()?.nodeIndex || null;
}

function buildNodeOptions({ nodeIndex, record, refTarget }) {
  const nodes = Array.isArray(nodeIndex?.all) ? nodeIndex.all : [];
  const movementId = record?.movementId || null;
  return nodes.filter(node => {
    if (movementId && node.movementId && node.movementId !== movementId) return false;
    if (refTarget && refTarget !== '*' && node.collectionName !== refTarget) return false;
    return true;
  });
}

function buildNodeSelect({
  nodeIndex,
  record,
  refTarget,
  value,
  onChange
}) {
  const select = document.createElement('select');
  select.appendChild(buildSelectOption('', '—'));
  const options = buildNodeOptions({ nodeIndex, record, refTarget });
  options.forEach(node => {
    const label = node.title || node.id;
    const suffix = `${node.collectionName}:${node.id}`;
    select.appendChild(buildSelectOption(node.id, `${label} (${suffix})`));
  });
  select.value = value ?? '';
  select.addEventListener('change', event => {
    onChange(event.target.value || undefined);
  });
  return select;
}

export function FieldRenderer({
  fieldDef,
  value,
  onChange,
  error,
  fieldName,
  collectionName,
  record,
  model,
  snapshot,
  isBodyField
}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'generic-crud-field-input';

  const kindInfo = resolveFieldKind(fieldDef, { isBodyField });
  const kind = kindInfo.kind;
  let control = null;

  if (!control && kind === 'markdown') {
    const textarea = document.createElement('textarea');
    textarea.rows = 6;
    textarea.value = value ?? '';
    textarea.addEventListener('input', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = textarea;
  } else if (!control && kind === 'boolean') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(value);
    input.addEventListener('change', event => {
      onChange(event.target.checked);
    });
    control = input;
  } else if (!control && kind === 'number') {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value ?? '';
    input.addEventListener('input', event => {
      onChange(coerceInputValue(fieldDef, event.target.value));
    });
    control = input;
  } else if (!control && kind === 'enum') {
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
  } else if (!control && kind === 'ref') {
    if (kindInfo.ref === '*') {
      const nodeIndex = resolveNodeIndex(snapshot);
      control = buildNodeSelect({
        nodeIndex,
        record,
        refTarget: '*',
        value,
        onChange: nextValue => onChange(coerceInputValue(fieldDef, nextValue))
      });
    } else {
      const select = document.createElement('select');
      select.appendChild(buildSelectOption('', '—'));
      const { options, collectionDef, collectionName: refCollectionName } = resolveRefOptions({
        ref: kindInfo.ref,
        model,
        snapshot
      });
      const filteredOptions = filterOptionsByMovement({
        options,
        record,
        collectionName: refCollectionName,
        model
      });
      filteredOptions.forEach(option => {
        const label = getRecordTitle(option, collectionDef) || option.id;
        select.appendChild(buildSelectOption(option.id, label));
      });
      select.value = value ?? '';
      select.addEventListener('change', event => {
        onChange(coerceInputValue(fieldDef, event.target.value));
      });
      control = select;
    }
  } else if (!control && kind === 'array') {
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
        if (kindInfo.items.ref === '*') {
          const nodeIndex = resolveNodeIndex(snapshot);
          const select = buildNodeSelect({
            nodeIndex,
            record,
            refTarget: '*',
            value: itemValue,
            onChange: nextValue => {
              const next = currentItems.slice();
              next[index] = nextValue || undefined;
              updateArray(next);
            }
          });
          row.appendChild(select);
        } else {
          const select = document.createElement('select');
          select.appendChild(buildSelectOption('', '—'));
          const { options, collectionDef, collectionName: refCollectionName } = resolveRefOptions({
            ref: kindInfo.items.ref,
            model,
            snapshot
          });
          const filteredOptions = filterOptionsByMovement({
            options,
            record,
            collectionName: refCollectionName,
            model
          });
          filteredOptions.forEach(option => {
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
        }
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
        if (kindInfo.items.ref === '*') {
          const nodeIndex = resolveNodeIndex(snapshot);
          const select = buildNodeSelect({
            nodeIndex,
            record,
            refTarget: '*',
            value: '',
            onChange: () => {}
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
          const select = document.createElement('select');
          select.appendChild(buildSelectOption('', '—'));
          const { options, collectionDef, collectionName: refCollectionName } = resolveRefOptions({
            ref: kindInfo.items.ref,
            model,
            snapshot
          });
          const filteredOptions = filterOptionsByMovement({
            options,
            record,
            collectionName: refCollectionName,
            model
          });
          filteredOptions.forEach(option => {
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
        }
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
  } else if (!control) {
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
