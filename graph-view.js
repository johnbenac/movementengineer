(function () {
  'use strict';

  const DEFAULT_WIDTH = 920;
  const DEFAULT_HEIGHT = 460;
  const NODE_RADIUS = 18;
  const ARROW_ID = 'graph-shared-arrow';

  const graphColors =
    (typeof window !== 'undefined' && window.EntityGraphColors) || Object.freeze({
      palette: [],
      colorForNodeType: () => '#1f2937'
    });

  function clearElement(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  const colorForNodeType = graphColors.colorForNodeType || (() => '#1f2937');

  function normaliseLinks(graph, nodeById) {
    const edges = Array.isArray(graph?.edges) ? graph.edges : graph?.links || [];
    return edges
      .map(edge => {
        const fromId = edge.fromId ?? edge.source;
        const toId = edge.toId ?? edge.target;
        const relationType = edge.relationType || edge.label || edge.type || 'rel';
        const from = nodeById.get(fromId);
        const to = nodeById.get(toId);
        if (!from || !to) return null;
        return {
          id: edge.id || `${fromId}-${relationType}-${toId}`,
          source: from,
          target: to,
          relationType
        };
      })
      .filter(Boolean);
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
        chip.title = node.kind || node.type || '';
        if (node.id !== vm.centerEntityId && onNodeClick) {
          chip.addEventListener('click', () => onNodeClick(node.id, node));
        }
        chipRow.appendChild(chip);
      });
    aside.appendChild(chipRow);

    const edgesTitle = document.createElement('div');
    edgesTitle.className = 'section-heading small';
    edgesTitle.textContent = `Edges (${vm.links.length})`;
    aside.appendChild(edgesTitle);

    const list = document.createElement('ul');
    list.className = 'edge-list';
    const nodesById = new Map(vm.nodes.map(n => [n.id, n]));
    const sortedLinks = [...vm.links].sort((a, b) => {
      const fromA = nodesById.get(a.source.id);
      const fromB = nodesById.get(b.source.id);
      const labelA = (fromA?.name || a.source.id || '').toLowerCase();
      const labelB = (fromB?.name || b.source.id || '').toLowerCase();
      return labelA.localeCompare(labelB);
    });

    sortedLinks.forEach(edge => {
      const from = nodesById.get(edge.source.id);
      const to = nodesById.get(edge.target.id);
      const li = document.createElement('li');
      li.textContent = `${from ? from.name : edge.source.id} — ${edge.relationType} → ${
        to ? to.name : edge.target.id
      }`;
      list.appendChild(li);
    });
    aside.appendChild(list);

    return aside;
  }

  class EntityGraphView {
    constructor(options = {}) {
      this.onNodeClick = options.onNodeClick || null;
      this.onLinkClick = options.onLinkClick || null;
      this.onBackgroundClick = options.onBackgroundClick || null;
      this.showSummary = options.showSummary !== false;
      this.nodeState = new Map();
      this.contextMenu = null;
      this.currentContextNodeId = null;
      this.currentGraph = null;
      this.svgEl = null;
      this.g = null;
      this.zoomBehavior = null;
      this.lastTransform = (typeof d3 !== 'undefined' && d3.zoomIdentity) || null;
      this.simulation = null;
    }

    render(container, graph, options = {}) {
      if (!container) return;
      if (typeof d3 === 'undefined') {
        container.innerHTML = '<p class="hint">D3 is not loaded. (Graph view requires d3.)</p>';
        return;
      }

      if (this.simulation) {
        this.simulation.stop();
        this.simulation = null;
      }

      const nodes = Array.isArray(graph?.nodes) ? graph.nodes.map(n => ({ ...n })) : [];

      clearElement(container);
      if (!nodes.length) {
        const p = document.createElement('p');
        p.className = 'hint';
        p.textContent = 'No graphable items yet.';
        container.appendChild(p);
        return;
      }

      const height = options.height || container.clientHeight || DEFAULT_HEIGHT;

      const nodeById = new Map(nodes.map(n => [n.id, n]));
      const links = normaliseLinks(graph, nodeById);

      const wrapper = document.createElement('div');
      wrapper.className = 'entity-graph-wrapper';

      const canvas = document.createElement('div');
      canvas.className = 'entity-graph-canvas graph-canvas';
      canvas.style.minHeight = `${height}px`;
      canvas.style.height = `${height}px`;

      const summarySection =
        this.showSummary &&
        buildSummarySection({ nodes, links, centerEntityId: options.centerEntityId }, this.onNodeClick);

      wrapper.appendChild(canvas);
      if (summarySection) wrapper.appendChild(summarySection);
      container.appendChild(wrapper);

      const measuredWidth = Math.floor(canvas.getBoundingClientRect().width);
      const width = options.width || measuredWidth || DEFAULT_WIDTH;

      // seed or restore positions
      nodes.forEach(n => {
        const saved = this.nodeState.get(n.id);
        if (saved) {
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

      this.currentGraph = {
        nodes,
        links,
        width,
        height,
        centerEntityId: options.centerEntityId,
        selectedEntityId: options.selectedEntityId,
        selectedEdgeId: options.selectedEdgeId,
        focusEntityId: options.focusEntityId
      };

      const svg = d3
        .select(canvas)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);
      this.svgEl = svg;

      this._ensureDefs(svg);

      svg
        .append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .on('click', () => {
          this._hideContextMenu();
          if (this.onBackgroundClick) this.onBackgroundClick();
        });

      this.g = svg.append('g').attr('class', 'zoom-group');
      this.zoomBehavior = d3
        .zoom()
        .scaleExtent([0.2, 2])
        .on('zoom', event => {
          this.lastTransform = event.transform;
          this.g.attr('transform', this.lastTransform);
        });
      svg.call(this.zoomBehavior);
      if (this.lastTransform) svg.call(this.zoomBehavior.transform, this.lastTransform);

      const nodeFill = n => colorForNodeType(n.type || n.kind);
      const labelFor = n => {
        const s = n.name || n.id;
        return s.length > 18 ? s.slice(0, 17) + '…' : s;
      };

      const linkGroup = this.g
        .append('g')
        .selectAll('g.graph-link')
        .data(links, d => d.id)
        .join('g')
        .attr('class', d => {
          const selected =
            this.currentGraph.selectedEdgeId && this.currentGraph.selectedEdgeId === d.id;
          return 'graph-link' + (selected ? ' selected' : '');
        })
        .on('click', (event, d) => {
          event.stopPropagation();
          this._hideContextMenu();
          if (this.onLinkClick) this.onLinkClick(d.id, d);
        });

      linkGroup.append('path').attr('class', 'graph-link-hitbox');

      const linkPath = linkGroup
        .append('path')
        .attr('class', 'graph-link')
        .attr('marker-end', `url(#${ARROW_ID})`);

      const linkLabel = linkGroup
        .append('text')
        .attr('class', 'graph-link-label')
        .text(d => d.relationType || 'rel');

      const nodeGroup = this.g
        .append('g')
        .selectAll('g.graph-node')
        .data(nodes, d => d.id)
        .join('g')
        .attr('class', d => {
          const classes = ['graph-node'];
          if (this.currentGraph.selectedEntityId === d.id) classes.push('selected');
          if (this.currentGraph.centerEntityId === d.id) classes.push('center');
          if (this.nodeState.get(d.id)?.frozen) classes.push('frozen');
          return classes.join(' ');
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
              this._persistPosition(d.id, d.fx, d.fy, true);
              this._hideContextMenu();
            })
            .on('end', (event, d) => {
              if (!event.active && this.simulation) this.simulation.alphaTarget(0);
              this._persistPosition(d.id, d.fx ?? d.x, d.fy ?? d.y, true);
              this._restartLayout();
            })
        )
        .on('click', (event, d) => {
          event.stopPropagation();
          this._hideContextMenu();
          if (this.onNodeClick) this.onNodeClick(d.id, d);
        })
        .on('contextmenu', (event, d) => this._showContextMenu(event, d));

      nodeGroup
        .append('circle')
        .attr('r', NODE_RADIUS)
        .attr('fill', nodeFill)
        .attr('stroke', d => (this.currentGraph.centerEntityId === d.id ? '#111827' : '#f3f4f6'))
        .attr('stroke-width', d => (this.currentGraph.centerEntityId === d.id ? 3 : 2));

      nodeGroup
        .append('text')
        .attr('dy', 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .text(d => {
          const initials = (d.name || d.id)
            .split(/\s+/)
            .slice(0, 2)
            .map(part => part[0])
            .join('');
          return initials.toUpperCase();
        });

      const nodeLabel = this.g
        .append('g')
        .selectAll('text.graph-node-label')
        .data(nodes, d => d.id)
        .join('text')
        .attr('class', 'graph-node-label')
        .attr('text-anchor', 'middle')
        .text(labelFor);

      this.simulation = d3
        .forceSimulation(nodes)
        .force(
          'link',
          d3
            .forceLink(links)
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
          if (typeof n.x === 'number' && typeof n.y === 'number') {
            this._persistPosition(n.id, n.x, n.y, this.nodeState.get(n.id)?.frozen);
          }
        });

        linkPath.attr('d', arcPath);
        linkGroup.selectAll('path.graph-link-hitbox').attr('d', arcPath);

        linkLabel.attr('transform', d => {
          const pathEl = linkPath.nodes()[links.indexOf(d)];
          if (!pathEl) return null;
          const len = pathEl.getTotalLength();
          const p = pathEl.getPointAtLength(len / 2);
          return `translate(${p.x},${p.y})`;
        });

        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`).classed('frozen', d => {
          return Boolean(this.nodeState.get(d.id)?.frozen);
        });

        nodeLabel
          .attr('x', d => d.x)
          .attr('y', d => {
            const below = d.y + NODE_RADIUS + 12;
            return below > height - 6 ? d.y - NODE_RADIUS - 8 : below;
          });
      });

      if (options.focusEntityId && nodes.some(n => n.id === options.focusEntityId)) {
        const focusNode = nodes.find(n => n.id === options.focusEntityId);
        this._focusOnNode(focusNode, width, height);
      }

      this._bindGlobalContextClose();
    }

    fit() {
      if (!this.svgEl || !this.simulation || !this.zoomBehavior) return;
      const nodes = this.simulation.nodes();
      if (!nodes || !nodes.length) return;

      const xs = nodes.map(n => n.x).filter(Number.isFinite);
      const ys = nodes.map(n => n.y).filter(Number.isFinite);
      if (!xs.length || !ys.length) return;

      const minX = Math.min.apply(null, xs);
      const maxX = Math.max.apply(null, xs);
      const minY = Math.min.apply(null, ys);
      const maxY = Math.max.apply(null, ys);

      const width = this.currentGraph?.width || DEFAULT_WIDTH;
      const height = this.currentGraph?.height || DEFAULT_HEIGHT;

      const contentWidth = Math.max(maxX - minX, 1);
      const contentHeight = Math.max(maxY - minY, 1);
      const padding = 50;

      const scale = Math.min(
        2,
        Math.max(
          0.2,
          Math.min((width - padding * 2) / contentWidth, (height - padding * 2) / contentHeight)
        )
      );

      const t = d3.zoomIdentity
        .translate(width / 2 - (minX + contentWidth / 2) * scale, height / 2 - (minY + contentHeight / 2) * scale)
        .scale(scale);

      this.svgEl.transition().duration(400).call(this.zoomBehavior.transform, t);
      this.lastTransform = t;
    }

    _ensureDefs(svg) {
      const defs = svg.select('defs').node() ? svg.select('defs') : svg.append('defs');
      if (!defs.select(`#${ARROW_ID}`).node()) {
        defs
          .append('marker')
          .attr('id', ARROW_ID)
          .attr('viewBox', '-10 -5 10 10')
          .attr('refX', 18)
          .attr('refY', 0)
          .attr('markerWidth', 6)
          .attr('markerHeight', 6)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M -10,-5 L 0,0 L -10,5')
          .attr('fill', 'var(--link-color, rgba(255,255,255,0.45))');
      }
    }

    _persistPosition(nodeId, x, y, frozen = false) {
      const existing = this.nodeState.get(nodeId) || {};
      this.nodeState.set(nodeId, {
        ...existing,
        x,
        y,
        frozen
      });
    }

    _restartLayout() {
      if (!this.simulation) return;
      this.simulation.alpha(0.8).restart();
    }

    _focusOnNode(node, width, height) {
      if (!node || !this.svgEl || !this.zoomBehavior) return;
      const zoomLevel = 1.2;
      const t = d3.zoomIdentity
        .translate(width / 2 - node.x * zoomLevel, height / 2 - node.y * zoomLevel)
        .scale(zoomLevel);
      this.svgEl.transition().duration(450).call(this.zoomBehavior.transform, t);
      this.lastTransform = t;
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
      event.preventDefault();
      event.stopPropagation();
      this.currentContextNodeId = node.id;
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
      this.currentContextNodeId = null;
    }

    _toggleFreeze(nodeId, frozen) {
      const state = this.nodeState.get(nodeId) || {};
      const node = (this.currentGraph?.nodes || []).find(n => n.id === nodeId);
      const x = node?.x ?? state.x;
      const y = node?.y ?? state.y;
      this.nodeState.set(nodeId, {
        ...state,
        frozen,
        x,
        y
      });
      if (node) {
        node.fx = frozen ? x : null;
        node.fy = frozen ? y : null;
      }
      this._restartLayout();
    }

    _unfreezeOthers(nodeId) {
      const nodes = this.currentGraph?.nodes || [];
      nodes.forEach(n => {
        if (n.id === nodeId) return;
        const state = this.nodeState.get(n.id) || {};
        this.nodeState.set(n.id, { ...state, frozen: false });
        n.fx = null;
        n.fy = null;
      });
      this._restartLayout();
    }
  }

  window.EntityGraphView = EntityGraphView;
})();
