(function () {
  'use strict';

  function cleanId(raw) {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const match = str.match(/^\[\[([^\]]+)\]\]$/);
    const cleaned = match ? match[1] : str;
    const trimmed = cleaned.trim();
    return trimmed || null;
  }

  const api = { cleanId };

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.IdUtils = api;
  }
})();
