(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function cleanId(raw) {
    if (raw === undefined || raw === null) return null;
    const str = String(raw).trim();
    if (!str) return null;
    const match = str.match(/^\[\[([^\]]+)\]\]$/);
    const unwrapped = match ? match[1] : str;
    const trimmed = unwrapped.trim();
    return trimmed || null;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = cleanId;
  }
  if (globalScope) {
    const root = globalScope.MovementEngineer || (globalScope.MovementEngineer = {});
    root.cleanId = cleanId;
  }
})();
