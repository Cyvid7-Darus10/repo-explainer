// Chapter: end-to-end flow player. A sequence diagram you step through one
// hop at a time, Brilliant-style: one idea per screen, a big Continue button.
const SEQ = { minCol: 130, maxCol: 220, head: 70, top: 40, row: 58, pad: 20 };
const DASHED_KINDS = new Set(['response', 'async']);

function renderFlows(data, mount) {
  const flows = list(data.flows);
  if (!flows.length) {
    mount.append(h('p', { class: 'empty' }, 'No flows traced yet.'));
    return;
  }
  const nodeIndex = byId(data.nodes);
  let state = { flowIndex: 0, stepIndex: 0, finished: false, direction: 1 };

  const tabs = h('div', { class: 'flow-tabs', role: 'tablist', 'aria-label': 'Flows' });
  const meta = h('div', { class: 'flow-meta' });
  const headsWrap = h('div', { class: 'seq-heads-wrap' });
  const bodyWrap = h('div', { class: 'seq-body' });
  const seqWrap = h('div', { class: 'seq-wrap seq', 'aria-label': 'Sequence diagram' }, headsWrap, bodyWrap);
  // The body scrolls sideways only; the sticky header strip follows it.
  bodyWrap.addEventListener('scroll', () => {
    if (headsWrap.firstElementChild) headsWrap.firstElementChild.style.transform = `translateX(${-bodyWrap.scrollLeft}px)`;
  }, { passive: true });
  const panel = h('div', { class: 'card step-card', 'aria-live': 'polite' });
  const root = h('div', { class: 'flow-player' }, tabs, meta, h('div', { class: 'flow-layout' }, seqWrap, panel));
  let lastWidth = 0;
  new ResizeObserver(() => {
    if (Math.abs(seqWrap.clientWidth - lastWidth) > 24) { lastWidth = seqWrap.clientWidth; render(); }
  }).observe(seqWrap);

  function setState(next) {
    state = { ...state, ...next };
    render({ animate: true });
  }

  function go(stepIndex) {
    const steps = list(flows[state.flowIndex].steps);
    if (stepIndex >= steps.length) return setState({ finished: true, direction: 1 });
    return setState({ stepIndex: Math.max(0, stepIndex), finished: false, direction: stepIndex >= state.stepIndex ? 1 : -1 });
  }

  function render({ animate = false } = {}) {
    const flow = flows[state.flowIndex];
    fill(tabs, ...flows.map((f, i) => h('button', {
      class: 'chip flow-tab', type: 'button', role: 'tab', 'aria-selected': String(i === state.flowIndex),
      onclick: () => setState({ flowIndex: i, stepIndex: 0, finished: false }),
    }, `${i + 1}. ${f.title}`)));
    fill(meta,
      flow.trigger && h('span', { class: 'chip' }, '⚡ ', flow.trigger),
      h('span', { class: 'chip' }, `${list(flow.steps).length} steps`),
      flow.summary && h('p', { style: 'flex-basis:100%' }, flow.summary),
    );
    const diagram = sequenceDiagram(flow, nodeIndex, state.finished ? list(flow.steps).length : state.stepIndex, go, bodyWrap.clientWidth);
    fill(headsWrap, diagram.heads);
    fill(bodyWrap, diagram.body);
    centerCurrentStep(bodyWrap, animate);
    fill(panel, ...(state.finished ? finishedPanel(flow) : stepPanel(flow)));
    const current = diagram.body.querySelector('.seq-step.is-current .arrow');
    if (current) {
      const marker = current.dataset.marker;
      if (animate) drawPath(current, marker); else current.setAttribute('marker-end', marker);
    }
    if (animate) slideIn(panel.firstElementChild, state.direction);
    if (animate && !state.finished) revealCurrentStep(diagram.body);
    if (animate && state.finished) pop(panel.querySelector('.trophy'));
  }

  function stepPanel(flow) {
    const steps = list(flow.steps);
    const step = steps[state.stepIndex];
    const from = nodeIndex.get(step.from);
    const to = nodeIndex.get(step.to);
    const last = state.stepIndex === steps.length - 1;
    return [h('div', { class: 'step-body' }, h('div', { class: 'step-text' },
      h('div', { class: 'step-top' },
        h('span', { class: 'step-count' }, `Step ${state.stepIndex + 1} of ${steps.length}`),
        step.kind && h('span', { class: `tag tag-${step.kind}` }, step.kind)),
      h('div', { class: 'step-route' },
        from && icon(from.kind), text(from && from.label, step.from),
        h('span', { class: 'arrow-glyph', 'aria-hidden': 'true' }, step.from === step.to ? '↺' : '→'),
        step.from !== step.to && [to && icon(to.kind), text(to && to.label, step.to)]),
      h('h3', null, step.label),
      step.detail && h('p', null, step.detail),
      step.why && h('div', { class: 'callout' }, h('b', null, 'Why it works this way'), step.why)),
      (step.file || step.code) && h('div', { class: 'step-code' },
        step.file && h('div', { class: 'code-head', style: 'margin-top:0' }, fileChip(step.file)),
        step.code && codeBlock(step.code, step.lang))),
      h('div', { class: 'step-controls' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: state.stepIndex === 0, onclick: () => go(state.stepIndex - 1) }, 'Back'),
        stepDots(steps.length, state.stepIndex, go),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => go(state.stepIndex + 1) }, last ? 'Finish' : 'Continue')),
      h('p', { class: 'kbd-hint' }, 'Tip: use ', h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' to step through.'),
    ];
  }

  function finishedPanel(flow) {
    const steps = list(flow.steps);
    const actors = new Set(steps.flatMap((st) => [st.from, st.to]));
    const nextIndex = state.flowIndex + 1;
    return [h('div', { class: 'flow-done' },
      icon('trophy', { class: 'trophy' }),
      h('h3', null, 'Flow complete!'),
      h('p', null, `You followed “${flow.title}” through ${steps.length} steps and ${actors.size} parts of the system.`),
      h('div', { class: 'btn-row', style: 'justify-content:center' },
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => go(0) }, 'Replay'),
        nextIndex < flows.length && h('button', { class: 'btn btn-primary', type: 'button', onclick: () => setState({ flowIndex: nextIndex, stepIndex: 0, finished: false }) }, 'Next flow')))];
  }

  root.addEventListener('keydown', (event) => {
    if (event.target.closest('input, textarea')) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); go(state.stepIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(state.finished ? state.stepIndex : state.stepIndex - 1); }
  });

  on('open-flow', ({ flowId }) => {
    const index = flows.findIndex((f) => f.id === flowId);
    if (index < 0) return;
    setState({ flowIndex: index, stepIndex: 0, finished: false });
    root.scrollIntoView({ block: 'start' });
  });

  render();
  mount.append(root);
}

function stepDots(count, current, go) {
  if (count > 14) return h('span', { class: 'step-count' }, `${current + 1} / ${count}`);
  return h('div', { class: 'step-dots' }, Array.from({ length: count }, (_, i) => h('button', {
    type: 'button', class: i === current ? 'is-current' : i < current ? 'is-done' : '', 'aria-label': `Go to step ${i + 1}`, onclick: () => go(i),
  })));
}

function flowActors(steps) {
  return [...new Set(steps.flatMap((step) => [step.from, step.to]))];
}

// Two SVGs share one scroll box: a sticky strip of actor heads and the steps.
function sequenceDiagram(flow, nodeIndex, currentIndex, go, available) {
  const steps = list(flow.steps);
  const actors = flowActors(steps);
  const fit = ((available || 0) - SEQ.pad * 2) / Math.max(actors.length, 1);
  const col = Math.min(SEQ.maxCol, Math.max(SEQ.minCol, fit));
  const width = SEQ.pad * 2 + actors.length * col;
  const height = SEQ.top + steps.length * SEQ.row;
  const xOf = (id) => SEQ.pad + actors.indexOf(id) * col + col / 2;
  const headW = Math.min(col - 16, 170);
  const chars = Math.floor((headW - 52) / 7.5);
  const heads = s('svg', { class: 'seq-heads', viewBox: `0 0 ${width} ${SEQ.head}`, width, height: SEQ.head, 'aria-hidden': 'true' });
  const body = s('svg', { viewBox: `0 0 ${width} ${height}`, width, height, role: 'img', 'aria-label': `${flow.title}: ${steps.length} steps` });

  actors.forEach((id) => {
    const node = nodeIndex.get(id);
    const x = xOf(id);
    heads.append(
      s('rect', { x: x - headW / 2, y: 14, width: headW, height: 50, rx: 12, fill: '#e5e5e5' }),
      s('rect', { x: x - headW / 2, y: 10, width: headW, height: 50, rx: 12, fill: '#fff', stroke: '#e5e5e5', 'stroke-width': 2 }),
      icon(node ? node.kind : 'service', { x: x - headW / 2 + 10, y: 21, width: 28, height: 28 }),
      s('text', { class: 'seq-head-label', x: x - headW / 2 + 44, y: 40 }, truncate(node ? node.label : id, chars), s('title', null, node ? node.label : id)),
    );
    body.append(s('line', { class: 'seq-lifeline', x1: x, x2: x, y1: 0, y2: height }));
  });

  steps.forEach((step, i) => body.append(sequenceStep(step, i, currentIndex, xOf, width, go, col)));
  return { heads, body };
}

function sequenceStep(step, i, currentIndex, xOf, width, go, col) {
  const y = SEQ.top + i * SEQ.row;
  const status = i < currentIndex ? 'is-done' : i === currentIndex ? 'is-current' : 'is-todo';
  const x1 = xOf(step.from);
  const x2 = xOf(step.to);
  const self = step.from === step.to;
  const dir = x2 >= x1 ? 1 : -1;
  const d = self
    ? `M${x1},${y} h44 v18 h-40`
    : `M${x1 + dir * 12},${y} L${x2 - dir * 8},${y}`;
  const labelX = self ? x1 + 52 : (x1 + x2) / 2;
  const group = s('g', {
    class: `seq-step ${status}${DASHED_KINDS.has(step.kind) ? ' is-dashed' : ''}`,
    role: 'button', tabindex: '0', 'aria-label': `Step ${i + 1}: ${step.label}`,
    onclick: () => go(i),
    onkeydown: (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(i); } },
  },
  s('rect', { class: 'hit', x: 4, y: y - 30, width: width - 8, height: SEQ.row - 4, rx: 10 }),
  s('path', status === 'is-current'
    ? { class: 'arrow', d, 'data-marker': `url(#seq-arrow-${status})` }
    : { class: 'arrow', d, 'marker-end': `url(#seq-arrow-${status})` }),
  s('circle', { class: 'badge-bg', cx: x1, cy: y, r: 11 }),
  s('text', { class: 'badge-num', x: x1, y: y + 4, 'text-anchor': 'middle' }, String(i + 1)),
  s('text', { class: 'label', x: labelX, y: y - 10, 'text-anchor': self ? 'start' : 'middle' },
    truncate(step.label, Math.max(14, Math.floor(((self ? col : Math.abs(x2 - x1)) - 16) / 6.6))), s('title', null, step.label)));

  if (i === 0) group.prepend(seqMarkers());
  if (status === 'is-current' && !reducedMotion()) {
    // One pass along the arrow after it draws, then fade — no endless loop.
    group.append(s('circle', { class: 'seq-dot', r: 6, opacity: 0 },
      s('set', { attributeName: 'opacity', to: 1, begin: '0.3s' }),
      s('animateMotion', { dur: '0.6s', begin: '0.3s', fill: 'freeze', path: d, calcMode: 'spline', keyTimes: '0;1', keySplines: '0.4 0 0.2 1' }),
      s('animate', { attributeName: 'opacity', from: 1, to: 0, begin: '0.9s', dur: '0.3s', fill: 'freeze' })));
  }
  return group;
}

function seqMarkers() {
  const marker = (status, color) => s('marker', { id: `seq-arrow-${status}`, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 11, markerHeight: 11, markerUnits: 'userSpaceOnUse', orient: 'auto' },
    s('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }));
  return s('defs', null, marker('is-done', '#777777'), marker('is-current', '#58cc02'), marker('is-todo', '#e5e5e5'));
}

// Only on reader actions: bring the active hop into view without fighting
// the page's own scrolling.
function centerCurrentStep(bodyWrap, animate) {
  const badge = bodyWrap.querySelector('.seq-step.is-current .badge-bg');
  if (!badge) return;
  const left = Number(badge.getAttribute('cx')) - bodyWrap.clientWidth / 3;
  bodyWrap.scrollTo({ left: Math.max(0, left), behavior: animate && !reducedMotion() ? 'smooth' : 'auto' });
}

function revealCurrentStep(diagram) {
  const current = diagram.querySelector('.seq-step.is-current');
  if (!current) return;
  const box = current.getBoundingClientRect();
  const headerBottom = 200;
  if (box.top < headerBottom || box.bottom > window.innerHeight - 24) {
    current.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }
}
