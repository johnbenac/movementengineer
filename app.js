/* app.js
 *
 * UI layer for Movement Engineer v3.
 * All domain logic lives in view-models.js & your data model.
 * This file just handles DOM, localStorage, import/export, and wiring.
 */

/* global DomainService, StorageService, ViewModels */

(function () {
  'use strict';

  // ---- Snapshot management ----

  const COLLECTION_NAMES = DomainService.COLLECTION_NAMES;
  const COLLECTIONS_WITH_MOVEMENT_ID = DomainService.COLLECTIONS_WITH_MOVEMENT_ID;

  let snapshot = null;
  let currentMovementId = null;
  let currentCollectionName = 'entities';
  let currentItemId = null;
  let navigationStack = [];
  let navigationIndex = -1;

  function persistSnapshot({ showStatus = true, statusText } = {}) {
    const result = StorageService.saveSnapshot(snapshot);
    if (!result.ok) {
      setStatus('Save failed');
    } else if (showStatus) {
      setStatus(statusText || 'Saved ✓');
    }
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

  function activateTab(name) {
    const current = getActiveTabName();
    if (current === name) return;
    document
      .querySelectorAll('.tab')
      .forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    document
      .querySelectorAll('.tab-panel')
      .forEach(panel =>
        panel.classList.toggle('active', panel.id === 'tab-' + name)
      );
    renderActiveTab();
  }

  function focusDataTab() {
    if (getActiveTabName() !== 'data') activateTab('data');
  }

  function updateNavigationButtons() {
    const backBtn = document.getElementById('btn-preview-back');
    const fwdBtn = document.getElementById('btn-preview-forward');
    if (!backBtn || !fwdBtn) return;
    backBtn.disabled = navigationIndex <= 0;
    fwdBtn.disabled =
      navigationIndex < 0 || navigationIndex >= navigationStack.length - 1;
  }

  function resetNavigationHistory() {
    navigationStack = [];
    navigationIndex = -1;
    updateNavigationButtons();
  }

  function pushNavigationState(collectionName, itemId) {
    if (!collectionName || !itemId) {
      updateNavigationButtons();
      return;
    }

    const current = navigationStack[navigationIndex];
    if (
      current &&
      current.collectionName === collectionName &&
      current.itemId === itemId
    ) {
      updateNavigationButtons();
      return;
    }

    navigationStack = navigationStack.slice(0, navigationIndex + 1);
    navigationStack.push({ collectionName, itemId });
    navigationIndex = navigationStack.length - 1;
    updateNavigationButtons();
  }

  function pruneNavigationState(collectionName, itemId) {
    if (!navigationStack.length) return;
    const filtered = [];
    navigationStack.forEach((entry, idx) => {
      if (entry.collectionName === collectionName && entry.itemId === itemId) {
        if (idx <= navigationIndex) navigationIndex -= 1;
        return;
      }
      filtered.push(entry);
    });
    navigationStack = filtered;
    if (!navigationStack.length) {
      navigationIndex = -1;
    } else {
      navigationIndex = Math.max(
        Math.min(navigationIndex, navigationStack.length - 1),
        0
      );
    }
    updateNavigationButtons();
  }

  function navigateHistory(direction) {
    if (!navigationStack.length) return;
    const target = navigationIndex + direction;
    if (target < 0 || target >= navigationStack.length) return;
    navigationIndex = target;
    const state = navigationStack[navigationIndex];
    setCollectionAndItem(state.collectionName, state.itemId, {
      addToHistory: false,
      fromHistory: true
    });
    updateNavigationButtons();
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
    const movement = DomainService.addMovement();
    snapshot = DomainService.getSnapshot();
    selectMovement(movement.id);
    persistSnapshot();
  }

  function deleteMovement(id) {
    if (!id) return;
    const movement = DomainService.getMovementById(id);
    if (!movement) return;

    const confirmed = window.confirm(
      'Delete this movement AND all data with this movementId?\n\n' +
        movement.name +
        '\n\nThis cannot be undone.'
    );
    if (!confirmed) return;

    // Remove movement itself
    DomainService.deleteMovement(id);
    snapshot = DomainService.getSnapshot();

    currentMovementId = snapshot.movements[0]
      ? snapshot.movements[0].id
      : null;
    currentItemId = null;
    resetNavigationHistory();
    persistSnapshot();
  }

  // ---- DOM helpers ----

  function $(selector) {
    return document.querySelector(selector);
  }

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function getActiveTabName() {
    const btn = document.querySelector('.tab.active');
    return btn ? btn.dataset.tab : 'dashboard';
  }

  function getActiveMovementSubtabName() {
    const btn = document.querySelector('#movement-subtabs .subtab.active');
    return btn ? btn.dataset.subtab : 'scripture';
  }

  function setActiveMovementSubtab(name) {
    const buttons = document.querySelectorAll('#movement-subtabs .subtab');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === name);
    });
    const panels = document.querySelectorAll(
      '.movement-explorer .subtab-panel'
    );
    panels.forEach(panel => {
      panel.classList.toggle(
        'active',
        panel.id === 'movement-subtab-' + name
      );
    });
    renderMovementSubtab(name);
  }

  function renderActiveTab() {
    const tabName = getActiveTabName();
    switch (tabName) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'movement':
        renderMovementForm();
        renderMovementExplorer();
        break;
      case 'data':
        renderCollectionList();
        renderItemDetail();
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
      [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(
        el => {
          el.disabled = true;
        }
      );
      return;
    }

    const movement = getMovementById(currentMovementId);
    if (!movement) {
      // out of sync; reset
      currentMovementId = null;
      renderMovementForm();
      return;
    }

    [nameInput, shortInput, summaryInput, tagsInput, deleteBtn, saveBtn].forEach(
      el => {
        el.disabled = false;
      }
    );

    idLabel.textContent = movement.id;
    nameInput.value = movement.name || '';
    shortInput.value = movement.shortName || '';
    summaryInput.value = movement.summary || '';
    tagsInput.value = Array.isArray(movement.tags)
      ? movement.tags.join(', ')
      : '';
  }

  function saveMovementFromForm() {
    if (!currentMovementId) return;
    const movement = getMovementById(currentMovementId);
    if (!movement) return;

    const nameInput = document.getElementById('movement-name');
    const shortInput = document.getElementById('movement-shortName');
    const summaryInput = document.getElementById('movement-summary');
    const tagsInput = document.getElementById('movement-tags');

    DomainService.updateMovement(currentMovementId, {
      name: nameInput.value.trim() || 'Untitled movement',
      shortName: shortInput.value.trim() || movement.name,
      summary: summaryInput.value.trim(),
      tags: tagsInput.value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    });

    snapshot = DomainService.getSnapshot();
    persistSnapshot();
  }

  // ---- Movement explorer (view-model-driven views) ----

  function renderMovementExplorer() {
    const explorer = document.querySelector('.movement-explorer');
    if (!explorer) return;

    const hasMovement = Boolean(currentMovementId);
    // Disable inner controls textually when no movement
    const subtabPanels = explorer.querySelectorAll('.subtab-panel');
    if (!hasMovement) {
      subtabPanels.forEach(panel => {
        clearElement(panel.querySelector('.tree-container') || panel);
      });
    }
    const activeSubtab = getActiveMovementSubtabName();
    renderMovementSubtab(activeSubtab);
  }

  function ensureSelectOptions(selectEl, options, includeEmptyLabel) {
    if (!selectEl) return;
    const prev = selectEl.value;
    clearElement(selectEl);
    if (includeEmptyLabel) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = includeEmptyLabel;
      selectEl.appendChild(opt);
    }
    options.forEach(optData => {
      const opt = document.createElement('option');
      opt.value = optData.value;
      opt.textContent = optData.label;
      selectEl.appendChild(opt);
    });
    if (prev && options.some(o => o.value === prev)) {
      selectEl.value = prev;
    }
  }

  function renderMovementSubtab(name) {
    if (!currentMovementId) {
      // Show a simple message in each container
      const containers = {
        scripture: $('#scripture-tree'),
        entities: $('#entity-detail'),
        practices: $('#practice-detail'),
        calendar: $('#calendar-view'),
        claims: $('#claims-table-wrapper'),
        rules: $('#rules-table-wrapper'),
        authority: $('#authority-sources'),
        media: $('#media-gallery'),
        relations: $('#relations-table-wrapper'),
        notes: $('#notes-table-wrapper')
      };
      const target = containers[name];
      if (target) {
        clearElement(target);
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent =
          'Create or select a movement on the left to explore this section.';
        target.appendChild(p);
      }
      return;
    }

    switch (name) {
      case 'scripture':
        renderScriptureView();
        break;
      case 'entities':
        renderEntitiesView();
        break;
      case 'practices':
        renderPracticesView();
        break;
      case 'calendar':
        renderCalendarView();
        break;
      case 'claims':
        renderClaimsView();
        break;
      case 'rules':
        renderRulesView();
        break;
      case 'authority':
        renderAuthorityView();
        break;
      case 'media':
        renderMediaView();
        break;
      case 'relations':
        renderRelationsView();
        break;
      case 'notes':
        renderNotesView();
        break;
      default:
        break;
    }
  }

  // ---- Scripture (buildScriptureTreeViewModel) ----

  function renderScriptureView() {
    const treeContainer = document.getElementById('scripture-tree');
    if (!treeContainer) return;
    clearElement(treeContainer);

    const select = document.getElementById('scripture-collection-select');
    if (!select) return;

    const allCollections = snapshot.textCollections || [];
    const ownCollections = allCollections.filter(
      tc => tc.movementId === currentMovementId
    );
    const options = ownCollections.map(tc => ({
      value: tc.id,
      label: tc.name || tc.id
    }));
    ensureSelectOptions(select, options, 'All texts (no collection filter)');

    const textCollectionId = select.value || null;

    const vm = ViewModels.buildScriptureTreeViewModel(snapshot, {
      movementId: currentMovementId,
      textCollectionId: textCollectionId || null
    });

    if (!vm.roots || vm.roots.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No texts found for this movement.';
      treeContainer.appendChild(p);
      return;
    }

    const ul = document.createElement('ul');
    ul.className = 'text-tree';

    const renderNode = node => {
      const li = document.createElement('li');
      li.className = 'text-node';

      const header = document.createElement('div');
      header.className = 'text-node-header';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'text-node-title';
      const labelPart = node.label ? node.label + ' ' : '';
      titleSpan.textContent =
        (labelPart + (node.title || '')).trim() || node.id;
      header.appendChild(titleSpan);

      const metaSpan = document.createElement('span');
      metaSpan.className = 'text-node-meta';
      const bits = [];
      if (node.level) bits.push(node.level);
      if (node.mainFunction) bits.push(node.mainFunction);
      if (node.hasContent) bits.push('has content');
      metaSpan.textContent = bits.join(' · ');
      header.appendChild(metaSpan);

      li.appendChild(header);

      const body = document.createElement('div');
      body.className = 'text-node-body';

      if (node.tags && node.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        node.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        body.appendChild(row);
      }

      if (node.mentionsEntities && node.mentionsEntities.length) {
        const label = document.createElement('div');
        label.textContent = 'Mentions:';
        label.style.fontSize = '0.75rem';
        body.appendChild(label);

        const row = document.createElement('div');
        row.className = 'chip-row';
        node.mentionsEntities.forEach(ent => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = ent.name || ent.id;
          chip.title = ent.kind || '';
          chip.addEventListener('click', () => jumpToEntity(ent.id));
          row.appendChild(chip);
        });
        body.appendChild(row);
      }

      if (node.referencedByClaims && node.referencedByClaims.length) {
        const label = document.createElement('div');
        label.textContent = `Claims (${node.referencedByClaims.length}):`;
        label.style.fontSize = '0.75rem';
        body.appendChild(label);
      }

      if (node.usedInEvents && node.usedInEvents.length) {
        const label = document.createElement('div');
        label.textContent = `Used in events (${node.usedInEvents.length}):`;
        label.style.fontSize = '0.75rem';
        body.appendChild(label);
      }

      if (body.childNodes.length) {
        li.appendChild(body);
      }

      if (node.childIds && node.childIds.length) {
        const childUl = document.createElement('ul');
        childUl.className = 'text-tree';
        node.childIds.forEach(id => {
          const child = vm.nodesById[id];
          if (child) {
            childUl.appendChild(renderNode(child));
          }
        });
        li.appendChild(childUl);
      }

      return li;
    };

    vm.roots.forEach(root => {
      ul.appendChild(renderNode(root));
    });
    treeContainer.appendChild(ul);
  }

  // ---- Entities (buildEntityDetailViewModel + buildEntityGraphViewModel) ----

  function renderEntitiesView() {
    const select = document.getElementById('entity-select');
    const detailContainer = document.getElementById('entity-detail');
    const graphDepthSelect = document.getElementById('entity-graph-depth');
    const graphContainer = document.getElementById('entity-graph');
    if (!select || !detailContainer || !graphDepthSelect || !graphContainer)
      return;

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId || e.movementId == null
    );

    const options = entities
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(e => ({ value: e.id, label: e.name || e.id }));
    ensureSelectOptions(select, options, 'Choose entity');

    const entityId =
      select.value || (options.length ? options[0].value : null);

    clearElement(detailContainer);
    clearElement(graphContainer);

    if (!entityId) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No entities found for this movement.';
      detailContainer.appendChild(p);
      return;
    }

    // Detail view
    const vm = ViewModels.buildEntityDetailViewModel(snapshot, {
      entityId
    });

    if (!vm.entity) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Entity not found.';
      detailContainer.appendChild(p);
      return;
    }

    const title = document.createElement('h3');
    title.textContent =
      vm.entity.name +
      (vm.entity.kind ? ` (${vm.entity.kind})` : '');
    detailContainer.appendChild(title);

    if (vm.entity.summary) {
      const summary = document.createElement('p');
      summary.textContent = vm.entity.summary;
      detailContainer.appendChild(summary);
    }

    const mkSection = (label, contentBuilder) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading small';
      heading.textContent = label;
      detailContainer.appendChild(heading);
      const section = document.createElement('div');
      section.style.fontSize = '0.8rem';
      contentBuilder(section);
      detailContainer.appendChild(section);
    };

    if (vm.claims && vm.claims.length) {
      mkSection('Claims about this entity', section => {
        const ul = document.createElement('ul');
        vm.claims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.practices && vm.practices.length) {
      mkSection('Involved in practices', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.practices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.title = p.kind || '';
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.events && vm.events.length) {
      mkSection('Appears in events', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.events.forEach(ev => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = ev.name || ev.id;
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.mentioningTexts && vm.mentioningTexts.length) {
      mkSection('Mentioned in texts', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.mentioningTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.title = t.level || '';
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.media && vm.media.length) {
      mkSection('Linked media', section => {
        const ul = document.createElement('ul');
        vm.media.forEach(m => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = m.uri;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = `${m.title} (${m.kind})`;
          li.appendChild(a);
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (
      (vm.relationsOut && vm.relationsOut.length) ||
      (vm.relationsIn && vm.relationsIn.length)
    ) {
      mkSection('Relations', section => {
        const ul = document.createElement('ul');
        vm.relationsOut.forEach(r => {
          const li = document.createElement('li');
          li.textContent = `→ ${r.relationType} → ${r.to.name}`;
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => jumpToEntity(r.to.id));
          ul.appendChild(li);
        });
        vm.relationsIn.forEach(r => {
          const li = document.createElement('li');
          li.textContent = `← ${r.relationType} ← ${r.from.name}`;
          li.style.cursor = 'pointer';
          li.addEventListener('click', () => jumpToEntity(r.from.id));
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    // Graph view
    const depth = parseInt(
      document.getElementById('entity-graph-depth').value,
      10
    );
    const relTypeInput = document.getElementById(
      'entity-graph-relation-types'
    );
    const relTypesRaw = relTypeInput.value || '';
    const relationTypeFilter = relTypesRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const graphVm = ViewModels.buildEntityGraphViewModel(snapshot, {
      movementId: currentMovementId,
      centerEntityId: entityId,
      depth: Number.isFinite(depth) ? depth : 1,
      relationTypeFilter
    });

    const nodesById = new Map();
    graphVm.nodes.forEach(n => nodesById.set(n.id, n));

    const nodesTitle = document.createElement('div');
    nodesTitle.className = 'section-heading small';
    nodesTitle.textContent = `Nodes (${graphVm.nodes.length})`;
    graphContainer.appendChild(nodesTitle);

    const nodeRow = document.createElement('div');
    nodeRow.className = 'chip-row';
    graphVm.nodes.forEach(n => {
      const chip = document.createElement('span');
      chip.className =
        'chip' + (n.id === graphVm.centerEntityId ? ' clickable' : '');
      chip.textContent =
        (n.id === graphVm.centerEntityId ? '★ ' : '') +
        (n.name || n.id);
      chip.title = n.kind || '';
      chip.addEventListener('click', () => {
        if (n.id) {
          document.getElementById('entity-select').value = n.id;
          renderEntitiesView();
        }
      });
      nodeRow.appendChild(chip);
    });
    graphContainer.appendChild(nodeRow);

    const edgesTitle = document.createElement('div');
    edgesTitle.className = 'section-heading small';
    edgesTitle.textContent = `Edges (${graphVm.edges.length})`;
    graphContainer.appendChild(edgesTitle);

    const edgesList = document.createElement('ul');
    edgesList.style.fontSize = '0.8rem';
    graphVm.edges.forEach(e => {
      const li = document.createElement('li');
      const from = nodesById.get(e.fromId);
      const to = nodesById.get(e.toId);
      li.textContent = `${from ? from.name : e.fromId} — ${
        e.relationType
      } → ${to ? to.name : e.toId}`;
      edgesList.appendChild(li);
    });
    graphContainer.appendChild(edgesList);
  }

  // ---- Practices (buildPracticeDetailViewModel) ----

  function renderPracticesView() {
    const select = document.getElementById('practice-select');
    const detailContainer = document.getElementById('practice-detail');
    if (!select || !detailContainer) return;
    clearElement(detailContainer);

    const practices = (snapshot.practices || []).filter(
      p => p.movementId === currentMovementId
    );
    const options = practices
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(p => ({ value: p.id, label: p.name || p.id }));
    ensureSelectOptions(select, options, 'Choose practice');

    const practiceId =
      select.value || (options.length ? options[0].value : null);

    if (!practiceId) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No practices found for this movement.';
      detailContainer.appendChild(p);
      return;
    }

    const vm = ViewModels.buildPracticeDetailViewModel(snapshot, {
      practiceId
    });

    if (!vm.practice) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'Practice not found.';
      detailContainer.appendChild(p);
      return;
    }

    const title = document.createElement('h3');
    title.textContent =
      vm.practice.name +
      (vm.practice.kind ? ` (${vm.practice.kind})` : '');
    detailContainer.appendChild(title);

    const meta = document.createElement('p');
    meta.style.fontSize = '0.8rem';
    meta.textContent = `Frequency: ${vm.practice.frequency} · Public: ${
      vm.practice.isPublic ? 'yes' : 'no'
    }`;
    detailContainer.appendChild(meta);

    if (vm.practice.description) {
      const desc = document.createElement('p');
      desc.textContent = vm.practice.description;
      detailContainer.appendChild(desc);
    }

    const mkSection = (label, contentBuilder) => {
      const heading = document.createElement('div');
      heading.className = 'section-heading small';
      heading.textContent = label;
      detailContainer.appendChild(heading);
      const section = document.createElement('div');
      section.style.fontSize = '0.8rem';
      contentBuilder(section);
      detailContainer.appendChild(section);
    };

    if (vm.entities && vm.entities.length) {
      mkSection('Involves entities', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.entities.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = e.name || e.id;
          chip.title = e.kind || '';
          chip.addEventListener('click', () => jumpToEntity(e.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.instructionsTexts && vm.instructionsTexts.length) {
      mkSection('Instruction texts', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.instructionsTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.title = t.level || '';
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.supportingClaims && vm.supportingClaims.length) {
      mkSection('Supporting claims', section => {
        const ul = document.createElement('ul');
        vm.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.attachedRules && vm.attachedRules.length) {
      mkSection('Related rules', section => {
        const ul = document.createElement('ul');
        vm.attachedRules.forEach(r => {
          const li = document.createElement('li');
          li.textContent =
            (r.kind ? '[' + r.kind + '] ' : '') + r.shortText;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }

    if (vm.attachedEvents && vm.attachedEvents.length) {
      mkSection('Scheduled in events', section => {
        const row = document.createElement('div');
        row.className = 'chip-row';
        vm.attachedEvents.forEach(ev => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = `${ev.name} (${ev.recurrence})`;
          row.appendChild(chip);
        });
        section.appendChild(row);
      });
    }

    if (vm.media && vm.media.length) {
      mkSection('Media', section => {
        const ul = document.createElement('ul');
        vm.media.forEach(m => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = m.uri;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = `${m.title} (${m.kind})`;
          li.appendChild(a);
          ul.appendChild(li);
        });
        section.appendChild(ul);
      });
    }
  }

  // ---- Calendar (buildCalendarViewModel) ----

  function renderCalendarView() {
    const wrapper = document.getElementById('calendar-view');
    const select = document.getElementById('calendar-recurrence-filter');
    if (!wrapper || !select) return;
    clearElement(wrapper);

    const val = select.value;
    const recurrenceFilter = val ? [val] : [];

    const vm = ViewModels.buildCalendarViewModel(snapshot, {
      movementId: currentMovementId,
      recurrenceFilter
    });

    if (!vm.events || vm.events.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No events in the calendar for this filter.';
      wrapper.appendChild(p);
      return;
    }

    vm.events.forEach(e => {
      const card = document.createElement('div');
      card.className = 'card';

      const title = document.createElement('h4');
      title.textContent = e.name;
      card.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `${e.recurrence} · ${e.timingRule}`;
      card.appendChild(meta);

      if (e.description) {
        const p = document.createElement('p');
        p.textContent = e.description;
        card.appendChild(p);
      }

      if (e.tags && e.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        e.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.mainPractices && e.mainPractices.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Practices:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.mainPractices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.mainEntities && e.mainEntities.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Entities:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.mainEntities.forEach(ent => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = ent.name || ent.id;
          chip.addEventListener('click', () => jumpToEntity(ent.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.readings && e.readings.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Readings:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        e.readings.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (e.supportingClaims && e.supportingClaims.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Supporting claims:';
        card.appendChild(heading);

        const ul = document.createElement('ul');
        e.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      wrapper.appendChild(card);
    });
  }

  // ---- Claims (buildClaimsExplorerViewModel) ----

  function renderClaimsView() {
    const wrapper = document.getElementById('claims-table-wrapper');
    const catSelect = document.getElementById('claims-category-filter');
    const entSelect = document.getElementById('claims-entity-filter');
    if (!wrapper || !catSelect || !entSelect) return;
    clearElement(wrapper);

    const allClaims = (snapshot.claims || []).filter(
      c =>
        c.movementId === currentMovementId ||
        c.movementId == null
    );
    const categories = Array.from(
      new Set(
        allClaims
          .map(c => c.category)
          .filter(Boolean)
      )
    ).sort();

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId || e.movementId == null
    );

    ensureSelectOptions(
      catSelect,
      categories.map(c => ({ value: c, label: c })),
      'All'
    );
    ensureSelectOptions(
      entSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );

    const categoryVal = catSelect.value || '';
    const entityVal = entSelect.value || '';

    const vm = ViewModels.buildClaimsExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      categoryFilter: categoryVal ? [categoryVal] : [],
      entityIdFilter: entityVal || null
    });

    if (!vm.claims || vm.claims.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No claims match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Category',
      'Text',
      'Tags',
      'About entities',
      'Source texts',
      'Sources of truth'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.claims.forEach(c => {
      const tr = document.createElement('tr');

      const tdCat = document.createElement('td');
      tdCat.textContent = c.category || '';
      tr.appendChild(tdCat);

      const tdText = document.createElement('td');
      tdText.textContent = c.text;
      tr.appendChild(tdText);

      const tdTags = document.createElement('td');
      tdTags.textContent = (c.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdEnts = document.createElement('td');
      if (c.aboutEntities && c.aboutEntities.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        c.aboutEntities.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = e.name || e.id;
          chip.addEventListener('click', () => jumpToEntity(e.id));
          row.appendChild(chip);
        });
        tdEnts.appendChild(row);
      }
      tr.appendChild(tdEnts);

      const tdTexts = document.createElement('td');
      if (c.sourceTexts && c.sourceTexts.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        c.sourceTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        tdTexts.appendChild(row);
      }
      tr.appendChild(tdTexts);

      const tdSources = document.createElement('td');
      tdSources.textContent = (c.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Rules (buildRuleExplorerViewModel) ----

  function renderRulesView() {
    const wrapper = document.getElementById('rules-table-wrapper');
    const kindSelect = document.getElementById('rules-kind-filter');
    const domainInput = document.getElementById('rules-domain-filter');
    if (!wrapper || !kindSelect || !domainInput) return;
    clearElement(wrapper);

    const kindVal = kindSelect.value || '';
    const rawDomain = domainInput.value || '';
    const domainFilter = rawDomain
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const vm = ViewModels.buildRuleExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      kindFilter: kindVal ? [kindVal] : [],
      domainFilter
    });

    if (!vm.rules || vm.rules.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No rules match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Kind',
      'Short text',
      'Domain',
      'Applies to',
      'Tags',
      'Supporting texts',
      'Supporting claims',
      'Related practices',
      'Sources of truth'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.rules.forEach(r => {
      const tr = document.createElement('tr');

      const tdKind = document.createElement('td');
      tdKind.textContent = r.kind || '';
      tr.appendChild(tdKind);

      const tdShort = document.createElement('td');
      tdShort.textContent = r.shortText;
      tr.appendChild(tdShort);

      const tdDomain = document.createElement('td');
      tdDomain.textContent = (r.domain || []).join(', ');
      tr.appendChild(tdDomain);

      const tdApplies = document.createElement('td');
      tdApplies.textContent = (r.appliesTo || []).join(', ');
      tr.appendChild(tdApplies);

      const tdTags = document.createElement('td');
      tdTags.textContent = (r.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdTexts = document.createElement('td');
      if (r.supportingTexts && r.supportingTexts.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        r.supportingTexts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        tdTexts.appendChild(row);
      }
      tr.appendChild(tdTexts);

      const tdClaims = document.createElement('td');
      if (r.supportingClaims && r.supportingClaims.length) {
        const ul = document.createElement('ul');
        r.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent =
            (c.category ? '[' + c.category + '] ' : '') + c.text;
          ul.appendChild(li);
        });
        tdClaims.appendChild(ul);
      }
      tr.appendChild(tdClaims);

      const tdPractices = document.createElement('td');
      if (r.relatedPractices && r.relatedPractices.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        r.relatedPractices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        tdPractices.appendChild(row);
      }
      tr.appendChild(tdPractices);

      const tdSources = document.createElement('td');
      tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Authority (buildAuthorityViewModel) ----

  function renderAuthorityView() {
    const srcWrapper = document.getElementById('authority-sources');
    const entWrapper = document.getElementById('authority-entities');
    if (!srcWrapper || !entWrapper) return;
    clearElement(srcWrapper);
    clearElement(entWrapper);

    const vm = ViewModels.buildAuthorityViewModel(snapshot, {
      movementId: currentMovementId
    });

    if (!vm.sourcesByLabel || vm.sourcesByLabel.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No sources of truth recorded yet.';
      srcWrapper.appendChild(p);
    } else {
      vm.sourcesByLabel.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';

        const h = document.createElement('h4');
        h.textContent = s.label;
        card.appendChild(h);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = [
          `Claims: ${s.usedByClaims.length}`,
          `Rules: ${s.usedByRules.length}`,
          `Practices: ${s.usedByPractices.length}`,
          `Entities: ${s.usedByEntities.length}`,
          `Relations: ${s.usedByRelations.length}`
        ].join(' · ');
        card.appendChild(meta);

        srcWrapper.appendChild(card);
      });
    }

    if (!vm.authorityEntities || vm.authorityEntities.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No authority entities recorded yet.';
      entWrapper.appendChild(p);
    } else {
      vm.authorityEntities.forEach(e => {
        const card = document.createElement('div');
        card.className = 'card';

        const h = document.createElement('h4');
        h.textContent =
          e.name + (e.kind ? ` (${e.kind})` : '');
        card.appendChild(h);

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = [
          `Claims: ${e.usedAsSourceIn.claims.length}`,
          `Rules: ${e.usedAsSourceIn.rules.length}`,
          `Practices: ${e.usedAsSourceIn.practices.length}`,
          `Entities: ${e.usedAsSourceIn.entities.length}`,
          `Relations: ${e.usedAsSourceIn.relations.length}`
        ].join(' · ');
        card.appendChild(meta);

        entWrapper.appendChild(card);
      });
    }
  }

  // ---- Media (buildMediaGalleryViewModel) ----

  function renderMediaView() {
    const wrapper = document.getElementById('media-gallery');
    const entSelect = document.getElementById('media-entity-filter');
    const prSelect = document.getElementById('media-practice-filter');
    const evSelect = document.getElementById('media-event-filter');
    const txSelect = document.getElementById('media-text-filter');
    if (!wrapper || !entSelect || !prSelect || !evSelect || !txSelect) return;
    clearElement(wrapper);

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId || e.movementId == null
    );
    const practices = (snapshot.practices || []).filter(
      p => p.movementId === currentMovementId
    );
    const events = (snapshot.events || []).filter(
      e => e.movementId === currentMovementId
    );
    const texts = (snapshot.texts || []).filter(
      t => t.movementId === currentMovementId
    );

    ensureSelectOptions(
      entSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );
    ensureSelectOptions(
      prSelect,
      practices
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(p => ({ value: p.id, label: p.name || p.id })),
      'Any'
    );
    ensureSelectOptions(
      evSelect,
      events
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );
    ensureSelectOptions(
      txSelect,
      texts
        .slice()
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
        .map(t => ({ value: t.id, label: t.title || t.id })),
      'Any'
    );

    const entityIdFilter = entSelect.value || null;
    const practiceIdFilter = prSelect.value || null;
    const eventIdFilter = evSelect.value || null;
    const textIdFilter = txSelect.value || null;

    const vm = ViewModels.buildMediaGalleryViewModel(snapshot, {
      movementId: currentMovementId,
      entityIdFilter: entityIdFilter || null,
      practiceIdFilter: practiceIdFilter || null,
      eventIdFilter: eventIdFilter || null,
      textIdFilter: textIdFilter || null
    });

    if (!vm.items || vm.items.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No media match this filter.';
      wrapper.appendChild(p);
      return;
    }

    vm.items.forEach(m => {
      const card = document.createElement('div');
      card.className = 'card';

      const h = document.createElement('h4');
      h.textContent =
        m.title + (m.kind ? ` (${m.kind})` : '');
      card.appendChild(h);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = m.uri;
      card.appendChild(meta);

      if (m.description) {
        const p = document.createElement('p');
        p.textContent = m.description;
        card.appendChild(p);
      }

      if (m.tags && m.tags.length) {
        const row = document.createElement('div');
        row.className = 'chip-row';
        m.tags.forEach(tag => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = tag;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.entities && m.entities.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Entities:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.entities.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = e.name || e.id;
          chip.addEventListener('click', () => jumpToEntity(e.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.practices && m.practices.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Practices:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.practices.forEach(p => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = p.name || p.id;
          chip.addEventListener('click', () => jumpToPractice(p.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.events && m.events.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Events:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.events.forEach(e => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = e.name || e.id;
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      if (m.texts && m.texts.length) {
        const heading = document.createElement('div');
        heading.style.fontSize = '0.75rem';
        heading.textContent = 'Texts:';
        card.appendChild(heading);

        const row = document.createElement('div');
        row.className = 'chip-row';
        m.texts.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = t.title || t.id;
          chip.addEventListener('click', () => jumpToText(t.id));
          row.appendChild(chip);
        });
        card.appendChild(row);
      }

      wrapper.appendChild(card);
    });
  }

  // ---- Relations (buildRelationExplorerViewModel) ----

  function renderRelationsView() {
    const wrapper = document.getElementById('relations-table-wrapper');
    const typeSelect = document.getElementById('relations-type-filter');
    const entSelect = document.getElementById('relations-entity-filter');
    if (!wrapper || !typeSelect || !entSelect) return;
    clearElement(wrapper);

    const allRelations = (snapshot.relations || []).filter(
      r =>
        r.movementId === currentMovementId ||
        r.movementId == null
    );
    const relationTypes = Array.from(
      new Set(allRelations.map(r => r.relationType).filter(Boolean))
    ).sort();

    const entities = (snapshot.entities || []).filter(
      e => e.movementId === currentMovementId || e.movementId == null
    );

    ensureSelectOptions(
      typeSelect,
      relationTypes.map(t => ({ value: t, label: t })),
      'All'
    );
    ensureSelectOptions(
      entSelect,
      entities
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(e => ({ value: e.id, label: e.name || e.id })),
      'Any'
    );

    const typeVal = typeSelect.value || '';
    const entVal = entSelect.value || '';

    const vm = ViewModels.buildRelationExplorerViewModel(snapshot, {
      movementId: currentMovementId,
      relationTypeFilter: typeVal ? [typeVal] : [],
      entityIdFilter: entVal || null
    });

    if (!vm.relations || vm.relations.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No relations match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    ['Type', 'From', 'To', 'Tags', 'Supporting claims', 'Sources of truth'].forEach(
      h => {
        const th = document.createElement('th');
        th.textContent = h;
        headerRow.appendChild(th);
      }
    );
    table.appendChild(headerRow);

    vm.relations.forEach(r => {
      const tr = document.createElement('tr');

      const tdType = document.createElement('td');
      tdType.textContent = r.relationType;
      tr.appendChild(tdType);

      const tdFrom = document.createElement('td');
      const fromLink = document.createElement('a');
      fromLink.href = '#';
      fromLink.textContent = r.from.name || r.from.id;
      fromLink.className = 'entity-link';
      fromLink.addEventListener('click', ev => {
        ev.preventDefault();
        jumpToEntity(r.from.id);
      });
      tdFrom.appendChild(fromLink);
      tr.appendChild(tdFrom);

      const tdTo = document.createElement('td');
      const toLink = document.createElement('a');
      toLink.href = '#';
      toLink.textContent = r.to.name || r.to.id;
      toLink.className = 'entity-link';
      toLink.addEventListener('click', ev => {
        ev.preventDefault();
        jumpToEntity(r.to.id);
      });
      tdTo.appendChild(toLink);
      tr.appendChild(tdTo);

      const tdTags = document.createElement('td');
      tdTags.textContent = (r.tags || []).join(', ');
      tr.appendChild(tdTags);

      const tdClaims = document.createElement('td');
      if (r.supportingClaims && r.supportingClaims.length) {
        const ul = document.createElement('ul');
        r.supportingClaims.forEach(c => {
          const li = document.createElement('li');
          li.textContent = c.text;
          ul.appendChild(li);
        });
        tdClaims.appendChild(ul);
      }
      tr.appendChild(tdClaims);

      const tdSources = document.createElement('td');
      tdSources.textContent = (r.sourcesOfTruth || []).join(', ');
      tr.appendChild(tdSources);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Notes (buildNotesViewModel) ----

  function renderNotesView() {
    const wrapper = document.getElementById('notes-table-wrapper');
    const typeSelect = document.getElementById('notes-target-type-filter');
    const idSelect = document.getElementById('notes-target-id-filter');
    if (!wrapper || !typeSelect || !idSelect) return;
    clearElement(wrapper);

    // First pass to build filters from all notes
    const baseVm = ViewModels.buildNotesViewModel(snapshot, {
      movementId: currentMovementId,
      targetTypeFilter: null,
      targetIdFilter: null
    });

    const notes = baseVm.notes || [];
    const targetTypes = Array.from(
      new Set(notes.map(n => n.targetType).filter(Boolean))
    ).sort();

    ensureSelectOptions(
      typeSelect,
      targetTypes.map(t => ({ value: t, label: t })),
      'All'
    );

    const selectedType = typeSelect.value || '';

    const idsForType = notes.filter(
      n => !selectedType || n.targetType === selectedType
    );

    const idOptionsMap = new Map();
    idsForType.forEach(n => {
      if (!idOptionsMap.has(n.targetId)) {
        idOptionsMap.set(n.targetId, n.targetLabel || n.targetId);
      }
    });

    const idOptions = Array.from(idOptionsMap.entries()).map(
      ([value, label]) => ({ value, label })
    );
    ensureSelectOptions(idSelect, idOptions, 'Any');

    const selectedId = idSelect.value || '';

    const vm = ViewModels.buildNotesViewModel(snapshot, {
      movementId: currentMovementId,
      targetTypeFilter: selectedType || null,
      targetIdFilter: selectedId || null
    });

    if (!vm.notes || vm.notes.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No notes match this filter.';
      wrapper.appendChild(p);
      return;
    }

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');
    [
      'Target type',
      'Target',
      'Author',
      'Body',
      'Context',
      'Tags'
    ].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    vm.notes.forEach(n => {
      const tr = document.createElement('tr');

      const tdType = document.createElement('td');
      tdType.textContent = n.targetType;
      tr.appendChild(tdType);

      const tdTarget = document.createElement('td');
      tdTarget.textContent = n.targetLabel || n.targetId;
      tr.appendChild(tdTarget);

      const tdAuthor = document.createElement('td');
      tdAuthor.textContent = n.author || '';
      tr.appendChild(tdAuthor);

      const tdBody = document.createElement('td');
      tdBody.textContent = n.body;
      tr.appendChild(tdBody);

      const tdCtx = document.createElement('td');
      tdCtx.textContent = n.context || '';
      tr.appendChild(tdCtx);

      const tdTags = document.createElement('td');
      tdTags.textContent = (n.tags || []).join(', ');
      tr.appendChild(tdTags);

      table.appendChild(tr);
    });

    wrapper.appendChild(table);
  }

  // ---- Cross-navigation helpers ----

  function jumpToEntity(entityId) {
    if (!entityId) return;
    const entSelect = document.getElementById('entity-select');
    if (!entSelect) return;
    // Switch to movement tab + entities subtab
    document
      .querySelectorAll('.tab')
      .forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="movement"]').classList.add('active');
    document
      .querySelectorAll('.tab-panel')
      .forEach(panel => panel.classList.remove('active'));
    document.getElementById('tab-movement').classList.add('active');
    setActiveMovementSubtab('entities');
    entSelect.value = entityId;
    renderEntitiesView();
  }

  function jumpToPractice(practiceId) {
    if (!practiceId) return;
    const prSelect = document.getElementById('practice-select');
    if (!prSelect) return;
    document
      .querySelectorAll('.tab')
      .forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="movement"]').classList.add('active');
    document
      .querySelectorAll('.tab-panel')
      .forEach(panel => panel.classList.remove('active'));
    document.getElementById('tab-movement').classList.add('active');
    setActiveMovementSubtab('practices');
    prSelect.value = practiceId;
    renderPracticesView();
  }

  function jumpToText(textId) {
    if (!textId) return;
    document
      .querySelectorAll('.tab')
      .forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="movement"]').classList.add('active');
    document
      .querySelectorAll('.tab-panel')
      .forEach(panel => panel.classList.remove('active'));
    document.getElementById('tab-movement').classList.add('active');
    setActiveMovementSubtab('scripture');
    // Scripture view does not currently center on a text,
    // but re-render so the user can browse the tree that includes it.
    renderScriptureView();
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
    title.textContent =
      vm.movement.name +
      (vm.movement.shortName ? ` (${vm.movement.shortName})` : '');
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
      Object.entries(vm.eventStats.byRecurrence).forEach(
        ([rec, count]) => {
          const li = document.createElement('li');
          li.textContent = `${rec}: ${count}`;
          ul.appendChild(li);
        }
      );
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
    const filterByMovement = document.getElementById(
      'collection-filter-by-movement'
    ).checked;

    let items = coll;
    if (
      filterByMovement &&
      currentMovementId &&
      COLLECTIONS_WITH_MOVEMENT_ID.has(collName)
    ) {
      items = coll.filter(
        item =>
          item.movementId === currentMovementId ||
          item.movementId == null
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
        setCollectionAndItem(collName, item.id);
      });
      list.appendChild(li);
    });

    document.getElementById('btn-delete-item').disabled = !currentItemId;
  }

  function mapIdToLabel(collectionName, id) {
    if (!id) return '—';
    if (collectionName === 'movements') {
      const movement = getMovementById(id);
      return movement ? movement.name || movement.id : id;
    }
    const coll = snapshot[collectionName] || [];
    const item = coll.find(it => it.id === id);
    return item ? getLabelForItem(item) : id;
  }

  function setCollectionAndItem(collectionName, itemId, options = {}) {
    const { addToHistory = true, fromHistory = false } = options;

    if (!COLLECTION_NAMES.includes(collectionName)) {
      setStatus('Unknown collection: ' + collectionName);
      return;
    }

    currentCollectionName = collectionName;
    const select = document.getElementById('collection-select');
    if (select && select.value !== collectionName) select.value = collectionName;

    const coll = snapshot[collectionName] || [];
    const foundItem = itemId ? coll.find(it => it.id === itemId) : null;

    const movementFilter = document.getElementById('collection-filter-by-movement');
    if (
      movementFilter &&
      movementFilter.checked &&
      foundItem &&
      COLLECTIONS_WITH_MOVEMENT_ID.has(collectionName) &&
      foundItem.movementId &&
      currentMovementId &&
      foundItem.movementId !== currentMovementId
    ) {
      movementFilter.checked = false;
    }

    currentItemId = foundItem ? foundItem.id : null;

    focusDataTab();

    renderCollectionList();
    renderItemDetail();

    if (addToHistory && currentItemId && !fromHistory) {
      pushNavigationState(collectionName, currentItemId);
    } else {
      updateNavigationButtons();
    }
  }

  function jumpToReferencedItem(collectionName, itemId) {
    if (!collectionName || !itemId) return;
    if (collectionName === 'movements') {
      selectMovement(itemId);
      activateTab('movement');
      return;
    }
    const coll = snapshot[collectionName];
    if (!Array.isArray(coll)) {
      setStatus('Unknown collection: ' + collectionName);
      return;
    }
    const exists = coll.find(it => it.id === itemId);
    if (!exists) {
      setStatus('Referenced item not found');
      return;
    }
    setCollectionAndItem(collectionName, itemId);
  }

  function renderPreviewValue(container, value, type, refCollection) {
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
        const row = document.createElement('div');
        row.className = 'chip-row';
        arr.forEach(v => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = v;
          row.appendChild(chip);
        });
        container.appendChild(row);
        return;
      }
      case 'id': {
        if (!value) return placeholder();
        const chip = document.createElement('span');
        chip.className = 'chip clickable';
        chip.textContent = mapIdToLabel(refCollection, value);
        chip.title = 'Open ' + value;
        if (refCollection) {
          chip.addEventListener('click', () =>
            jumpToReferencedItem(refCollection, value)
          );
        }
        container.appendChild(chip);
        return;
      }
      case 'idList': {
        const ids = Array.isArray(value) ? value.filter(Boolean) : [];
        if (!ids.length) return placeholder();
        const row = document.createElement('div');
        row.className = 'chip-row';
        ids.forEach(id => {
          const chip = document.createElement('span');
          chip.className = 'chip clickable';
          chip.textContent = mapIdToLabel(refCollection, id);
          chip.title = 'Open ' + id;
          if (refCollection) {
            chip.addEventListener('click', () =>
              jumpToReferencedItem(refCollection, id)
            );
          }
          row.appendChild(chip);
        });
        container.appendChild(row);
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
        if (value === undefined || value === null || value === '')
          return placeholder();
        const span = document.createElement('span');
        span.textContent = value;
        container.appendChild(span);
      }
    }
  }

  function renderPreviewRow(container, label, value, type, refCollection) {
    const row = document.createElement('div');
    row.className = 'preview-row';
    const lbl = document.createElement('div');
    lbl.className = 'preview-label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = 'preview-value';
    renderPreviewValue(val, value, type, refCollection);
    row.appendChild(lbl);
    row.appendChild(val);
    container.appendChild(row);
  }

  const PREVIEW_FIELDS = {
    entities: [
      { label: 'Kind', key: 'kind' },
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Summary', key: 'summary', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    practices: [
      { label: 'Kind', key: 'kind' },
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Frequency', key: 'frequency' },
      { label: 'Public', key: 'isPublic', type: 'boolean' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Involved entities', key: 'involvedEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Instructions texts', key: 'instructionsTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    events: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Recurrence', key: 'recurrence' },
      { label: 'Timing rule', key: 'timingRule' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Main practices', key: 'mainPracticeIds', type: 'idList', ref: 'practices' },
      { label: 'Main entities', key: 'mainEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Readings', key: 'readingTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' }
    ],
    rules: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Kind', key: 'kind' },
      { label: 'Details', key: 'details', type: 'paragraph' },
      { label: 'Applies to', key: 'appliesTo', type: 'chips' },
      { label: 'Domain', key: 'domain', type: 'chips' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Supporting texts', key: 'supportingTextIds', type: 'idList', ref: 'texts' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Related practices', key: 'relatedPracticeIds', type: 'idList', ref: 'practices' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' }
    ],
    claims: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Category', key: 'category' },
      { label: 'Text', key: 'text', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'About entities', key: 'aboutEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Source texts', key: 'sourceTextIds', type: 'idList', ref: 'texts' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ],
    textCollections: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Root texts', key: 'rootTextIds', type: 'idList', ref: 'texts' }
    ],
    texts: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Level', key: 'level' },
      { label: 'Label', key: 'label' },
      { label: 'Parent text', key: 'parentId', type: 'id', ref: 'texts' },
      { label: 'Content', key: 'content', type: 'paragraph' },
      { label: 'Main function', key: 'mainFunction' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Mentions entities', key: 'mentionsEntityIds', type: 'idList', ref: 'entities' }
    ],
    media: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'Kind', key: 'kind' },
      { label: 'URI', key: 'uri', type: 'link' },
      { label: 'Title', key: 'title' },
      { label: 'Description', key: 'description', type: 'paragraph' },
      { label: 'Tags', key: 'tags', type: 'chips' },
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
      { label: 'Tags', key: 'tags', type: 'chips' }
    ],
    relations: [
      { label: 'Movement', key: 'movementId', type: 'id', ref: 'movements' },
      { label: 'From', key: 'fromEntityId', type: 'id', ref: 'entities' },
      { label: 'To', key: 'toEntityId', type: 'id', ref: 'entities' },
      { label: 'Type', key: 'relationType' },
      { label: 'Tags', key: 'tags', type: 'chips' },
      { label: 'Supporting claims', key: 'supportingClaimIds', type: 'idList', ref: 'claims' },
      { label: 'Sources of truth', key: 'sourcesOfTruth', type: 'chips' },
      { label: 'Source entities', key: 'sourceEntityIds', type: 'idList', ref: 'entities' },
      { label: 'Notes', key: 'notes', type: 'paragraph' }
    ]
  };

  function renderItemPreview() {
    const titleEl = document.getElementById('item-preview-title');
    const subtitleEl = document.getElementById('item-preview-subtitle');
    const body = document.getElementById('item-preview-body');
    const badge = document.getElementById('item-preview-collection');
    if (!titleEl || !subtitleEl || !body || !badge) return;

    clearElement(body);
    badge.textContent = currentCollectionName;

    if (!currentItemId) {
      titleEl.textContent = 'Select an item';
      subtitleEl.textContent = 'Preview will appear here';
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'Pick an item on the left to see a human-friendly summary.';
      body.appendChild(p);
      return;
    }

    const coll = snapshot[currentCollectionName] || [];
    const item = coll.find(it => it.id === currentItemId);
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
    subtitleEl.textContent = `${currentCollectionName.slice(0, -1)} · ${item.id}`;

    const fields = PREVIEW_FIELDS[currentCollectionName];
    if (!fields) {
      renderPreviewRow(body, 'Details', JSON.stringify(item, null, 2), 'code');
      return;
    }

    fields.forEach(field => {
      const value = item[field.key];
      renderPreviewRow(body, field.label, value, field.type, field.ref);
    });
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
      renderItemPreview();
      return;
    }

    const item = coll.find(it => it.id === currentItemId);
    if (!item) {
      editor.value = '';
      editor.disabled = true;
      deleteBtn.disabled = true;
      renderItemPreview();
      return;
    }

    editor.disabled = false;
    deleteBtn.disabled = false;
    editor.value = JSON.stringify(item, null, 2);
    renderItemPreview();
  }

  function renderItemDetail() {
    renderItemPreview();
    renderItemEditor();
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

    const saved = DomainService.upsertItem(collName, obj);
    if (!saved) {
      alert('Failed to save item.');
      return;
    }

    snapshot = DomainService.getSnapshot();
    currentItemId = obj.id;
    persistSnapshot();
    pushNavigationState(collName, currentItemId);
  }

  function addNewItem() {
    const collName = currentCollectionName;
    const coll = snapshot[collName];
    if (!Array.isArray(coll)) {
      alert('Unknown collection: ' + collName);
      return;
    }

    const skeleton = DomainService.createItem(collName, currentMovementId);
    if (!skeleton) {
      alert('Could not create item.');
      return;
    }

    snapshot = DomainService.getSnapshot();
    currentItemId = skeleton.id;
    persistSnapshot({ showStatus: false }); // we'll call setStatus manually
    setStatus('New item created');
    setCollectionAndItem(collName, skeleton.id);
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

    DomainService.deleteItem(collName, currentItemId);
    snapshot = DomainService.getSnapshot();
    pruneNavigationState(collName, currentItemId);
    currentItemId = null;
    persistSnapshot();
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

    const selectedIds = Array.from(
      document.querySelectorAll('.cmp-rel:checked')
    ).map(cb => cb.value);
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
          alert(
            'Invalid snapshot file: missing top-level "movements" array.'
          );
          return;
        }
        snapshot = DomainService.importSnapshot(data);
        currentMovementId = snapshot.movements[0]
          ? snapshot.movements[0].id
          : null;
        currentItemId = null;
        resetNavigationHistory();
        persistSnapshot();
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
      (typeof window !== 'undefined' && window.sampleData) || {
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
    snapshot = DomainService.loadSample(JSON.parse(JSON.stringify(sample)));
    currentMovementId = snapshot.movements[0]
      ? snapshot.movements[0].id
      : null;
    currentItemId = null;
    resetNavigationHistory();
    persistSnapshot();
    setStatus('Loaded sample');
  }

  function newSnapshot() {
    const ok = window.confirm(
      'Start a new, empty snapshot?\n\nThis will clear all current data in the browser.'
    );
    if (!ok) return;
    snapshot = DomainService.resetSnapshot();
    currentMovementId = null;
    currentItemId = null;
    resetNavigationHistory();
    persistSnapshot();
    setStatus('New snapshot created');
  }

  // ---- Init ----

  function init() {
    DomainService.setSnapshot(StorageService.loadSnapshot());
    snapshot = DomainService.getSnapshot();
    currentMovementId = snapshot.movements[0]
      ? snapshot.movements[0].id
      : null;
    resetNavigationHistory();

    // Sidebar
    document
      .getElementById('btn-add-movement')
      .addEventListener('click', () => addMovement());

    // Top bar actions
    document
      .getElementById('btn-export-snapshot')
      .addEventListener('click', exportSnapshot);

    document
      .getElementById('btn-import-snapshot')
      .addEventListener('click', () => {
        const input = document.getElementById('file-input');
        input.value = '';
        input.click();
      });

    document
      .getElementById('file-input')
      .addEventListener('change', e => {
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
      .addEventListener('click', () =>
        deleteMovement(currentMovementId)
      );

    // Tabs
    document.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document
          .querySelectorAll('.tab')
          .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabName = btn.dataset.tab;
        document
          .querySelectorAll('.tab-panel')
          .forEach(panel => {
            panel.classList.toggle(
              'active',
              panel.id === 'tab-' + tabName
            );
          });
        renderActiveTab();
      });
    });

    // Movement subtabs
    document
      .querySelectorAll('#movement-subtabs .subtab')
      .forEach(btn => {
        btn.addEventListener('click', () => {
          setActiveMovementSubtab(btn.dataset.subtab);
        });
      });

    // Entity graph refresh button
    const refreshGraphBtn = document.getElementById(
      'btn-refresh-entity-graph'
    );
    if (refreshGraphBtn) {
      refreshGraphBtn.addEventListener('click', () => {
        renderEntitiesView();
      });
    }

    // Calendar / claims / rules / media / relations / notes filters react on change
    const calendarFilter = document.getElementById(
      'calendar-recurrence-filter'
    );
    if (calendarFilter) {
      calendarFilter.addEventListener('change', renderCalendarView);
    }
    const claimsCatFilter = document.getElementById(
      'claims-category-filter'
    );
    const claimsEntFilter = document.getElementById(
      'claims-entity-filter'
    );
    if (claimsCatFilter) {
      claimsCatFilter.addEventListener('change', renderClaimsView);
    }
    if (claimsEntFilter) {
      claimsEntFilter.addEventListener('change', renderClaimsView);
    }
    const rulesKindFilter = document.getElementById(
      'rules-kind-filter'
    );
    const rulesDomainFilter = document.getElementById(
      'rules-domain-filter'
    );
    if (rulesKindFilter) {
      rulesKindFilter.addEventListener('change', renderRulesView);
    }
    if (rulesDomainFilter) {
      rulesDomainFilter.addEventListener('input', renderRulesView);
    }

    const mediaFilters = [
      'media-entity-filter',
      'media-practice-filter',
      'media-event-filter',
      'media-text-filter'
    ];
    mediaFilters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', renderMediaView);
      }
    });

    const relTypeFilter = document.getElementById(
      'relations-type-filter'
    );
    const relEntFilter = document.getElementById(
      'relations-entity-filter'
    );
    if (relTypeFilter) {
      relTypeFilter.addEventListener('change', renderRelationsView);
    }
    if (relEntFilter) {
      relEntFilter.addEventListener('change', renderRelationsView);
    }

    const notesTypeFilter = document.getElementById(
      'notes-target-type-filter'
    );
    const notesIdFilter = document.getElementById(
      'notes-target-id-filter'
    );
    if (notesTypeFilter) {
      notesTypeFilter.addEventListener('change', renderNotesView);
    }
    if (notesIdFilter) {
      notesIdFilter.addEventListener('change', renderNotesView);
    }

    const entitySelect = document.getElementById('entity-select');
    if (entitySelect) {
      entitySelect.addEventListener('change', renderEntitiesView);
    }
    const practiceSelect = document.getElementById('practice-select');
    if (practiceSelect) {
      practiceSelect.addEventListener('change', renderPracticesView);
    }
    const scriptureCollectionSelect = document.getElementById(
      'scripture-collection-select'
    );
    if (scriptureCollectionSelect) {
      scriptureCollectionSelect.addEventListener(
        'change',
        renderScriptureView
      );
    }

    // Collections tab
    document
      .getElementById('collection-select')
      .addEventListener('change', e => {
        setCollectionAndItem(e.target.value, null, { addToHistory: false });
      });

    document
      .getElementById('collection-filter-by-movement')
      .addEventListener('change', () => {
        renderCollectionList();
        renderItemDetail();
      });

    document
      .getElementById('btn-add-item')
      .addEventListener('click', addNewItem);
    document
      .getElementById('btn-delete-item')
      .addEventListener('click', deleteCurrentItem);
    document
      .getElementById('btn-save-item')
      .addEventListener('click', saveItemFromEditor);

    const navBack = document.getElementById('btn-preview-back');
    const navForward = document.getElementById('btn-preview-forward');
    if (navBack) navBack.addEventListener('click', () => navigateHistory(-1));
    if (navForward) navForward.addEventListener('click', () => navigateHistory(1));

    // Initial render
    renderMovementList();
    renderActiveTab();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
