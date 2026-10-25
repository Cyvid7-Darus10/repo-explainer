// Chapter: the data. An entity-relationship diagram (same interaction as the
// architecture map) plus a roomy field table for the selected entity.
const CARDINALITY = {
  'has many': ['1', 'N'],
  'has one': ['1', '1'],
  'belongs to': ['N', '1'],
  'many to many': ['N', 'M'],
};

// One edge per pair: "Team has many User" and "User belongs to Team" are the
// same line, so keep the first and drop its mirror.
function relationEdges(models) {
  const names = new Set(models.map((m) => m.name));
  const seen = new Set();
  return models.flatMap((model) => list(model.relations)
    .filter((rel) => names.has(rel.to) && rel.to !== model.name)
    .map((rel) => {
      const key = [model.name, rel.to].sort().join('|');
      if (seen.has(key)) return null;
      seen.add(key);
      const kind = text(rel.kind, 'relates to').toLowerCase();
      return { from: model.name, to: rel.to, kind, ends: CARDINALITY[kind] || ['', ''] };
    })
    .filter(Boolean));
}

// Zig-zag order: start at the most connected entity, then walk neighbours so
// related boxes sit next to each other.
function entityOrder(models, edges) {
  const degree = (name) => edges.filter((e) => e.from === name || e.to === name).length;
  const byDegree = [...models].sort((a, b) => degree(b.name) - degree(a.name));
  const order = [];
  const visit = (model) => {
    if (!model || order.includes(model)) return;
    order.push(model);
    edges.filter((e) => e.from === model.name || e.to === model.name)
      .map((e) => models.find((m) => m.name === (e.from === model.name ? e.to : e.from)))
      .forEach(visit);
  };
  byDegree.forEach(visit);
  return order;
}

// PK: named "id" or noted as primary. FK: explicit `ref`, or "<model>Id" / "<model>_id".
// Ids of outside systems (stripeCustomerId) are not FKs, so no suffix guessing.
function fieldBadges(field, modelNames) {
  const name = text(field.name);
  const lower = name.toLowerCase();
  const isPk = name === 'id' || /\bprimary\b/i.test(text(field.note));
  const named = [...modelNames].find((m) => lower === `${m.toLowerCase()}id` || lower === `${m.toLowerCase()}_id`);
  const fkTarget = modelNames.has(field.ref) ? field.ref : named;
  return { isPk, fkTarget, isFk: Boolean(fkTarget) };
}

function renderModels(data, mount) {
  const models = list(data.dataModel);
  const edges = relationEdges(models);
  const ordered = entityOrder(models, edges);
  const modelNames = new Set(models.map((m) => m.name));
  const svg = s('svg', { class: 'map-edges', 'aria-hidden': 'true' });
  const grid = h('div', { class: 'er-grid', style: `--er-cols:${ordered.length + 1}` },
    ordered.map((model, i) => entityBox(model, i, modelNames, () => select(model.name))));
  const canvas = h('div', { class: 'map-canvas er-canvas', style: `--er-cols:${ordered.length + 1}` }, svg, grid);
  const detail = h('div', { class: 'card er-detail', 'aria-live': 'polite' });
  let selected = ordered[0] ? ordered[0].name : null;

  function select(name) {
    selected = name;
    paint();
    fill(detail, ...modelDetail(models.find((m) => m.name === name)));
  }

  function paint() {
    const related = new Set(edges.filter((e) => e.from === selected || e.to === selected).flatMap((e) => [e.from, e.to]));
    canvas.classList.add('has-selection');
    grid.querySelectorAll('.entity').forEach((el) => {
      el.classList.toggle('is-selected', el.dataset.entity === selected);
      el.classList.toggle('is-related', related.has(el.dataset.entity));
      el.setAttribute('aria-pressed', String(el.dataset.entity === selected));
    });
    svg.querySelectorAll('[data-edge]').forEach((g) => {
      const [from, to] = g.dataset.edge.split('→');
      const active = from === selected || to === selected;
      g.querySelectorAll('path, text').forEach((part) => part.classList.toggle('is-active', active));
    });
  }

  function modelDetail(model) {
    if (!model) return [];
    const rels = edges.filter((e) => e.from === model.name || e.to === model.name);
    return [
      h('div', { class: 'er-detail-head' },
        h('h3', null, icon('db'), model.name),
        model.summary && h('p', null, model.summary)),
      h('div', { class: 'er-fields', role: 'table', 'aria-label': `${model.name} fields` },
        h('div', { class: 'er-row er-row-head', role: 'row' },
          h('span', { role: 'columnheader' }, 'Field'), h('span', { role: 'columnheader' }, 'Type'), h('span', { role: 'columnheader' }, 'Meaning')),
        list(model.fields).map((field) => fieldRow(field, modelNames, select))),
      rels.length > 0 && h('div', { class: 'er-rels' },
        h('div', { class: 'detail-label' }, 'Relationships'),
        h('ul', { class: 'rel' }, rels.map((edge) => {
          const other = edge.from === model.name ? edge.to : edge.from;
          const [a, b] = edge.from === model.name ? edge.ends : [...edge.ends].reverse();
          return h('li', null,
            h('span', { class: 'tag' }, `${a || '?'} : ${b || '?'}`),
            h('span', null, `${model.name} ${edge.from === model.name ? edge.kind : 'is linked from'} `),
            h('button', { class: 'link', type: 'button', onclick: () => select(other) }, other));
        }))),
    ];
  }

  function drawEdges() {
    const box = canvas.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    fill(svg, s('defs', null), edges.map((edge) => relationShape(edge, grid, box)).filter(Boolean));
    paint();
  }

  if (!models.length) return;
  mount.append(h('div', { class: 'map-scroll' }, canvas), detail);
  select(selected);
  const redraw = () => window.requestAnimationFrame(drawEdges);
  new ResizeObserver(redraw).observe(canvas);
  if (document.fonts) document.fonts.ready.then(redraw);
}

function entityBox(model, index, modelNames, onSelect) {
  // Zig-zag: each box spans two tracks and steps one track right, alternating rows.
  const row = index % 2;
  const col = index + 1;
  const keys = list(model.fields).filter((f) => {
    const b = fieldBadges(f, modelNames);
    return b.isPk || b.isFk;
  }).slice(0, 4);
  return h('button', {
    class: 'entity', type: 'button', 'data-entity': model.name, 'aria-pressed': 'false',
    style: `grid-column:${col} / span 2;grid-row:${row + 1}`, onclick: onSelect,
  },
  h('span', { class: 'entity-head' }, icon('db'), h('span', { class: 'entity-name' }, model.name), h('span', { class: 'entity-count' }, `${list(model.fields).length} fields`)),
  keys.length > 0 && h('span', { class: 'entity-keys' }, keys.map((f) => {
    const b = fieldBadges(f, modelNames);
    return h('span', { class: 'entity-key' }, h('span', { class: `key-badge ${b.isPk ? 'is-pk' : 'is-fk'}` }, b.isPk ? 'PK' : 'FK'), f.name);
  })));
}

function fieldRow(field, modelNames, select) {
  const b = fieldBadges(field, modelNames);
  return h('div', { class: 'er-row', role: 'row' },
    h('span', { class: 'er-name', role: 'cell' },
      h('code', null, field.name),
      b.isPk && h('span', { class: 'key-badge is-pk' }, 'PK'),
      b.isFk && h('span', { class: 'key-badge is-fk' }, 'FK'),
      b.fkTarget && h('button', { class: 'link er-fk', type: 'button', onclick: () => select(b.fkTarget) }, `→ ${b.fkTarget}`)),
    h('span', { class: 'er-type', role: 'cell' }, h('code', null, text(field.type, '—'))),
    h('span', { class: 'er-note', role: 'cell' }, text(field.note, '')));
}

function relationShape(edge, grid, box) {
  const fromEl = grid.querySelector(`[data-entity="${CSS.escape(edge.from)}"]`);
  const toEl = grid.querySelector(`[data-entity="${CSS.escape(edge.to)}"]`);
  if (!fromEl || !toEl) return null;
  const a = relativeRect(fromEl, box);
  const b = relativeRect(toEl, box);
  const d = connectorPath(a, b);
  const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const [x1, y1] = nums;
  const [x2, y2] = nums.slice(-2);
  const nudge = (x, y, tx, ty) => {
    const len = Math.hypot(tx - x, ty - y) || 1;
    return { x: x + ((tx - x) / len) * 18 + 8, y: y + ((ty - y) / len) * 18 - 4 };
  };
  const startLabel = nudge(x1, y1, x2, y2);
  const endLabel = nudge(x2, y2, x1, y1);
  return s('g', { 'data-edge': `${edge.from}→${edge.to}` },
    s('path', { class: 'edge', d }),
    s('text', { class: 'er-card', x: startLabel.x, y: startLabel.y, 'text-anchor': 'middle' }, edge.ends[0]),
    s('text', { class: 'er-card', x: endLabel.x, y: endLabel.y, 'text-anchor': 'middle' }, edge.ends[1]),
    s('text', { class: 'edge-label', x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 8, 'text-anchor': 'middle' }, edge.kind));
}
