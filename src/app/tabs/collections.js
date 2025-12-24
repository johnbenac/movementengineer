import { getCollectionDoc, getModelForSnapshot } from '../ui/schemaDoc.js';
import { renderMarkdownPreview } from '../ui/markdown.js';

const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};

const PREVIEW_FIELDS = {
  entities: [
    { label: 'Kind', key: 'kind' },
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Summary', key: 'summary', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  practices: [
    { label: 'Kind', key: 'kind' },
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Frequency', key: 'frequency' },
    { label: 'Public', key: 'isPublic', type: 'boolean' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Involved entities', key: 'involvedEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Instructions texts', key: 'instructionsTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  events: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Recurrence', key: 'recurrence' },
    { label: 'Timing rule', key: 'timingRule' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Main practices', key: 'mainPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Readings', key: 'readingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' }
  ],
  rules: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'Details', key: 'details', type: 'paragraph' },
    { label: 'Applies to', key: 'appliesTo', type: 'chips', facet: 'appliesTo', scope: 'rules' },
    { label: 'Domain', key: 'domain', type: 'chips', facet: 'domain', scope: 'rules' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Supporting texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
    { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
    { label: 'Related practices', key: 'relatedPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' }
  ],
  claims: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Category', key: 'category' },
    { label: 'Text', key: 'text', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag', scope: 'claims' },
    { label: 'About entities', key: 'aboutEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Source texts', key: 'sourceTextIds', type: 'idList', ref: 'texts' },
    { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips', facet: 'sourceOfTruth' },
    { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Notes', key: 'notes', type: 'paragraph' }
  ],
  textCollections: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Root texts', key: 'rootTextIds', type: 'idList', ref: 'texts' }
  ],
  texts: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Label', key: 'label' },
    { label: 'Parent text', key: 'parentId', type: 'id', ref: 'texts' },
    { label: 'Content', key: 'content', type: 'paragraph' },
    { label: 'Main function', key: 'mainFunction' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Mentions entities', key: 'mentionsEntityIds', type: 'idList', ref: 'entities' }
  ],
  media: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Kind', key: 'kind' },
    { label: 'URI', key: 'uri', type: 'link' },
    { label: 'Title', key: 'title' },
    { label: 'Description', key: 'description', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' },
    { label: 'Linked entities', key: 'linkedEntityIds', type: 'idList', ref: 'entities' },
    { label: 'Linked practices', key: 'linkedPracticeIds', type: 'idList', ref: 'practices' },
    { label: 'Linked events', key: 'linkedEventIds', type: 'idList', ref: 'events' },
    { label: 'Linked texts', key: 'linkedTextIds', type: 'idList', ref: 'texts' }
  ],
  notes: [
    { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
    { label: 'Target type', key: 'targetType' },
    { label: 'Target', key: 'targetId' },
    { label: 'Author', key: 'author' },
    { label: 'Context', key: 'context', type: 'paragraph' },
    { label: 'Body', key: 'body', type: 'paragraph' },
    { label: 'Tags', key: 'tags', type: 'chips', facet: 'tag' }
  ]
};

function getState(ctx) {
  return ctx.store.getState() || {};
}

function getDomainService(ctx) {
  return ctx.services.DomainService;
}

function getMarkdownLoader(ctx) {
  return ctx?.services?.MarkdownDatasetLoader || window.MarkdownDatasetLoader || null;
}

function getStorageService(ctx) {
  return ctx.services.StorageService;
}

function getStore(ctx) {
  return ctx.store || null;
}

function getActions(ctx) {
  return ctx.actions;
}

function getViewModels(ctx) {
  return ctx.services.ViewModels;
}

function applyState(ctx, updater) {
  if (typeof ctx?.update === 'function') {
    return ctx.update(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next || prev;
    });
  }
  if (typeof ctx?.setState === 'function') {
    const prev = typeof ctx?.getState === 'function' ? ctx.getState() : {};
    const next = typeof updater === 'function' ? updater(prev) : updater;
    return ctx.setState(next || prev);
  }
  return null;
}

function getCollectionNames(ctx) {
  const DomainService = getDomainService(ctx);
  return Array.isArray(DomainService?.COLLECTION_NAMES)
    ? DomainService.COLLECTION_NAMES
    : [];
}

function getModel(ctx) {
  const snapshot = getState(ctx)?.snapshot || null;
  return getModelForSnapshot(snapshot);
}

function getCollectionsWithMovementId(ctx) {
  const DomainService = getDomainService(ctx);
  return DomainService?.COLLECTIONS_WITH_MOVEMENT_ID || new Set();
}

function inferTargetCollectionFromField(field) {
  if (!field) return null;
  if (field === 'parentId') return 'texts';
  if (/TextIds$/.test(field) || field === 'rootTextIds') return 'texts';
  if (/EntityIds$/.test(field)) return 'entities';
  if (/PracticeIds$/.test(field)) return 'practices';
  if (/ClaimIds$/.test(field)) return 'claims';
  if (/EventIds$/.test(field)) return 'events';
  return null;
}

function dedupeRefFields(fields) {
  const seen = new Set();
  return (fields || [])
    .filter(f => f.field && f.target)
    .filter(f => {
      const key = `${f.field}:${f.target}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function deriveLegacySchemaGuide(ctx, collectionName, movementId) {
  const DomainService = getDomainService(ctx);
  const loader = getMarkdownLoader(ctx);

  let skeleton = {};
  try {
    skeleton = DomainService?.createSkeletonItem
      ? DomainService.createSkeletonItem(collectionName, movementId || 'mov-placeholder')
      : {};
  } catch {
    skeleton = {};
  }

  const expectedKeys = new Set(Object.keys(skeleton || {}));

  (PREVIEW_FIELDS[collectionName] || []).forEach(f => expectedKeys.add(f.key));

  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);

  const requiredKeys = new Set(['id']);
  if (collectionsWithMovementId.has(collectionName)) requiredKeys.add('movementId');

  const labelCandidates = ['name', 'title', 'shortText', 'text'];
  const labelKey = labelCandidates.find(k => expectedKeys.has(k));
  if (collectionName === 'movements') requiredKeys.add('name');
  else if (collectionName === 'notes') {
    requiredKeys.add('targetType');
    requiredKeys.add('targetId');
  } else if (collectionName === 'media') {
    requiredKeys.add('kind');
    requiredKeys.add('uri');
  } else if (labelKey) {
    requiredKeys.add(labelKey);
  }

  const refFields = [];

  (PREVIEW_FIELDS[collectionName] || []).forEach(f => {
    if ((f.type === 'id' || f.type === 'idList') && f.ref) {
      refFields.push({ field: f.key, target: f.ref });
    }
  });

  const refRuleFields = loader?.COLLECTION_REFERENCE_RULES?.[collectionName] || [];
  refRuleFields.forEach(field => {
    refFields.push({ field, target: inferTargetCollectionFromField(field) });
  });

  if (collectionName === 'texts') {
    refFields.push({ field: 'parentId', target: 'texts' });
  }

  const schema = loader?.selectCollectionSchema?.(collectionName) || null;
  const bodyField = schema?.bodyField || null;

  return {
    expectedKeys: Array.from(expectedKeys).sort(),
    requiredKeys: Array.from(requiredKeys),
    referenceFields: dedupeRefFields(refFields),
    bodyField
  };
}

function deriveSchemaGuide(ctx, collectionName, movementId) {
  const guide = getCollectionDoc(getModel(ctx), collectionName);
  if (guide) return guide;
  return deriveLegacySchemaGuide(ctx, collectionName, movementId);
}

function validateRecord(ctx, collectionName, record, snapshot, guide) {
  const issues = [];

  if (!record) return issues;

  (guide.requiredKeys || []).forEach(key => {
    const value = record[key];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    if (missing) {
      issues.push({ level: 'error', message: `Missing ${key}` });
    }
  });

  (guide.referenceFields || []).forEach(({ field, target, kind }) => {
    if (!target || kind === 'poly') return;

    const value = record[field];
    if (value === undefined || value === null || value === '') return;

    const targetColl = snapshot?.[target] || [];
    const checkOne = id => {
      const hit = Array.isArray(targetColl) ? targetColl.find(it => it.id === id) : null;
      if (!hit) {
        issues.push({ level: 'warn', message: `Bad ref: ${field} → ${id}` });
        return;
      }
      if (hit.movementId && record.movementId && hit.movementId !== record.movementId) {
        issues.push({ level: 'warn', message: `Cross-movement ref: ${field} → ${id}` });
      }
    };

    if (Array.isArray(value)) value.filter(Boolean).forEach(checkOne);
    else checkOne(value);
  });

  if (collectionName === 'notes') {
    const targetType = record.targetType;
    const targetId = record.targetId;
    const typeMap = getModel(ctx)?.notes?.targetType?.aliases || {};
    const canonical = typeMap[String(targetType).replace(/[\s_]/g, '').toLowerCase()] || targetType;

    const targetCollection =
      canonical === 'Movement' ? 'movements'
      : canonical === 'TextNode' ? 'texts'
      : canonical === 'Entity' ? 'entities'
      : canonical === 'Practice' ? 'practices'
      : canonical === 'Event' ? 'events'
      : canonical === 'Rule' ? 'rules'
      : canonical === 'Claim' ? 'claims'
      : canonical === 'MediaAsset' ? 'media'
      : null;

    if (targetCollection && targetId) {
      const coll = snapshot?.[targetCollection] || [];
      const hit = Array.isArray(coll) ? coll.find(it => it.id === targetId) : null;
      if (!hit) issues.push({ level: 'warn', message: `Bad note target: ${targetType} → ${targetId}` });
      if (hit?.movementId && record.movementId && hit.movementId !== record.movementId) {
        issues.push({ level: 'warn', message: `Cross-movement note target` });
      }
    }
  }

  return issues;
}

function getNavigation(state) {
  const nav = state?.navigation || {};
  const stack = Array.isArray(nav.stack) ? [...nav.stack] : [];
  if (!stack.length) return { stack: [], index: -1 };
  const idx = typeof nav.index === 'number' ? nav.index : stack.length - 1;
  const index = Math.max(Math.min(idx, stack.length - 1), 0);
  return { stack, index };
}

function pushNavigation(nav, collectionName, itemId) {
  if (!collectionName || !itemId) return getNavigation(nav);
  const base = getNavigation({ navigation: nav });
  const current = base.stack[base.index];
  if (current && current.collectionName === collectionName && current.itemId === itemId) {
    return base;
  }
  const stack = base.stack.slice(0, base.index + 1);
  stack.push({ collectionName, itemId });
  return { stack, index: stack.length - 1 };
}

function pruneNavigation(nav, collectionName, itemId) {
  const base = getNavigation({ navigation: nav });
  if (!base.stack.length) return base;
  const trimmed = [];
  let index = base.index;
  base.stack.forEach((entry, idx) => {
    if (entry.collectionName === collectionName && entry.itemId === itemId) {
      if (idx <= index) index -= 1;
      return;
    }
    trimmed.push(entry);
  });
  if (!trimmed.length) {
    return { stack: [], index: -1 };
  }
  return {
    stack: trimmed,
    index: Math.max(Math.min(index, trimmed.length - 1), 0)
  };
}

function updateNavigationButtons(nav) {
  const backBtn = document.getElementById('btn-preview-back');
  const fwdBtn = document.getElementById('btn-preview-forward');
  if (!backBtn || !fwdBtn) return;
  backBtn.disabled = nav.index <= 0;
  fwdBtn.disabled = nav.index < 0 || nav.index >= nav.stack.length - 1;
}

function makeIssueBadge(issue) {
  const span = document.createElement('span');
  span.className = `issue-badge ${issue.level === 'error' ? 'error' : 'warn'}`;
  span.textContent = issue.message;
  return span;
}

function renderSchemaGuide(ctx, state, guide, issues) {
  const el = document.getElementById('collections-schema-guide');
  if (!el) return;
  ctx.dom.clearElement(el);

  const header = document.createElement('div');
  header.className = 'card-header';

  const titleWrap = document.createElement('div');
  const eyebrow = document.createElement('div');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Schema guide';
  const title = document.createElement('h3');
  title.className = 'card-title';
  title.textContent = state.currentCollectionName || '—';
  titleWrap.appendChild(eyebrow);
  titleWrap.appendChild(title);

  const issueStrip = document.createElement('div');
  issueStrip.className = 'issue-strip';
  issues.slice(0, 6).forEach(i => issueStrip.appendChild(makeIssueBadge(i)));

  header.appendChild(titleWrap);
  header.appendChild(issueStrip);
  el.appendChild(header);

  const required = document.createElement('div');
  required.className = 'muted small-text';
  required.innerHTML = `<strong>Required:</strong> ${guide.requiredKeys.map(k => `<code>${k}</code>`).join(' ') || '—'}`;
  el.appendChild(required);

  if (guide.requiredNotes && guide.requiredNotes.length) {
    const requiredNote = document.createElement('div');
    requiredNote.className = 'muted small-text';
    requiredNote.innerHTML = guide.requiredNotes.map(note => `<em>${note}</em>`).join(' ');
    el.appendChild(requiredNote);
  }

  if (guide.bodyField) {
    const body = document.createElement('div');
    body.className = 'muted small-text';
    body.innerHTML = `<strong>Markdown body field:</strong> <code>${guide.bodyField}</code>`;
    el.appendChild(body);
  }

  if (guide.referenceFields.length) {
    const refs = document.createElement('div');
    refs.className = 'muted small-text';
    refs.innerHTML =
      `<strong>References:</strong> ` +
      guide.referenceFields
        .map(r => `<code>${r.field}</code> → <code>${r.target}</code>${r.kind === 'many' ? ' (many)' : r.kind === 'poly' ? ' (poly)' : ''}`)
        .join(' · ');
    el.appendChild(refs);
  }

  if (guide.fieldsInOrder && guide.fields) {
    const fieldsDetails = document.createElement('details');
    fieldsDetails.style.marginTop = '0.5rem';

    const fieldsSummary = document.createElement('summary');
    fieldsSummary.textContent = 'Fields';
    fieldsDetails.appendChild(fieldsSummary);

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-wrapper';
    tableWrapper.style.marginTop = '0.35rem';

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['Field', 'Type', 'Required', 'Nullable', 'Stored In', 'Ref Target', 'Description'].forEach(label => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    const frontMatterFields = guide.frontMatterFields || [];
    guide.fieldsInOrder.forEach(fieldName => {
      const field = guide.fields[fieldName] || {};
      const row = document.createElement('tr');

      const fieldLabel = document.createElement('td');
      const isBodyField = fieldName === guide.bodyField;
      const fieldText = isBodyField ? `${fieldName} (body)` : fieldName;
      fieldLabel.innerHTML = `<code>${fieldText}</code>`;
      row.appendChild(fieldLabel);

      const typeCell = document.createElement('td');
      let typeLabel = field.type || '—';
      if (field.type === 'array') {
        const itemType = field.items?.type || 'unknown';
        typeLabel = `array<${itemType}>`;
      }
      const typeMeta = [];
      const format = field.format || field.items?.format;
      if (format) typeMeta.push(`format:${format}`);
      const enumName = field.enum || field.items?.enum || field.ui?.enum;
      if (enumName) typeMeta.push(`enum:${enumName}`);
      if (typeMeta.length) typeLabel = `${typeLabel} (${typeMeta.join(', ')})`;
      typeCell.textContent = typeLabel;
      row.appendChild(typeCell);

      const requiredCell = document.createElement('td');
      requiredCell.textContent = field.required ? 'Yes' : 'No';
      row.appendChild(requiredCell);

      const nullableCell = document.createElement('td');
      nullableCell.textContent = field.nullable ? 'Yes' : 'No';
      row.appendChild(nullableCell);

      const storedInCell = document.createElement('td');
      const inFrontMatter = frontMatterFields.includes(fieldName);
      const inBody = fieldName === guide.bodyField;
      if (inFrontMatter && inBody) storedInCell.textContent = 'front matter + body';
      else if (inBody) storedInCell.textContent = 'body';
      else if (inFrontMatter) storedInCell.textContent = 'front matter';
      else storedInCell.textContent = '—';
      row.appendChild(storedInCell);

      const refCell = document.createElement('td');
      const refTarget = field.ref || field.items?.ref || (fieldName === 'targetId' ? '(polymorphic via targetType)' : null);
      refCell.textContent = refTarget || '—';
      row.appendChild(refCell);

      const descCell = document.createElement('td');
      descCell.textContent = field.description || '—';
      row.appendChild(descCell);

      table.appendChild(row);
    });

    tableWrapper.appendChild(table);
    fieldsDetails.appendChild(tableWrapper);
    el.appendChild(fieldsDetails);
  }

  const details = document.createElement('details');
  details.style.marginTop = '0.5rem';
  const summary = document.createElement('summary');
  summary.textContent = 'Expected keys';
  details.appendChild(summary);

  const keys = document.createElement('div');
  keys.style.marginTop = '0.35rem';
  keys.innerHTML = (guide.expectedKeys || []).map(k => `<code>${k}</code>`).join(' ');
  details.appendChild(keys);

  el.appendChild(details);
}

function renderMarkdownPane(ctx, state, record, issues = []) {
  const previewEl = document.getElementById('collections-markdown-preview');
  const rawEl = document.getElementById('collections-markdown-raw');
  const issuesEl = document.getElementById('collections-markdown-issues');
  if (!previewEl || !rawEl || !issuesEl) return;

  ctx.dom.clearElement(issuesEl);
  issues.slice(0, 6).forEach(i => issuesEl.appendChild(makeIssueBadge(i)));

  if (!record) {
    rawEl.textContent = '';
    previewEl.classList.add('empty');
    previewEl.innerHTML = '<p class="muted">Select an item to see markdown.</p>';
    return;
  }

  previewEl.classList.remove('empty');

  const loader = getMarkdownLoader(ctx);
  const snapshot = state.snapshot || {};

  const markdownText =
    loader?.renderMarkdownForRecord
      ? loader.renderMarkdownForRecord(snapshot, state.currentCollectionName, record)
      : (JSON.stringify(record, null, 2) || '');

  rawEl.textContent = markdownText;

  renderMarkdownPreview(previewEl, markdownText, { enabled: true });
}

function renderJsonIssues(issues) {
  const issuesEl = document.getElementById('collections-json-issues');
  if (!issuesEl) return;
  issuesEl.innerHTML = '';
  issues.slice(0, 6).forEach(i => issuesEl.appendChild(makeIssueBadge(i)));
}

function isMovementFilterEnabled() {
  const filterCheckbox = document.getElementById('collection-filter-by-movement');
  return Boolean(filterCheckbox && filterCheckbox.checked);
}

function getLabelForItem(item) {
  if (!item || typeof item !== 'object') return '';
  return (
    item.name ||
    item.title ||
    item.shortText ||
    item.text ||
    item.id ||
    '[no label]'
  );
}

function mapIdToLabel(snapshot, collectionName, id) {
  if (!id) return '—';
  if (collectionName === 'movements') {
    const movement = (snapshot?.movements || []).find(m => m.id === id);
    return movement ? movement.name || movement.id : id;
  }
  const coll = snapshot?.[collectionName] || [];
  const item = coll.find(it => it.id === id);
  return item ? getLabelForItem(item) : id;
}

function renderPreviewValue(ctx, container, snapshot, field, value) {
  const dom = ctx.dom;
  const type = field?.type;
  const refCollection = field?.ref;
  const placeholder = () => {
    const span = document.createElement('span');
    span.className = 'muted';
    span.textContent = '—';
    container.appendChild(span);
  };

  switch (type) {
    case 'chips': {
      const arr = Array.isArray(value) ? value.filter(Boolean) : [];
      if (!arr.length) return placeholder();
      container.appendChild(
        dom.createChipRow(arr, {
          getLabel: v => String(v),
          getTarget: v =>
            field?.facet
              ? { kind: 'facet', facet: field.facet, value: v, scope: field.scope }
              : null
        })
      );
      return;
    }
    case 'id': {
      if (!value) return placeholder();
      const chip = dom.createChip({
        label: mapIdToLabel(snapshot, refCollection, value),
        attrs: { title: 'Open ' + value },
        target: { kind: 'item', collection: refCollection, id: value }
      });
      container.appendChild(chip);
      return;
    }
    case 'idList': {
      const ids = Array.isArray(value) ? value.filter(Boolean) : [];
      if (!ids.length) return placeholder();
      container.appendChild(
        dom.createChipRow(ids, {
          className: '',
          getLabel: id => mapIdToLabel(snapshot, refCollection, id),
          getTarget: id => ({ kind: 'item', collection: refCollection, id })
        })
      );
      return;
    }
    case 'paragraph': {
      if (!value) return placeholder();
      const p = document.createElement('p');
      p.textContent = value;
      container.appendChild(p);
      return;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return placeholder();
      const span = document.createElement('span');
      span.textContent = value ? 'Yes' : 'No';
      container.appendChild(span);
      return;
    }
    case 'link': {
      if (!value) return placeholder();
      const a = document.createElement('a');
      a.href = value;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = value;
      container.appendChild(a);
      return;
    }
    case 'code': {
      if (!value) return placeholder();
      const pre = document.createElement('pre');
      pre.textContent = value;
      container.appendChild(pre);
      return;
    }
    default: {
      if (value === undefined || value === null || value === '') return placeholder();
      const span = document.createElement('span');
      span.textContent = value;
      container.appendChild(span);
    }
  }
}

function renderPreviewRow(ctx, container, snapshot, field, value) {
  const row = document.createElement('div');
  row.className = 'preview-row';
  const lbl = document.createElement('div');
  lbl.className = 'preview-label';
  lbl.textContent = field?.label;
  const val = document.createElement('div');
  val.className = 'preview-value';
  renderPreviewValue(ctx, val, snapshot, field, value);
  row.appendChild(lbl);
  row.appendChild(val);
  container.appendChild(row);
}

function renderCollectionList(ctx, tab, state, options = {}) {
  const { facetVm = null, facetError = null } = options;
  const list = document.getElementById('collection-items');
  const deleteBtn = document.getElementById('btn-delete-item');
  const facetBanner = document.getElementById('collections-facet-banner');
  const facetTitle = document.getElementById('collections-facet-title');
  const facetSubtitle = document.getElementById('collections-facet-subtitle');
  if (!list) return;
  const clear = ctx.dom.clearElement;
  clear(list);

  const explorer = state.facetExplorer || null;
  const isFacetMode = Boolean(explorer);
  if (facetBanner) {
    facetBanner.hidden = !isFacetMode;
    if (isFacetMode && facetTitle && facetSubtitle) {
      facetTitle.textContent = `${explorer.facet}: “${explorer.value}”`;
      if (facetError) {
        facetSubtitle.textContent = facetError;
      } else if (facetVm) {
        const count = facetVm.results?.length || 0;
        facetSubtitle.textContent = `${count} match${count === 1 ? '' : 'es'}`;
      } else {
        facetSubtitle.textContent = 'Loading facet matches…';
      }
    }
  }

  if (isFacetMode) {
    const results = facetVm?.results || [];
    if (!results.length) {
      const li = document.createElement('li');
      li.textContent = facetError || 'No items match this facet.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      list.appendChild(li);
    } else {
      results.forEach(result => {
        const li = document.createElement('li');
        li.dataset.id = result.id;
        li.dataset.collection = result.collectionName;
        if (
          result.id === state.currentItemId &&
          result.collectionName === state.currentCollectionName
        ) {
          li.classList.add('selected');
        }
        const primary = document.createElement('span');
        primary.textContent = result.label || result.id;
        const secondary = document.createElement('span');
        secondary.className = 'secondary';
        secondary.textContent = `${result.collectionName} · ${result.id}`;
        li.appendChild(primary);
        li.appendChild(secondary);
        li.addEventListener('click', () => {
          tab.setCollectionAndItem?.(ctx, result.collectionName, result.id);
        });
        list.appendChild(li);
      });
    }
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName] || [];
  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);
  const filterByMovement = isMovementFilterEnabled();

  let items = coll;
  if (
    filterByMovement &&
    state.currentMovementId &&
    collectionsWithMovementId.has(collName)
  ) {
    items = coll.filter(item => item.movementId === state.currentMovementId);
  }

  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'No items in this collection.';
    li.style.fontStyle = 'italic';
    li.style.cursor = 'default';
    list.appendChild(li);
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    if (item.id === state.currentItemId) li.classList.add('selected');
    const primary = document.createElement('span');
    primary.textContent = getLabelForItem(item);
    const secondary = document.createElement('span');
    secondary.className = 'secondary';
    secondary.textContent = item.id;
    li.appendChild(primary);
    li.appendChild(secondary);
    li.addEventListener('click', () => {
      tab.setCollectionAndItem?.(ctx, collName, item.id);
    });
    list.appendChild(li);
  });

  if (deleteBtn) deleteBtn.disabled = !state.currentItemId;
}

function renderItemPreview(ctx, state) {
  const titleEl = document.getElementById('item-preview-title');
  const subtitleEl = document.getElementById('item-preview-subtitle');
  const body = document.getElementById('item-preview-body');
  const badge = document.getElementById('item-preview-collection');
  if (!titleEl || !subtitleEl || !body || !badge) return;

  const snapshot = state.snapshot || {};
  const clear = ctx.dom.clearElement;
  clear(body);
  badge.textContent = state.currentCollectionName || '—';

  if (!state.currentItemId) {
    titleEl.textContent = 'Select an item';
    subtitleEl.textContent = 'Preview will appear here';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Pick an item on the left to see a human-friendly summary.';
    body.appendChild(p);
    return;
  }

  const coll = snapshot[state.currentCollectionName] || [];
  const item = coll.find(it => it.id === state.currentItemId);
  if (!item) {
    titleEl.textContent = 'Not found';
    subtitleEl.textContent = '';
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'The selected item could not be loaded.';
    body.appendChild(p);
    return;
  }

  titleEl.textContent = getLabelForItem(item);
  subtitleEl.textContent = `${(state.currentCollectionName || '').slice(0, -1)} · ${item.id}`;

  const fields = PREVIEW_FIELDS[state.currentCollectionName];
  if (!fields) {
    renderPreviewRow(
      ctx,
      body,
      snapshot,
      { label: 'Details', key: 'details', type: 'code' },
      JSON.stringify(item, null, 2)
    );
    return;
  }

  fields.forEach(field => {
    const value = item[field.key];
    renderPreviewRow(ctx, body, snapshot, field, value);
  });

  if (state.currentCollectionName === 'texts') {
    const applyMovementFilter = isMovementFilterEnabled();
    const children = (snapshot.texts || [])
      .filter(text => text.parentId === item.id)
      .filter(text => {
        if (!applyMovementFilter || !state.currentMovementId) return true;
        return text.movementId === state.currentMovementId;
      })
      .sort((a, b) =>
        getLabelForItem(a).localeCompare(getLabelForItem(b), undefined, {
          sensitivity: 'base'
        })
      )
      .map(text => text.id);

    renderPreviewRow(
      ctx,
      body,
      snapshot,
      { label: 'Child texts', key: 'childTexts', type: 'idList', ref: 'texts' },
      children
    );
  }
}

function renderItemEditor(ctx, tab, state) {
  const collName = state.currentCollectionName;
  const snapshot = state.snapshot || {};
  const coll = snapshot[collName] || [];
  const editor = document.getElementById('item-editor');
  const deleteBtn = document.getElementById('btn-delete-item');

  if (!editor) return;

  if (!state.currentItemId) {
    tab.__state.isPopulatingEditor = true;
    editor.value = '';
    tab.__state.isPopulatingEditor = false;
    editor.disabled = coll.length === 0;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  const item = coll.find(it => it.id === state.currentItemId);
  if (!item) {
    tab.__state.isPopulatingEditor = true;
    editor.value = '';
    tab.__state.isPopulatingEditor = false;
    editor.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }

  editor.disabled = false;
  if (deleteBtn) deleteBtn.disabled = false;
  tab.__state.isPopulatingEditor = true;
  editor.value = JSON.stringify(item, null, 2);
  tab.__state.isPopulatingEditor = false;
}

function getSelectedRecord(state) {
  if (!state.currentItemId) return null;
  const coll = state.snapshot?.[state.currentCollectionName] || [];
  return Array.isArray(coll) ? coll.find(it => it.id === state.currentItemId) : null;
}

function renderCollectionsTab(ctx, tab) {
  const state = getState(ctx);
  const snapshot = state.snapshot;
  const collectionNames = getCollectionNames(ctx);
  const collectionName =
    collectionNames.includes(state.currentCollectionName) && state.currentCollectionName
      ? state.currentCollectionName
      : collectionNames[0] || state.currentCollectionName || 'entities';

  if (collectionName !== state.currentCollectionName) {
    applyState(ctx, prev => ({ ...prev, currentCollectionName: collectionName }));
  }

  const select = document.getElementById('collection-select');
  if (select && select.value !== collectionName) {
    select.value = collectionName;
  }

  const normalizedState = { ...state, currentCollectionName: collectionName };
  const facetExplorer = normalizedState.facetExplorer || null;
  const ViewModels = getViewModels(ctx);
  const facetVm =
    facetExplorer && typeof ViewModels?.buildFacetExplorerViewModel === 'function'
      ? ViewModels.buildFacetExplorerViewModel(snapshot, {
          movementId: normalizedState.currentMovementId,
          facet: facetExplorer.facet,
          value: facetExplorer.value,
          scope: facetExplorer.scope
        })
      : null;
  const facetError =
    facetExplorer && typeof ViewModels?.buildFacetExplorerViewModel !== 'function'
      ? 'Facet explorer unavailable'
      : null;

  renderCollectionList(ctx, tab, normalizedState, {
    facetVm: facetExplorer ? facetVm : null,
    facetError: facetExplorer ? facetError : null
  });

  const record = getSelectedRecord(normalizedState);
  const guide = deriveSchemaGuide(ctx, collectionName, normalizedState.currentMovementId);
  const issues = validateRecord(ctx, collectionName, record, normalizedState.snapshot || {}, guide);

  renderSchemaGuide(ctx, normalizedState, guide, issues);
  renderItemPreview(ctx, normalizedState);
  renderMarkdownPane(ctx, normalizedState, record, issues);
  renderItemEditor(ctx, tab, normalizedState);
  renderJsonIssues(issues);
  updateNavigationButtons(getNavigation(state));
}

function ensureCollectionsTabActive(ctx) {
  const actions = getActions(ctx);
  if (typeof actions.activateTab === 'function') {
    actions.activateTab('collections');
    return;
  }
  const btn = document.querySelector('.tab[data-tab="collections"]');
  if (btn) btn.click();
}

function setCollectionAndItem(ctx, tab, collectionName, itemId, options = {}) {
  const { addToHistory = true, fromHistory = false } = options;
  const state = getState(ctx);
  const snapshot = state.snapshot || {};
  const DomainService = getDomainService(ctx);
  const collectionNames = getCollectionNames(ctx);

  if (!collectionNames.includes(collectionName)) {
    ctx.setStatus?.('Unknown collection: ' + collectionName);
    return null;
  }

  const coll = snapshot[collectionName] || [];
  const foundItem = itemId ? coll.find(it => it.id === itemId) : null;
  const collectionsWithMovementId = getCollectionsWithMovementId(ctx);
  const movementFilter = document.getElementById('collection-filter-by-movement');
  if (
    movementFilter &&
    movementFilter.checked &&
    foundItem &&
    collectionsWithMovementId.has(collectionName) &&
    foundItem.movementId &&
    state.currentMovementId &&
    foundItem.movementId !== state.currentMovementId
  ) {
    movementFilter.checked = false;
  }

  const navigation = getNavigation(state);
  const nextNavigation =
    addToHistory && foundItem && !fromHistory
      ? pushNavigation(navigation, collectionName, foundItem.id)
      : navigation;

  const nextState = {
    ...state,
    snapshot,
    currentCollectionName: collectionName,
    currentItemId: foundItem ? foundItem.id : null,
    navigation: nextNavigation
  };

  applyState(ctx, nextState);
  if (DomainService && typeof DomainService.ensureAllCollections === 'function') {
    DomainService.ensureAllCollections(snapshot);
  }
  tab.render?.(ctx);
  return nextState;
}

function jumpToReferencedItem(ctx, tab, collectionName, itemId) {
  if (!collectionName || !itemId) return null;
  const actions = getActions(ctx);
  const state = getState(ctx);
  const snapshot = state.snapshot || {};

  if (collectionName === 'movements') {
    actions.selectMovement?.(itemId);
    actions.activateTab?.('dashboard');
    return null;
  }

  const coll = snapshot[collectionName];
  if (!Array.isArray(coll)) {
    ctx.setStatus?.('Unknown collection: ' + collectionName);
    return null;
  }
  const exists = coll.find(it => it.id === itemId);
  if (!exists) {
    ctx.setStatus?.('Referenced item not found');
    return null;
  }
  ensureCollectionsTabActive(ctx);
  return tab.setCollectionAndItem?.(ctx, collectionName, itemId);
}

function addNewItem(ctx, tab) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;

  if (!DomainService?.addNewItem) {
    ctx.setStatus?.('Collections domain service unavailable');
    return;
  }

  let skeleton = null;
  try {
    skeleton = DomainService.addNewItem(snapshot, collName, state.currentMovementId);
  } catch (err) {
    window.alert?.(err?.message || String(err));
    return;
  }
  if (!skeleton) return;

  const navigation = pushNavigation(state.navigation, collName, skeleton.id);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: skeleton.id,
    navigation
  };
  applyState(ctx, nextState);
  const store = getStore(ctx);
  store?.markDirty?.('snapshot');
  store?.saveSnapshot?.({ show: false, clearMovementDirty: false, clearItemDirty: true });
  ctx.setStatus?.('New item created');
  tab.render?.(ctx);
}

function saveCurrentItem(ctx, tab, options = {}) {
  const { persist = true } = options;
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName];
  const editor = document.getElementById('item-editor');

  if (!Array.isArray(coll)) {
    window.alert?.('Unknown collection: ' + collName);
    return false;
  }
  if (!DomainService?.upsertItem) {
    ctx.setStatus?.('Collections domain service unavailable');
    return false;
  }
  if (!editor) return false;

  const raw = editor.value.trim();
  if (!raw) {
    window.alert?.('Editor is empty. Nothing to save.');
    return false;
  }

  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    window.alert?.('Invalid JSON: ' + e.message);
    return false;
  }

  if (!obj.id) {
    window.alert?.('Object must have an "id" field.');
    return false;
  }

  try {
    DomainService?.upsertItem(snapshot, collName, obj);
  } catch (e) {
    window.alert?.(e?.message || String(e));
    return false;
  }

  const navigation = pushNavigation(state.navigation, collName, obj.id);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: obj.id,
    navigation
  };
  applyState(ctx, nextState);
  if (persist) {
    const store = getStore(ctx);
    store?.saveSnapshot?.({ clearItemDirty: true, clearMovementDirty: false });
  } else {
    const store = getStore(ctx);
    store?.markSaved?.({ item: true });
    store?.markDirty?.('snapshot');
  }
  tab.render?.(ctx);
  return true;
}

function deleteCurrentItem(ctx, tab) {
  const state = getState(ctx);
  const DomainService = getDomainService(ctx);
  const snapshot = state.snapshot || {};
  const collName = state.currentCollectionName;
  const coll = snapshot[collName];

  if (!Array.isArray(coll) || !state.currentItemId) return;

  const item = coll.find(it => it.id === state.currentItemId);
  const label = getLabelForItem(item);
  const ok = window.confirm(
    `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
  );
  if (!ok) return;

  try {
    if (DomainService?.deleteItem) {
      DomainService.deleteItem(snapshot, collName, state.currentItemId);
    } else {
      snapshot[collName] = coll.filter(it => it.id !== state.currentItemId);
    }
  } catch (e) {
    window.alert?.(e?.message || String(e));
    return;
  }

  const navigation = pruneNavigation(state.navigation, collName, state.currentItemId);
  const nextState = {
    ...state,
    snapshot,
    currentItemId: null,
    navigation
  };
  applyState(ctx, nextState);
  const store = getStore(ctx);
  store?.markDirty?.('snapshot');
  store?.saveSnapshot?.({ clearItemDirty: true, clearMovementDirty: false });
  tab.render?.(ctx);
}

function navigateHistory(ctx, tab, direction) {
  const state = getState(ctx);
  const nav = getNavigation(state);
  if (!nav.stack.length) return;
  const target = nav.index + direction;
  if (target < 0 || target >= nav.stack.length) return;
  const destination = nav.stack[target];
  const nextNav = { ...nav, index: target };
  applyState(ctx, { ...state, navigation: nextNav });
  tab.setCollectionAndItem?.(ctx, destination.collectionName, destination.itemId, {
    addToHistory: false,
    fromHistory: true
  });
}

function openFacet(ctx, tab, facet, value, scope) {
  const facetKey = facet ? String(facet).trim() : '';
  const facetValue =
    value !== undefined && value !== null ? String(value).trim() : '';

  if (!facetKey || !facetValue) {
    ctx.setStatus?.('Facet target missing');
    return null;
  }

  applyState(ctx, prev => ({
    ...prev,
    facetExplorer: { facet: facetKey, value: facetValue, scope: scope || null }
  }));
  ensureCollectionsTabActive(ctx);
  tab.render?.(ctx);
  return { facet: facetKey, value: facetValue, scope: scope || null };
}

function clearFacet(ctx, tab) {
  applyState(ctx, prev => ({ ...prev, facetExplorer: null }));
  tab.render?.(ctx);
}

export function registerCollectionsTab(ctx) {
  ctx?.dom?.installGlobalChipHandler?.(ctx);
  const tab = {
    __handlers: null,
    __state: { isPopulatingEditor: false },
    mount(context) {
      const select = document.getElementById('collection-select');
      const filterCheckbox = document.getElementById('collection-filter-by-movement');
      const addBtn = document.getElementById('btn-add-item');
      const deleteBtn = document.getElementById('btn-delete-item');
      const saveBtn = document.getElementById('btn-save-item');
      const navBack = document.getElementById('btn-preview-back');
      const navForward = document.getElementById('btn-preview-forward');
      const editor = document.getElementById('item-editor');
      const copyMarkdownBtn = document.getElementById('btn-copy-item-markdown');
      const clearFacetBtn = document.getElementById('collections-facet-clear');

      const rerender = () => tab.render(context);
      const handleStateChange = () => {
        const active = document.querySelector('.tab.active');
        if (!active || active.dataset.tab !== 'collections') return;
        rerender();
      };

      const handleSelectChange = e =>
        tab.setCollectionAndItem?.(context, e.target.value, null, { addToHistory: false });
      const handleFilterChange = rerender;
      const handleAdd = () => tab.addNewItem?.(context);
      const handleDelete = () => tab.deleteCurrentItem?.(context);
      const handleSave = () => tab.saveCurrentItem?.(context);
      const handleNavBack = () => tab.navigateHistory?.(context, -1);
      const handleNavForward = () => tab.navigateHistory?.(context, 1);
      const handleEditorInput = () => {
        if (tab.__state.isPopulatingEditor) return;
        context.store?.markDirty?.('item');
      };
      const handleClearFacet = () => tab.clearFacet?.(context);
      const handleCopyMarkdown = async () => {
        const rawEl = document.getElementById('collections-markdown-raw');
        const text = rawEl?.textContent || '';
        if (!text.trim()) {
          context.setStatus?.('Nothing to copy');
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          context.setStatus?.('Markdown copied');
        } catch {
          const tmp = document.createElement('textarea');
          tmp.value = text;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
          context.setStatus?.('Markdown copied');
        }
      };

      if (select) select.addEventListener('change', handleSelectChange);
      if (filterCheckbox) filterCheckbox.addEventListener('change', handleFilterChange);
      if (addBtn) addBtn.addEventListener('click', handleAdd);
      if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
      if (saveBtn) saveBtn.addEventListener('click', handleSave);
      if (navBack) navBack.addEventListener('click', handleNavBack);
      if (navForward) navForward.addEventListener('click', handleNavForward);
      if (editor) editor.addEventListener('input', handleEditorInput);
      if (copyMarkdownBtn) copyMarkdownBtn.addEventListener('click', handleCopyMarkdown);
      if (clearFacetBtn) clearFacetBtn.addEventListener('click', handleClearFacet);

      const unsubscribe = context?.subscribe ? context.subscribe(handleStateChange) : null;

      this.__handlers = {
        select,
        filterCheckbox,
        addBtn,
        deleteBtn,
        saveBtn,
        navBack,
        navForward,
        editor,
        copyMarkdownBtn,
        clearFacetBtn,
        handleSelectChange,
        handleFilterChange,
        handleAdd,
        handleDelete,
        handleSave,
        handleNavBack,
        handleNavForward,
        handleEditorInput,
        handleCopyMarkdown,
        handleClearFacet,
        rerender,
        unsubscribe
      };
    },
    render(context) {
      renderCollectionsTab(context, tab);
    },
    unmount() {
      const h = this.__handlers;
      if (!h) return;
      if (h.select) h.select.removeEventListener('change', h.handleSelectChange);
      if (h.filterCheckbox) h.filterCheckbox.removeEventListener('change', h.handleFilterChange);
      if (h.addBtn) h.addBtn.removeEventListener('click', h.handleAdd);
      if (h.deleteBtn) h.deleteBtn.removeEventListener('click', h.handleDelete);
      if (h.saveBtn) h.saveBtn.removeEventListener('click', h.handleSave);
      if (h.navBack) h.navBack.removeEventListener('click', h.handleNavBack);
      if (h.navForward) h.navForward.removeEventListener('click', h.handleNavForward);
      if (h.editor) h.editor.removeEventListener('input', h.handleEditorInput);
      if (h.copyMarkdownBtn) h.copyMarkdownBtn.removeEventListener('click', h.handleCopyMarkdown);
      if (h.clearFacetBtn) h.clearFacetBtn.removeEventListener('click', h.handleClearFacet);
      if (typeof h.unsubscribe === 'function') h.unsubscribe();
      this.__handlers = null;
      this.__state.isPopulatingEditor = false;
    },
    setCollectionAndItem: (context, collectionName, itemId, options) =>
      setCollectionAndItem(context, tab, collectionName, itemId, options),
    jumpToReferencedItem: (context, collectionName, itemId) =>
      jumpToReferencedItem(context, tab, collectionName, itemId),
    addNewItem: context => addNewItem(context, tab),
    saveCurrentItem: (context, options) => saveCurrentItem(context, tab, options),
    deleteCurrentItem: context => deleteCurrentItem(context, tab),
    navigateHistory: (context, direction) => navigateHistory(context, tab, direction),
    openFacet: (context, facet, value, scope) => openFacet(context, tab, facet, value, scope),
    clearFacet: context => clearFacet(context, tab)
  };

  movementEngineerGlobal.tabs.collections = tab;
  if (ctx?.tabs) {
    ctx.tabs.collections = tab;
  }
  if (ctx) {
    ctx.actions = ctx.actions || {};
    ctx.actions.setCollectionAndItem = (collectionName, itemId, options) =>
      tab.setCollectionAndItem(ctx, collectionName, itemId, options);
    ctx.actions.jumpToReferencedItem = (collectionName, itemId) =>
      tab.jumpToReferencedItem(ctx, collectionName, itemId);
    ctx.actions.navigateCollectionHistory = direction =>
      tab.navigateHistory(ctx, direction);
    ctx.actions.openFacet = (facet, value, scope) => tab.openFacet(ctx, facet, value, scope);
  }

  return tab;
}
