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

  function initialisePositions(nodes, width, height, previousPositions = new Map()) {
    const positions = new Map();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, idx) => {
      const existing = previousPositions.get(node.id);
      if (existing) {
        positions.set(node.id, { ...existing });
        return;
      }

      const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        frozen: false
      });
    });

    return positions;
  }

  function runForceLayout(nodes, edges, options) {
    const width = options.width || DEFAULT_WIDTH;
    const height = options.height || DEFAULT_HEIGHT;
    const iterations = options.iterations || 220;
    const centerId = options.centerEntityId;

    const positions = initialisePositions(
      nodes,
      width,
      height,
      options.initialPositions || new Map()
    );

    const frozenNodes = new Set(options.frozenNodes || []);
    frozenNodes.forEach(id => {
      const pos = positions.get(id);
      if (pos) pos.frozen = true;
    });

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
          if (!posA.frozen) {
            posA.vx += fx;
            posA.vy += fy;
          }
          if (!posB.frozen) {
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
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const delta = dist - EDGE_LENGTH;
        const force = SPRING_STRENGTH * delta;
        const fx = (force * dx) / dist;
        const fy = (force * dy) / dist;
        if (!source.frozen) {
          source.vx += fx;
          source.vy += fy;
        }
        if (!target.frozen) {
          target.vx -= fx;
          target.vy -= fy;
        }
      });

      // Centering force on the highlighted node
      if (centerId && positions.has(centerId)) {
        const pos = positions.get(centerId);
        if (!pos.frozen) {
          pos.vx += (width / 2 - pos.x) * CENTER_PULL;
          pos.vy += (height / 2 - pos.y) * CENTER_PULL;
        }
      }

      // Integrate
      positions.forEach(pos => {
        if (pos.frozen) {
          pos.vx = 0;
          pos.vy = 0;
          return;
        }
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
    nodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;
      const label = createSvgElement('text', {
        x: pos.x,
        y: pos.y + NODE_RADIUS + 12,
        class: 'graph-node-label',
        'text-anchor': 'middle',
        'data-id': node.id
      });
      label.textContent = node.name || node.id;
      svg.appendChild(label);
    });
  }

  function renderEdges(svg, edges, positions) {
    const g = createSvgElement('g', { class: 'graph-edges' });
    edges.forEach(edge => {
      const from = positions.get(edge.fromId);
      const to = positions.get(edge.toId);
      if (!from || !to) return;
      const line = createSvgElement('line', {
        x1: from.x,
        y1: from.y,
        x2: to.x,
        y2: to.y,
        'marker-end': 'url(#arrowhead)',
        'data-from': edge.fromId,
        'data-to': edge.toId
      });
      g.appendChild(line);

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const label = createSvgElement('text', {
        x: midX,
        y: midY - 6,
        class: 'graph-edge-label',
        'text-anchor': 'middle',
        'data-from': edge.fromId,
        'data-to': edge.toId
      });
      label.textContent = edge.relationType;
      g.appendChild(label);
    });
    svg.appendChild(g);
  }

  function renderNodes(svg, nodes, positions, centerEntityId, onNodeClick, options) {
    const g = createSvgElement('g', { class: 'graph-nodes' });
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

      nodeGroup.dataset.id = node.id;
      nodeGroup.classList.toggle('frozen', Boolean(pos.frozen));

      if (options && options.onNodeContextMenu) {
        nodeGroup.addEventListener('contextmenu', event => {
          event.preventDefault();
          options.onNodeContextMenu(event, node.id);
        });
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
    });
    svg.appendChild(g);
  }

  class EntityGraphView {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.positions = new Map();
      this.frozenNodes = new Set();
      this.lastContainer = null;
      this.lastVm = null;
      this.lastOptions = null;
      this.contextMenu = null;
      this.contextMenuState = { nodeId: null };
    }

    render(container, vm, options = {}) {
      if (!container) return;
      this.lastContainer = container;
      this.lastVm = vm;
      this.lastOptions = options;
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

      // Clean up state for removed nodes
      const incomingIds = new Set(vm.nodes.map(n => n.id));
      Array.from(this.positions.keys()).forEach(id => {
        if (!incomingIds.has(id)) {
          this.positions.delete(id);
          this.frozenNodes.delete(id);
        }
      });

      const positions = runForceLayout(vm.nodes, vm.edges, {
        width,
        height,
        centerEntityId: options.centerEntityId,
        initialPositions: this.positions,
        frozenNodes: this.frozenNodes
      });

      this.positions = positions;

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

      renderEdges(svg, vm.edges, positions);
      renderNodes(svg, vm.nodes, positions, options.centerEntityId, this.onNodeClick, {
        onNodeContextMenu: (event, nodeId) => this.showContextMenu(event, nodeId)
      });
      renderLabels(svg, vm.nodes, positions);

      this.attachDragHandlers(canvas, svg, vm);
      this.installContextMenu();

      canvas.appendChild(svg);
      wrapper.appendChild(canvas);

      const summary = buildSummarySection(vm, this.onNodeClick);
      wrapper.appendChild(summary);

      container.appendChild(wrapper);
    }

    attachDragHandlers(canvas, svg, vm) {
      let activeNodeId = null;
      let offset = { x: 0, y: 0 };
      const bounds = svg.getBoundingClientRect();

      const onMouseMove = evt => {
        if (!activeNodeId) return;
        const pos = this.positions.get(activeNodeId);
        if (!pos) return;
        pos.x = evt.clientX - bounds.left - offset.x;
        pos.y = evt.clientY - bounds.top - offset.y;
        pos.frozen = true;
        this.frozenNodes.add(activeNodeId);
        this.updateGraph(svg, vm);
      };

      const onMouseUp = () => {
        if (activeNodeId) {
          this.frozenNodes.add(activeNodeId);
        }
        activeNodeId = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      canvas.querySelectorAll('.graph-node').forEach(nodeEl => {
        nodeEl.addEventListener('mousedown', evt => {
          if (evt.button !== 0) return;
          const id = nodeEl.dataset.id;
          if (!id) return;
          activeNodeId = id;
          const pos = this.positions.get(id);
          if (!pos) return;
          offset = {
            x: evt.clientX - bounds.left - pos.x,
            y: evt.clientY - bounds.top - pos.y
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        });
      });
    }

    updateGraph(svg, vm) {
      vm.nodes.forEach(node => {
        const pos = this.positions.get(node.id);
        if (!pos) return;
        const nodeEl = svg.querySelector(`.graph-node[data-id="${node.id}"]`);
        if (nodeEl) {
          nodeEl.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
          nodeEl.classList.toggle('frozen', Boolean(pos.frozen));
        }
      });

      svg.querySelectorAll('.graph-edges line').forEach(line => {
        const fromId = line.getAttribute('data-from');
        const toId = line.getAttribute('data-to');
        const from = this.positions.get(fromId);
        const to = this.positions.get(toId);
        if (!from || !to) return;
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
      });

      svg.querySelectorAll('.graph-edge-label').forEach(label => {
        const fromId = label.getAttribute('data-from');
        const toId = label.getAttribute('data-to');
        const from = this.positions.get(fromId);
        const to = this.positions.get(toId);
        if (!from || !to) return;
        label.setAttribute('x', (from.x + to.x) / 2);
        label.setAttribute('y', (from.y + to.y) / 2 - 6);
      });

      svg.querySelectorAll('.graph-node-label').forEach(label => {
        const id = label.getAttribute('data-id');
        const pos = this.positions.get(id);
        if (!pos) return;
        label.setAttribute('x', pos.x);
        label.setAttribute('y', pos.y + NODE_RADIUS + 12);
      });
    }

    installContextMenu() {
      if (this.contextMenu) return;
      const menu = document.createElement('div');
      menu.className = 'graph-context-menu';
      menu.hidden = true;

      const freezeItem = document.createElement('button');
      freezeItem.type = 'button';
      freezeItem.className = 'graph-context-item';
      freezeItem.textContent = 'Freeze node';
      freezeItem.addEventListener('click', () => this.toggleFreeze());

      const unfreezeOthers = document.createElement('button');
      unfreezeOthers.type = 'button';
      unfreezeOthers.className = 'graph-context-item';
      unfreezeOthers.textContent = 'Unfreeze all other nodes';
      unfreezeOthers.addEventListener('click', () => this.unfreezeOthers());

      menu.appendChild(freezeItem);
      menu.appendChild(unfreezeOthers);
      document.body.appendChild(menu);

      document.addEventListener('click', () => this.hideContextMenu());
      this.contextMenu = menu;
    }

    showContextMenu(event, nodeId) {
      if (!this.contextMenu) return;
      this.contextMenuState.nodeId = nodeId;
      const frozen = this.frozenNodes.has(nodeId);
      this.contextMenu.querySelector('.graph-context-item').textContent = frozen
        ? 'Unfreeze node'
        : 'Freeze node';
      this.contextMenu.style.left = `${event.clientX}px`;
      this.contextMenu.style.top = `${event.clientY}px`;
      this.contextMenu.hidden = false;
    }

    hideContextMenu() {
      if (this.contextMenu) {
        this.contextMenu.hidden = true;
        this.contextMenuState.nodeId = null;
      }
    }

    toggleFreeze() {
      const nodeId = this.contextMenuState.nodeId;
      if (!nodeId) return;
      if (this.frozenNodes.has(nodeId)) {
        this.frozenNodes.delete(nodeId);
        const pos = this.positions.get(nodeId);
        if (pos) pos.frozen = false;
      } else {
        this.frozenNodes.add(nodeId);
        const pos = this.positions.get(nodeId);
        if (pos) pos.frozen = true;
      }
      this.hideContextMenu();
      this.render(this.lastContainer, this.lastVm, this.lastOptions);
    }

    unfreezeOthers() {
      const keepId = this.contextMenuState.nodeId;
      if (!keepId) return;
      this.frozenNodes = new Set([keepId]);
      this.positions.forEach((pos, id) => {
        pos.frozen = id === keepId;
      });
      this.hideContextMenu();
      this.render(this.lastContainer, this.lastVm, this.lastOptions);
    }
  }

  window.EntityGraphView = EntityGraphView;
})();
