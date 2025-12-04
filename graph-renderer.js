/*
 * Lightweight SVG graph renderer for entity relations.
 * Keeps layout + DOM rendering concerns separate from the main app.
 */

const GraphRenderer = (() => {
  function buildAdjacency(edges) {
    const adjacency = new Map();

    const add = (from, to) => {
      const list = adjacency.get(from) || [];
      list.push(to);
      adjacency.set(from, list);
    };

    edges.forEach(edge => {
      add(edge.fromId, edge.toId);
      add(edge.toId, edge.fromId);
    });

    return adjacency;
  }

  function assignLayers(nodes, edges, centerId) {
    const adjacency = buildAdjacency(edges);
    const layers = new Map();

    let rootId = centerId;
    if (!rootId && nodes.length) {
      rootId = nodes[0].id;
    }

    if (!rootId) return { layers, maxLayer: 0 };

    layers.set(rootId, 0);
    const visited = new Set([rootId]);
    let frontier = [rootId];
    let depth = 0;

    while (frontier.length) {
      const next = [];
      frontier.forEach(nodeId => {
        const neighbours = adjacency.get(nodeId) || [];
        neighbours.forEach(neighbour => {
          if (!visited.has(neighbour)) {
            visited.add(neighbour);
            layers.set(neighbour, depth + 1);
            next.push(neighbour);
          }
        });
      });
      frontier = next;
      depth += 1;
    }

    // Any unvisited nodes get placed on the outermost ring.
    nodes.forEach(node => {
      if (!layers.has(node.id)) {
        layers.set(node.id, depth);
      }
    });

    const maxLayer = Math.max(...layers.values());
    return { layers, maxLayer };
  }

  function computeLayout(nodes, edges, centerId, width, height) {
    const { layers, maxLayer } = assignLayers(nodes, edges, centerId);
    const cx = width / 2;
    const cy = height / 2;
    const radiusStep = Math.max(90, Math.min(width, height) / (2 * (maxLayer + 1)));

    const nodesByLayer = new Map();
    layers.forEach((layerIndex, nodeId) => {
      const list = nodesByLayer.get(layerIndex) || [];
      list.push(nodeId);
      nodesByLayer.set(layerIndex, list);
    });

    const positions = new Map();

    nodesByLayer.forEach((nodeIds, layerIndex) => {
      if (layerIndex === 0) {
        positions.set(nodeIds[0], { x: cx, y: cy });
        return;
      }

      const radius = radiusStep * layerIndex;
      const angleStep = (Math.PI * 2) / nodeIds.length;
      nodeIds.forEach((nodeId, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        positions.set(nodeId, { x, y });
      });
    });

    return positions;
  }

  function renderGraph(container, graph, options = {}) {
    const width = options.width || container.clientWidth || 720;
    const height = options.height || 480;

    container.innerHTML = '';

    if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = 'No graph data to display.';
      container.appendChild(p);
      return;
    }

    const layout = computeLayout(graph.nodes, graph.edges || [], graph.centerEntityId, width, height);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'graph-canvas');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Entity relation graph');

    const edgeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeLayer.setAttribute('class', 'graph-edges');
    (graph.edges || []).forEach(edge => {
      const from = layout.get(edge.fromId);
      const to = layout.get(edge.toId);
      if (!from || !to) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'graph-edge');

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      g.appendChild(line);

      if (edge.relationType) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.textContent = edge.relationType;
        text.setAttribute('x', (from.x + to.x) / 2);
        text.setAttribute('y', (from.y + to.y) / 2 - 6);
        text.setAttribute('class', 'graph-edge-label');
        g.appendChild(text);
      }

      edgeLayer.appendChild(g);
    });
    svg.appendChild(edgeLayer);

    const nodeLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeLayer.setAttribute('class', 'graph-nodes');
    graph.nodes.forEach(node => {
      const pos = layout.get(node.id);
      if (!pos) return;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'graph-node');
      g.setAttribute('transform', `translate(${pos.x}, ${pos.y})`);
      if (node.id === graph.centerEntityId) {
        g.classList.add('is-center');
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 22);
      g.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dy', '5');
      label.textContent = node.name || node.id;
      g.appendChild(label);

      if (node.kind) {
        const kind = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        kind.textContent = node.kind;
        g.appendChild(kind);
      }

      if (typeof options.onNodeClick === 'function') {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => options.onNodeClick(node));
      }

      nodeLayer.appendChild(g);
    });
    svg.appendChild(nodeLayer);

    container.appendChild(svg);
  }

  return { renderGraph };
})();
