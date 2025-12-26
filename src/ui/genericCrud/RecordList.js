import { getRecordTitle } from './genericCrudHelpers.js';

function normalizeRecords(records) {
  return Array.isArray(records) ? records : [];
}

function filterRecords(records, query, collectionDef) {
  if (!query) return records;
  const needle = query.toLowerCase();
  return records.filter(record => {
    const title = getRecordTitle(record, collectionDef);
    const haystack = `${record?.id || ''} ${title || ''}`.toLowerCase();
    return haystack.includes(needle);
  });
}

function sortRecords(records, collectionDef, sortMode) {
  const sorted = records.slice();
  if (sortMode === 'id') {
    sorted.sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
  } else {
    sorted.sort((a, b) =>
      String(getRecordTitle(a, collectionDef)).localeCompare(String(getRecordTitle(b, collectionDef)))
    );
  }
  return sorted;
}

export function RecordList({
  collectionDef,
  records,
  selectedId,
  search,
  sortMode,
  onSearchChange,
  onSortChange,
  onSelect,
  onCreate,
  emptyMessage
}) {
  const wrapper = document.createElement('div');

  const actions = document.createElement('div');
  actions.className = 'generic-crud-actions';

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search';
  searchInput.value = search || '';
  searchInput.addEventListener('input', event => onSearchChange(event.target.value));

  const sortSelect = document.createElement('select');
  const titleOpt = document.createElement('option');
  titleOpt.value = 'title';
  titleOpt.textContent = 'Title asc';
  const idOpt = document.createElement('option');
  idOpt.value = 'id';
  idOpt.textContent = 'Id asc';
  sortSelect.appendChild(titleOpt);
  sortSelect.appendChild(idOpt);
  sortSelect.value = sortMode || 'title';
  sortSelect.addEventListener('change', event => onSortChange(event.target.value));

  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New';
  newButton.setAttribute('data-testid', 'generic-crud-new');
  newButton.addEventListener('click', () => onCreate());

  actions.appendChild(searchInput);
  actions.appendChild(sortSelect);
  actions.appendChild(newButton);

  wrapper.appendChild(actions);

  const list = document.createElement('ul');
  list.className = 'item-list';

  const normalized = normalizeRecords(records);
  const filtered = filterRecords(normalized, search, collectionDef);
  const sorted = sortRecords(filtered, collectionDef, sortMode);

  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = emptyMessage || 'No records yet';
    wrapper.appendChild(empty);
  } else {
    sorted.forEach(record => {
      const li = document.createElement('li');
      li.setAttribute('data-testid', 'generic-crud-record');
      if (record?.id) li.dataset.recordId = record.id;
      const label = document.createElement('span');
      label.textContent = getRecordTitle(record, collectionDef);
      const secondary = document.createElement('span');
      secondary.className = 'secondary';
      secondary.textContent = record?.id || '';
      li.appendChild(label);
      li.appendChild(secondary);
      if (record?.id === selectedId) li.classList.add('selected');
      li.addEventListener('click', () => onSelect(record?.id));
      list.appendChild(li);
    });
    wrapper.appendChild(list);
  }

  return wrapper;
}
