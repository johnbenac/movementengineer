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
    '#0ea5e9',
    '#10b981',
    '#9333ea'
  ];

  const NODE_TYPE_ORDER = [
    'Entity',
    'TextCollection',
    'TextNode',
    'Practice',
    'Event',
    'Rule',
    'Claim',
    'MediaAsset',
    'Note'
  ];

  const nodeTypeColors = new Map(
    NODE_TYPE_ORDER.map((type, idx) => [type, GRAPH_COLOR_PALETTE[idx % GRAPH_COLOR_PALETTE.length]])
  );

  function hashString(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // convert to 32bit
    }
    return hash;
  }

  function hashToColor(text) {
    if (!text) return '#1f2937';
    const idx = Math.abs(hashString(text)) % GRAPH_COLOR_PALETTE.length;
    return GRAPH_COLOR_PALETTE[idx];
  }

  function colorForNodeType(type) {
    if (!type) return '#1f2937';
    if (nodeTypeColors.has(type)) return nodeTypeColors.get(type);
    return hashToColor(type);
  }

  if (typeof window !== 'undefined') {
    window.EntityGraphColors = {
      palette: GRAPH_COLOR_PALETTE.slice(),
      hashToColor,
      colorForNodeType
    };
  }
})();
