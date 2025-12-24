import { getRecordTitle } from './genericCrudHelpers.ts';

function matchesSearch(record, title, query) {
  if (!query) return true;
  const needle = query.toLowerCase();
  return (
    String(record?.id || '').toLowerCase().includes(needle) ||
    String(title || '').toLowerCase().includes(needle)
  );
}

export function renderRecordList({
  collectionDef,
  records,
  selectedId,
  searchQuery,
  sortKey,
  onSearchChange,
  onSortToggle,
  onSelect,
  onCreate
}) {
  const wrapper = document.createElement('div');

  const header = document.createElement('div');
  header.className = 'generic-crud-pane-header';
  const title = document.createElement('span');
  title.textContent = collectionDef ? 'Records' : 'Records';
  const actions = document.createElement('div');
  actions.className = 'generic-crud-pane-actions';
  const newBtn = document.createElement('button');
  newBtn.type = 'button';
  newBtn.textContent = 'New';
  newBtn.disabled = !collectionDef;
  newBtn.addEventListener('click', () => onCreate());
  const sortBtn = document.createElement('button');
  sortBtn.type = 'button';
  sortBtn.textContent = sortKey === 'id' ? 'Sort: Id' : 'Sort: Title';
  sortBtn.addEventListener('click', () => onSortToggle());
  actions.append(sortBtn, newBtn);
  header.append(title, actions);
  wrapper.appendChild(header);

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search records';
  searchInput.value = searchQuery || '';
  searchInput.addEventListener('input', () => onSearchChange(searchInput.value));
  wrapper.appendChild(searchInput);

  if (!collectionDef) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'Select a collection';
    wrapper.appendChild(empty);
    return wrapper;
  }

  const list = document.createElement('ul');
  list.className = 'generic-crud-list';

  const decorated = records.map(record => ({
    record,
    title: getRecordTitle(record, collectionDef) || record?.id || ''
  }));
  const filtered = decorated.filter(entry => matchesSearch(entry.record, entry.title, searchQuery));
  const sorted = filtered.sort((a, b) => {
    if (sortKey === 'id') {
      return String(a.record?.id || '').localeCompare(String(b.record?.id || ''));
    }
    const titleCompare = String(a.title || '').localeCompare(String(b.title || ''));
    if (titleCompare !== 0) return titleCompare;
    return String(a.record?.id || '').localeCompare(String(b.record?.id || ''));
  });

  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'No records yet';
    wrapper.appendChild(empty);
    return wrapper;
  }

  sorted.forEach(({ record, title }) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'generic-crud-list-button';
    if (record?.id === selectedId) button.classList.add('active');
    button.textContent = `${title || 'Untitled'} (${record?.id || 'no-id'})`;
    button.addEventListener('click', () => onSelect(record?.id));
    item.appendChild(button);
    list.appendChild(item);
  });

  if (!sorted.length && records.length) {
    const empty = document.createElement('div');
    empty.className = 'generic-crud-empty';
    empty.textContent = 'No records match your search';
    wrapper.appendChild(empty);
    return wrapper;
  }

  wrapper.appendChild(list);
  return wrapper;
}
