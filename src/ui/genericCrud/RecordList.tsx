import { getRecordTitle } from './genericCrudHelpers.ts';

export function renderRecordList({
  container,
  collectionDef,
  records,
  selectedId,
  searchQuery,
  sortMode,
  onSearch,
  onToggleSort,
  onSelect,
  onCreate
}) {
  container.textContent = '';

  if (!collectionDef) {
    const placeholder = document.createElement('div');
    placeholder.className = 'muted';
    placeholder.textContent = 'Select a collection';
    container.appendChild(placeholder);
    return;
  }

  const header = document.createElement('div');
  header.className = 'pane-header';
  const heading = document.createElement('div');
  heading.className = 'section-heading small';
  heading.textContent = 'Records';
  header.appendChild(heading);

  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const newButton = document.createElement('button');
  newButton.type = 'button';
  newButton.textContent = 'New';
  newButton.addEventListener('click', () => onCreate?.());
  actions.appendChild(newButton);

  header.appendChild(actions);
  container.appendChild(header);

  const searchRow = document.createElement('div');
  searchRow.className = 'input-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search records';
  searchInput.value = searchQuery || '';
  searchInput.addEventListener('input', event => onSearch?.(event.target.value));
  searchRow.appendChild(searchInput);

  const sortButton = document.createElement('button');
  sortButton.type = 'button';
  sortButton.textContent = sortMode === 'id' ? 'Sort: Id asc' : 'Sort: Title asc';
  sortButton.addEventListener('click', () => onToggleSort?.());
  searchRow.appendChild(sortButton);

  container.appendChild(searchRow);

  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No records yet';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'item-list';
  records.forEach(record => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-button';
    button.textContent = getRecordTitle(record, collectionDef);
    if (record?.id === selectedId) button.classList.add('active');
    button.addEventListener('click', () => onSelect?.(record?.id || null));
    item.appendChild(button);
    list.appendChild(item);
  });

  container.appendChild(list);
}
