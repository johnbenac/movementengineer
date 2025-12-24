export function renderCollectionList({ collections, selectedKey, onSelect }) {
  const wrapper = document.createElement('div');
  const heading = document.createElement('div');
  heading.className = 'generic-crud-pane-header';
  heading.textContent = 'Collections';
  wrapper.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'generic-crud-list';

  collections.forEach(collection => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'generic-crud-list-button';
    if (collection.collectionName === selectedKey) {
      button.classList.add('active');
    }
    button.textContent =
      collection?.ui?.label ||
      collection?.label ||
      collection?.typeName ||
      collection.collectionName;
    button.addEventListener('click', () => onSelect(collection.collectionName));
    item.appendChild(button);
    list.appendChild(item);
  });

  wrapper.appendChild(list);
  return wrapper;
}
