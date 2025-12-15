(function () {
  'use strict';

  const DEFAULT_WIDTH = 920;
  const DEFAULT_HEIGHT = 460;
  const NODE_RADIUS = 18;
  const EDGE_LENGTH = 150;
  const REPULSION = 1800;
  const SPRING_STRENGTH = 0.06;
  const DAMPING = 0.85;
  const CENTER_PULL = 0.08;

  const PALETTE = [
    '#2563eb',
    '#ea580c',
    '#16a34a',
    '#7c3aed',
    '#0891b2',
    '#b91c1c',
    '#c026d3',
    '#0d9488'
  ];

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function hashToColor(text) {
    if (!text) return '#1f2937';
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0; // convert to 32bit
    }
    const idx = Math.abs(hash) % PALETTE.length;
    return PALETTE[idx];
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function initialisePositions(nodes, width, height, nodeState = new Map()) {
    const positions = new Map();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, idx) => {
      const existing = nodeState.get(node.id);
      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      positions.set(node.id, {
        x: existing && Number.isFinite(existing.x)
          ? existing.x
          : centerX + Math.cos(angle) * radius,
        y: existing && Number.isFinite(existing.y)
          ? existing.y
          : centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0
      });
    });

    return positions;
  }

  function runForceLayout(nodes, edges, options) {
    const width = options.width || DEFAULT_WIDTH;
    const height = options.height || DEFAULT_HEIGHT;
    const iterations = options.iterations || 220;
    const centerId = options.centerEntityId;
    const nodeState = options.nodeState || new Map();

    const positions = initialisePositions(nodes, width, height, nodeState);

    for (let step = 0; step < iterations; step += 1) {
      // Repulsion
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const posA = positions.get(a.id);
        const frozenA = nodeState.get(a.id)?.frozen;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const posB = positions.get(b.id);
          const frozenB = nodeState.get(b.id)?.frozen;
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const distSq = Math.max(dx * dx + dy * dy, 16);
          const force = REPULSION / distSq;
          const fx = (force * dx) / Math.sqrt(distSq);
          const fy = (force * dy) / Math.sqrt(distSq);
          if (!frozenA) {
            posA.vx += fx;
            posA.vy += fy;
          }
          if (!frozenB) {
            posB.vx -= fx;
            posB.vy -= fy;
          }
        }
      }

      // Springs
      edges.forEach(edge => {
        const source = positions.get(edge.fromId);
        const target = positions.get(edge.toId);
        if (!source || !target) return;
        const frozenSource = nodeState.get(edge.fromId)?.frozen;
        const frozenTarget = nodeState.get(edge.toId)?.frozen;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const delta = dist - EDGE_LENGTH;
        const force = SPRING_STRENGTH * delta;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        if (!frozenSource) {
          source.vx += fx;
          source.vy += fy;
        }
        if (!frozenTarget) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Centering force on the highlighted node
      if (centerId && positions.has(centerId)) {
        const pos = positions.get(centerId);
        pos.vx += (width / 2 - pos.x) * CENTER_PULL;
        pos.vy += (height / 2 - pos.y) * CENTER_PULL;
      }

      // Integrate
      positions.forEach((pos, nodeId) => {
        const frozen = nodeState.get(nodeId)?.frozen;
        pos.vx *= DAMPING;
        pos.vy *= DAMPING;
        if (!frozen) {
          pos.x = clamp(pos.x + pos.vx, NODE_RADIUS * 2, width - NODE_RADIUS * 2);
          pos.y = clamp(pos.y + pos.vy, NODE_RADIUS * 2, height - NODE_RADIUS * 2);
        }
      });
    }

    return positions;
  }

  function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value != null) el.setAttribute(key, value);
    });
    return el;
  }

  function buildSummarySection(vm, onNodeClick) {
    const aside = document.createElement('div');
    aside.className = 'entity-graph-summary';

    const title = document.createElement('div');
    title.className = 'section-heading small';
    title.textContent = `Nodes (${vm.nodes.length})`;
    aside.appendChild(title);

    const chipRow = document.createElement('div');
    chipRow.className = 'chip-row wrap';
    vm.nodes.forEach(node => {
      const chip = document.createElement('span');
      chip.className =
        'chip' + (node.id === vm.centerEntityId ? ' chip-strong' : ' clickable');
      chip.textContent =
        (node.id === vm.centerEntityId ? '★ ' : '') + (node.name || node.id);
      chip.title = node.kind || '';
      if (node.id !== vm.centerEntityId && onNodeClick) {
        chip.addEventListener('click', () => onNodeClick(node.id));
      }
      chipRow.appendChild(chip);
    });
    aside.appendChild(chipRow);

    const edgesTitle = document.createElement('div');
    edgesTitle.className = 'section-heading small';
    edgesTitle.textContent = `Edges (${vm.edges.length})`;
    aside.appendChild(edgesTitle);

    const list = document.createElement('ul');
    list.className = 'edge-list';
    vm.edges.forEach(edge => {
      const li = document.createElement('li');
      const from = vm.nodes.find(n => n.id === edge.fromId);
      const to = vm.nodes.find(n => n.id === edge.toId);
      li.textContent = `${from ? from.name : edge.fromId} — ${edge.relationType} → ${
        to ? to.name : edge.toId
      }`;
      list.appendChild(li);
    });
    aside.appendChild(list);

    return aside;
  }

  function renderEdges(svg, edges, positions) {
    const g = createSvgElement('g', { class: 'graph-edges' });
    const rendered = [];
    edges.forEach(edge => {
      const from = positions.get(edge.fromId);
      const to = positions.get(edge.toId);
      if (!from || !to) return;
      const line = createSvgElement('line', {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        'marker-end': 'url(#arrowhead)'
      });
      g.appendChild(line);

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const label = createSvgElement('text', {
        x: midX,
        y: midY - 6,
        class: 'graph-edge-label',
        'text-anchor': 'middle'
      });
      label.textContent = edge.relationType;
      g.appendChild(label);

      rendered.push({ edge, line, label });
    });
    svg.appendChild(g);
    return rendered;
  }

  function renderNodes(svg, nodes, positions, centerEntityId, options) {
    const { onNodeClick, onContextMenu, onDragStart, nodeState } = options;
    const g = createSvgElement('g', { class: 'graph-nodes' });
    const rendered = new Map();
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;
      const nodeGroup = createSvgElement('g', {
        class: 'graph-node' + (nodeState.get(node.id)?.frozen ? ' frozen' : ''),
        transform: `translate(${pos.x}, ${pos.y})`
      });

      if (onNodeClick) {
        nodeGroup.style.cursor = 'pointer';
        nodeGroup.addEventListener('click', () => onNodeClick(node.id));
      }

      if (onContextMenu) {
        nodeGroup.addEventListener('contextmenu', event =>
          onContextMenu(event, node)
        );
      }

      if (onDragStart) {
        nodeGroup.addEventListener('mousedown', event =>
          onDragStart(event, node)
        );
      }

      const hit = createSvgElement('circle', {
        r: NODE_RADIUS + 10,
        class: 'graph-node-hit',
        fill: 'transparent',
        stroke: 'transparent'
      });
      hit.setAttribute('pointer-events', onNodeClick ? 'all' : 'none');

      const circle = createSvgElement('circle', {
        r: NODE_RADIUS,
        class: 'graph-node-circle',
        fill: hashToColor(node.kind),
        stroke: node.id === centerEntityId ? '#111827' : '#f3f4f6',
        'stroke-width': node.id === centerEntityId ? 3 : 2
      });

      const initials = (node.name || node.id)
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase();

      const text = createSvgElement('text', {
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: '#fff',
        'font-size': '0.85rem'
      });
      text.textContent = initials;

      nodeGroup.appendChild(hit);
      nodeGroup.appendChild(circle);
      nodeGroup.appendChild(text);
      g.appendChild(nodeGroup);
      rendered.set(node.id, nodeGroup);
    });
    svg.appendChild(g);
    return rendered;
  }

  class EntityGraphView {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.nodeState = new Map();
      this.positions = new Map();
      this.edgeElements = [];
      this.nodeElements = new Map();
      this.nodeLabels = new Map();
      this.svgEl = null;
      this.contextMenu = null;
      this.currentContextNodeId = null;
      this.currentGraph = null;
    }

    render(container, vm, options = {}) {
      if (!container) return;
      clearElement(container);

      if (!vm || !vm.nodes || !vm.nodes.length) {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'No relations to graph yet.';
        container.appendChild(p);
        return;
      }

      const width = options.width || container.clientWidth || DEFAULT_WIDTH;
      const height = options.height || DEFAULT_HEIGHT;

      const positions = runForceLayout(vm.nodes, vm.edges, {
        width,
        height,
        centerEntityId: options.centerEntityId,
        nodeState: this.nodeState
      });
      this.positions = positions;
      this.currentGraph = {
        nodes: vm.nodes,
        edges: vm.edges,
        width,
        height,
        centerEntityId: options.centerEntityId
      };
      this._syncNodeState(vm.nodes, positions);

      const wrapper = document.createElement('div');
      wrapper.className = 'entity-graph-wrapper';

      const canvas = document.createElement('div');
      canvas.className = 'entity-graph-canvas';
      canvas.style.minHeight = `${height}px`;

      const svg = createSvgElement('svg', {
        viewBox: `0 0 ${width} ${height}`,
        role: 'img',
        'aria-label': 'Entity relation graph'
      });
      this.svgEl = svg;

      const defs = createSvgElement('defs');
      const marker = createSvgElement('marker', {
        id: 'arrowhead',
        viewBox: '0 0 10 10',
        refX: '10',
        refY: '5',
        markerWidth: '8',
        markerHeight: '6',
        orient: 'auto-start-reverse'
      });
      marker.appendChild(createSvgElement('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#9ca3af' }));
      defs.appendChild(marker);
      svg.appendChild(defs);

      this.edgeElements = renderEdges(svg, vm.edges, positions);
      this.nodeElements = renderNodes(svg, vm.nodes, positions, options.centerEntityId, {
        onNodeClick: this.onNodeClick,
        onContextMenu: (event, node) => this._showContextMenu(event, node),
        onDragStart: (event, node) => this._startDrag(event, node),
        nodeState: this.nodeState
      });
      this.nodeLabels = this._renderNodeLabels(svg, vm.nodes, positions);

      canvas.appendChild(svg);
      wrapper.appendChild(canvas);

      const summary = buildSummarySection(vm, this.onNodeClick);
      wrapper.appendChild(summary);

      container.appendChild(wrapper);
      this._bindGlobalContextClose();
    }

    _renderNodeLabels(svg, nodes, positions) {
      const labels = new Map();
      nodes.forEach(node => {
        const pos = positions.get(node.id);
        if (!pos) return;
        const label = createSvgElement('text', {
          x: pos.x,
          y: pos.y + NODE_RADIUS + 12,
          class: 'graph-node-label',
          'text-anchor': 'middle'
        });
        label.textContent = node.name || node.id;
        labels.set(node.id, label);
        svg.appendChild(label);
      });
      return labels;
    }

    _bindGlobalContextClose() {
      if (this._boundContextClose) return;
      this._boundContextClose = evt => {
        // Ignore right-clicks used to open the menu
        if (evt && typeof evt.button === 'number' && evt.button === 2) return;

        // Don't close if clicking inside the menu itself; menu items handle their own clicks
        if (this.contextMenu && evt?.target && this.contextMenu.contains(evt.target)) {
          return;
        }

        this._hideContextMenu();
      };

      // Use mousedown so the close doesn't immediately follow the contextmenu event
      document.addEventListener('mousedown', this._boundContextClose, true);
    }

    _syncNodeState(nodes, positions) {
      nodes.forEach(node => {
        const pos = positions.get(node.id);
        if (!pos) return;
        const existing = this.nodeState.get(node.id) || {};
        this.nodeState.set(node.id, {
          ...existing,
          x: pos.x,
          y: pos.y,
          frozen: existing.frozen || false
        });
      });
    }

    _updateGraphPositions() {
      if (!this.positions || !this.currentGraph) return;
      this.nodeElements.forEach((group, nodeId) => {
        const pos = this.positions.get(nodeId);
        if (!pos) return;
        group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        const frozen = this.nodeState.get(nodeId)?.frozen;
        group.classList.toggle('frozen', !!frozen);
      });

      this.nodeLabels.forEach((label, nodeId) => {
        const pos = this.positions.get(nodeId);
        if (!pos) return;
        label.setAttribute('x', pos.x);
        label.setAttribute('y', pos.y + NODE_RADIUS + 12);
      });

      this.edgeElements.forEach(({ edge, line, label }) => {
        const from = this.positions.get(edge.fromId);
        const to = this.positions.get(edge.toId);
        if (!from || !to) return;
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        label.setAttribute('x', midX);
        label.setAttribute('y', midY - 6);
      });
    }

    _relayout() {
      if (!this.currentGraph) return;
      const { nodes, edges, width, height, centerEntityId } = this.currentGraph;
      this.positions = runForceLayout(nodes, edges, {
        width,
        height,
        centerEntityId,
        nodeState: this.nodeState
      });
      this._syncNodeState(nodes, this.positions);
      this._updateGraphPositions();
    }

    _showContextMenu(event, node) {
      event.preventDefault();
      event.stopPropagation();
      this.currentContextNodeId = node.id;
      if (!this.contextMenu) {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'graph-context-menu';
        document.body.appendChild(this.contextMenu);

        // Prevent interactions inside the menu from bubbling and instantly closing it
        this.contextMenu.addEventListener('mousedown', e => e.stopPropagation());
        this.contextMenu.addEventListener('contextmenu', e => e.preventDefault());
      }

      this.contextMenu.innerHTML = '';
      const frozen = this.nodeState.get(node.id)?.frozen;

      const toggle = document.createElement('div');
      toggle.className = 'graph-context-item';
      toggle.textContent = frozen ? 'Unfreeze node' : 'Freeze node';
      toggle.addEventListener('click', () => {
        this._toggleFreeze(node.id);
        this._hideContextMenu();
      });
      this.contextMenu.appendChild(toggle);

      const unfreezeOthers = document.createElement('div');
      unfreezeOthers.className = 'graph-context-item';
      unfreezeOthers.textContent = 'Unfreeze all other nodes';
      unfreezeOthers.addEventListener('click', () => {
        this._unfreezeOthers(node.id);
        this._hideContextMenu();
      });
      this.contextMenu.appendChild(unfreezeOthers);

      this.contextMenu.style.display = 'block';
      this.contextMenu.style.left = `${event.clientX}px`;
      this.contextMenu.style.top = `${event.clientY}px`;
    }

    _hideContextMenu() {
      if (this.contextMenu) this.contextMenu.style.display = 'none';
      this.currentContextNodeId = null;
    }

    _toggleFreeze(nodeId) {
      const state = this.nodeState.get(nodeId) || {};
      this.nodeState.set(nodeId, {
        ...state,
        frozen: !state.frozen,
        x: this.positions.get(nodeId)?.x ?? state.x,
        y: this.positions.get(nodeId)?.y ?? state.y
      });
      this._relayout();
    }

    _unfreezeOthers(nodeId) {
      this.nodeState.forEach((state, id) => {
        if (id === nodeId) return;
        this.nodeState.set(id, { ...state, frozen: false });
      });
      this._relayout();
    }

    _startDrag(event, node) {
      if (event.button !== 0) return;
      event.preventDefault();
      const svgRect = this.svgEl.getBoundingClientRect();
      const pos = this.positions.get(node.id);
      if (!pos) return;
      const offsetX = event.clientX - pos.x - svgRect.left;
      const offsetY = event.clientY - pos.y - svgRect.top;

        const move = moveEvt => {
          const x = clamp(
            moveEvt.clientX - svgRect.left - offsetX,
            NODE_RADIUS * 2,
            this.currentGraph.width - NODE_RADIUS * 2
          );
          const y = clamp(
            moveEvt.clientY - svgRect.top - offsetY,
            NODE_RADIUS * 2,
            this.currentGraph.height - NODE_RADIUS * 2
          );
          pos.x = x;
          pos.y = y;
          pos.vx = 0;
          pos.vy = 0;
          this.nodeState.set(node.id, {
            ...(this.nodeState.get(node.id) || {}),
            x,
            y
          });
          this._updateGraphPositions();
        };

      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        this.nodeState.set(node.id, {
          ...(this.nodeState.get(node.id) || {}),
          frozen: true,
          x: pos.x,
          y: pos.y
        });
        this._relayout();
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    }
  }

  window.EntityGraphView = EntityGraphView;
})();
