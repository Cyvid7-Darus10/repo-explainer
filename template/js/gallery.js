// The kit page: every reusable piece, rendered by the same code the explainer
// uses. Agents look things up here instead of drawing their own.
function gallerySection(title, lead, ...children) {
  return h('section', { class: 'chapter' },
    h('header', { class: 'chapter-head' }, h('h2', null, title), h('p', { class: 'chapter-lead' }, lead)),
    children);
}

function swatch(name, value, note) {
  return h('div', { class: 'card kit-swatch' },
    h('div', { class: 'kit-chip', style: `background:${value}` }),
    h('b', null, name), h('code', null, value), note && h('p', null, note));
}

function bootGallery() {
  const data = JSON.parse(document.getElementById('explainer-data').textContent);
  const kinds = list(data.kinds);
  const patterns = list(data.patterns);
  const app = document.getElementById('app');
  const main = h('main', { id: 'main', class: 'wrap' },
    h('section', { class: 'hero' },
      h('div', null,
        h('div', { class: 'hero-eyebrow' }, 'Design kit · v', String(data.version || '')),
        h('h1', null, 'Repo Explainer kit'),
        h('p', { class: 'hero-summary' }, 'Everything an explainer is made of. Reuse these by name in your data file. Never redraw, recolor or restyle them.'),
        h('p', { class: 'kit-credit' }, 'Design credit: the palette, type scale and pressable-button style follow Duolingo’s design language (color names such as Ecto Green and Macaw Blue are theirs). The one-idea-per-step lesson flow is inspired by Brilliant. This project is not affiliated with or endorsed by Duolingo or Brilliant.')),
      h('div', { class: 'hero-art' }, h('div', { class: 'kit-logo' }, brandMark()))),

    gallerySection('Icons', 'Set a node’s "kind" to one of these names. Unknown kinds fall back to "service".',
      h('div', { class: 'kit-grid' }, [...kinds, 'robot', 'trophy', 'folder', 'file'].map((kind) => h('div', { class: 'card kit-icon' },
        icon(kind), h('code', null, kind), kinds.includes(kind) ? null : h('span', { class: 'tag' }, 'ui only'))))),

    gallerySection('Layer colors', 'Set a layer’s "color" to one of these names. Each layer gets its own; reuse only when you have more than six layers.',
      h('div', { class: 'kit-grid kit-grid-wide' }, Object.entries(PALETTE).map(([name, colors]) => h('div', { class: 'card kit-layer', style: `--layer:${colors.ink};--layer-wash:${colors.wash};--layer-ink:${colors.text}` },
        h('span', { class: 'map-col-head' }, name),
        h('button', { class: 'node', type: 'button', style: `border-color:${colors.ink};background:${colors.wash}` }, icon('service'), h('span', { class: 'node-text' }, h('span', { class: 'node-label' }, 'Selected node'), h('span', { class: 'node-tech' }, colors.ink))))))),

    gallerySection('Brand palette', 'Fixed. These are tokens in styles.css. Explainers never add other colors.',
      h('div', { class: 'kit-grid kit-grid-wide' },
        swatch('Ecto Green', '#58cc02', 'Primary actions, display headings'),
        swatch('Eel Light', '#d7ffb8', 'Correct answers, callout wash'),
        swatch('Lingot Lime', '#a5ed6e', 'Outlines only, never a fill'),
        swatch('Macaw Blue', '#1cb0f6', 'Secondary actions, links, focus'),
        swatch('Eel Dark Blue', '#042c60', 'Headings'),
        swatch('Midnight', '#000437', 'Code blocks'),
        swatch('Charcoal', '#4b4b4b', 'Body text'),
        swatch('Swan', '#e5e5e5', 'Borders, inactive'),
        swatch('Bee', '#ffc800', 'Illustrations, human authors'),
        swatch('Cardinal', '#ff4b4b', 'Wrong answers only'))),

    gallerySection('Components', 'All of these come from the data file. Pressable things use a thick bottom border, never a shadow.',
      h('div', { class: 'card kit-stack' },
        h('div', { class: 'btn-row' },
          h('button', { class: 'btn btn-primary', type: 'button' }, 'Continue'),
          h('button', { class: 'btn btn-ghost', type: 'button' }, 'Back'),
          h('button', { class: 'btn btn-blue btn-sm', type: 'button' }, 'Show on map'),
          h('button', { class: 'btn btn-primary', type: 'button', disabled: true }, 'Check')),
        h('div', { class: 'btn-row' },
          h('span', { class: 'chip' }, 'Next.js'), fileChip('src/app/api/route.ts:42'),
          ['request', 'response', 'async', 'data', 'agent', 'human', 'new'].map((k) => h('span', { class: `tag tag-${k}` }, k))),
        h('div', { class: 'callout' }, h('b', null, 'Why it works this way'), 'Callouts hold the reason behind a step: the part a reader cannot get from the code.'),
        codeBlock("// code blocks use a tiny safe highlighter\nconst task = await tasks.create(userId, input)\nreturn Response.json(task, { status: 201 })", 'ts'),
        h('div', { class: 'options' },
          h('button', { class: 'option', type: 'button' }, h('span', { class: 'key' }, '1'), 'Unanswered option'),
          h('button', { class: 'option', type: 'button', 'aria-checked': 'true' }, h('span', { class: 'key' }, '2'), 'Selected option'),
          h('button', { class: 'option is-correct', type: 'button' }, h('span', { class: 'key' }, '3'), 'Correct'),
          h('button', { class: 'option is-wrong', type: 'button' }, h('span', { class: 'key' }, '4'), 'Wrong')))),

    gallerySection('Flow patterns', 'Starting points for flows. Run `repo-explainer patterns <id>`, copy the steps, rename roles to your node ids, add file:line to every step.',
      h('div', { class: 'kit-grid kit-grid-wide' }, patterns.map((pattern) => h('article', { class: 'card kit-pattern' },
        h('code', null, pattern.id), h('h3', null, pattern.name), h('p', null, pattern.use),
        h('div', { class: 'step-route' }, list(pattern.roles).map((role, i) => [i > 0 && h('span', { class: 'arrow-glyph' }, '→'), h('span', { class: 'chip' }, role)])))))),
  );
  fill(app, main);
  app.removeAttribute('aria-busy');
}
