import { getRecordTitle } from './genericCrudHelpers.ts';

export function createRecordList(container) {
  const header = document.createElement('div');
  header.className = 'pane-header';

  const title = document.createElement('div');
  title.textContent = 'Records';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New';
  actions.appendChild(newButton);
  header.appendChild(actions);

  const searchRow = document.createElement('div');
  searchRow.className = 'input-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search by id or title';
  searchRow.appendChild(searchInput);

  const sortRow = document.createElement('div');
  sortRow.className = 'input-row';
  const sortSelect = document.createElement('select');
  const optionTitle = document.createElement('option');
  optionTitle.value = 'title';
  optionTitle.textContent = 'Title asc';
  const optionId = document.createElement('option');
  optionId.value = 'id';
  optionId.textContent = 'Id asc';
  sortSelect.appendChild(optionTitle);
  sortSelect.appendChild(optionId);
  sortRow.appendChild(sortSelect);

  const list = document.createElement('ul');
  list.className = 'item-list';

  const empty = document.createElement('div');
  empty.className = 'muted';

  container.appendChild(header);
  container.appendChild(searchRow);
  container.appendChild(sortRow);
  container.appendChild(list);
  container.appendChild(empty);

  let currentCollectionKey = null;
  let currentRecords = [];
  let currentCollectionDef = null;
  let currentSelected = null;
  let searchQuery = '';
  let sortMode = 'title';
  let callbacks = {};

  function computeFilteredRecords() {
    const query = searchQuery.trim().toLowerCase();
    let records = Array.isArray(currentRecords) ? currentRecords.slice() : [];
    if (query) {
      records = records.filter(record => {
        const id = record?.id ? String(record.id).toLowerCase() : '';
        const title = getRecordTitle(record, currentCollectionDef).toLowerCase();
        return id.includes(query) || title.includes(query);
      });
    }

    records.sort((a, b) => {
      if (sortMode === 'id') {
        return String(a?.id || '').localeCompare(String(b?.id || ''));
      }
      const titleA = getRecordTitle(a, currentCollectionDef);
      const titleB = getRecordTitle(b, currentCollectionDef);
      return titleA.localeCompare(titleB);
    });

    return records;
  }

  function renderList() {
    list.innerHTML = '';
    const records = computeFilteredRecords();
    if (!currentCollectionKey) {
      empty.textContent = 'Select a collection.';
      list.innerHTML = '';
      return;
    }
    if (records.length === 0) {
      empty.textContent = 'No records yet.';
    } else {
      empty.textContent = '';
    }
    records.forEach(record => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = getRecordTitle(record, currentCollectionDef) || record?.id || 'Untitled';
      const meta = document.createElement('span');
      meta.className = 'secondary';
      meta.textContent = record?.id || '';
      li.appendChild(label);
      li.appendChild(meta);
      if (record?.id && record.id === currentSelected) {
        li.classList.add('selected');
      }
      li.addEventListener('click', () => {
        callbacks.onSelect?.(record?.id || null);
      });
      list.appendChild(li);
    });
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderList();
  });

  sortSelect.addEventListener('change', () => {
    sortMode = sortSelect.value;
    renderList();
  });

  newButton.addEventListener('click', () => {
    callbacks.onNew?.();
  });

  function render({
    collectionKey,
    collectionDef,
    records,
    selectedId,
    onSelect,
    onNew
  }) {
    if (collectionKey !== currentCollectionKey) {
      searchQuery = '';
      searchInput.value = '';
      sortMode = 'title';
      sortSelect.value = 'title';
    }
    currentCollectionKey = collectionKey;
    currentCollectionDef = collectionDef;
    currentRecords = records || [];
    currentSelected = selectedId;
    callbacks = { onSelect, onNew };
    newButton.disabled = !collectionKey;
    renderList();
  }

  return { render };
}
