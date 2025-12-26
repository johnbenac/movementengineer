import { getCollectionLabel, getCollectionSnapshotKey } from './genericCrudHelpers.js';

export function CollectionList({ model, selectedKey, onSelect }) {
  const wrapper = document.createElement('div');
  const list = document.createElement('ul');
  list.className = 'item-list';
  list.setAttribute('data-testid', 'generic-crud-collection-select');

  const collections = model?.collectionOrder?.length
    ? model.collectionOrder
    : Object.keys(model?.collections || {}).sort();

  collections.forEach(key => {
    const def = model?.collections?.[key];
    const collectionKey = getCollectionSnapshotKey(def, model) || key;
    const label = getCollectionLabel(def, collectionKey);
    const li = document.createElement('li');
    li.textContent = label;
    li.dataset.collectionKey = collectionKey;
    if (collectionKey === selectedKey) li.classList.add('selected');
    li.addEventListener('click', () => onSelect(collectionKey));
    list.appendChild(li);
  });

  wrapper.appendChild(list);
  return wrapper;
}
