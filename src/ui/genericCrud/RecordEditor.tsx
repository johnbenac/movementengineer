import {
  getOrderedFieldNames,
  getRequiredFieldIssues,
  getRecordTitle
} from './genericCrudHelpers.ts';
import { FieldRenderer } from './FieldRenderer.tsx';

function buildFieldGroups(fieldNames, collectionDef) {
  const groups = new Map();
  fieldNames.forEach(name => {
    const group = collectionDef?.fields?.[name]?.ui?.group || null;
    const key = group || '__default';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(name);
  });
  return groups;
}

function formatIssue(issue) {
  const fieldPath = issue.fieldPath || issue.field || 'unknown';
  const message = issue.message || 'Invalid value.';
  return { fieldPath, message };
}

export function createRecordEditor(container) {
  const header = document.createElement('div');
  header.className = 'pane-header';

  const title = document.createElement('div');
  title.textContent = 'Editor';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  actions.appendChild(saveButton);
  actions.appendChild(cancelButton);
  header.appendChild(actions);

  const body = document.createElement('div');
  body.className = 'crud-editor-body';

  container.appendChild(header);
  container.appendChild(body);

  let currentDraft = null;
  let currentErrors = [];
  let fieldErrorEls = new Map();
  let callbacks = {};

  function setErrors(errors) {
    currentErrors = Array.isArray(errors) ? errors : [];
    const summary = body.querySelector('.crud-validation-summary');
    const list = body.querySelector('.crud-validation-list');
    if (summary && list) {
      list.innerHTML = '';
      if (currentErrors.length) {
        summary.textContent = `Fix ${currentErrors.length} issues`;
        summary.style.display = 'block';
        currentErrors.forEach(issue => {
          const { fieldPath, message } = formatIssue(issue);
          const li = document.createElement('li');
          li.textContent = fieldPath ? `${fieldPath}: ${message}` : message;
          list.appendChild(li);
        });
      } else {
        summary.textContent = '';
        summary.style.display = 'none';
      }
    }

    fieldErrorEls.forEach((el, fieldName) => {
      const fieldIssues = currentErrors.filter(issue =>
        String(issue.fieldPath || '').startsWith(fieldName)
      );
      if (fieldIssues.length) {
        el.textContent = fieldIssues[0].message || 'Invalid value.';
      } else {
        el.textContent = '';
      }
    });

    saveButton.disabled = currentErrors.length > 0;
  }

  function validateDraft(validateRecord, collectionDef, draft) {
    if (!validateRecord) return [];
    const issues = validateRecord(draft, collectionDef) || [];
    const requiredIssues = getRequiredFieldIssues(draft, collectionDef);
    return [...issues, ...requiredIssues];
  }

  function render({
    collectionDef,
    record,
    model,
    snapshot,
    mode,
    onSave,
    onCancel,
    validateRecord,
    onDraftChange
  }) {
    callbacks = { onSave, onCancel };
    currentDraft = { ...(record || {}) };
    fieldErrorEls = new Map();

    body.innerHTML = '';

    const summary = document.createElement('div');
    summary.className = 'crud-validation-summary';
    summary.style.display = 'none';
    const list = document.createElement('ul');
    list.className = 'crud-validation-list';
    body.appendChild(summary);
    body.appendChild(list);

    if (!collectionDef) {
      body.appendChild(document.createTextNode('Select a collection.'));
      saveButton.disabled = true;
      return;
    }

    const heading = document.createElement('div');
    heading.className = 'section-heading';
    heading.textContent =
      mode === 'create'
        ? `New ${collectionDef.typeName || collectionDef.collectionName || 'record'}`
        : getRecordTitle(record, collectionDef) || record?.id || 'Edit record';
    body.appendChild(heading);

    const fieldNames = getOrderedFieldNames(collectionDef);
    const groups = buildFieldGroups(fieldNames, collectionDef);
    groups.forEach((fields, groupName) => {
      if (groupName && groupName !== '__default') {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'section-heading small';
        groupHeader.textContent = groupName;
        body.appendChild(groupHeader);
      }

      fields.forEach(fieldName => {
        const fieldDef = collectionDef.fields?.[fieldName] || {};
        const fieldRow = FieldRenderer({
          fieldName,
          fieldDef,
          value: currentDraft[fieldName],
          error: '',
          context: {
            collectionDef,
            model,
            snapshot
          },
          onChange: nextValue => {
            const nextDraft = { ...currentDraft };
            if (nextValue === undefined) {
              delete nextDraft[fieldName];
            } else {
              nextDraft[fieldName] = nextValue;
            }
            currentDraft = nextDraft;
            onDraftChange?.(currentDraft);
            const issues = validateDraft(validateRecord, collectionDef, currentDraft);
            setErrors(issues);
          }
        });
        const errorEl = fieldRow.errorEl || fieldRow.querySelector('.crud-field-error');
        if (errorEl) {
          fieldErrorEls.set(fieldName, errorEl);
        }
        body.appendChild(fieldRow);
      });
    });

    const issues = validateDraft(validateRecord, collectionDef, currentDraft);
    setErrors(issues);
  }

  saveButton.addEventListener('click', () => {
    if (!callbacks.onSave) return;
    callbacks.onSave(currentDraft, currentErrors);
  });

  cancelButton.addEventListener('click', () => {
    callbacks.onCancel?.();
  });

  return { render, setErrors };
}
