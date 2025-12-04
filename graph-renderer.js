class EntityGraphRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.classList.add('entity-graph-svg');
    this.container.appendChild(this.svg);
  }

  render(graph) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return;
    const bounds = this.container.getBoundingClientRect();
    const width = Math.max(Math.floor(bounds.width) || 1, 320);
    const height = Math.max(Math.floor(bounds.height) || 1, 260);

    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', height);

    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);

    const nodes = graph.nodes.map(node => ({
      ...node,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0
    }));

    const nodesById = new Map();
    nodes.forEach(n => nodesById.set(n.id, n));

    const edges = graph.edges
      .map(edge => ({
        ...edge,
        source: nodesById.get(edge.fromId),
        target: nodesById.get(edge.toId)
      }))
      .filter(edge => edge.source && edge.target);

    this.#runSimulation(nodes, edges, width, height);

    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    edgeGroup.setAttribute('stroke', '#d1d5db');
    edgeGroup.setAttribute('stroke-width', '1.2');
    this.svg.appendChild(edgeGroup);

    edges.forEach(edge => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', edge.source.x.toFixed(1));
      line.setAttribute('y1', edge.source.y.toFixed(1));
      line.setAttribute('x2', edge.target.x.toFixed(1));
      line.setAttribute('y2', edge.target.y.toFixed(1));
      line.setAttribute('class', 'entity-graph-edge');
      line.dataset.relationType = edge.relationType;
      edgeGroup.appendChild(line);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = edge.relationType;
      label.setAttribute('class', 'entity-graph-edge-label');
      label.setAttribute('x', ((edge.source.x + edge.target.x) / 2).toFixed(1));
      label.setAttribute('y', ((edge.source.y + edge.target.y) / 2).toFixed(1));
      this.svg.appendChild(label);
    });

    nodes.forEach(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('transform', `translate(${node.x.toFixed(1)}, ${node.y.toFixed(1)})`);
      group.setAttribute('class', 'entity-graph-node');
      if (graph.centerEntityId && node.id === graph.centerEntityId) {
        group.classList.add('is-center');
      }

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', graph.centerEntityId === node.id ? 14 : 10);
      circle.setAttribute('class', 'entity-graph-node-circle');
      group.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.textContent = node.name || node.id;
      label.setAttribute('class', 'entity-graph-node-label');
      label.setAttribute('x', 0);
      label.setAttribute('y', 4);
      group.appendChild(label);

      group.addEventListener('click', () => {
        if (typeof this.options.onNodeClick === 'function') {
          this.options.onNodeClick(node.id);
        }
      });

      this.svg.appendChild(group);
    });
  }

  #runSimulation(nodes, edges, width, height) {
    const iterations = 300;
    const centerX = width / 2;
    const centerY = height / 2;
    const repulsion = 8000;
    const springLength = 90;
    const springStrength = 0.05;
    const damping = 0.85;

    for (let i = 0; i < iterations; i += 1) {
      // Repulsion
      for (let a = 0; a < nodes.length; a += 1) {
        for (let b = a + 1; b < nodes.length; b += 1) {
          const dx = nodes[a].x - nodes[b].x;
          const dy = nodes[a].y - nodes[b].y;
          const distanceSq = Math.max(dx * dx + dy * dy, 0.01);
          const force = repulsion / distanceSq;
          const dist = Math.sqrt(distanceSq);
          const ux = dx / dist;
          const uy = dy / dist;
          nodes[a].vx += force * ux;
          nodes[a].vy += force * uy;
          nodes[b].vx -= force * ux;
          nodes[b].vy -= force * uy;
        }
      }

      // Springs
      edges.forEach(edge => {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const displacement = distance - springLength;
        const force = springStrength * displacement;
        const ux = dx / distance;
        const uy = dy / distance;
        edge.source.vx += force * ux;
        edge.source.vy += force * uy;
        edge.target.vx -= force * ux;
        edge.target.vy -= force * uy;
      });

      // Centering
      nodes.forEach(node => {
        node.vx += (centerX - node.x) * 0.02;
        node.vy += (centerY - node.y) * 0.02;
      });

      // Apply velocities
      nodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        node.x = Math.min(Math.max(node.x + node.vx * 0.02, 10), width - 10);
        node.y = Math.min(Math.max(node.y + node.vy * 0.02, 10), height - 10);
      });
    }
  }
}

window.EntityGraphRenderer = EntityGraphRenderer;
