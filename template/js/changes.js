// Chapter: what changed and why. Built for repos where many humans and
// agents merge every day — each change carries its reason and the parts of
// the system it touched, so readers can re-sync their mental model fast.
const AUTHOR_FILTERS = [
  { id: 'all', label: 'Everyone' },
  { id: 'agent', label: 'Agents' },
  { id: 'human', label: 'Humans' },
];

function renderChanges(data, mount) {
  const changes = [...list(data.changes)].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!changes.length) {
    mount.append(h('p', { class: 'empty' }, 'No recent changes recorded.'));
    return;
  }
  const nodeIndex = byId(data.nodes);
  let state = { author: 'all', kind: 'all', onMap: false };

  const kinds = ['all', ...new Set(changes.map((c) => c.kind).filter(Boolean))];
  const toolbar = h('div', { class: 'changes-toolbar' });
  const timeline = h('ol', { class: 'timeline' });

  function setState(next) {
    state = { ...state, ...next };
    render();
    [...timeline.children].slice(0, 8).forEach((item, i) => riseIn(item, i * 35));
  }

  function visible() {
    return changes.filter((c) => (state.author === 'all' || c.authorType === state.author)
      && (state.kind === 'all' || c.kind === state.kind));
  }

  function render() {
    fill(toolbar,
      h('div', { class: 'filter-group', role: 'group', 'aria-label': 'Filter by author' },
        AUTHOR_FILTERS.map((f) => filterChip(f.label, state.author === f.id, () => setState({ author: f.id })))),
      kinds.length > 2 && h('div', { class: 'filter-group', role: 'group', 'aria-label': 'Filter by type' },
        kinds.map((k) => filterChip(k === 'all' ? 'All types' : k, state.kind === k, () => setState({ kind: k })))),
      h('button', {
        class: `btn btn-sm ${state.onMap ? 'btn-blue' : 'btn-ghost'}`, type: 'button', 'aria-pressed': String(state.onMap),
        onclick: () => { emit('highlight-changes', { enabled: !state.onMap }); setState({ onMap: !state.onMap }); },
      }, state.onMap ? 'Hide on map' : 'Show on map'),
    );
    const items = visible();
    fill(timeline, ...(items.length
      ? items.map((change) => changeItem(change, nodeIndex))
      : [h('li', { class: 'empty' }, 'Nothing matches these filters.')]));
  }

  render();
  mount.append(changeStats(changes), toolbar, timeline);
}

function filterChip(label, pressed, onclick) {
  return h('button', { class: 'chip', type: 'button', 'aria-pressed': String(pressed), onclick }, label);
}

function changeStats(changes) {
  const agents = changes.filter((c) => c.authorType === 'agent').length;
  const touched = new Set(changes.flatMap((c) => list(c.nodes))).size;
  const stat = (value, label) => h('div', { class: 'stat' }, h('b', null, String(value)), h('span', null, label));
  return h('div', { class: 'changes-stats' },
    stat(changes.length, 'changes'),
    stat(agents, 'by agents'),
    stat(changes.length - agents, 'by humans'),
    stat(touched, 'parts touched'));
}

function changeItem(change, nodeIndex) {
  const isAgent = change.authorType === 'agent';
  return h('li', { class: `change ${isAgent ? 'is-agent' : 'is-human'}` },
    h('div', { class: 'change-dot', 'aria-hidden': 'true' }, icon(isAgent ? 'robot' : 'user')),
    h('article', { class: 'card change-card' },
      h('div', { class: 'change-top' },
        h('span', null, formatDate(change.date)),
        change.ref && (safeUrl(change.url)
          ? h('a', { class: 'link', href: safeUrl(change.url), target: '_blank', rel: 'noopener noreferrer' }, change.ref)
          : h('span', null, change.ref)),
        h('span', { class: `tag ${isAgent ? 'tag-agent' : 'tag-human'}` }, isAgent ? 'agent' : 'human'),
        change.author && h('span', null, change.author),
        change.kind && h('span', { class: 'tag' }, change.kind)),
      h('h3', null, change.title),
      change.what && h('p', null, change.what),
      change.why && h('div', { class: 'change-why' }, h('b', null, 'Why'), change.why),
      change.risk && h('p', { class: 'change-risk' }, '⚠ ', change.risk),
      list(change.nodes).length > 0 && h('div', { class: 'change-nodes' }, list(change.nodes).map((id) => {
        const node = nodeIndex.get(id);
        return h('span', { class: 'chip' }, node ? node.label : id);
      })),
      list(change.files).length > 0 && h('div', { class: 'change-nodes' }, list(change.files).slice(0, 6).map(fileChip))));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value, 'undated');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
