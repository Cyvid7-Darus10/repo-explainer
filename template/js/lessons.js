// Chapters: key concepts (one idea per card) and check-yourself quiz.
function renderConcepts(data, mount) {
  const concepts = list(data.concepts);
  if (!concepts.length) return;
  let index = 0;
  const card = h('article', { class: 'card concept-card', 'aria-live': 'polite' });
  const controls = h('div', { class: 'carousel-controls' });

  function go(next) {
    const target = Math.min(Math.max(next, 0), concepts.length - 1);
    const direction = target >= index ? 1 : -1;
    index = target;
    render();
    slideIn(card, direction);
  }

  function render() {
    const concept = concepts[index];
    fill(card,
      h('span', { class: 'step-count' }, `Idea ${index + 1} of ${concepts.length}`),
      h('h3', null, concept.title),
      h('p', null, concept.body),
      concept.analogy && h('div', { class: 'callout' }, h('b', null, 'Think of it like'), concept.analogy),
      concept.file && h('div', { class: 'code-head' }, fileChip(concept.file)),
      concept.code && codeBlock(concept.code, concept.lang),
    );
    fill(controls,
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', disabled: index === 0, onclick: () => go(index - 1) }, 'Back'),
      stepDots(concepts.length, index, go),
      h('button', { class: 'btn btn-primary', type: 'button', disabled: index === concepts.length - 1, onclick: () => go(index + 1) }, 'Continue'),
    );
  }

  render();
  mount.append(h('div', { class: 'lesson' }, card, controls));
}

function renderQuiz(data, mount) {
  const questions = list(data.quiz);
  if (!questions.length) return;
  let results = {};
  const bar = h('div');
  const label = h('b');
  const score = h('div', { class: 'score card' }, label, h('div', { class: 'score-bar' }, bar));

  function record(index, correct) {
    results = { ...results, [index]: correct };
    const right = Object.values(results).filter(Boolean).length;
    const answered = Object.keys(results).length;
    label.textContent = `${right} / ${questions.length} correct`;
    bar.style.width = `${(right / questions.length) * 100}%`;
    if (answered === questions.length) label.textContent += right === questions.length ? ' · Perfect!' : ' · Nice work';
  }

  label.textContent = `0 / ${questions.length} correct`;
  bar.style.width = '0%';
  mount.append(h('div', { class: 'lesson quiz' }, questions.map((q, i) => questionCard(q, i, record)), score));
}

function questionCard(question, index, record) {
  const options = list(question.options);
  let picked = null;
  const optionEls = options.map((option, i) => h('button', {
    class: 'option', type: 'button', role: 'radio', 'aria-checked': 'false',
    onclick: () => pick(i),
  }, h('span', { class: 'key' }, String(i + 1)), option));
  const check = h('button', { class: 'btn btn-primary', type: 'button', disabled: true, onclick: grade }, 'Check');
  const feedback = h('div', { 'aria-live': 'polite' });

  function pick(i) {
    picked = i;
    optionEls.forEach((el, j) => el.setAttribute('aria-checked', String(j === i)));
    check.disabled = false;
  }

  function grade() {
    const correct = picked === question.answer;
    optionEls.forEach((el, j) => {
      el.disabled = true;
      el.classList.toggle('is-correct', j === question.answer);
      el.classList.toggle('is-wrong', j === picked && !correct);
    });
    check.remove();
    const pickedEl = optionEls[picked];
    if (correct) pop(pickedEl); else shake(pickedEl);
    fill(feedback, h('div', { class: `feedback ${correct ? 'is-correct' : 'is-wrong'}` },
      h('b', null, correct ? 'Correct!' : 'Not quite'),
      text(question.explain, correct ? 'You got it.' : `The answer is “${options[question.answer]}”.`)));
    riseIn(feedback.firstElementChild);
    record(index, correct);
  }

  return h('article', { class: 'card question' },
    h('span', { class: 'step-count' }, `Question ${index + 1}`),
    h('h3', null, question.question),
    h('div', { class: 'options', role: 'radiogroup', 'aria-label': question.question }, optionEls),
    feedback,
    h('div', { class: 'question-actions' }, check));
}
