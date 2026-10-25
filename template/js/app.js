// Boot: read the embedded data, decide which chapters exist, render the page.
const DESIGN_CREDIT = 'Visual design language inspired by Duolingo; lesson format inspired by Brilliant. Not affiliated with either.';
const CHAPTERS = [
  { key: 'map', title: 'The big picture', lead: 'Every box is one part of the system. Tap one to see what it does and who it talks to.', has: (d) => list(d.nodes).length > 0, render: renderMap },
  { key: 'flows', title: 'Follow it end to end', lead: 'Pick a flow and press Continue. Each step is one hop, with the exact file that does the work.', has: (d) => list(d.flows).length > 0, render: renderFlows },
  { key: 'changes', title: 'What changed, and why', lead: 'Recent merges from people and agents, each with its reason. Use “Show on map” to see which parts moved.', has: (d) => list(d.changes).length > 0, render: renderChanges },
  { key: 'tree', title: 'Where things live', lead: 'The folders worth knowing. Starred ones are where most changes happen.', has: (d) => list(d.tree).length > 0, render: renderTree },
  { key: 'data', title: 'The data', lead: 'What the system stores and how the pieces relate.', has: (d) => list(d.dataModel).length > 0, render: renderModels },
  { key: 'concepts', title: 'Key ideas', lead: 'The few patterns you need to read this code with confidence. One idea at a time.', has: (d) => list(d.concepts).length > 0, render: renderConcepts },
  { key: 'quiz', title: 'Check yourself', lead: 'A few quick questions. If you can answer these, you can find your way around.', has: (d) => list(d.quiz).length > 0, render: renderQuiz },
  { key: 'glossary', title: 'Glossary', lead: 'Words this codebase uses in its own way.', has: (d) => list(d.glossary).length > 0, render: renderGlossary },
  { key: 'run', title: 'Run it yourself', lead: 'Commands to get it running on your machine.', has: (d) => list(d.runbook).length > 0, render: renderRunbook },
];

function chooseChapters(data) {
  const requested = list(data.meta && data.meta.chapters);
  const order = requested.length ? requested : CHAPTERS.map((c) => c.key);
  return order
    .map((key) => CHAPTERS.find((c) => c.key === key))
    .filter((chapter) => chapter && chapter.has(data));
}

function chapterSection(chapter, index, chapters, data) {
  const intro = (data.intros || {})[chapter.key];
  const body = h('div', { class: 'chapter-body' });
  const next = chapters[index + 1];
  const section = h('section', { class: 'chapter', id: `ch-${chapter.key}`, 'aria-labelledby': `ch-${chapter.key}-title` },
    h('header', { class: 'chapter-head' },
      h('div', { class: 'chapter-eyebrow' }, h('span', { class: 'num' }, String(index + 1)), `Chapter ${index + 1} of ${chapters.length}`),
      h('h2', { id: `ch-${chapter.key}-title` }, text(intro && intro.title, chapter.title)),
      h('p', { class: 'chapter-lead' }, text(intro && intro.lead, chapter.lead))),
    body,
    next && h('div', { class: 'chapter-next' }, h('a', { class: 'btn btn-primary', href: `#ch-${next.key}` }, `Continue: ${next.title}`)));
  try {
    chapter.render(data, body);
  } catch (error) {
    body.append(h('p', { class: 'empty' }, `This chapter could not be drawn: ${error.message}`));
  }
  return section;
}

function siteHeader(chapters) {
  const progressFill = h('div', { class: 'lesson-progress-fill' });
  const pills = chapters.map((chapter, i) => h('a', { class: 'chapter-pill', href: `#ch-${chapter.key}`, 'data-key': chapter.key },
    h('span', { class: 'num' }, String(i + 1)), chapter.title));
  const header = h('header', { class: 'site-header' },
    h('div', { class: 'site-header-inner' },
      h('a', { class: 'brand', href: '#main' }, brandMark(), h('span', { class: 'brand-text' }, 'Repo Explainer')),
      h('div', { class: 'lesson-progress', role: 'progressbar', 'aria-label': 'Tour progress', 'aria-valuemin': '0', 'aria-valuemax': '100' }, progressFill)),
    h('nav', { class: 'chapter-nav', 'aria-label': 'Chapters' }, pills));
  return { header, progressFill, pills };
}

function trackProgress(progressFill, pills) {
  const bar = progressFill.parentElement;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 100;
    progressFill.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(pct));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();

  const observer = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((entry) => {
      const key = entry.target.id.replace('ch-', '');
      const activeIndex = pills.findIndex((p) => p.dataset.key === key);
      pills.forEach((pill, i) => {
        pill.classList.toggle('is-active', i === activeIndex);
        pill.classList.toggle('is-done', i < activeIndex);
      });
      // Scroll only the nav strip sideways; scrollIntoView would also nudge
      // the page and cancel the reader's scroll momentum.
      const pill = pills[activeIndex];
      if (pill) {
        const nav = pill.parentElement;
        nav.scrollTo({ left: pill.offsetLeft - nav.clientWidth / 2 + pill.offsetWidth / 2, behavior: 'smooth' });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('.chapter').forEach((el) => observer.observe(el));
}

function fatal(app, message) {
  fill(app, h('div', { class: 'fatal', role: 'alert' }, h('h1', null, 'This explainer could not load'), h('p', null, message)));
}

function boot() {
  const app = document.getElementById('app');
  let data;
  try {
    data = JSON.parse(document.getElementById('explainer-data').textContent);
  } catch (error) {
    fatal(app, `The embedded data is not valid JSON (${error.message}). Rebuild with scripts/build.mjs.`);
    return;
  }
  if (!data || !data.meta || !data.meta.title) {
    fatal(app, 'The embedded data has no meta.title. Run scripts/validate.mjs to see what is missing.');
    return;
  }
  const chapters = chooseChapters(data);
  const { header, progressFill, pills } = siteHeader(chapters);
  const main = h('main', { id: 'main', tabindex: '-1' },
    h('div', { class: 'wrap' }, renderHero(data, chapters), chapters.map((c, i) => chapterSection(c, i, chapters, data))));
  const meta = data.meta;
  const footer = h('footer', { class: 'site-footer' },
    h('p', null, `Generated ${meta.generatedAt ? `on ${formatDate(meta.generatedAt)} ` : ''}${meta.commit ? `at ${String(meta.commit).slice(0, 7)} ` : ''}with repo-explainer.`),
    h('p', null, DESIGN_CREDIT));
  fill(app, header, main, footer);
  app.removeAttribute('aria-busy');
  trackProgress(progressFill, pills);
  revealOnScroll();
}

// Chapters rise in once as they enter the viewport. Content is never hidden
// unless the observer exists and motion is allowed.
function revealOnScroll() {
  if (reducedMotion() || !('IntersectionObserver' in window)) return;
  const targets = [...document.querySelectorAll('.chapter-head')];
  const observer = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((entry) => {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -4% 0px' });
  targets.forEach((el) => {
    el.classList.add('reveal');
    observer.observe(el);
  });
}

