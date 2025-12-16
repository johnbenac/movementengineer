(function () {
  'use strict';

  const NODE_RADIUS = 18;
  const MIN_WIDTH = 640;
  const MIN_HEIGHT = 420;
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
      hash |= 0;
    }
    const idx = Math.abs(hash) % PALETTE.length;
    return PALETTE[idx];
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
      chip.className = 'chip' + (onNodeClick ? ' clickable' : '');
      chip.textContent = node.name || node.id;
      chip.title = node.kind || '';
      if (onNodeClick) {
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

  function normaliseEdges(rawEdges, nodeById) {
    const edges = (rawEdges || []).map((edge, idx) => {
      const fromId =
        edge.fromId || edge.from || edge.fromEntityId || edge.source || edge.sourceId;
      const toId = edge.toId || edge.to || edge.toEntityId || edge.target || edge.targetId;
      if (!fromId || !toId) return null;
      return {
        ...edge,
        id: edge.id || edge.key || `${fromId}-${toId}-${idx}`,
        fromId,
        toId,
        relationType: edge.relationType || edge.type || edge.label || 'rel',
        source: nodeById.get(fromId),
        target: nodeById.get(toId)
      };
    });

    return edges.filter(e => e.source && e.target);
  }

  class EntityGraphView {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.onLinkClick = options.onLinkClick || null;
      this.onBackgroundClick = options.onBackgroundClick || null;
      this.nodeState = new Map();
      this.contextMenu = null;
      this._boundContextClose = null;
      this.currentGraph = null;
      this.svg = null;
      this.zoomBehavior = null;
      this.simulation = null;
      this.containerEl = null;
      this.lastTransform = typeof d3 !== 'undefined' ? d3.zoomIdentity.scale(0.9) : null;
    }

    render(container, vm, options = {}) {
      if (!container) return;
      this.containerEl = container;
      clearElement(container);

      if (typeof d3 === 'undefined') {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'D3 is not loaded. (Graph view requires d3.)';
        container.appendChild(p);
        return;
      }

      const nodes = (vm && vm.nodes ? vm.nodes : vm && vm.entities ? vm.entities : [])
        .filter(Boolean)
        .map(n => ({ ...n }));

      if (!nodes.length) {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'No relations to graph yet.';
        container.appendChild(p);
        return;
      }

      const nodeById = new Map(nodes.map(n => [n.id, n]));
      const edges = normaliseEdges(vm && (vm.edges || vm.links), nodeById);
      const width = Math.max(options.width || container.clientWidth || 0, MIN_WIDTH);
      const height = Math.max(options.height || 0, MIN_HEIGHT);

      this.currentGraph = { nodes, edges, width, height };
      this._bindGlobalContextClose();

      const wrapper = document.createElement('div');
      wrapper.className = 'entity-graph-wrapper';

      const canvas = document.createElement('div');
      canvas.className = 'entity-graph-canvas';
      canvas.style.minHeight = `${height}px`;
      wrapper.appendChild(canvas);

      const summary = buildSummarySection({ nodes, edges }, this.onNodeClick);
      wrapper.appendChild(summary);

      container.appendChild(wrapper);

      this._renderGraph(canvas, nodes, edges, options);
    }

    fit() {
      if (!this.svg || !this.simulation || !this.containerEl || typeof d3 === 'undefined')
        return;

      const nodes = this.simulation.nodes();
      if (!nodes || !nodes.length) return;

      const rect = this.containerEl.getBoundingClientRect();
      const width = Math.max(rect.width || 0, MIN_WIDTH);
      const height = Math.max(rect.height || 0, MIN_HEIGHT);
      const xs = nodes.map(n => n.x).filter(n => Number.isFinite(n));
      const ys = nodes.map(n => n.y).filter(n => Number.isFinite(n));
      if (!xs.length || !ys.length) return;

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const pad = 40;
      const dx = maxX - minX || 1;
      const dy = maxY - minY || 1;
      const scale = Math.min(2, Math.max(0.2, Math.min((width - pad * 2) / dx, (height - pad * 2) / dy)));
      const tx = width / 2 - ((minX + maxX) / 2) * scale;
      const ty = height / 2 - ((minY + maxY) / 2) * scale;
      const t = d3.zoomIdentity.translate(tx, ty).scale(scale);

      this.svg.transition().duration(500).call(this.zoomBehavior.transform, t);
    }

    _renderGraph(canvas, nodes, edges, options) {
      const onNodeClick = this.onNodeClick;
      const onLinkClick = this.onLinkClick;
      const onBackgroundClick = this.onBackgroundClick;
      const selectedEntityId = options.selectedEntityId || options.centerEntityId;
      const selectedRelationId = options.selectedRelationId || null;
      const focusEntityId = options.focusEntityId || null;

      const rect = canvas.getBoundingClientRect();
      const width = Math.max(rect.width || 0, MIN_WIDTH);
      const height = Math.max(rect.height || 0, MIN_HEIGHT);

      this._applyNodeState(nodes, width, height);
      this._hideContextMenu();

      const svg = d3
        .select(canvas)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('role', 'img')
        .attr('aria-label', 'Entity relation graph');

      const defs = svg.append('defs');
      defs
        .append('marker')
        .attr('id', 'graph-arrow')
        .attr('viewBox', '-10 -5 10 10')
        .attr('refX', 18)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M -10,-5 L 0,0 L -10,5')
        .attr('fill', '#9ca3af');

      svg
        .append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .on('click', () => {
          if (onBackgroundClick) onBackgroundClick();
        });

      const g = svg.append('g').attr('class', 'zoom-group');

      const zoomBehavior = d3
        .zoom()
        .scaleExtent([0.2, 2])
        .on('zoom', event => {
          this.lastTransform = event.transform;
          g.attr('transform', this.lastTransform);
        });

      svg.call(zoomBehavior);
      if (this.lastTransform) {
        svg.call(zoomBehavior.transform, this.lastTransform);
      }

      const color = id => hashToColor(id);

      const linkGroup = g
        .append('g')
        .selectAll('g.graph-link')
        .data(edges, d => d.id)
        .join('g')
        .attr('class', d => {
          const selected = selectedRelationId && selectedRelationId === d.id;
          return 'graph-link' + (selected ? ' selected' : '');
        })
        .on('click', (event, d) => {
          event.stopPropagation();
          if (onLinkClick) onLinkClick(d.id);
        });

      linkGroup.append('path').attr('class', 'graph-link-hitbox');

      const linkPath = linkGroup
        .append('path')
        .attr('class', 'graph-link')
        .attr('marker-end', 'url(#graph-arrow)');

      const linkLabel = linkGroup
        .append('text')
        .attr('class', 'graph-link-label')
        .text(d => d.relationType || 'rel');

      const nodeGroup = g
        .append('g')
        .selectAll('g.graph-node')
        .data(nodes, d => d.id)
        .join('g')
        .attr('class', d => {
          const selected = selectedEntityId && selectedEntityId === d.id;
          const frozen = this.nodeState.get(d.id)?.frozen;
          return (
            'graph-node' +
            (selected ? ' selected' : '') +
            (frozen ? ' frozen' : '') +
            (d.id === options.centerEntityId ? ' center' : '')
          );
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
            })
            .on('end', (event, d) => {
              if (!event.active && this.simulation) this.simulation.alphaTarget(0);
              d.fx = d.x;
              d.fy = d.y;
              this.nodeState.set(d.id, { ...this.nodeState.get(d.id), x: d.x, y: d.y, frozen: true });
            })
        )
        .on('click', (event, d) => {
          event.stopPropagation();
          if (onNodeClick) onNodeClick(d.id);
        })
        .on('contextmenu', (event, d) => {
          event.preventDefault();
          event.stopPropagation();
          this._showContextMenu(event, d);
        });

      nodeGroup
        .append('circle')
        .attr('r', NODE_RADIUS)
        .attr('fill', d => color(d.kind || d.id));

      nodeGroup
        .append('text')
        .attr('dy', NODE_RADIUS + 14)
        .attr('text-anchor', 'middle')
        .text(d => {
          const s = d.name || d.id;
          return s.length > 18 ? `${s.slice(0, 17)}…` : s;
        });

      this.simulation = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink(edges)
            .id(d => d.id)
            .distance(120)
        )
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
          if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
            this.nodeState.set(n.id, {
              ...this.nodeState.get(n.id),
              x: n.x,
              y: n.y,
              frozen: this.nodeState.get(n.id)?.frozen || Boolean(n.fx || n.fy)
            });
          }
        });

        linkPath.attr('d', arcPath);
        linkGroup.selectAll('path.graph-link-hitbox').attr('d', arcPath);
        linkLabel.attr('transform', d => {
          const pathEl = linkPath.nodes()[edges.indexOf(d)];
          if (!pathEl) return null;
          const len = pathEl.getTotalLength();
          const p = pathEl.getPointAtLength(len / 2);
          return `translate(${p.x},${p.y})`;
        });

        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      if (focusEntityId) {
        const focusNode = nodes.find(n => n.id === focusEntityId);
        if (focusNode) {
          const zoomLevel = 1.2;
          const t = d3.zoomIdentity
            .translate(width / 2 - focusNode.x * zoomLevel, height / 2 - focusNode.y * zoomLevel)
            .scale(zoomLevel);

          svg.transition().duration(450).call(zoomBehavior.transform, t);
        }
      }

      this.svg = svg;
      this.zoomBehavior = zoomBehavior;
    }

    _applyNodeState(nodes, width, height) {
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
    }

    _bindGlobalContextClose() {
      if (this._boundContextClose) return;
      this._boundContextClose = evt => {
        if (evt && typeof evt.button === 'number' && evt.button === 2) return;
        if (this.contextMenu && evt?.target && this.contextMenu.contains(evt.target)) {
          return;
        }
        this._hideContextMenu();
      };
      document.addEventListener('mousedown', this._boundContextClose, true);
    }

    _showContextMenu(event, node) {
      this._hideContextMenu();
      if (!this.contextMenu) {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'graph-context-menu';
        document.body.appendChild(this.contextMenu);
        this.contextMenu.addEventListener('mousedown', e => e.stopPropagation());
        this.contextMenu.addEventListener('contextmenu', e => e.preventDefault());
      }

      this.contextMenu.innerHTML = '';
      const frozen = this.nodeState.get(node.id)?.frozen;

      const toggle = document.createElement('div');
      toggle.className = 'graph-context-item';
      toggle.textContent = frozen ? 'Unfreeze node' : 'Freeze node';
      toggle.addEventListener('click', () => {
        this._toggleFreeze(node.id, !frozen);
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
    }

    _toggleFreeze(nodeId, frozen) {
      const state = this.nodeState.get(nodeId) || {};
      const next = { ...state, frozen };
      if (this.simulation) {
        const node = this.simulation.nodes().find(n => n.id === nodeId);
        if (node) {
          if (frozen) {
            node.fx = node.x;
            node.fy = node.y;
            next.x = node.x;
            next.y = node.y;
          } else {
            node.fx = null;
            node.fy = null;
          }
        }
        this.simulation.alpha(0.6).restart();
      }
      this.nodeState.set(nodeId, next);
    }

    _unfreezeOthers(nodeId) {
      if (this.simulation) {
        this.simulation.nodes().forEach(n => {
          if (n.id === nodeId) return;
          n.fx = null;
          n.fy = null;
        });
        this.simulation.alpha(0.6).restart();
      }
      this.nodeState.forEach((state, id) => {
        if (id === nodeId) return;
        this.nodeState.set(id, { ...state, frozen: false });
      });
    }
  }

  window.EntityGraphView = EntityGraphView;
})();
