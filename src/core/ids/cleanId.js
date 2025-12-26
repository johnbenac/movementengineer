(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function cleanId(raw) {
    if (raw === null || raw === undefined) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const match = str.match(/^\[\[([^\]]+)\]\]$/);
    const unwrapped = match ? match[1] : str;
    const trimmed = String(unwrapped).trim();
    return trimmed ? trimmed : null;
  }

  const api = { cleanId };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.CleanId = api;
  }
})();
