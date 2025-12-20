const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});
movementEngineerGlobal.ui = movementEngineerGlobal.ui || {};

export function renderMarkdownPreview(targetEl, content, { enabled = true } = {}) {
  if (!targetEl) return;

  if (!enabled) {
    targetEl.classList.add('empty');
    targetEl.innerHTML = '<p class="muted">Select a text to see its content.</p>';
    return;
  }

  const trimmed = (content || '').trim();
  if (!trimmed) {
    targetEl.classList.add('empty');
    targetEl.innerHTML = '<p class="muted">Add markdown content to see a preview.</p>';
    return;
  }

  targetEl.classList.remove('empty');
  try {
    if (window.marked && typeof window.marked.parse === 'function') {
      const parsed = window.marked.parse(content);
      if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
        targetEl.innerHTML = window.DOMPurify.sanitize(parsed);
      } else {
        targetEl.textContent = parsed;
      }
    } else {
      targetEl.textContent = content;
    }
  } catch (err) {
    targetEl.textContent = content;
  }
}

export function openMarkdownModal({
  title = 'Edit Markdown',
  initial = '',
  onSave = null,
  onClose = null
} = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'markdown-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'markdown-modal';

  const header = document.createElement('div');
  header.className = 'markdown-modal-header';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  header.appendChild(h2);
  modal.appendChild(header);

  const body = document.createElement('div');
  body.className = 'markdown-modal-body';

  const editorWrapper = document.createElement('div');
  editorWrapper.className = 'markdown-editor-container';
  const textarea = document.createElement('textarea');
  textarea.className = 'markdown-editor';
  textarea.value = initial || '';
  editorWrapper.appendChild(textarea);

  const previewWrapper = document.createElement('div');
  previewWrapper.className = 'markdown-preview';
  renderMarkdownPreview(previewWrapper, textarea.value);

  body.appendChild(editorWrapper);
  body.appendChild(previewWrapper);
  modal.appendChild(body);

  const footer = document.createElement('div');
  footer.className = 'markdown-modal-footer';
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'btn btn-primary';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn';
  footer.appendChild(saveBtn);
  footer.appendChild(cancelBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const handleInput = () => {
    renderMarkdownPreview(previewWrapper, textarea.value);
  };
  textarea.addEventListener('input', handleInput);

  const closeModal = (triggerOnClose = true) => {
    textarea.removeEventListener('input', handleInput);
    document.removeEventListener('keydown', onKeyDown);
    if (overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
    if (triggerOnClose && typeof onClose === 'function') onClose();
  };

  const onKeyDown = evt => {
    if (evt.key === 'Escape') {
      closeModal();
    }
  };
  document.addEventListener('keydown', onKeyDown);

  saveBtn.addEventListener('click', () => {
    if (typeof onSave === 'function') onSave(textarea.value);
    closeModal(false);
  });
  cancelBtn.addEventListener('click', () => closeModal());
}

movementEngineerGlobal.ui.markdown = Object.assign(
  movementEngineerGlobal.ui.markdown || {},
  {
    renderMarkdownPreview,
    openMarkdownModal
  }
);
