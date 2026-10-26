// Static chapters: hero, where-things-live tree, glossary, runbook.

// Rough reading time, Brilliant-style: a cue for how long the tour takes.
function tourMinutes(data) {
  const steps = list(data.flows).reduce((n, f) => n + list(f.steps).length, 0);
  const minutes = 2 + steps * 0.35 + list(data.concepts).length * 0.6 + list(data.quiz).length * 0.5 + list(data.changes).length * 0.3;
  return Math.max(3, Math.round(minutes));
}

function renderHero(data, chapters) {
  const meta = data.meta || {};
  const firstChapter = chapters[0];
  const flowChapter = chapters.find((c) => c.key === 'flows');
  const glance = [
    [list(data.nodes).length, 'parts'],
    [list(data.flows).length, list(data.flows).length === 1 ? 'flow' : 'flows'],
    [list(data.changes).length, 'changes'],
    [chapters.length, 'chapters'],
  ];
  return h('section', { class: 'hero', 'aria-labelledby': 'hero-title' },
    h('div', { class: 'hero-copy' },
      h('div', { class: 'hero-eyebrow' },
        h('span', null, text(meta.repo, 'Repository')),
        h('span', { class: 'hero-dot', 'aria-hidden': 'true' }),
        h('span', null, `${tourMinutes(data)} min guided tour`)),
      h('h1', { id: 'hero-title' }, meta.title),
      h('p', { class: 'hero-summary' }, meta.summary),
      h('div', { class: 'btn-row hero-actions' },
        firstChapter && h('a', { class: 'btn btn-primary', href: `#ch-${firstChapter.key}` }, 'Start the tour'),
        flowChapter && h('a', { class: 'btn btn-ghost', href: `#ch-${flowChapter.key}` }, 'Jump to a flow')),
      h('dl', { class: 'hero-glance' }, glance.map(([value, label]) => h('div', null, h('dt', null, label), h('dd', null, String(value))))),
      list(meta.stack).length > 0 && h('div', { class: 'hero-stack' },
        h('span', { class: 'hero-stack-label' }, 'Built with'),
        list(meta.stack).map((item) => h('span', { class: 'chip' }, item)))),
    h('div', { class: 'hero-art' }, heroArt(data)));
}

// The repo's own first flow, drawn as a tidy loop of four stops inside the
// brand blob, with one dot travelling the route. Falls back to the first nodes.
const HERO_SPOTS = [{ x: 64, y: 70 }, { x: 266, y: 70 }, { x: 266, y: 246 }, { x: 64, y: 246 }];
const HERO_BOX = { w: 130, h: 104 };

function heroArt(data) {
  const nodeIndex = byId(data.nodes);
  const flow = list(data.flows)[0];
  const ids = flow ? flowActors(list(flow.steps)) : list(data.nodes).map((n) => n.id);
  const actors = ids.slice(0, 4).map((id) => nodeIndex.get(id)).filter(Boolean);
  const center = (i) => ({ x: HERO_SPOTS[i].x + HERO_BOX.w / 2, y: HERO_SPOTS[i].y + HERO_BOX.h / 2 });
  const route = actors.map((_, i) => `${i ? 'L' : 'M'}${center(i).x},${center(i).y}`).join(' ');
  const svg = s('svg', { viewBox: '0 0 460 420', role: 'img', 'aria-label': flow ? `${flow.title}: ${actors.map((a) => a.label).join(', then ')}` : 'Main parts of the system' });
  svg.append(
    s('circle', { cx: 230, cy: 218, r: 196, fill: '#d7ffb8' }),
    s('circle', { cx: 404, cy: 52, r: 30, fill: '#ffc800' }),
    s('circle', { cx: 42, cy: 372, r: 14, fill: '#1cb0f6' }),
  );
  if (actors.length > 1) {
    svg.append(s('path', { d: route, fill: 'none', stroke: '#ffffff', 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      s('path', { d: route, fill: 'none', stroke: '#1cb0f6', 'stroke-width': 4, 'stroke-dasharray': '1 11', 'stroke-linecap': 'round' }));
  }
  actors.forEach((node, i) => svg.append(heroStop(node, i)));
  if (actors.length > 1 && !reducedMotion()) {
    svg.append(s('circle', { r: 10, fill: '#58cc02', stroke: '#ffffff', 'stroke-width': 4 },
      s('animateMotion', { dur: `${actors.length * 1.4}s`, repeatCount: 'indefinite', path: route, calcMode: 'linear' })));
  }
  if (flow) {
    svg.append(s('text', { class: 'hero-art-caption', x: 230, y: 404, 'text-anchor': 'middle' }, truncate(`▶ ${flow.title}`, 40)));
  }
  return svg;
}

function heroStop(node, index) {
  const { x, y } = HERO_SPOTS[index];
  const label = truncate(node.label, 16);
  return s('g', null,
    s('rect', { x, y: y + 6, width: HERO_BOX.w, height: HERO_BOX.h, rx: 18, fill: '#e5e5e5' }),
    s('rect', { x, y, width: HERO_BOX.w, height: HERO_BOX.h, rx: 18, fill: '#ffffff', stroke: '#e5e5e5', 'stroke-width': 3 }),
    s('circle', { cx: x + 18, cy: y + 18, r: 11, fill: '#58cc02' }),
    s('text', { class: 'hero-art-num', x: x + 18, y: y + 22, 'text-anchor': 'middle' }, String(index + 1)),
    icon(node.kind, { x: x + HERO_BOX.w / 2 - 22, y: y + 14, width: 44, height: 44 }),
    s('text', { class: 'hero-art-label', x: x + HERO_BOX.w / 2, y: y + 84, 'text-anchor': 'middle' }, label, s('title', null, node.label)));
}

function renderTree(data, mount) {
  const entries = list(data.tree);
  mount.append(h('div', { class: 'card', style: 'padding:0' }, h('ul', { class: 'tree' }, entries.map((entry) => {
    const depth = String(entry.path).replace(/\/$/, '').split('/').length - 1;
    const isDir = String(entry.path).endsWith('/');
    return h('li', { class: entry.key ? 'is-key' : '' },
      h('span', { class: 'path', style: `padding-left:${Math.min(depth, 4) * 18}px` }, icon(isDir ? 'folder' : 'file'), h('span', { class: 'path-text' }, breakablePath(entry.path))),
      h('span', { class: 'note' }, text(entry.note)));
  }))));
}

function renderGlossary(data, mount) {
  const terms = list(data.glossary);
  const input = h('input', { class: 'search', type: 'search', placeholder: 'Search terms…', 'aria-label': 'Search glossary' });
  const items = terms.map((term) => ({ term, el: h('div', null, h('dt', null, term.term), h('dd', null, term.definition)) }));
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    items.forEach(({ term, el }) => {
      el.hidden = Boolean(q) && !`${term.term} ${term.definition}`.toLowerCase().includes(q);
    });
  });
  mount.append(h('div', { class: 'lesson' }, input, h('dl', { class: 'glossary' }, items.map((item) => item.el))));
}

function renderRunbook(data, mount) {
  mount.append(h('div', { class: 'lesson runbook' }, list(data.runbook).map((item) => {
    const copy = h('button', { class: 'btn btn-ghost btn-sm', type: 'button' }, 'Copy');
    copy.addEventListener('click', () => {
      navigator.clipboard.writeText(item.command)
        .then(() => { copy.textContent = 'Copied'; })
        .catch(() => { copy.textContent = 'Select & copy'; });
    });
    return h('article', { class: 'card' },
      h('div', { class: 'code-head', style: 'margin-top:0' }, h('h3', null, item.label), item.command && copy),
      item.note && h('p', null, item.note),
      item.command && codeBlock(item.command, 'sh'));
  })));
}
