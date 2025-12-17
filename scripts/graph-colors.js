(function () {
  'use strict';

  const GRAPH_COLOR_PALETTE = [
    '#2563eb',
    '#ea580c',
    '#16a34a',
    '#7c3aed',
    '#0891b2',
    '#b91c1c',
    '#c026d3',
    '#0d9488',
    '#f59e0b',
    '#10b981',
    '#6366f1',
    '#e11d48'
  ];

  function hashToColor(text) {
    if (!text) return '#1f2937';
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // convert to 32bit
    }
    const idx = Math.abs(hash) % GRAPH_COLOR_PALETTE.length;
    return GRAPH_COLOR_PALETTE[idx];
  }

  if (typeof window !== 'undefined') {
    window.EntityGraphColors = {
      palette: GRAPH_COLOR_PALETTE.slice(),
      hashToColor
    };
  }
})();
