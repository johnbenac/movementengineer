(function () {
  'use strict';

  const DEFAULT_WIDTH = 920;
  const DEFAULT_HEIGHT = 460;
  const NODE_RADIUS = 18;
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

  function buildSummarySection(graph, onNodeClick) {
    const aside = document.createElement('div');
    aside.className = 'entity-graph-summary';

    const title = document.createElement('div');
    title.className = 'section-heading small';
    title.textContent = `Nodes (${graph.nodes.length})`;
    aside.appendChild(title);

    const chipRow = document.createElement('div');
    chipRow.className = 'chip-row wrap';
    graph.nodes.forEach(node => {
      const chip = document.createElement('span');
      chip.className = 'chip clickable';
      chip.textContent = node.name || node.id;
      chip.title = node.kind || '';
      chip.addEventListener('click', () => onNodeClick && onNodeClick(node.id));
      chipRow.appendChild(chip);
    });
    aside.appendChild(chipRow);

    const edgesTitle = document.createElement('div');
    edgesTitle.className = 'section-heading small';
    edgesTitle.textContent = `Edges (${graph.edges.length})`;
    aside.appendChild(edgesTitle);

    const list = document.createElement('ul');
    list.className = 'edge-list';
    graph.edges.forEach(edge => {
      const li = document.createElement('li');
      const from = graph.nodes.find(n => n.id === edge.fromId);
      const to = graph.nodes.find(n => n.id === edge.toId);
      li.textContent = `${from ? from.name : edge.fromId} — ${edge.relationType} → ${
        to ? to.name : edge.toId
      }`;
      list.appendChild(li);
    });
    aside.appendChild(list);

    return aside;
  }

  function normaliseGraph(graph) {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes.map(n => ({
      id: n.id,
      name: n.name || n.id,
      kind: n.kind || ''
    })) : [];

    const edges = Array.isArray(graph?.edges) ? graph.edges.map((e, idx) => ({
      id: e.id || `edge_${idx}`,
      relationType: e.relationType || e.label || 'rel',
      fromId: e.fromId || e.source,
      toId: e.toId || e.target
    })).filter(e => e.fromId && e.toId) : [];

    return { nodes, edges };
  }

  class GraphViewer {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.onLinkClick = options.onLinkClick || null;
      this.onBackgroundClick = options.onBackgroundClick || null;
      this.enableContextMenu = options.enableContextMenu !== false;
      this.nodeState = new Map();
      this.wrapper = null;
      this.canvas = null;
      this.summary = null;
      this.contextMenu = null;
      this.currentGraph = null;
      this.svg = null;
      this.zoomBehavior = null;
      this.simulation = null;
      this.lastTransform = typeof d3 !== 'undefined' ? d3.zoomIdentity.scale(0.9) : null;
    }

    render(container, rawGraph, options = {}) {
      if (typeof d3 === 'undefined') {
        if (container) container.innerHTML = '<p class="hint">D3 is not loaded. (Graph view requires d3.)</p>';
        return;
      }

      if (!container) return;
      clearElement(container);

      const graph = normaliseGraph(rawGraph);
      if (!graph.nodes.length) {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'No relations to graph yet.';
        container.appendChild(p);
        return;
      }

      this.currentGraph = {
        ...graph,
        selectedEntityId: options.selectedEntityId || options.centerEntityId || null,
        selectedRelationId: options.selectedRelationId || null,
        focusEntityId: options.focusEntityId || options.centerEntityId || null
      };

      this.enableContextMenu = options.enableContextMenu !== false;

      this.wrapper = document.createElement('div');
      this.wrapper.className = 'entity-graph-wrapper';
      this.canvas = document.createElement('div');
      this.canvas.className = 'entity-graph-canvas';
      this.canvas.style.minHeight = `${options.height || DEFAULT_HEIGHT}px`;
      this.wrapper.appendChild(this.canvas);

      // optional summary
      const summaryEnabled = options.showSummary !== false;
      if (summaryEnabled) {
        this.summary = buildSummarySection(graph, this.onNodeClick);
        this.wrapper.appendChild(this.summary);
      }

      container.appendChild(this.wrapper);

      const width = options.width || this.canvas.clientWidth || DEFAULT_WIDTH;
      const height = options.height || DEFAULT_HEIGHT;

      this._renderSvg(graph, { width, height });
    }

    _renderSvg(graph, size) {
      const { width, height } = size;
      this.canvas.innerHTML = '';

      this.svg = d3
        .select(this.canvas)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', 'Entity relation graph');

      const defs = this.svg.append('defs');
      defs
        .append('marker')
        .attr('id', 'gw-arrow')
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M -10,-5 L 0,0 L -10,5')
        .attr('fill', 'var(--link-color, rgba(0,0,0,0.35))');

      this.svg
        .append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .on('click', () => {
          if (this.onBackgroundClick) this.onBackgroundClick();
          this._hideContextMenu();
        });

      const g = this.svg.append('g').attr('class', 'zoom-group');

      this.zoomBehavior = d3
        .zoom()
        .scaleExtent([0.2, 2])
        .on('zoom', event => {
          this.lastTransform = event.transform;
          g.attr('transform', this.lastTransform);
        });

      this.svg.call(this.zoomBehavior);
      if (this.lastTransform) {
        this.svg.call(this.zoomBehavior.transform, this.lastTransform);
      }

      const nodes = graph.nodes.map(n => ({ ...n }));
      const links = graph.edges.map(e => ({
        id: e.id,
        relationType: e.relationType,
        source: e.fromId,
        target: e.toId
      }));

      const nodeById = new Map(nodes.map(n => [n.id, n]));
      const validLinks = links
        .map(l => ({
          ...l,
          source: nodeById.get(l.source),
          target: nodeById.get(l.target)
        }))
        .filter(l => l.source && l.target);

      // restore saved positions and frozen state
      nodes.forEach(n => {
        const saved = this.nodeState.get(n.id);
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
          n.x = saved.x;
          n.y = saved.y;
          if (saved.frozen) {
            n.fx = saved.x;
            n.fy = saved.y;
          }
        } else {
          const angle = Math.random() * 2 * Math.PI;
          const radius = Math.min(width, height) / 3;
          n.x = width / 2 + radius * Math.cos(angle);
          n.y = height / 2 + radius * Math.sin(angle);
        }
      });

      // Draw links
      const linkGroup = g
        .append('g')
        .selectAll('g.graph-link')
        .data(validLinks, d => d.id)
        .join('g')
        .attr('class', d => {
          const selected =
            this.currentGraph &&
            this.currentGraph.selectedRelationId &&
            this.currentGraph.selectedRelationId === d.id;
          return 'graph-link' + (selected ? ' selected' : '');
        })
        .on('click', (event, d) => {
          event.stopPropagation();
          if (this.onLinkClick) this.onLinkClick(d.id);
        });

      const linkHitbox = linkGroup.append('path').attr('class', 'graph-link-hitbox');

      const linkPath = linkGroup
        .append('path')
        .attr('class', 'graph-link')
        .attr('marker-end', 'url(#gw-arrow)');

      const linkLabel = linkGroup
        .append('text')
        .attr('class', 'graph-link-label')
        .text(d => d.relationType || 'rel');

      // Nodes
      const nodeGroup = g
        .append('g')
        .selectAll('g.graph-node')
        .data(nodes, d => d.id)
        .join('g')
        .attr('class', d => {
          const selected =
            this.currentGraph &&
            this.currentGraph.selectedEntityId &&
            this.currentGraph.selectedEntityId === d.id;
          const frozen = this.nodeState.get(d.id)?.frozen;
          return 'graph-node' + (selected ? ' selected' : '') + (frozen ? ' frozen' : '');
        })
        .call(
          d3
            .drag()
            .on('start', (event, d) => {
              if (!event.active && this.simulation) this.simulation.alphaTarget(0.2).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on('drag', (event, d) => {
              d.fx = event.x;
              d.fy = event.y;
              this.nodeState.set(d.id, { ...(this.nodeState.get(d.id) || {}), x: d.fx, y: d.fy });
            })
            .on('end', (event, d) => {
              if (!event.active && this.simulation) this.simulation.alphaTarget(0);
              this.nodeState.set(d.id, {
                ...(this.nodeState.get(d.id) || {}),
                frozen: true,
                x: d.fx,
                y: d.fy
              });
              d.fx = d.fx;
              d.fy = d.fy;
            })
        )
        .on('click', (event, d) => {
          event.stopPropagation();
          this._hideContextMenu();
          if (this.onNodeClick) this.onNodeClick(d.id);
        })
        .on('contextmenu', (event, d) => {
          event.preventDefault();
          event.stopPropagation();
          this._showContextMenu(event, d);
        });

      nodeGroup
        .append('circle')
        .attr('r', NODE_RADIUS)
        .attr('class', 'graph-node-circle')
        .attr('fill', d => hashToColor(d.kind || ''));

      nodeGroup
        .append('text')
        .attr('class', 'graph-node-initials')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('fill', '#fff')
        .text(d => {
          return (d.name || d.id)
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join('')
            .toUpperCase();
        });

      nodeGroup
        .append('text')
        .attr('class', 'graph-node-label')
        .attr('dy', NODE_RADIUS + 14)
        .attr('text-anchor', 'middle')
        .text(d => d.name || d.id);

      this.simulation = d3
        .forceSimulation(nodes)
        .force('link', d3.forceLink(validLinks).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-420).distanceMax(420))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(28))
        .alpha(1)
        .alphaDecay(0.03);

      const arcPath = d => {
        const sx = d.source.x;
        const sy = d.source.y;
        const tx = d.target.x;
        const ty = d.target.y;

        const dx = tx - sx;
        const dy = ty - sy;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;

        return `M ${sx} ${sy} A ${dr} ${dr} 0 0 1 ${tx} ${ty}`;
      };

      this.simulation.on('tick', () => {
        nodes.forEach(n => {
          if (typeof n.x === 'number' && typeof n.y === 'number') {
            const frozen = this.nodeState.get(n.id)?.frozen;
            this.nodeState.set(n.id, { ...(this.nodeState.get(n.id) || {}), x: n.x, y: n.y, frozen });
          }
        });

        linkPath.attr('d', arcPath);
        linkHitbox.attr('d', arcPath);

        linkLabel.attr('transform', d => {
          const pathEl = linkPath.nodes()[validLinks.indexOf(d)];
          if (!pathEl) return null;
          const len = pathEl.getTotalLength();
          const p = pathEl.getPointAtLength(len / 2);
          return `translate(${p.x},${p.y})`;
        });

        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      if (this.currentGraph && this.currentGraph.focusEntityId) {
        const focusNode = nodes.find(n => n.id === this.currentGraph.focusEntityId);
        if (focusNode) {
          const zoomLevel = 1.2;
          const t = d3.zoomIdentity
            .translate(width / 2 - focusNode.x * zoomLevel, height / 2 - focusNode.y * zoomLevel)
            .scale(zoomLevel);

          this.svg
            .transition()
            .duration(450)
            .call(this.zoomBehavior.transform, t);
        }
      }
    }

    _showContextMenu(event, node) {
      if (!this.enableContextMenu) return;
      if (!this.contextMenu) {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'graph-context-menu';
        document.body.appendChild(this.contextMenu);
      }

      const state = this.nodeState.get(node.id) || {};
      this.contextMenu.innerHTML = '';

      const toggle = document.createElement('div');
      toggle.className = 'graph-context-item';
      toggle.textContent = state.frozen ? 'Unfreeze node' : 'Freeze node';
      toggle.addEventListener('click', () => {
        this.nodeState.set(node.id, { ...state, frozen: !state.frozen, x: state.x, y: state.y });
        if (this.simulation) {
          const n = this.simulation.nodes().find(n => n.id === node.id);
          if (n) {
            if (state.frozen) {
              n.fx = null;
              n.fy = null;
            } else {
              n.fx = state.x ?? n.x;
              n.fy = state.y ?? n.y;
            }
          }
          this.simulation.alpha(0.6).restart();
        }
        this._hideContextMenu();
      });
      this.contextMenu.appendChild(toggle);

      const unfreezeOthers = document.createElement('div');
      unfreezeOthers.className = 'graph-context-item';
      unfreezeOthers.textContent = 'Unfreeze all other nodes';
      unfreezeOthers.addEventListener('click', () => {
        this.nodeState.forEach((val, id) => {
          if (id === node.id) return;
          this.nodeState.set(id, { ...val, frozen: false });
        });
        if (this.simulation) {
          this.simulation.nodes().forEach(n => {
            if (n.id === node.id) return;
            n.fx = null;
            n.fy = null;
          });
          this.simulation.alpha(0.6).restart();
        }
        this._hideContextMenu();
      });
      this.contextMenu.appendChild(unfreezeOthers);

      this.contextMenu.style.display = 'block';
      this.contextMenu.style.left = `${event.clientX}px`;
      this.contextMenu.style.top = `${event.clientY}px`;

      document.addEventListener('mousedown', this._boundContextClose || (this._boundContextClose = evt => {
        if (evt && typeof evt.button === 'number' && evt.button === 2) return;
        if (this.contextMenu && evt?.target && this.contextMenu.contains(evt.target)) return;
        this._hideContextMenu();
      }), true);
    }

    _hideContextMenu() {
      if (this.contextMenu) this.contextMenu.style.display = 'none';
    }

    fit() {
      if (!this.svg || !this.simulation || !this.canvas) return;

      const nodes = this.simulation.nodes();
      if (!nodes || !nodes.length) return;

      const r = this.canvas.getBoundingClientRect();
      const width = Math.max(DEFAULT_WIDTH, Math.floor(r.width || 0));
      const height = Math.max(DEFAULT_HEIGHT, Math.floor(r.height || 0));

      const xs = nodes.map(n => n.x).filter(n => Number.isFinite(n));
      const ys = nodes.map(n => n.y).filter(n => Number.isFinite(n));
      if (!xs.length || !ys.length) return;

      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minY = Math.min.apply(null, ys);
      const maxY = Math.max.apply(null, ys);

      const pad = 40;
      const dx = maxX - minX || 1;
      const dy = maxY - minY || 1;

      const scale = Math.min(2, Math.max(0.2, Math.min((width - pad * 2) / dx, (height - pad * 2) / dy)));

      const tx = width / 2 - ((minX + maxX) / 2) * scale;
      const ty = height / 2 - ((minY + maxY) / 2) * scale;

      const t = d3.zoomIdentity.translate(tx, ty).scale(scale);

      this.svg.transition().duration(500).call(this.zoomBehavior.transform, t);
    }
  }

  window.GraphViewer = GraphViewer;
})();
