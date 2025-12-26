import {
  coerceInputValue,
  generateId,
  getBodyField,
  getOrderedFieldNames
} from './genericCrudHelpers.js';
import { FieldRenderer } from './FieldRenderer.js';
import { usePlugins } from '../../core/plugins/PluginProvider.js';

const globalScope =
  typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

function getModelRegistry() {
  return globalScope?.ModelRegistry || null;
}

function isDevEnvironment() {
  return globalScope?.MovementEngineer?.bootstrapOptions?.dev === true;
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

function validateDraft(draft, collectionDef, model, snapshot) {
  const validator = globalScope?.ModelValidator;
  const issues = validator?.validateRecord
    ? validator.validateRecord(draft, collectionDef, { model, snapshot })
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
  model,
  snapshot,
  mode,
  onSave,
  onCancel
}) {
  const wrapper = document.createElement('div');
  const plugins = usePlugins();
  const modelRegistry = getModelRegistry();
  const resolvedCollectionName = collectionName || collectionDef?.collectionName || null;
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

  function refreshValidation() {
    const result = validateDraft(draft, collectionDef, model, snapshot);
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
    row.dataset.testid = `generic-crud-field-${fieldName}`;
    const label = document.createElement('label');
    label.textContent = fieldName;
    row.appendChild(label);

    const widgetId = fieldDef?.ui?.widget || null;
    const widget = widgetId && resolvedCollectionName
      ? plugins.getFieldWidget({
        collectionName: resolvedCollectionName,
        fieldName,
        widgetId
      })
      : null;

    if (widgetId && !widget && isDevEnvironment()) {
      console.warn(
        `[plugins] Missing widget plugin: collection="${resolvedCollectionName}" field="${fieldName}" widget="${widgetId}"`
      );
    }

    const fieldWrapper = widget?.component
      ? widget.component({
        modelRegistry,
        plugins,
        collectionName: resolvedCollectionName,
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
        errors: fieldErrors.get(fieldName) || []
      })
      : FieldRenderer({
        fieldDef,
        fieldName,
        collectionName: resolvedCollectionName,
        value: draft?.[fieldName],
        record: draft,
        model,
        snapshot,
        isBodyField: fieldName === bodyField,
        error: null,
        onChange: nextValue => {
          const coerced = coerceInputValue(fieldDef, nextValue);
          updateDraft(fieldName, coerced);
        }
      });

    row.appendChild(fieldWrapper);
    form.appendChild(row);
  });

  wrapper.appendChild(form);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  saveButton.dataset.testid = 'generic-crud-save';
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
