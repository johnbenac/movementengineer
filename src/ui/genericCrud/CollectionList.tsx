export function createCollectionList(container) {
  const wrapper = document.createElement('div');
  const list = document.createElement('ul');
  list.className = 'item-list';
  wrapper.appendChild(list);
  container.appendChild(wrapper);

  function render({ collections, selectedKey, onSelect }) {
    list.innerHTML = '';
    (collections || []).forEach(collection => {
      const li = document.createElement('li');
      li.textContent = collection.label || collection.key;
      if (collection.key === selectedKey) {
        li.classList.add('selected');
      }
      li.addEventListener('click', () => {
        onSelect?.(collection.key);
      });
      list.appendChild(li);
    });
  }

  return { render };
}
