export function renderCollectionList({
  container,
  collections,
  selectedKey,
  onSelect
}) {
  container.textContent = '';

  const header = document.createElement('div');
  header.className = 'pane-header';
  const title = document.createElement('div');
  title.className = 'section-heading small';
  title.textContent = 'Collections';
  header.appendChild(title);
  container.appendChild(header);

  const list = document.createElement('ul');
  list.className = 'item-list';

  collections.forEach(collection => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'list-button';
    const label =
      collection?.ui?.label ||
      collection?.label ||
      collection?.typeName ||
      collection?.collectionName ||
      'Collection';
    button.textContent = label;
    if (collection?.collectionName === selectedKey) {
      button.classList.add('active');
    }
    button.addEventListener('click', () => onSelect?.(collection?.collectionName || null));
    item.appendChild(button);
    list.appendChild(item);
  });

  if (!collections.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No collections found.';
    container.appendChild(empty);
  } else {
    container.appendChild(list);
  }
}
