/* app.js
 *
 * UI layer for Movement Engineer v3.
 * All domain logic lives in view-models.js & your data model.
 * This file just handles DOM, localStorage, import/export, and wiring.
 */

/* global ViewModels */

(function () {
  'use strict';

  // ---- Storage & snapshot management ----

  const STORAGE_KEY = 'movementDesigner.v3.snapshot';

  const COLLECTION_NAMES = [
    'movements',
    'textCollections',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes',
    'relations'
  ];

  const COLLECTIONS_WITH_MOVEMENT_ID = new Set([
    'textCollections',
    'texts',
    'entities',
    'practices',
    'events',
    'rules',
    'claims',
    'media',
    'notes',
    'relations'
  ]);

  let snapshot = null;
  let currentMovementId = null;
  let currentCollectionName = 'entities';
  let currentItemId = null;

  function createEmptySnapshot() {
    const base = {};
    COLLECTION_NAMES.forEach(name => {
      base[name] = [];
    });
    return base;
  }

  function ensureAllCollections(data) {
    const obj = data || {};
    COLLECTION_NAMES.forEach(name => {
      if (!Array.isArray(obj[name])) obj[name] = [];
    });
    return obj;
  }

  function loadSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptySnapshot();
      const parsed = JSON.parse(raw);
      return ensureAllCollections(parsed);
    } catch (e) {
      console.warn('Failed to load snapshot from localStorage, using empty:', e);
      return createEmptySnapshot();
    }
  }

  function saveSnapshot(show = true) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      if (show) setStatus('Saved ✓');
    } catch (e) {
      console.error('Failed to save snapshot:', e);
      setStatus('Save failed');
    }
    // Re-render current views to reflect changes
    renderMovementList();
    renderActiveTab();
  }

  function setStatus(text) {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = text || '';
    if (!text) return;
    // Fade after a short delay
    setTimeout(() => {
      if (el.textContent === text) {
        el.textContent = '';
      }
    }, 2500);
  }

  // ---- ID generation ----

  function generateId(prefix) {
    const base = prefix || 'id-';
    return base + Math.random().toString(36).substr(2, 9);
  }

  // ---- Movement helpers ----

  function getMovementById(id) {
    return snapshot.movements.find(r => r.id === id) || null;
  }

  function selectMovement(id) {
    currentMovementId = id || null;
    currentItemId = null; // reset item selection in collection editor
    renderMovementList();
    renderActiveTab();
  }

  function addMovement() {
    const movement = {
      id: generateId('mov-'),
      name: 'New Movement',
      shortName: 'New',
      summary: '',
      notes: null,
      tags: []
    };
    snapshot.movements.push(movement);
    selectMovement(movement.id);
    saveSnapshot();
  }

  function deleteMovement(id) {
    if (!id) return;
    const movement = getMovementById(id);
    if (!movement) return;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        movement.name +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return;

    // Remove movement itself
    snapshot.movements = snapshot.movements.filter(r => r.id !== id);

    // Cascade delete on movement-scoped collections
    COLLECTIONS_WITH_MOVEMENT_ID.forEach(collName => {
      snapshot[collName] = snapshot[collName].filter(item => item.movementId !== id);
    });

    currentMovementId = snapshot.movements[0] ? snapshot.movements[0].id : null;
    currentItemId = null;
    saveSnapshot();
  }

  // ---- Skeleton creators for new items ----

  function createSkeletonItem(collectionName) {
    const rid = currentMovementId || null;

    switch (collectionName) {
      case 'entities':
        return {
          id: generateId('ent-'),
          movementId: rid,
          name: 'New entity',
          kind: null,
          summary: '',
          notes: null,
          tags: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'practices':
        return {
          id: generateId('prc-'),
          movementId: rid,
          name: 'New practice',
          kind: null,
          description: '',
          frequency: 'weekly',
          isPublic: true,
          notes: null,
          tags: [],
          involvedEntityIds: [],
          instructionsTextIds: [],
          supportingClaimIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'events':
        return {
          id: generateId('evt-'),
          movementId: rid,
          name: 'New event',
          description: '',
          recurrence: 'yearly',
          timingRule: 'TBD',
          notes: null,
          tags: [],
          mainPracticeIds: [],
          mainEntityIds: [],
          readingTextIds: [],
          supportingClaimIds: []
        };
      case 'rules':
        return {
          id: generateId('rul-'),
          movementId: rid,
          shortText: 'New rule',
          kind: 'must_do',
          details: null,
          appliesTo: [],
          domain: [],
          tags: [],
          supportingTextIds: [],
          supportingClaimIds: [],
          relatedPracticeIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: []
        };
      case 'claims':
        return {
          id: generateId('clm-'),
          movementId: rid,
          text: 'New claim',
          category: null,
          tags: [],
          sourceTextIds: [],
          aboutEntityIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: [],
          notes: null
        };
      case 'textCollections':
        return {
          id: generateId('tc-'),
          movementId: rid,
          name: 'New text collection',
          description: null,
          tags: [],
          rootTextIds: []
        };
      case 'texts':
        return {
          id: generateId('txt-'),
          movementId: rid,
          parentId: null,
          level: 'work',
          title: 'New text',
          label: '1',
          content: '',
          mainFunction: null,
          tags: [],
          mentionsEntityIds: []
        };
      case 'media':
        return {
          id: generateId('med-'),
          movementId: rid,
          kind: 'image',
          uri: '',
          title: 'New media asset',
          description: null,
          tags: [],
          linkedEntityIds: [],
          linkedPracticeIds: [],
          linkedEventIds: [],
          linkedTextIds: []
        };
      case 'notes':
        return {
          id: generateId('note-'),
          movementId: rid,
          targetType: 'Entity',
          targetId: '',
          author: null,
          body: '',
          context: null,
          tags: []
        };
      case 'relations':
        return {
          id: generateId('rel-'),
          movementId: rid,
          fromEntityId: '',
          toEntityId: '',
          relationType: 'related_to',
          tags: [],
          supportingClaimIds: [],
          sourcesOfTruth: [],
          sourceEntityIds: [],
          notes: null
        };
      default:
        return { id: generateId('id-') };
    }
  }

  // ---- DOM helpers ----

  function $(selector) {
    return document.querySelector(selector);
  }

  function clearElement(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function getActiveTabName() {
    const btn = document.querySelector('.tab.active');
    return btn ? btn.dataset.tab : 'dashboard';
  }

  function renderActiveTab() {
    const tabName = getActiveTabName();
    switch (tabName) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'movement':
        renderMovementForm();
        break;
      case 'data':
        renderCollectionList();
        renderItemEditor();
        break;
      case 'comparison':
        renderComparison();
        break;
      default:
        break;
    }
  }

  // ---- Movement list & form ----

  function renderMovementList() {
    const list = document.getElementById('movement-list');
    if (!list) return;
    clearElement(list);

    if (!snapshot.movements.length) {
      const li = document.createElement('li');
      li.textContent = 'No movements yet. Click + to add one.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      list.appendChild(li);
      return;
    }

    snapshot.movements.forEach(movement => {
      const li = document.createElement('li');
      li.dataset.id = movement.id;
      li.className = movement.id === currentMovementId ? 'selected' : '';
      const primary = document.createElement('span');
      primary.textContent = movement.name || movement.id;
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = movement.shortName || '';
      li.appendChild(primary);
      li.appendChild(secondary);
      li.addEventListener('click', () => selectMovement(movement.id));
      list.appendChild(li);
    });
  }

  function renderMovementForm() {
    const idLabel = document.getElementById('movement-id-label');
    const nameInput = document.getElementById('movement-name');
    const shortInput = document.getElementById('movement-shortName');
    const summaryInput = document.getElementById('movement-summary');
    const tagsInput = document.getElementById('movement-tags');
    const deleteBtn = document.getElementById('btn-delete-movement');
    const saveBtn = document.getElementById('btn-save-movement');

    if (!currentMovementId) {
      idLabel.textContent = '—';
      nameInput.value = '';
      shortInput.value = '';
      summaryInput.value = '';
      tagsInput.value = '';
      [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(el => {
        el.disabled = true;
      });
      return;
    }

    const movement = getMovementById(currentMovementId);
    if (!movement) {
      // out of sync; reset
      currentMovementId = null;
      renderMovementForm();
      return;
    }

    [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(el => {
      el.disabled = false;
    });

    idLabel.textContent = movement.id;
    nameInput.value = movement.name || '';
    shortInput.value = movement.shortName || '';
    summaryInput.value = movement.summary || '';
    tagsInput.value = Array.isArray(movement.tags)
      ? movement.tags.join(', ')
      : '';

    // Save handler wired once in init; here we only set values
  }

  function saveMovementFromForm() {
    if (!currentMovementId) return;
    const movement = getMovementById(currentMovementId);
    if (!movement) return;

    const nameInput = document.getElementById('movement-name');
    const shortInput = document.getElementById('movement-shortName');
    const summaryInput = document.getElementById('movement-summary');
    const tagsInput = document.getElementById('movement-tags');

    movement.name = nameInput.value.trim() || 'Untitled movement';
    movement.shortName = shortInput.value.trim() || movement.name;
    movement.summary = summaryInput.value.trim();
    movement.tags = tagsInput.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    saveSnapshot();
  }

  // ---- Dashboard (ViewModels) ----

  function renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    clearElement(container);

    if (!currentMovementId) {
      const p = document.createElement('p');
      p.textContent = 'Create a movement on the left to see a dashboard.';
      container.appendChild(p);
      return;
    }

    if (typeof ViewModels === 'undefined') {
      const p = document.createElement('p');
      p.textContent = 'ViewModels module not loaded.';
      container.appendChild(p);
      return;
    }

    const vm = ViewModels.buildMovementDashboardViewModel(snapshot, {
      movementId: currentMovementId
    });

    if (!vm.movement) {
      const p = document.createElement('p');
      p.textContent = 'Selected movement not found in dataset.';
      container.appendChild(p);
      return;
    }

    const title = document.createElement('h2');
    title.textContent = vm.movement.name + (vm.movement.shortName ? ` (${vm.movement.shortName})` : '');
    container.appendChild(title);

    const summary = document.createElement('p');
    summary.textContent = vm.movement.summary || 'No summary yet.';
    container.appendChild(summary);

    // Stats cards
    const statsGrid = document.createElement('div');
    statsGrid.className = 'stats-grid';

    // Text stats
    const textCard = document.createElement('div');
    textCard.className = 'stat-card';
    textCard.innerHTML =
      '<h3>Texts</h3>' +
      `<p>Total: ${vm.textStats.totalTexts}</p>` +
      `<p>Works: ${vm.textStats.works} · Sections: ${vm.textStats.sections}</p>` +
      `<p>Passages: ${vm.textStats.passages} · Lines: ${vm.textStats.lines}</p>`;
    statsGrid.appendChild(textCard);

    // Entity stats
    const entityCard = document.createElement('div');
    entityCard.className = 'stat-card';
    entityCard.innerHTML = `<h3>Entities</h3><p>Total: ${vm.entityStats.totalEntities}</p>`;
    if (vm.entityStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.entityStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      entityCard.appendChild(ul);
    }
    statsGrid.appendChild(entityCard);

    // Practice stats
    const practiceCard = document.createElement('div');
    practiceCard.className = 'stat-card';
    practiceCard.innerHTML = `<h3>Practices</h3><p>Total: ${vm.practiceStats.totalPractices}</p>`;
    if (vm.practiceStats.byKind) {
      const ul = document.createElement('ul');
      Object.entries(vm.practiceStats.byKind).forEach(([kind, count]) => {
        const li = document.createElement('li');
        li.textContent = `${kind}: ${count}`;
        ul.appendChild(li);
      });
      practiceCard.appendChild(ul);
    }
    statsGrid.appendChild(practiceCard);

    // Event stats
    const eventCard = document.createElement('div');
    eventCard.className = 'stat-card';
    eventCard.innerHTML = `<h3>Events</h3><p>Total: ${vm.eventStats.totalEvents}</p>`;
    if (vm.eventStats.byRecurrence) {
      const ul = document.createElement('ul');
      Object.entries(vm.eventStats.byRecurrence).forEach(([rec, count]) => {
        const li = document.createElement('li');
        li.textContent = `${rec}: ${count}`;
        ul.appendChild(li);
      });
      eventCard.appendChild(ul);
    }
    statsGrid.appendChild(eventCard);

    // Rule / claim / media counts
    const miscCard = document.createElement('div');
    miscCard.className = 'stat-card';
    miscCard.innerHTML =
      '<h3>Other</h3>' +
      `<p>Rules: ${vm.ruleCount}</p>` +
      `<p>Claims: ${vm.claimCount}</p>` +
      `<p>Media assets: ${vm.mediaCount}</p>`;
    statsGrid.appendChild(miscCard);

    container.appendChild(statsGrid);

    // Example nodes
    const exampleSectionTitle = document.createElement('div');
    exampleSectionTitle.className = 'section-heading';
    exampleSectionTitle.textContent = 'Example nodes';
    container.appendChild(exampleSectionTitle);

    const mkChipRow = (label, items, key) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading';
      heading.style.fontSize = '0.85rem';
      heading.textContent = label;
      container.appendChild(heading);

      if (!items || !items.length) {
        const p = document.createElement('p');
        p.style.fontSize = '0.8rem';
        p.textContent = 'None yet.';
        container.appendChild(p);
        return;
      }

      const row = document.createElement('div');
      row.className = 'chip-row';
      items.forEach(item => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = item[key] || item.id;
        row.appendChild(chip);
      });
      container.appendChild(row);
    };

    mkChipRow('Key entities', vm.exampleNodes.keyEntities, 'name');
    mkChipRow('Key practices', vm.exampleNodes.keyPractices, 'name');
    mkChipRow('Key events', vm.exampleNodes.keyEvents, 'name');
  }

  // ---- Collections tab ----

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

  function renderCollectionList() {
    const list = document.getElementById('collection-items');
    if (!list) return;
    clearElement(list);

    const collName = currentCollectionName;
    const coll = snapshot[collName] || [];
    const filterByMovement = document.getElementById('collection-filter-by-movement').checked;

    let items = coll;
    if (filterByMovement && currentMovementId && COLLECTIONS_WITH_MOVEMENT_ID.has(collName)) {
      items = coll.filter(
        item => item.movementId === currentMovementId || item.movementId == null
      );
    }

    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'No items in this collection.';
      li.style.fontStyle = 'italic';
      li.style.cursor = 'default';
      list.appendChild(li);
      document.getElementById('btn-delete-item').disabled = true;
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.dataset.id = item.id;
      if (item.id === currentItemId) li.classList.add('selected');
      const primary = document.createElement('span');
      primary.textContent = getLabelForItem(item);
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = item.id;
      li.appendChild(primary);
      li.appendChild(secondary);
      li.addEventListener('click', () => {
        currentItemId = item.id;
        renderCollectionList();
        renderItemEditor();
      });
      list.appendChild(li);
    });

    document.getElementById('btn-delete-item').disabled = !currentItemId;
  }

  function renderItemEditor() {
    const collName = currentCollectionName;
    const coll = snapshot[collName] || [];
    const editor = document.getElementById('item-editor');
    const deleteBtn = document.getElementById('btn-delete-item');

    if (!currentItemId) {
      editor.value = '';
      editor.disabled = coll.length === 0;
      deleteBtn.disabled = true;
      return;
    }

    const item = coll.find(it => it.id === currentItemId);
    if (!item) {
      editor.value = '';
      editor.disabled = true;
      deleteBtn.disabled = true;
      return;
    }

    editor.disabled = false;
    deleteBtn.disabled = false;
    editor.value = JSON.stringify(item, null, 2);
  }

  function saveItemFromEditor() {
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll)) {
      alert('Unknown collection: ' + collName);
      return;
    }

    const editor = document.getElementById('item-editor');
    const raw = editor.value.trim();
    if (!raw) {
      alert('Editor is empty. Nothing to save.');
      return;
    }

    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      alert('Invalid JSON: ' + e.message);
      return;
    }

    if (!obj.id) {
      alert('Object must have an "id" field.');
      return;
    }

    const idx = coll.findIndex(it => it.id === obj.id);
    if (idx >= 0) {
      coll[idx] = obj;
    } else {
      coll.push(obj);
    }
    currentItemId = obj.id;
    saveSnapshot();
  }

  function addNewItem() {
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll)) {
      alert('Unknown collection: ' + collName);
      return;
    }

    const skeleton = createSkeletonItem(collName);
    coll.push(skeleton);
    currentItemId = skeleton.id;
    saveSnapshot(false); // we'll call setStatus manually
    setStatus('New item created');
    renderCollectionList();
    renderItemEditor();
  }

  function deleteCurrentItem() {
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll) || !currentItemId) return;

    const item = coll.find(it => it.id === currentItemId);
    const label = getLabelForItem(item);
    const ok = window.confirm(
      `Delete this ${collName.slice(0, -1)}?\n\n${label}\n\nThis cannot be undone.`
    );
    if (!ok) return;

    snapshot[collName] = coll.filter(it => it.id !== currentItemId);
    currentItemId = null;
    saveSnapshot();
  }

  // ---- Comparison tab ----

  function renderComparison() {
    const selector = document.getElementById('comparison-selector');
    const wrapper = document.getElementById('comparison-table-wrapper');
    if (!selector || !wrapper) return;
    clearElement(selector);
    clearElement(wrapper);

    if (!snapshot.movements.length) {
      const p = document.createElement('p');
      p.textContent = 'No movements to compare yet.';
      selector.appendChild(p);
      return;
    }

    snapshot.movements.forEach(rel => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = rel.id;
      cb.className = 'cmp-rel';
      cb.checked = true;
      cb.addEventListener('change', updateComparisonTable);
      label.appendChild(cb);
      label.appendChild(document.createTextNode(' ' + (rel.name || rel.id)));
      selector.appendChild(label);
    });

    updateComparisonTable();
  }

  function updateComparisonTable() {
    const wrapper = document.getElementById('comparison-table-wrapper');
    if (!wrapper) return;
    clearElement(wrapper);

    if (typeof ViewModels === 'undefined') {
      const p = document.createElement('p');
      p.textContent = 'ViewModels module not loaded.';
      wrapper.appendChild(p);
      return;
    }

    const selectedIds = Array.from(document.querySelectorAll('.cmp-rel:checked')).map(
      cb => cb.value
    );
    if (!selectedIds.length) {
      const p = document.createElement('p');
      p.textContent = 'Select at least one movement.';
      wrapper.appendChild(p);
      return;
    }

    const cmpVm = ViewModels.buildComparisonViewModel(snapshot, {
      movementIds: selectedIds
    });

    const rows = cmpVm.rows || [];
    if (!rows.length) {
      const p = document.createElement('p');
      p.textContent = 'No data available for comparison.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');

    const headerRow = document.createElement('tr');
    const metricTh = document.createElement('th');
    metricTh.textContent = 'Metric';
    headerRow.appendChild(metricTh);

    rows.forEach(row => {
      const th = document.createElement('th');
      th.textContent = row.movement?.name || row.movement?.id || '—';
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    function addMetricRow(label, getter) {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      th.textContent = label;
      tr.appendChild(th);
      rows.forEach(row => {
        const td = document.createElement('td');
        td.textContent = getter(row);
        tr.appendChild(td);
      });
      table.appendChild(tr);
    }

    addMetricRow('Total texts', r => r.textCounts.totalTexts ?? 0);
    addMetricRow('Works', r => r.textCounts.works ?? 0);
    addMetricRow('Entities', r => r.entityCounts.total ?? 0);
    addMetricRow('Practices', r => r.practiceCounts.total ?? 0);
    addMetricRow('Events', r => r.eventCounts.total ?? 0);
    addMetricRow('Rules', r => r.ruleCount ?? 0);
    addMetricRow('Claims', r => r.claimCount ?? 0);

    // Compact histograms
    addMetricRow('Entities by kind', r =>
      r.entityCounts.byKind
        ? Object.entries(r.entityCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    addMetricRow('Practices by kind', r =>
      r.practiceCounts.byKind
        ? Object.entries(r.practiceCounts.byKind)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    addMetricRow('Events by recurrence', r =>
      r.eventCounts.byRecurrence
        ? Object.entries(r.eventCounts.byRecurrence)
            .map(([k, v]) => `${k}:${v}`)
            .join(', ')
        : ''
    );

    wrapper.appendChild(table);
  }

  // ---- Import / export / sample ----

  function exportSnapshot() {
    const dataStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'movement-snapshot.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('Exported JSON');
  }

  function importSnapshotFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.movements)) {
          alert('Invalid snapshot file: missing top-level "movements" array.');
          return;
        }
        snapshot = ensureAllCollections(data);
        currentMovementId = snapshot.movements[0] ? snapshot.movements[0].id : null;
        currentItemId = null;
        saveSnapshot();
        setStatus('Imported JSON');
      } catch (e) {
        alert('Failed to import: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  // Optional: sample dataset roughly matching sample-data.js
  function loadSampleSnapshot() {
    const sample =
      (typeof window !== 'undefined' && window.sampleData) ||
      {
        movements: [
          {
            id: 'mov-test',
            name: 'Test Faith',
            shortName: 'TF',
            summary: 'A tiny test movement.',
            notes: null,
            tags: ['test']
          }
        ],
        textCollections: [],
        texts: [],
        entities: [
          {
            id: 'ent-god',
            movementId: 'mov-test',
            name: 'Test God',
            kind: 'being',
            summary: 'The primary deity of Test Faith.',
            notes: null,
            tags: ['deity'],
            sourcesOfTruth: ['tradition'],
            sourceEntityIds: []
          }
        ],
        practices: [
          {
            id: 'pr-weekly',
            movementId: 'mov-test',
            name: 'Weekly Gathering',
            kind: 'ritual',
            description: 'People meet once a week.',
            frequency: 'weekly',
            isPublic: true,
            notes: null,
            tags: ['weekly', 'gathering'],
            involvedEntityIds: ['ent-god'],
            instructionsTextIds: [],
            supportingClaimIds: [],
            sourcesOfTruth: ['tradition'],
            sourceEntityIds: []
          }
        ],
        events: [],
        rules: [],
        claims: [],
        media: [],
        notes: [],
        relations: []
      };

    const name = sample.movements?.[0]?.name || 'the sample dataset';
    const confirmReset = window.confirm(
      `Replace the current snapshot with ${name}? This will overwrite all current data.`
    );
    if (!confirmReset) return;

    // Clone to avoid mutating the global sample reference
    snapshot = ensureAllCollections(JSON.parse(JSON.stringify(sample)));
    currentMovementId = snapshot.movements[0] ? snapshot.movements[0].id : null;
    currentItemId = null;
    saveSnapshot();
    setStatus('Loaded sample');
  }

  function newSnapshot() {
    const ok = window.confirm(
      'Start a new, empty snapshot?\n\nThis will clear all current data in the browser.'
    );
    if (!ok) return;
    snapshot = createEmptySnapshot();
    currentMovementId = null;
    currentItemId = null;
    saveSnapshot();
    setStatus('New snapshot created');
  }

  // ---- Init ----

  function init() {
    snapshot = loadSnapshot();
    currentMovementId = snapshot.movements[0] ? snapshot.movements[0].id : null;

    // Sidebar
    document
      .getElementById('btn-add-movement')
      .addEventListener('click', () => addMovement());

    // Top bar actions
    document
      .getElementById('btn-export-snapshot')
      .addEventListener('click', exportSnapshot);

    document.getElementById('btn-import-snapshot').addEventListener('click', () => {
      const input = document.getElementById('file-input');
      input.value = '';
      input.click();
    });

    document.getElementById('file-input').addEventListener('change', e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      importSnapshotFromFile(file);
    });

    document
      .getElementById('btn-load-sample')
      .addEventListener('click', loadSampleSnapshot);

    document
      .getElementById('btn-new-snapshot')
      .addEventListener('click', newSnapshot);

    // Movement form
    document
      .getElementById('btn-save-movement')
      .addEventListener('click', saveMovementFromForm);
    document
      .getElementById('btn-delete-movement')
      .addEventListener('click', () => deleteMovement(currentMovementId));

    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.toggle('active', panel.id === 'tab-' + tabName);
        });
        renderActiveTab();
      });
    });

    // Collections tab
    document
      .getElementById('collection-select')
      .addEventListener('change', e => {
        currentCollectionName = e.target.value;
        currentItemId = null;
        renderCollectionList();
        renderItemEditor();
      });

    document
      .getElementById('collection-filter-by-movement')
      .addEventListener('change', () => {
        renderCollectionList();
        renderItemEditor();
      });

    document.getElementById('btn-add-item').addEventListener('click', addNewItem);
    document
      .getElementById('btn-delete-item')
      .addEventListener('click', deleteCurrentItem);
    document.getElementById('btn-save-item').addEventListener('click', saveItemFromEditor);

    // Initial render
    renderMovementList();
    renderActiveTab();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
