import {
  getBodyFieldName,
  getFieldGroup,
  getFieldLabel,
  getFieldOrder
} from './genericCrudHelpers.ts';
import { renderFieldInput } from './FieldRenderer.tsx';

function buildErrorMap(errors = []) {
  const map = new Map();
  errors.forEach(error => {
    const fieldPath = error?.fieldPath || error?.field || '';
    const fieldName = fieldPath.split('[')[0];
    if (!map.has(fieldName)) map.set(fieldName, []);
    map.get(fieldName).push(error);
  });
  return map;
}

function renderErrorSummary(errors) {
  const wrapper = document.createElement('div');
  wrapper.className = 'generic-crud-error-summary';
  const title = document.createElement('div');
  title.textContent = `Fix ${errors.length} issues`;
  wrapper.appendChild(title);
  const list = document.createElement('ul');
  errors.forEach(error => {
    const item = document.createElement('li');
    const fieldPath = error?.fieldPath || error?.field || '';
    item.textContent = `${fieldPath || 'Record'}: ${error?.message || 'Validation error'}`;
    list.appendChild(item);
  });
  wrapper.appendChild(list);
  return wrapper;
}

export function renderRecordEditor({
  collectionDef,
  draft,
  mode,
  model,
  snapshot,
  errors,
  onDraftChange,
  onSave,
  onCancel
}) {
  const wrapper = document.createElement('div');

  const heading = document.createElement('div');
  heading.className = 'generic-crud-pane-header';
  heading.textContent = mode === 'create' ? 'New record' : 'Edit record';
  wrapper.appendChild(heading);

  if (errors?.length) {
    wrapper.appendChild(renderErrorSummary(errors));
  }

  const fieldOrder = getFieldOrder(collectionDef);
  const errorMap = buildErrorMap(errors);
  const bodyField = getBodyFieldName(collectionDef);
  let currentGroup = null;

  fieldOrder.forEach(fieldName => {
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
    row.className = 'form-row';
    if (fieldName === bodyField) row.classList.add('generic-crud-body-row');
    const label = document.createElement('label');
    label.textContent = getFieldLabel(fieldName, fieldDef);
    if (fieldDef.required) {
      const required = document.createElement('span');
      required.className = 'generic-crud-required';
      required.textContent = ' *';
      label.appendChild(required);
    }
    row.appendChild(label);

    const fieldErrors = errorMap.get(fieldName) || [];
    const fieldInput = renderFieldInput({
      fieldDef,
      fieldName,
      value: draft?.[fieldName],
      model,
      snapshot,
      collectionDef,
      error: fieldErrors[0]?.message,
      onChange: nextValue => {
        const nextDraft = { ...(draft || {}) };
        if (nextValue === undefined) {
          delete nextDraft[fieldName];
        } else {
          nextDraft[fieldName] = nextValue;
        }
        onDraftChange(nextDraft);
      }
    });

    row.appendChild(fieldInput);
    wrapper.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'form-actions';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Save';
  saveBtn.disabled = !!errors?.length;
  saveBtn.addEventListener('click', () => onSave());
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => onCancel());
  actions.append(saveBtn, cancelBtn);
  wrapper.appendChild(actions);

  return wrapper;
}
