// Chapter: architecture map. Layers are columns, nodes are pressable cards,
// edges are an SVG overlay redrawn whenever the layout changes.
function renderMap(data, mount) {
  const layers = list(data.layers);
  const nodes = list(data.nodes);
  const edges = list(data.edges);
  const nodeIndex = byId(nodes);
  const changedIds = new Set(list(data.changes).flatMap((change) => list(change.nodes)));

  const svg = s('svg', { class: 'map-edges', 'aria-hidden': 'true' });
  const grid = h('div', { class: 'map-grid', style: `--cols:${Math.max(layers.length, 1)}` },
    layers.map((layer) => mapColumn(layer, nodes, changedIds, (id) => select(id))));
  const canvas = h('div', { class: 'map-canvas', style: `--cols:${Math.max(layers.length, 1)}` }, svg, grid);
  const detail = h('aside', { class: 'map-detail card', 'aria-live': 'polite' });
  let selectedId = null;

  function select(id) {
    selectedId = selectedId === id ? null : id;
    paintSelection();
    renderDetail();
  }

  function related(id) {
    return edges.filter((edge) => edge.from === id || edge.to === id);
  }

  function paintSelection() {
    canvas.classList.toggle('has-selection', Boolean(selectedId));
    canvas.classList.remove('is-changes');
    const neighbours = new Set(selectedId ? related(selectedId).flatMap((e) => [e.from, e.to]) : []);
    grid.querySelectorAll('.node').forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.node === selectedId);
      el.classList.toggle('is-related', neighbours.has(el.dataset.node));
      el.setAttribute('aria-pressed', String(el.dataset.node === selectedId));
    });
    svg.querySelectorAll('[data-edge]').forEach((el) => {
      const [from, to] = el.dataset.edge.split('→');
      const active = from === selectedId || to === selectedId;
      el.querySelectorAll('path, text').forEach((part) => part.classList.toggle('is-active', active));
      el.querySelector('path').setAttribute('marker-end', active ? 'url(#arrow-active)' : 'url(#arrow)');
    });
  }

  function renderDetail() {
    fill(detail, ...(selectedId ? nodeDetail(nodeIndex.get(selectedId)) : emptyDetail()));
  }

  function emptyDetail() {
    return [h('div', { class: 'detail-main' },
      h('div', { class: 'detail-label', style: 'margin-top:0' }, 'Tip'),
      h('h3', null, 'Tap any box above'),
      h('p', null, 'You will see what it does, which files hold it, and who it talks to. Tap it again to clear.'))];
  }

  function nodeDetail(node) {
    const layer = layers.find((l) => l.id === node.layer);
    const links = related(node.id);
    const flows = list(data.flows).filter((flow) => list(flow.steps).some((st) => st.from === node.id || st.to === node.id));
    return [h('div', { class: 'detail-main' },
      h('div', { class: 'step-top' }, h('span', { class: 'tag' }, text(layer && layer.label, node.layer)), node.kind && h('span', { class: 'tag tag-request' }, node.kind)),
      h('h3', null, node.label),
      h('p', null, text(node.summary, 'No summary yet.')),
      node.tech && h('p', { class: 'detail-label' }, node.tech),
      list(node.files).length > 0 && [h('div', { class: 'detail-label' }, 'Lives in'), h('div', { class: 'files' }, list(node.files).map(fileChip))]),
    h('div', { class: 'detail-side' },
      links.length > 0 && [h('div', { class: 'detail-label' }, 'Talks to'), h('ul', { class: 'rel' }, links.map((edge) => relationItem(edge, node.id)))],
      flows.length > 0 && [h('div', { class: 'detail-label' }, 'Shows up in'), h('ul', { class: 'rel' }, flows.map((flow) => h('li', null,
        h('button', { class: 'link', type: 'button', onclick: () => emit('open-flow', { flowId: flow.id }) }, `▶ ${flow.title}`))))]),
    ];
  }

  function relationItem(edge, selfId) {
    const otherId = edge.from === selfId ? edge.to : edge.from;
    const other = nodeIndex.get(otherId);
    const direction = edge.from === selfId ? '→' : '←';
    return h('li', null, h('span', { class: 'arrow-glyph' }, direction),
      h('button', { class: 'link', type: 'button', onclick: () => select(otherId) }, other ? other.label : otherId),
      edge.label && h('span', { class: 'tag' }, edge.label));
  }

  function drawEdges() {
    const box = canvas.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const defs = s('defs', null, arrowMarker('arrow', '#e5e5e5'), arrowMarker('arrow-active', '#1cb0f6'));
    const paths = edges.map((edge) => edgeShape(edge, box)).filter(Boolean);
    fill(svg, defs, ...paths);
    paintSelection();
    if (canvas.dataset.changes === 'on') showChanges();
  }

  function edgeShape(edge, box) {
    const fromEl = grid.querySelector(`[data-node="${CSS.escape(edge.from)}"]`);
    const toEl = grid.querySelector(`[data-node="${CSS.escape(edge.to)}"]`);
    if (!fromEl || !toEl) return null;
    const a = relativeRect(fromEl, box);
    const b = relativeRect(toEl, box);
    const d = connectorPath(a, b);
    const key = `${edge.from}→${edge.to}`;
    const mid = { x: (a.cx + b.cx) / 2, y: (a.cy + b.cy) / 2 };
    return s('g', { 'data-edge': key },
      s('path', { class: `edge${edge.kind === 'async' ? ' is-async' : ''}`, d, 'marker-end': 'url(#arrow)' }),
      edge.label && s('text', { class: 'edge-label', x: mid.x, y: mid.y - 6, 'text-anchor': 'middle' }, truncate(edge.label, 28)));
  }

  function showChanges() {
    canvas.classList.remove('has-selection');
    canvas.classList.add('is-changes');
    grid.querySelectorAll('.node').forEach((el) => el.classList.toggle('is-changed', changedIds.has(el.dataset.node)));
  }

  on('highlight-changes', ({ enabled }) => {
    canvas.dataset.changes = enabled ? 'on' : 'off';
    selectedId = null;
    renderDetail();
    if (enabled) showChanges(); else paintSelection();
    canvas.scrollIntoView({ block: 'center' });
  });

  renderDetail();
  mount.append(
    h('div', { class: 'map-shell' }, h('div', { class: 'map-scroll' }, canvas), detail),
    h('div', { class: 'map-legend' },
      h('span', null, h('i'), 'Calls / reads'),
      h('span', null, h('i', { class: 'dash' }), 'Async / events'),
      changedIds.size > 0 && h('span', null, h('span', { class: 'tag tag-new' }, 'new'), 'Changed recently')),
  );
  const redraw = () => window.requestAnimationFrame(drawEdges);
  new ResizeObserver(redraw).observe(canvas);
  if (document.fonts) document.fonts.ready.then(redraw);
}

function mapColumn(layer, nodes, changedIds, onSelect) {
  const colors = paletteFor(layer.color);
  const layerNodes = nodes.filter((node) => node.layer === layer.id);
  return h('div', { class: 'map-col', style: `--layer:${colors.ink};--layer-wash:${colors.wash};--layer-ink:${colors.text}` },
    h('div', { class: 'map-col-head' }, layer.label),
    layerNodes.map((node) => h('button', {
      class: 'node', type: 'button', 'data-node': node.id, 'aria-pressed': 'false', onclick: () => onSelect(node.id),
    },
    changedIds.has(node.id) && h('span', { class: 'node-badge tag tag-new' }, 'new'),
    icon(node.kind),
    h('span', { class: 'node-text' }, h('span', { class: 'node-label' }, node.label), node.tech && h('span', { class: 'node-tech' }, node.tech)))));
}

function relativeRect(el, box) {
  const r = el.getBoundingClientRect();
  const left = r.left - box.left;
  const top = r.top - box.top;
  return { left, top, right: left + r.width, bottom: top + r.height, cx: left + r.width / 2, cy: top + r.height / 2 };
}

function connectorPath(a, b) {
  const horizontal = Math.abs(b.cx - a.cx) > Math.abs(b.cy - a.cy);
  if (horizontal) {
    const forward = b.cx > a.cx;
    const x1 = forward ? a.right : a.left;
    const x2 = forward ? b.left - 4 : b.right + 4;
    const bend = (x2 - x1) / 2;
    return `M${x1},${a.cy} C${x1 + bend},${a.cy} ${x2 - bend},${b.cy} ${x2},${b.cy}`;
  }
  const down = b.cy > a.cy;
  const y1 = down ? a.bottom : a.top;
  const y2 = down ? b.top - 4 : b.bottom + 4;
  const bend = (y2 - y1) / 2;
  return `M${a.cx},${y1} C${a.cx},${y1 + bend} ${b.cx},${y2 - bend} ${b.cx},${y2}`;
}

function arrowMarker(id, color) {
  return s('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto-start-reverse' },
    s('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }));
}
