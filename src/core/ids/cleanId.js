(function () {
  'use strict';

  const globalScope =
    typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : undefined;

  function cleanId(raw) {
    if (raw === undefined || raw === null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    const m = s.match(/^\[\[([^\]]+)\]\]$/);
    const unwrapped = m ? m[1] : s;
    const trimmed = String(unwrapped).trim();
    return trimmed || null;
  }

  const api = { cleanId };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (globalScope) {
    globalScope.cleanId = cleanId;
    globalScope.MovementEngineerIds = {
      ...(globalScope.MovementEngineerIds || {}),
      cleanId
    };
  }
})();
