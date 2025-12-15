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

  function clampToCanvas(value, radius, size) {
    return clamp(value, radius, Math.max(radius, size - radius));
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

  function initialisePositions(nodes, width, height) {
    const positions = new Map();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, idx) => {
      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
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

    const positions = initialisePositions(nodes, width, height);

    for (let step = 0; step < iterations; step += 1) {
      // Repulsion
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        const posA = positions.get(a.id);
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const posB = positions.get(b.id);
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const distSq = Math.max(dx * dx + dy * dy, 16);
          const force = REPULSION / distSq;
          const fx = (force * dx) / Math.sqrt(distSq);
          const fy = (force * dy) / Math.sqrt(distSq);
          posA.vx += fx;
          posA.vy += fy;
          posB.vx -= fx;
          posB.vy -= fy;
        }
      }

      // Springs
      edges.forEach(edge => {
        const source = positions.get(edge.fromId);
        const target = positions.get(edge.toId);
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const delta = dist - EDGE_LENGTH;
        const force = SPRING_STRENGTH * delta;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      });

      // Centering force on the highlighted node
      if (centerId && positions.has(centerId)) {
        const pos = positions.get(centerId);
        pos.vx += (width / 2 - pos.x) * CENTER_PULL;
        pos.vy += (height / 2 - pos.y) * CENTER_PULL;
      }

      // Integrate
      positions.forEach(pos => {
        pos.vx *= DAMPING;
        pos.vy *= DAMPING;
        pos.x = clamp(pos.x + pos.vx, NODE_RADIUS * 2, width - NODE_RADIUS * 2);
        pos.y = clamp(pos.y + pos.vy, NODE_RADIUS * 2, height - NODE_RADIUS * 2);
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

  function renderLabels(svg, nodes, positions) {
    const labels = [];
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
      svg.appendChild(label);
      labels.push({ id: node.id, el: label });
    });
    return labels;
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
      rendered.push({ id: `${edge.fromId}-${edge.toId}-${edge.relationType}`, edge, line, label });
    });
    svg.appendChild(g);
    return rendered;
  }

  function renderNodes(svg, nodes, positions, centerEntityId, onNodeClick) {
    const g = createSvgElement('g', { class: 'graph-nodes' });
    const rendered = [];
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;
      const nodeGroup = createSvgElement('g', {
        class: 'graph-node',
        transform: `translate(${pos.x}, ${pos.y})`
      });

      if (onNodeClick) {
        nodeGroup.style.cursor = 'pointer';
        nodeGroup.addEventListener('click', () => onNodeClick(node.id));
      }

      const hit = createSvgElement('circle', {
        r: NODE_RADIUS + 10,
        fill: 'transparent',
        stroke: 'transparent'
      });
      hit.setAttribute('pointer-events', onNodeClick ? 'all' : 'none');

      const circle = createSvgElement('circle', {
        r: NODE_RADIUS,
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
      rendered.push({ id: node.id, group: nodeGroup, circle });
    });
    svg.appendChild(g);
    return rendered;
  }

  class EntityGraphView {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.positions = null;
      this.nodeElements = new Map();
      this.edgeElements = [];
      this.labelElements = new Map();
      this.currentContextNodeId = null;
      this.contextMenuEl = null;
      this.svg = null;
      this.dimensions = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
      this.boundOutsideClick = null;
      this.centerEntityId = null;
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
        centerEntityId: options.centerEntityId
      });

      this.positions = positions;
      this.dimensions = { width, height };
      this.centerEntityId = options.centerEntityId || null;

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
      renderNodes(svg, vm.nodes, positions, options.centerEntityId, this.onNodeClick).forEach(n =>
        this.nodeElements.set(n.id, n)
      );
      renderLabels(svg, vm.nodes, positions).forEach(label =>
        this.labelElements.set(label.id, label.el)
      );

      this.enableDragging(svg, vm.nodes, vm.edges);
      this.attachContextMenu(wrapper);
      this.updateGraphPositions();

      canvas.appendChild(svg);
      wrapper.appendChild(canvas);

      const summary = buildSummarySection(vm, this.onNodeClick);
      wrapper.appendChild(summary);

      container.appendChild(wrapper);
      this.svg = svg;
    }

    updateGraphPositions(centerEntityId) {
      if (!this.positions) return;
      const activeCenter = centerEntityId || this.centerEntityId;
      this.nodeElements.forEach((nodeEl, nodeId) => {
        const pos = this.positions.get(nodeId);
        if (!pos) return;
        nodeEl.group.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
        nodeEl.group.classList.toggle('frozen', Boolean(pos.frozen));
        if (nodeEl.circle) {
          nodeEl.circle.setAttribute('stroke', nodeId === activeCenter ? '#111827' : '#f3f4f6');
          nodeEl.circle.setAttribute('stroke-width', nodeId === activeCenter ? 3 : 2);
        }
      });

      this.labelElements.forEach((label, nodeId) => {
        const pos = this.positions.get(nodeId);
        if (!pos) return;
        label.setAttribute('x', pos.x);
        label.setAttribute('y', pos.y + NODE_RADIUS + 12);
      });

      this.edgeElements.forEach(item => {
        const from = this.positions.get(item.edge.fromId);
        const to = this.positions.get(item.edge.toId);
        if (!from || !to) return;
        item.line.setAttribute('x1', from.x);
        item.line.setAttribute('y1', from.y);
        item.line.setAttribute('x2', to.x);
        item.line.setAttribute('y2', to.y);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        item.label.setAttribute('x', midX);
        item.label.setAttribute('y', midY - 6);
      });
    }

    enableDragging(svg, nodes) {
      if (!svg) return;
      const activeDrag = { nodeId: null, offsetX: 0, offsetY: 0 };
      const getCoords = evt => {
        const rect = svg.getBoundingClientRect();
        return {
          x: ((evt.clientX - rect.left) / rect.width) * this.dimensions.width,
          y: ((evt.clientY - rect.top) / rect.height) * this.dimensions.height
        };
      };

      const onPointerMove = evt => {
        if (!activeDrag.nodeId) return;
        const coords = getCoords(evt);
        const pos = this.positions.get(activeDrag.nodeId);
        if (!pos) return;
        pos.x = clampToCanvas(coords.x + activeDrag.offsetX, NODE_RADIUS * 2, this.dimensions.width);
        pos.y = clampToCanvas(coords.y + activeDrag.offsetY, NODE_RADIUS * 2, this.dimensions.height);
        this.updateGraphPositions();
      };

      const endDrag = () => {
        if (!activeDrag.nodeId) return;
        const pos = this.positions.get(activeDrag.nodeId);
        if (pos) pos.frozen = true;
        activeDrag.nodeId = null;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', endDrag);
      };

      this.nodeElements.forEach((nodeEl, nodeId) => {
        nodeEl.group.addEventListener('pointerdown', evt => {
          if (evt.button !== 0) return; // only left-click drag
          evt.preventDefault();
          const pos = this.positions.get(nodeId);
          if (!pos) return;
          const coords = getCoords(evt);
          activeDrag.nodeId = nodeId;
          activeDrag.offsetX = pos.x - coords.x;
          activeDrag.offsetY = pos.y - coords.y;
          document.addEventListener('pointermove', onPointerMove);
          document.addEventListener('pointerup', endDrag);
        });

        nodeEl.group.addEventListener('contextmenu', evt => {
          evt.preventDefault();
          this.showContextMenu(nodeId, evt.pageX, evt.pageY);
        });
      });
    }

    attachContextMenu(wrapper) {
      if (this.contextMenuEl) {
        this.contextMenuEl.remove();
      }
      if (this.boundOutsideClick) {
        document.removeEventListener('click', this.boundOutsideClick);
      }
      const menu = document.createElement('div');
      menu.className = 'graph-context-menu hidden';

      const freezeItem = document.createElement('div');
      freezeItem.className = 'graph-context-menu-item';
      freezeItem.textContent = 'Freeze node';
      freezeItem.addEventListener('click', () => {
        if (!this.currentContextNodeId || !this.positions) return;
        const pos = this.positions.get(this.currentContextNodeId);
        if (pos) pos.frozen = !pos.frozen;
        this.updateGraphPositions();
        this.hideContextMenu();
      });

      const unfreezeOthers = document.createElement('div');
      unfreezeOthers.className = 'graph-context-menu-item';
      unfreezeOthers.textContent = 'Unfreeze all other nodes';
      unfreezeOthers.addEventListener('click', () => {
        if (!this.currentContextNodeId || !this.positions) return;
        this.positions.forEach((pos, nodeId) => {
          if (nodeId !== this.currentContextNodeId) pos.frozen = false;
        });
        this.updateGraphPositions();
        this.hideContextMenu();
      });

      menu.appendChild(freezeItem);
      menu.appendChild(unfreezeOthers);
      wrapper.appendChild(menu);
      this.contextMenuEl = menu;

      const hide = () => this.hideContextMenu();
      this.boundOutsideClick = hide;
      document.addEventListener('click', hide);
    }

    showContextMenu(nodeId, pageX, pageY) {
      if (!this.contextMenuEl) return;
      this.currentContextNodeId = nodeId;
      const pos = this.positions?.get(nodeId);
      const freezeLabel = pos?.frozen ? 'Unfreeze node' : 'Freeze node';
      this.contextMenuEl.querySelector('.graph-context-menu-item').textContent = freezeLabel;
      this.contextMenuEl.style.left = `${pageX}px`;
      this.contextMenuEl.style.top = `${pageY}px`;
      this.contextMenuEl.classList.remove('hidden');
    }

    hideContextMenu() {
      if (!this.contextMenuEl) return;
      this.contextMenuEl.classList.add('hidden');
    }
  }

  window.EntityGraphView = EntityGraphView;
})();
