'use strict';

/* ============================================================
   Крутилка — колесо голосования
   ============================================================ */

const STORAGE_KEY = 'wheel-decide.v1';
const MAX_OPTIONS = 24;
const DEFAULTS = ['Пицца', 'Суши', 'Бургеры', 'Паста', 'Шаурма', 'Салат'];
const PALETTE = [
  '#8b5cf6', '#22d3ee', '#34d399', '#fbbf24', '#fb7185', '#60a5fa',
  '#f472b6', '#a3e635', '#fb923c', '#2dd4bf', '#c084fc', '#facc15'
];

/* Цвета колеса под тему оформления (переключатель в шапке, см. theme.js).
   В тёмной теме секторы затемняются к центру, в светлой — слегка
   выбеливаются, чтобы колесо не выглядело чёрным пятном на белом фоне. */
const WHEEL_COLORS = {
  dark: {
    plate: 'rgba(8, 8, 16, 0.92)',
    mixTo: '#08080f',
    mixInner: 0.5,
    mixMid: 0.12,
    divider: 'rgba(7, 7, 14, 0.42)',
    rim: 'rgba(255, 255, 255, 0.14)',
    rimInner: 'rgba(0, 0, 0, 0.28)',
    tick: 'rgba(255, 255, 255, 0.24)',
    hub: '#0c0c16',
    hubRing: 'rgba(255, 255, 255, 0.09)',
    emptyPlate: 'rgba(14, 14, 24, 0.9)',
    emptyStroke: 'rgba(255, 255, 255, 0.16)',
    emptyText: 'rgba(255, 255, 255, 0.32)'
  },
  light: {
    plate: 'rgba(255, 255, 255, 0.92)',
    mixTo: '#ffffff',
    mixInner: 0.16,
    mixMid: 0.04,
    divider: 'rgba(255, 255, 255, 0.55)',
    rim: 'rgba(18, 20, 43, 0.16)',
    rimInner: 'rgba(255, 255, 255, 0.65)',
    tick: 'rgba(18, 20, 43, 0.26)',
    hub: '#ffffff',
    hubRing: 'rgba(18, 20, 43, 0.12)',
    emptyPlate: 'rgba(255, 255, 255, 0.88)',
    emptyStroke: 'rgba(18, 20, 43, 0.22)',
    emptyText: 'rgba(18, 20, 43, 0.45)'
  }
};

let wheelColors = WHEEL_COLORS.dark;

function readWheelColors() {
  wheelColors = document.documentElement.getAttribute('data-theme') === 'light'
    ? WHEEL_COLORS.light
    : WHEEL_COLORS.dark;
}

const $ = (sel, root = document) => root.querySelector(sel);

const canvas = $('#wheel');
const ctx = canvas.getContext('2d');
const holder = $('#wheelHolder');
const optionsList = $('#options');
const addForm = $('#addForm');
const addInput = $('#addInput');
const countEl = $('#count');
const emptyEl = $('#emptyState');
const spinBtn = $('#spinBtn');
const resultEl = $('#result');
const resultValue = $('#resultValue');
const resultNote = $('#resultNote');
const againBtn = $('#againBtn');
const closeBtn = $('#closeBtn');
const eliminateInput = $('#eliminate');
const soundInput = $('#sound');
const shuffleBtn = $('#shuffleBtn');
const resetBtn = $('#resetBtn');
const toastEl = $('#toast');
const toastText = $('#toastText');
const toastAction = $('#toastAction');
const confettiCanvas = $('#confetti');
const cctx = confettiCanvas.getContext('2d');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let options = [];
let settings = { eliminate: false, sound: true };
let rotation = 0;
let spinning = false;
let size = 0;
let dpr = 1;
let rafId = 0;
let anim = null;
let lastTickIndex = -1;
let lastTickAt = 0;
let scrollPower = 0;
let scrollTimer = 0;
let toastTimer = 0;
let drag = null;
let particles = [];
let confettiRaf = 0;

/* ============ утилиты ============ */

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const mod = (v, m) => ((v % m) + m) % m;
const uid = () => Math.random().toString(36).slice(2, 9);
const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

function plural(n) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'вариантов';
  if (b === 1) return 'вариант';
  if (b >= 2 && b <= 4) return 'варианта';
  return 'вариантов';
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const to = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${to(a.r, b.r)}${to(a.g, b.g)}${to(a.b, b.b)}`;
}

function textOn(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.58 ? '#0b0b12' : '#ffffff';
}

/* ============ сохранение ============ */

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ options, settings }));
  } catch (e) { /* приватный режим — просто игнорируем */ }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.options)) {
      options = data.options
        .filter((o) => o && typeof o.label === 'string' && o.label.trim())
        .slice(0, MAX_OPTIONS)
        .map((o) => ({ id: typeof o.id === 'string' ? o.id : uid(), label: o.label.slice(0, 60) }));
    }
    if (data.settings && typeof data.settings === 'object') {
      settings = {
        eliminate: Boolean(data.settings.eliminate),
        sound: data.settings.sound !== false
      };
    }
  } catch (e) { /* повреждённые данные — стартуем с нуля */ }
}

/* ============ интерфейс списка ============ */

function renderOptions() {
  optionsList.innerHTML = '';
  const frag = document.createDocumentFragment();

  options.forEach((opt, i) => {
    const color = PALETTE[i % PALETTE.length];

    const li = document.createElement('li');
    li.className = 'option';
    li.dataset.id = opt.id;

    const dot = document.createElement('span');
    dot.className = 'option-dot';
    dot.style.color = color;

    const label = document.createElement('span');
    label.className = 'option-label';
    label.textContent = opt.label;
    label.title = 'Двойной клик — изменить';

    const del = document.createElement('button');
    del.className = 'option-del';
    del.type = 'button';
    del.textContent = '×';
    del.setAttribute('aria-label', `Удалить вариант «${opt.label}»`);

    del.addEventListener('click', () => removeOption(opt.id));
    label.addEventListener('dblclick', () => startEdit(li, opt));

    li.append(dot, label, del);
    frag.append(li);
  });

  optionsList.append(frag);

  countEl.textContent = `${options.length} ${plural(options.length)}`;
  emptyEl.hidden = options.length >= 2;
  updateSpinAvailability();
  updateListFade();
  canvas.setAttribute(
    'aria-label',
    options.length
      ? `Колесо с вариантами: ${options.map((o) => o.label).join(', ')}`
      : 'Пустое колесо'
  );
  drawWheel();
}

function updateSpinAvailability() {
  spinBtn.disabled = spinning || options.length < 2;
}

function updateListFade() {
  optionsList.classList.toggle('is-scrollable', optionsList.scrollHeight > optionsList.clientHeight + 1);
}

function startEdit(li, opt) {
  if (spinning) return;
  const label = li.querySelector('.option-label');
  if (!label) return;

  const input = document.createElement('input');
  input.className = 'option-edit';
  input.type = 'text';
  input.maxLength = 60;
  input.value = opt.label;
  label.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (commit) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim().slice(0, 60);
    if (commit && value) {
      opt.label = value;
      save();
    }
    renderOptions();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    if (e.key === 'Escape') { e.preventDefault(); finish(false); }
  });
  input.addEventListener('blur', () => finish(true));
}

function addOptions(raw) {
  if (spinning) return;
  const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return;

  let added = 0;
  let duplicate = false;
  let overflow = false;

  for (const part of parts) {
    if (options.length >= MAX_OPTIONS) { overflow = true; break; }
    const label = part.slice(0, 60);
    if (options.some((o) => o.label.toLowerCase() === label.toLowerCase())) {
      duplicate = true;
      continue;
    }
    options.push({ id: uid(), label });
    added += 1;
  }

  addInput.value = '';
  if (added) {
    save();
    renderOptions();
  } else if (duplicate && !overflow) {
    toast('Такой вариант уже есть');
  }
  if (overflow) toast(`Максимум ${MAX_OPTIONS} вариантов`);
}

function removeOption(id) {
  if (spinning) return;
  const index = options.findIndex((o) => o.id === id);
  if (index < 0) return;

  const [removed] = options.splice(index, 1);
  save();
  renderOptions();
  toast(`«${removed.label}» удалён`, 'Вернуть', () => {
    options.splice(Math.min(index, options.length), 0, removed);
    save();
    renderOptions();
  });
}

function shuffleOptions() {
  if (spinning || options.length < 2) return;
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  save();
  renderOptions();
  toast('Варианты перемешаны');
}

function resetOptions() {
  if (spinning) return;
  const previous = options.map((o) => ({ ...o }));
  options = DEFAULTS.map((label) => ({ id: uid(), label }));
  save();
  renderOptions();
  toast('Список сброшен к примеру', 'Вернуть', () => {
    options = previous;
    save();
    renderOptions();
  });
}

/* ============ рисование колеса ============ */

function resizeCanvas() {
  const rect = holder.getBoundingClientRect();
  const next = Math.max(140, Math.min(rect.width, rect.height));
  const nextDpr = Math.min(2, window.devicePixelRatio || 1);

  if (Math.abs(next - size) < 0.5 && nextDpr === dpr) return;

  size = next;
  dpr = nextDpr;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  drawWheel();
}

function fitText(text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

function drawWheel() {
  if (!size) return;

  const s = size;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, s, s);

  const cx = s / 2;
  const cy = s / 2;
  const R = s / 2 - s * 0.022;
  const scale = s / 540;
  const n = options.length;

  if (n === 0) {
    drawEmptyWheel(cx, cy, R, scale);
    return;
  }
  if (n === 1) {
    drawSingleWheel(cx, cy, R, scale);
    return;
  }

  const step = (Math.PI * 2) / n;

  // подложка
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = wheelColors.plate;
  ctx.fill();

  // секторы
  for (let i = 0; i < n; i += 1) {
    const start = rotation + i * step;
    const end = start + step;
    const color = PALETTE[i % PALETTE.length];

    const grad = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
    grad.addColorStop(0, mix(color, wheelColors.mixTo, wheelColors.mixInner));
    grad.addColorStop(0.72, mix(color, wheelColors.mixTo, wheelColors.mixMid));
    grad.addColorStop(1, color);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, start, end);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = wheelColors.divider;
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.stroke();
  }

  // подписи
  const fontSize = Math.round(
    (n <= 6 ? 17 : n <= 9 ? 15 : n <= 12 ? 13 : 11) *
    clamp(scale, 0.78, 1.3)
  );
  const hubR = s * 0.158;
  const pad = s * 0.05;
  const maxWidth = Math.max(40, R - pad - hubR - 8 * scale);

  ctx.font = `600 ${fontSize}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.textBaseline = 'middle';

  for (let i = 0; i < n; i += 1) {
    const mid = rotation + i * step + step / 2;
    const color = PALETTE[i % PALETTE.length];
    const label = fitText(options[i].label, maxWidth);
    const flip = Math.cos(mid) < 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(mid);
    if (flip) ctx.rotate(Math.PI);
    ctx.fillStyle = textOn(color);
    ctx.textAlign = flip ? 'left' : 'right';
    ctx.fillText(label, flip ? -(R - pad) : R - pad, 0);
    ctx.restore();
  }

  // обод
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = wheelColors.rim;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R - Math.max(2, 3 * scale), 0, Math.PI * 2);
  ctx.strokeStyle = wheelColors.rimInner;
  ctx.lineWidth = 1;
  ctx.stroke();

  // насечки на ободе
  for (let i = 0; i < n; i += 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation + i * step);
    ctx.beginPath();
    ctx.moveTo(R - 4 * scale, 0);
    ctx.lineTo(R - 10 * scale, 0);
    ctx.strokeStyle = wheelColors.tick;
    ctx.lineWidth = Math.max(1, 1.4 * scale);
    ctx.stroke();
    ctx.restore();
  }

  // центр под кнопкой
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
  ctx.fillStyle = wheelColors.hub;
  ctx.fill();
  ctx.strokeStyle = wheelColors.hubRing;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawEmptyWheel(cx, cy, R, scale) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = wheelColors.emptyPlate;
  ctx.fill();
  ctx.setLineDash([7 * scale, 8 * scale]);
  ctx.strokeStyle = wheelColors.emptyStroke;
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = wheelColors.emptyText;
  ctx.font = `500 ${Math.round(12 * clamp(scale, 0.8, 1.3))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('пока пусто', cx, cy);
  ctx.restore();
}

function drawSingleWheel(cx, cy, R, scale) {
  const color = PALETTE[0];
  const grad = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
  grad.addColorStop(0, mix(color, wheelColors.mixTo, wheelColors.mixInner));
  grad.addColorStop(1, color);

  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = wheelColors.rim;
  ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.stroke();

  ctx.font = `600 ${Math.round(17 * clamp(scale, 0.8, 1.3))}px Inter, "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = textOn(color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = R * 1.3;
  ctx.fillText(fitText(options[0].label, maxWidth), cx, cy - R * 0.5);

  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.158, 0, Math.PI * 2);
  ctx.fillStyle = wheelColors.hub;
  ctx.fill();
}

/* ============ анимация вращения ============ */

function animate(from, to, duration, onDone) {
  anim = { from, to, duration, start: performance.now(), onDone };
  if (!rafId) rafId = requestAnimationFrame(frame);
}

function frame(now) {
  rafId = 0;
  if (!anim) return;

  const t = clamp((now - anim.start) / anim.duration, 0, 1);
  rotation = anim.from + (anim.to - anim.from) * easeOutQuart(t);

  if (settings.sound && options.length > 1) {
    const step = (Math.PI * 2) / options.length;
    const index = Math.floor(rotation / step);
    if (index !== lastTickIndex) {
      lastTickIndex = index;
      if (now - lastTickAt > 42) {
        lastTickAt = now;
        tickSound();
      }
    }
  }

  drawWheel();

  if (t < 1) {
    rafId = requestAnimationFrame(frame);
  } else {
    const done = anim.onDone;
    anim = null;
    if (typeof done === 'function') done();
  }
}

/* ============ запуск вращения ============ */

function spin(power = 1) {
  if (spinning || options.length < 2) return;

  hideResult();
  spinning = true;
  updateSpinAvailability();
  holder.classList.add('is-spinning');

  const n = options.length;
  const step = (Math.PI * 2) / n;
  const winnerIndex = Math.floor(Math.random() * n);
  const winnerId = options[winnerIndex].id;

  // угол, при котором центр победного сектора смотрит в указатель (верх)
  const jitter = (Math.random() - 0.5) * Math.min(step * 0.55, 0.42);
  const target = -Math.PI / 2 - (winnerIndex * step + step / 2) + jitter;

  let delta = mod(target - rotation, Math.PI * 2);
  const turns = 5 + Math.min(4, Math.floor(power * 0.9));
  delta += Math.PI * 2 * turns;

  const duration = reduceMotion
    ? 900
    : 3200 + Math.random() * 900 + Math.min(1200, power * 120);

  lastTickIndex = -1;
  lastTickAt = 0;

  animate(rotation, rotation + delta, duration, () => {
    rotation = mod(rotation, Math.PI * 2);
    spinning = false;
    updateSpinAvailability();
    holder.classList.remove('is-spinning');
    onSpinEnd(winnerId);
  });
}

function onSpinEnd(winnerId) {
  const index = options.findIndex((o) => o.id === winnerId);
  if (index < 0) return;

  const label = options[index].label;
  showResult(label);
  burstConfetti();

  if (!settings.eliminate) return;

  window.setTimeout(() => {
    const current = options.findIndex((o) => o.id === winnerId);
    if (current < 0 || options.length <= 1) return;

    const [removed] = options.splice(current, 1);
    save();
    renderOptions();

    const left = options.length;
    setResultNote(
      left > 1
        ? `Вариант выбыл · осталось ${left} ${plural(left)}`
        : 'Остался последний вариант'
    );

    toast(`«${removed.label}» выбывает из списка`, 'Вернуть', () => {
      options.splice(Math.min(current, options.length), 0, removed);
      save();
      renderOptions();
      hideResult();
    }, 7000);
  }, 720);
}

/* ============ результат ============ */

function showResult(label, note = '') {
  resultValue.textContent = label;
  setResultNote(note);
  resultEl.hidden = false;
  againBtn.disabled = options.length < 2;

  requestAnimationFrame(() => {
    againBtn.focus({ preventScroll: true });
  });
}

function setResultNote(note) {
  resultNote.textContent = note || '';
  resultNote.hidden = !note;
}

function hideResult() {
  if (resultEl.hidden) return;
  resultEl.hidden = true;
}

/* ============ звук ============ */

let audioCtx = null;

function tickSound() {
  if (!settings.sound) return;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(560 + Math.random() * 260, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.04, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  } catch (e) { /* звук не критичен */ }
}

/* ============ конфетти ============ */

// Конфетти считается по времени (dt в секундах), а не «порция на кадр».
// Раньше при просадке FPS оно замедлялось: на кадр приходился один и тот же
// шаг, и при 25 кадрах в секунду всё летело в 2,5 раза медленнее.
const CONFETTI_GRAVITY = 620;   // px/с²
const CONFETTI_DRAG_X = 0.48;   // затухание по горизонтали, 1/с
const CONFETTI_DRAG_Y = 0.24;   // затухание по вертикали, 1/с
const CONFETTI_FADE = 0.36;     // life за секунду (живёт ~2,8 с)
const CONFETTI_MAX_DT = 0.1;    // потолок шага: после фоновой вкладки не телепортируем

let confettiW = 0;
let confettiH = 0;
let confettiLast = 0;

function resizeConfetti() {
  // Конфетти — мелкие вращающиеся прямоугольники: двойная плотность пикселей
  // на 1080p стоит заметных кадров, а разницы почти не видно.
  const ratio = Math.min(1.5, window.devicePixelRatio || 1);
  confettiW = window.innerWidth;
  confettiH = window.innerHeight;
  confettiCanvas.width = Math.round(confettiW * ratio);
  confettiCanvas.height = Math.round(confettiH * ratio);
  cctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function burstConfetti() {
  const w = confettiW || window.innerWidth;
  const h = confettiH || window.innerHeight;

  const origins = [
    { x: -20, y: h + 12, base: -Math.PI / 2 + 0.55 },
    { x: w + 20, y: h + 12, base: -Math.PI / 2 - 0.55 }
  ];

  for (const origin of origins) {
    for (let i = 0; i < 64; i += 1) {
      const angle = origin.base + (Math.random() - 0.5) * 0.8;
      const speed = 660 + Math.random() * 540;   // px/с
      particles.push({
        x: origin.x + (Math.random() - 0.5) * 24,
        y: origin.y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 4 + Math.random() * 7,
        h: 3 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 20,           // рад/с
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        life: 1
      });
    }
  }

  confettiLast = 0;
  if (!confettiRaf) confettiRaf = requestAnimationFrame(confettiFrame);
}

function confettiFrame(now) {
  confettiRaf = 0;

  const dt = confettiLast
    ? Math.min(CONFETTI_MAX_DT, Math.max(0, (now - confettiLast) / 1000))
    : 1 / 60;
  confettiLast = now;

  const w = confettiW;
  const h = confettiH;

  cctx.clearRect(0, 0, w, h);

  const dragX = Math.exp(-CONFETTI_DRAG_X * dt);
  const dragY = Math.exp(-CONFETTI_DRAG_Y * dt);

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.vy += CONFETTI_GRAVITY * dt;
    p.vx *= dragX;
    p.vy *= dragY;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    p.life -= CONFETTI_FADE * dt;

    if (p.life <= 0 || p.y > h + 40) {
      particles.splice(i, 1);
      continue;
    }

    cctx.save();
    cctx.translate(p.x, p.y);
    cctx.rotate(p.rot);
    cctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cctx.restore();
  }

  if (particles.length) {
    confettiRaf = requestAnimationFrame(confettiFrame);
  } else {
    cctx.clearRect(0, 0, w, h);
  }
}

/* ============ тосты ============ */

function toast(message, actionLabel, action, timeout = 5200) {
  window.clearTimeout(toastTimer);
  toastText.textContent = message;

  if (actionLabel && typeof action === 'function') {
    toastAction.hidden = false;
    toastAction.textContent = actionLabel;
    toastAction.onclick = () => {
      hideToast();
      action();
    };
  } else {
    toastAction.hidden = true;
    toastAction.onclick = null;
  }

  toastEl.classList.add('is-visible');
  toastTimer = window.setTimeout(hideToast, timeout);
}

function hideToast() {
  toastEl.classList.remove('is-visible');
}

/* ============ взаимодействие ============ */

function pointerAngle(event) {
  const rect = holder.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return Math.atan2(event.clientY - cy, event.clientX - cx);
}

holder.addEventListener('pointerdown', (event) => {
  if (spinning || options.length < 2) return;
  if (event.target.closest('.hub')) return;

  holder.setPointerCapture(event.pointerId);
  const angle = pointerAngle(event);

  drag = {
    startRotation: rotation,
    startPointer: angle,
    lastPointer: angle,
    lastTime: performance.now(),
    velocity: 0,
    moved: false
  };

  holder.classList.add('is-dragging');
});

holder.addEventListener('pointermove', (event) => {
  if (!drag) return;

  const angle = pointerAngle(event);
  rotation = drag.startRotation + (angle - drag.startPointer);

  const now = performance.now();
  const dt = Math.max(1, now - drag.lastTime);
  let d = angle - drag.lastPointer;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;

  drag.velocity = (d / dt) * 1000;
  drag.lastPointer = angle;
  drag.lastTime = now;

  if (Math.abs(angle - drag.startPointer) > 0.03) drag.moved = true;

  drawWheel();
});

function endDrag() {
  if (!drag) return;

  const { velocity, moved } = drag;
  drag = null;
  holder.classList.remove('is-dragging');

  if (!moved || spinning) return;

  const power = clamp(1 + Math.abs(velocity) * 0.35, 1, 6);
  spin(power);
}

holder.addEventListener('pointerup', endDrag);
holder.addEventListener('pointercancel', endDrag);

holder.addEventListener('wheel', (event) => {
  event.preventDefault();
  if (spinning) return;

  scrollPower += Math.abs(event.deltaY) + Math.abs(event.deltaX);

  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    const power = clamp(1 + scrollPower / 400, 1, 6);
    scrollPower = 0;
    spin(power);
  }, 130);
}, { passive: false });

spinBtn.addEventListener('click', () => spin(1));

holder.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'Enter') {
    event.preventDefault();
    spin(1);
  }
});

addForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addOptions(addInput.value);
});

shuffleBtn.addEventListener('click', shuffleOptions);
resetBtn.addEventListener('click', resetOptions);

eliminateInput.addEventListener('change', () => {
  settings.eliminate = eliminateInput.checked;
  save();
});

soundInput.addEventListener('change', () => {
  settings.sound = soundInput.checked;
  save();
});

againBtn.addEventListener('click', () => {
  hideResult();
  window.setTimeout(() => spin(1.35), 120);
});

closeBtn.addEventListener('click', () => {
  hideResult();
  spinBtn.focus({ preventScroll: true });
});

resultEl.addEventListener('click', (event) => {
  if (event.target === resultEl) hideResult();
});

document.addEventListener('keydown', (event) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;

  if (event.code === 'Space' && !typing) {
    event.preventDefault();
    if (!resultEl.hidden) {
      hideResult();
      return;
    }
    spin(1);
  }

  if (event.key === 'Escape') {
    if (!resultEl.hidden) hideResult();
    else hideToast();
  }
});

window.addEventListener('resize', () => {
  resizeCanvas();
  resizeConfetti();
  updateListFade();
});

/* ============ смена темы ============ */

readWheelColors();

window.addEventListener('themechange', () => {
  readWheelColors();
  drawWheel();
});

/* ============ старт ============ */

load();

/* Готовый набор из ссылки вида index.html?preset=eda (см. presets.js).
   Список не сохраняем: если пользователь ничего не менял, его прежние
   варианты останутся в localStorage и вернутся при следующем заходе. */
(function applyPresetFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('preset');
  if (!key) return;

  const presets = window.KRUTILKA_PRESETS || {};
  const preset = presets[key];
  if (!preset || !Array.isArray(preset.items) || !preset.items.length) return;

  options = preset.items
    .slice(0, MAX_OPTIONS)
    .map((label) => ({ id: uid(), label: String(label).slice(0, 60) }));

  if (preset.title) document.title = preset.title + ' — Крутилка';
})();

if (!options.length) {
  options = DEFAULTS.map((label) => ({ id: uid(), label }));
  save();
}

eliminateInput.checked = settings.eliminate;
soundInput.checked = settings.sound;

renderOptions();
resizeConfetti();

const observer = new ResizeObserver(resizeCanvas);
observer.observe(holder);
resizeCanvas();

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => drawWheel()).catch(() => {});
}
