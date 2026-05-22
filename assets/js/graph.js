(function() {
  'use strict';

  const container = document.getElementById('knowledgeGraph');
  if (!container || !window.graphData) return;

  const data = window.graphData;
  const width = container.clientWidth;
  const height = 500;

  // Simple force-directed graph using canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);
  canvas.style.width = '100%';
  container.style.overflow = 'hidden';

  const ctx = canvas.getContext('2d');

  // Initialize node positions
  const nodes = data.nodes.map((n, i) => ({
    ...n,
    x: Math.random() * (width - 100) + 50,
    y: Math.random() * (height - 100) + 50,
    vx: 0, vy: 0,
    radius: Math.max(18, 30 - data.nodes.length * 1.2),
  }));

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const edges = data.edges.map(e => ({
    source: typeof e.source === 'object' ? e.source.id : e.source,
    target: typeof e.target === 'object' ? e.target.id : e.target,
  }));

  // Simulation
  let isDragging = false;
  let dragNode = null;

  function simulate() {
    const repulsion = 3000;
    const attraction = 0.005;
    const damping = 0.9;
    const centerForce = 0.01;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = repulsion / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const s = nodeMap[edge.source];
      const t = nodeMap[edge.target];
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 100) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      s.vx += fx; s.vy += fy;
      t.vx -= fx; t.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * centerForce * 0.1;
      node.vy += (height / 2 - node.y) * centerForce * 0.1;
    }

    // Apply velocity
    for (const node of nodes) {
      if (node === dragNode) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(node.radius, Math.min(width - node.radius, node.x));
      node.y = Math.max(node.radius, Math.min(height - node.radius, node.y));
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw edges
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
    ctx.lineWidth = 1;
    for (const edge of edges) {
      const s = nodeMap[edge.source];
      const t = nodeMap[edge.target];
      if (!s || !t) continue;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of nodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color || '#7c3aed';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = node.label.length > 10 ? node.label.slice(0, 10) + '..' : node.label;
      ctx.fillText(label, node.x, node.y);
    }
  }

  function tick() {
    for (let i = 0; i < 5; i++) simulate();
    draw();
    requestAnimationFrame(tick);
  }

  // Mouse interaction
  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function findNode(pos) {
    for (const node of nodes) {
      const dx = pos.x - node.x;
      const dy = pos.y - node.y;
      if (dx * dx + dy * dy < node.radius * node.radius * 2) return node;
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    dragNode = findNode(pos);
    if (dragNode) isDragging = true;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging || !dragNode) return;
    const pos = getMousePos(e);
    dragNode.x = pos.x;
    dragNode.y = pos.y;
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    dragNode = null;
  });

  canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    dragNode = null;
  });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pos = getMousePos(e);
    dragNode = findNode(pos);
    if (dragNode) isDragging = true;
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!isDragging || !dragNode) return;
    const pos = getMousePos(e);
    dragNode.x = pos.x;
    dragNode.y = pos.y;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    isDragging = false;
    dragNode = null;
  });

  // Handle resize
  window.addEventListener('resize', () => {
    const newWidth = container.clientWidth;
    canvas.width = newWidth;
    canvas.width = newWidth;
  });

  tick();
})();
