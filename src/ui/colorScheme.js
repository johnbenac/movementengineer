(function () {
  'use strict';

  const PALETTE = [
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
    NODE_TYPE_ORDER.map((type, idx) => [type, PALETTE[idx % PALETTE.length]])
  );

  const COLLECTION_TYPE_MAP = {
    movements: 'Movement',
    textcollections: 'TextCollection',
    texts: 'TextNode',
    entities: 'Entity',
    practices: 'Practice',
    events: 'Event',
    rules: 'Rule',
    claims: 'Claim',
    media: 'MediaAsset',
    notes: 'Note'
  };

  const TAB_TYPE_MAP = {
    dashboard: 'Movement',
    canon: 'TextCollection',
    entities: 'Entity',
    practices: 'Practice',
    calendar: 'Event',
    claims: 'Claim',
    rules: 'Rule',
    authority: 'Rule',
    media: 'MediaAsset',
    graph: 'Entity',
    notes: 'Note',
    collections: 'TextCollection',
    comparison: 'Claim'
  };

  function normaliseKey(value) {
    return String(value || '').trim().toLowerCase();
  }

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
    const idx = Math.abs(hashString(text)) % PALETTE.length;
    return PALETTE[idx];
  }

  function colorForNodeType(type) {
    if (!type) return '#1f2937';
    if (nodeTypeColors.has(type)) return nodeTypeColors.get(type);
    return hashToColor(type);
  }

  function colorForCollection(collection) {
    if (!collection) return '#1f2937';
    const mapped = COLLECTION_TYPE_MAP[normaliseKey(collection)];
    return mapped ? colorForNodeType(mapped) : hashToColor(collection);
  }

  function colorForTab(tabName) {
    if (!tabName) return '#1f2937';
    const mapped = TAB_TYPE_MAP[normaliseKey(tabName)];
    return mapped ? colorForNodeType(mapped) : hashToColor(tabName);
  }

  function colorForChipTarget(target) {
    if (!target || typeof target !== 'object') return null;
    const kind = target.kind || target.type || target.targetKind || null;
    if (kind === 'item' && target.collection) {
      return colorForCollection(target.collection);
    }
    if (kind === 'facet' && (target.facet || target.value)) {
      return hashToColor(`${target.facet || 'facet'}:${target.value || ''}`);
    }
    if (kind) return hashToColor(kind);
    return null;
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    const cleaned = hex.replace('#', '').trim();
    const normalized =
      cleaned.length === 3
        ? cleaned
            .split('')
            .map(ch => ch + ch)
            .join('')
        : cleaned;
    if (normalized.length !== 6) return null;
    const int = Number.parseInt(normalized, 16);
    if (Number.isNaN(int)) return null;
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function rgbToHex({ r, g, b }) {
    const toHex = val => Math.max(0, Math.min(255, Math.round(val))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function mixColors(colorA, colorB, weight = 0.5) {
    const rgbA = hexToRgb(colorA);
    const rgbB = hexToRgb(colorB);
    if (!rgbA || !rgbB) return colorA || colorB || '#1f2937';
    const clamped = Math.max(0, Math.min(1, weight));
    return rgbToHex({
      r: rgbA.r + (rgbB.r - rgbA.r) * clamped,
      g: rgbA.g + (rgbB.g - rgbA.g) * clamped,
      b: rgbA.b + (rgbB.b - rgbA.b) * clamped
    });
  }

  function deriveSurfaceColors(color) {
    if (!color) {
      return {
        base: '#1f2937',
        background: '#e5e7eb',
        border: '#d1d5db',
        text: '#111827',
        hover: '#d1d5db',
        borderHover: '#cbd5f1'
      };
    }
    return {
      base: color,
      background: mixColors(color, '#ffffff', 0.86),
      border: mixColors(color, '#ffffff', 0.72),
      text: mixColors(color, '#111827', 0.25),
      hover: mixColors(color, '#ffffff', 0.78),
      borderHover: mixColors(color, '#ffffff', 0.6)
    };
  }

  function applyPaletteCssVars(root) {
    if (!root || !root.style) return;
    PALETTE.forEach((color, idx) => {
      root.style.setProperty(`--me-color-${idx}`, color);
    });
    const typeVars = {
      movement: 'Movement',
      entity: 'Entity',
      textcollection: 'TextCollection',
      textnode: 'TextNode',
      practice: 'Practice',
      event: 'Event',
      rule: 'Rule',
      claim: 'Claim',
      mediaasset: 'MediaAsset',
      note: 'Note'
    };
    Object.entries(typeVars).forEach(([key, type]) => {
      root.style.setProperty(`--me-color-${key}`, colorForNodeType(type));
    });
  }

  function applyTabColors(root) {
    if (!root || !root.querySelectorAll) return;
    const tabs = root.querySelectorAll('.tab');
    tabs.forEach(tab => {
      const name = tab.dataset?.tab || tab.getAttribute('data-tab');
      const base = colorForTab(name);
      const surface = deriveSurfaceColors(base);
      tab.style.setProperty('--tab-accent', surface.base);
      tab.style.setProperty('--tab-accent-soft', surface.background);
      tab.style.setProperty('--tab-accent-text', surface.text);
    });
  }

  const globalScope = typeof globalThis !== 'undefined' ? globalThis : window;
  const colors = {
    palette: PALETTE.slice(),
    hashToColor,
    colorForNodeType,
    colorForCollection,
    colorForTab,
    colorForChipTarget,
    deriveSurfaceColors,
    applyPaletteCssVars,
    applyTabColors
  };

  globalScope.MovementEngineerColors = colors;
  globalScope.EntityGraphColors = colors;

  if (typeof document !== 'undefined') {
    const applyAll = () => {
      applyPaletteCssVars(document.documentElement);
      applyTabColors(document);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyAll, { once: true });
    } else {
      applyAll();
    }
  }
})();
