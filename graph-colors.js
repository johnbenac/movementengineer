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
    '#4338ca',
    '#0ea5e9',
    '#84cc16'
  ];

  const DEFAULT_NODE_TYPES = [
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

  const colorAssignments = new Map();

  function seedAssignments(types) {
    types.forEach((type, idx) => {
      if (!colorAssignments.has(type)) {
        colorAssignments.set(type, GRAPH_COLOR_PALETTE[idx % GRAPH_COLOR_PALETTE.length]);
      }
    });
  }

  function colorForNodeType(type) {
    if (!type) return '#1f2937';
    if (!colorAssignments.has(type)) {
      const nextIndex = colorAssignments.size % GRAPH_COLOR_PALETTE.length;
      colorAssignments.set(type, GRAPH_COLOR_PALETTE[nextIndex]);
    }
    return colorAssignments.get(type);
  }

  seedAssignments(DEFAULT_NODE_TYPES);

  const api = {
    palette: GRAPH_COLOR_PALETTE.slice(),
    colorForNodeType
  };

  if (typeof window !== 'undefined') {
    window.EntityGraphColors = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
