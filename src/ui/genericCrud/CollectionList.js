import { getCollectionLabel, getCollectionSnapshotKey } from './genericCrudHelpers.js';

export function CollectionList({ model, selectedKey, onSelect }) {
  const wrapper = document.createElement('div');
  wrapper.dataset.testid = 'generic-crud-collection-select';
  const list = document.createElement('ul');
  list.className = 'item-list';

  const collections = model?.collectionOrder?.length
    ? model.collectionOrder
    : Object.keys(model?.collections || {}).sort();

  collections.forEach(key => {
    const def = model?.collections?.[key];
    const collectionKey = getCollectionSnapshotKey(def, model) || key;
    const label = getCollectionLabel(def, collectionKey);
    const li = document.createElement('li');
    li.textContent = label;
    if (collectionKey === selectedKey) li.classList.add('selected');
    li.addEventListener('click', () => onSelect(collectionKey));
    list.appendChild(li);
  });

  wrapper.appendChild(list);
  return wrapper;
}
