// DOM helpers. Every string from the data file goes through text nodes or
// setAttribute — never innerHTML — so repo content cannot inject markup.
const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(el, attrs) {
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([name, v]) => { el.dataset[name] = v; });
    } else {
      el.setAttribute(key === 'className' ? 'class' : key, value === true ? '' : String(value));
    }
  });
  return el;
}

function appendChildren(el, children) {
  children.flat(Infinity).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return el;
}

// replaceChildren() would stringify skipped (undefined/false) slots.
function fill(el, ...children) {
  el.replaceChildren();
  return appendChildren(el, children);
}

function h(tag, attrs, ...children) {
  return appendChildren(applyAttrs(document.createElement(tag), attrs), children);
}

function s(tag, attrs, ...children) {
  return appendChildren(applyAttrs(document.createElementNS(SVG_NS, tag), attrs), children);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function truncate(value, max) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function byId(items) {
  return new Map(list(items).map((item) => [item.id, item]));
}

function emit(name, detail) {
  document.dispatchEvent(new CustomEvent(`explainer:${name}`, { detail }));
}

function on(name, handler) {
  document.addEventListener(`explainer:${name}`, (event) => handler(event.detail));
}

function fileChip(path) {
  return h('span', { class: 'chip chip-file', title: path }, path);
}

// Tiny, safe highlighter: tokenises into spans, never parses HTML.
const CODE_TOKEN = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|async|await|export|import|from|class|def|if|else|for|while|new|throw|try|catch|func|go|type|interface|struct|public|private|select|insert|update|delete|where|SELECT|INSERT|UPDATE|DELETE|WHERE|FROM)\b/g;

function codeBlock(code, lang) {
  const pre = h('pre', { class: 'code', 'data-lang': lang || '' });
  const source = String(code);
  let last = 0;
  source.replace(CODE_TOKEN, (match, comment, str, keyword, offset) => {
    if (offset > last) pre.append(document.createTextNode(source.slice(last, offset)));
    const cls = comment ? 'cm' : str ? 'st' : 'hl';
    pre.append(h('span', { class: cls }, match));
    last = offset + match.length;
    return match;
  });
  if (last < source.length) pre.append(document.createTextNode(source.slice(last)));
  return pre;
}

// Motion helpers (Web Animations API). All motion is skipped for users who
// ask for reduced motion; nothing depends on an animation finishing.
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function motion(el, keyframes, options) {
  if (reducedMotion() || !el.animate) return null;
  return el.animate(keyframes, { duration: 240, easing: EASE_OUT, ...options });
}

function slideIn(el, direction = 1) {
  return motion(el, [{ opacity: 0, transform: `translateX(${direction * 14}px)` }, { opacity: 1, transform: 'none' }]);
}

function riseIn(el, delay = 0) {
  return motion(el, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { delay, fill: 'backwards' });
}

function pop(el) {
  return motion(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }], { duration: 320 });
}

function shake(el) {
  return motion(el, [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-2px)' }, { transform: 'none' }], { duration: 320, easing: 'ease-in-out' });
}

// Draw an SVG path from start to end, then reveal its arrowhead.
function drawPath(path, marker) {
  const anim = motion(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 420 });
  if (!anim) {
    path.setAttribute('marker-end', marker);
    return;
  }
  path.setAttribute('pathLength', '1');
  path.style.strokeDasharray = '1';
  anim.onfinish = () => {
    path.style.strokeDasharray = '';
    path.removeAttribute('pathLength');
    path.setAttribute('marker-end', marker);
  };
}
