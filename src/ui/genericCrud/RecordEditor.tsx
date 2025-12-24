import {
  coerceInputValue,
  generateId,
  getBodyField,
  getOrderedFieldNames
} from './genericCrudHelpers.ts';
import { FieldRenderer } from './FieldRenderer.tsx';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function isDevMode() {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV !== 'production';
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  return true;
}

function cloneRecord(record) {
  return record ? JSON.parse(JSON.stringify(record)) : {};
}

function normalizeErrors(issues) {
  return issues.map(issue => ({
    fieldPath: issue.fieldPath || '',
    message: issue.message || 'Invalid value'
  }));
}

function requiredFieldIssues(draft, collectionDef) {
  const issues = [];
  Object.entries(collectionDef?.fields || {}).forEach(([fieldName, fieldDef]) => {
    if (!fieldDef?.required) return;
    const value = draft?.[fieldName];
    if (value === undefined || value === null) {
      issues.push({ fieldPath: fieldName, message: 'This field is required.' });
      return;
    }
    if (typeof value === 'string' && value.trim() === '') {
      issues.push({ fieldPath: fieldName, message: 'This field is required.' });
    }
    if (Array.isArray(value) && value.length === 0) {
      issues.push({ fieldPath: fieldName, message: 'This field is required.' });
    }
  });
  return issues;
}

function validateDraft(draft, collectionDef, model) {
  const validator = globalScope?.ModelValidator;
  const issues = validator?.validateRecord
    ? validator.validateRecord(draft, collectionDef, { model })
    : [];
  const baseIssues = normalizeErrors(issues || []);
  const requiredIssues = requiredFieldIssues(draft, collectionDef);
  const allIssues = baseIssues.concat(requiredIssues);
  return {
    ok: allIssues.length === 0,
    errors: allIssues
  };
}

export function RecordEditor({
  record,
  collectionName,
  collectionDef,
  modelRegistry,
  plugins,
  model,
  snapshot,
  mode,
  onSave,
  onCancel
}) {
  const wrapper = document.createElement('div');
  const header = document.createElement('div');
  header.className = 'generic-crud-detail-header';
  const title = document.createElement('h3');
  title.textContent = mode === 'create' ? 'New record' : 'Edit record';
  header.appendChild(title);
  wrapper.appendChild(header);

  let draft = cloneRecord(record);
  const bodyField = getBodyField(collectionDef);
  const fields = getOrderedFieldNames(collectionDef);

  const errorSummary = document.createElement('div');
  errorSummary.className = 'generic-crud-error-summary';
  wrapper.appendChild(errorSummary);

  const form = document.createElement('div');

  const fieldErrors = new Map();
  let latestErrors = [];

  function refreshValidation() {
    const result = validateDraft(draft, collectionDef, model);
    latestErrors = result.errors || [];
    fieldErrors.clear();
    result.errors.forEach(error => {
      if (!error.fieldPath) return;
      const bucket = fieldErrors.get(error.fieldPath) || [];
      bucket.push(error.message);
      fieldErrors.set(error.fieldPath, bucket);
    });

    errorSummary.innerHTML = '';
    if (!result.ok) {
      const summaryTitle = document.createElement('div');
      summaryTitle.textContent = `Fix ${result.errors.length} issues`;
      errorSummary.appendChild(summaryTitle);
      const list = document.createElement('ul');
      result.errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error.fieldPath
          ? `${error.fieldPath}: ${error.message}`
          : error.message;
        list.appendChild(li);
      });
      errorSummary.appendChild(list);
      errorSummary.classList.add('visible');
    } else {
      errorSummary.classList.remove('visible');
    }

    refreshFieldErrors();
    saveButton.disabled = !result.ok;
    return result.ok;
  }

  function updateDraft(fieldName, nextValue) {
    if (nextValue === undefined) {
      delete draft[fieldName];
    } else {
      draft[fieldName] = nextValue;
    }
    refreshValidation();
  }

  fields.forEach(fieldName => {
    const fieldDef = collectionDef?.fields?.[fieldName] || {};
    const row = document.createElement('div');
    row.className = 'form-row';
    const label = document.createElement('label');
    label.textContent = fieldName;
    row.appendChild(label);

    let fieldWrapper = null;
    const widgetId = fieldDef?.ui?.widget || null;
    if (widgetId && plugins?.getFieldWidget) {
      const widgetDef = plugins.getFieldWidget({ collectionName, fieldName, widgetId });
      if (widgetDef?.component) {
        const Widget = widgetDef.component;
        fieldWrapper = Widget({
          modelRegistry,
          plugins,
          collectionName,
          collectionDef,
          fieldName,
          fieldDef,
          value: draft?.[fieldName],
          onChange: nextValue => {
            const coerced = coerceInputValue(fieldDef, nextValue);
            updateDraft(fieldName, coerced);
          },
          record: draft,
          mode,
          errors: latestErrors
        });
      } else if (isDevMode()) {
        console.warn(
          `[plugins] Missing widget plugin: collection="${collectionName}" field="${fieldName}" widget="${widgetId}"`
        );
      }
    }

    if (!fieldWrapper) {
      fieldWrapper = FieldRenderer({
        fieldDef,
        fieldName,
        value: draft?.[fieldName],
        model,
        snapshot,
        isBodyField: fieldName === bodyField,
        error: null,
        onChange: nextValue => {
          const coerced = coerceInputValue(fieldDef, nextValue);
          updateDraft(fieldName, coerced);
        }
      });
    }

    row.appendChild(fieldWrapper);
    form.appendChild(row);
  });

  wrapper.appendChild(form);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  saveButton.addEventListener('click', () => {
    if (!draft.id) {
      draft.id = generateId(collectionDef?.fields?.id || null);
    }
    const isValid = refreshValidation();
    if (!isValid) return;
    onSave(draft);
  });

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', () => onCancel());

  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  wrapper.appendChild(actions);

  refreshValidation();

  function refreshFieldErrors() {
    const rows = form.querySelectorAll('.form-row');
    rows.forEach(row => {
      const label = row.querySelector('label');
      const fieldName = label?.textContent || '';
      const errorText = fieldErrors.get(fieldName)?.[0] || '';
      const existing = row.querySelector('.generic-crud-field-error');
      if (existing) existing.remove();
      if (errorText) {
        const errorEl = document.createElement('div');
        errorEl.className = 'generic-crud-field-error';
        errorEl.textContent = errorText;
        row.appendChild(errorEl);
      }
    });
  }

  refreshFieldErrors();

  return wrapper;
}
