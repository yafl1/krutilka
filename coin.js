'use strict';

/* ============================================================
   Монетка — орёл или решка
   ============================================================ */

const COIN_STORAGE_KEY = 'wheel-decide.coin.v1';
const COIN_HISTORY_MAX = 12;

const COIN_LANG = document.documentElement.lang === 'en' ? 'en' : 'ru';

function coinPlural(n) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'бросков';
  if (b === 1) return 'бросок';
  if (b >= 2 && b <= 4) return 'броска';
  return 'бросков';
}

const COIN_TEXT = {
  ru: {
    heads: 'Орёл',
    tails: 'Решка',
    headsShort: 'О',
    tailsShort: 'Р',
    idle: 'Нажмите «Подбросить» или пробел',
    flipping: 'Монетка крутится…',
    result: (side) => (side === 'heads' ? 'Выпал орёл' : 'Выпала решка'),
    throws: (n) => `${n} ${coinPlural(n)}`,
    emptyHistory: 'Пока ни одного броска',
    resetDone: 'Статистика сброшена'
  },
  en: {
    heads: 'Heads',
    tails: 'Tails',
    headsShort: 'H',
    tailsShort: 'T',
    idle: 'Press “Flip” or hit Space',
    flipping: 'The coin is spinning…',
    result: (side) => (side === 'heads' ? 'Heads it is' : 'Tails it is'),
    throws: (n) => `${n} ${n === 1 ? 'flip' : 'flips'}`,
    emptyHistory: 'No flips yet',
    resetDone: 'Stats cleared'
  }
};

const CT = COIN_TEXT[COIN_LANG];

const $c = (sel) => document.querySelector(sel);

const coinEl = $c('#coin');
const tossEl = $c('#coinToss');
const flipBtn = $c('#flipBtn');
const verdictEl = $c('#coinResult');
const totalEl = $c('#coinTotal');
const headsEl = $c('#statHeads');
const tailsEl = $c('#statTails');
const barHeads = $c('#barHeads');
const barTails = $c('#barTails');
const historyEl = $c('#coinHistory');
const historyEmptyEl = $c('#coinHistoryEmpty');
const resetStatsBtn = $c('#resetStats');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLIP_MS = reduceMotion ? 220 : 2400;

let stats = { heads: 0, tails: 0, history: [] };
let coinRotation = 0;
let flipping = false;
let verdictTimer = 0;

/* ============ сохранение ============ */

function saveCoinStats() {
  try {
    localStorage.setItem(COIN_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) { /* приватный режим — просто игнорируем */ }
}

function loadCoinStats() {
  try {
    const raw = localStorage.getItem(COIN_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const heads = Number(data.heads);
    const tails = Number(data.tails);
    stats.heads = Number.isFinite(heads) && heads > 0 ? Math.floor(heads) : 0;
    stats.tails = Number.isFinite(tails) && tails > 0 ? Math.floor(tails) : 0;
    if (Array.isArray(data.history)) {
      stats.history = data.history
        .filter((side) => side === 'heads' || side === 'tails')
        .slice(0, COIN_HISTORY_MAX);
    }
  } catch (e) { /* повреждённые данные — начинаем с нуля */ }
}

/* ============ случайность ============ */

function randomSide() {
  if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(1);
    window.crypto.getRandomValues(buf);
    // 256 значений делятся на два исхода ровно поровну
    return (buf[0] & 1) === 1 ? 'tails' : 'heads';
  }
  return Math.random() < 0.5 ? 'heads' : 'tails';
}

/* ============ отрисовка ============ */

function renderStats() {
  const total = stats.heads + stats.tails;

  totalEl.textContent = CT.throws(total);
  headsEl.textContent = String(stats.heads);
  tailsEl.textContent = String(stats.tails);
  barHeads.style.width = total ? `${(stats.heads / total) * 100}%` : '0%';
  barTails.style.width = total ? `${(stats.tails / total) * 100}%` : '0%';

  historyEl.textContent = '';
  const frag = document.createDocumentFragment();
  stats.history.forEach((side) => {
    const li = document.createElement('li');
    li.className = `coin-chip coin-chip--${side}`;
    li.textContent = side === 'heads' ? CT.headsShort : CT.tailsShort;
    li.title = side === 'heads' ? CT.heads : CT.tails;
    frag.append(li);
  });
  historyEl.append(frag);

  historyEmptyEl.hidden = stats.history.length > 0;
  resetStatsBtn.disabled = total === 0;
}

function setVerdict(text, side) {
  window.clearTimeout(verdictTimer);
  verdictEl.textContent = text;
  verdictEl.classList.toggle('is-heads', side === 'heads');
  verdictEl.classList.toggle('is-tails', side === 'tails');
}

/* ============ бросок ============ */

function flipCoin() {
  if (flipping) return;

  flipping = true;
  flipBtn.disabled = true;

  const result = randomSide();
  const extraTurns = reduceMotion ? 0 : 4 + Math.floor(Math.random() * 3);
  const sideTurns = result === 'heads' ? 0 : 180;

  coinRotation += extraTurns * 360 + sideTurns;
  coinEl.style.transform = `rotateX(${coinRotation}deg)`;

  if (!reduceMotion) {
    tossEl.classList.remove('is-tossing');
    // перезапуск анимации подбрасывания
    void tossEl.offsetWidth;
    tossEl.classList.add('is-tossing');
  }

  setVerdict(CT.flipping, null);

  window.setTimeout(() => {
    flipping = false;
    flipBtn.disabled = false;
    tossEl.classList.remove('is-tossing');

    stats[result] += 1;
    stats.history.unshift(result);
    stats.history = stats.history.slice(0, COIN_HISTORY_MAX);
    saveCoinStats();
    renderStats();

    setVerdict(CT.result(result), result);
  }, FLIP_MS);
}

function resetStats() {
  if (flipping) return;
  stats = { heads: 0, tails: 0, history: [] };
  saveCoinStats();
  renderStats();
  setVerdict(CT.resetDone, null);
  verdictTimer = window.setTimeout(() => setVerdict(CT.idle, null), 1800);
}

/* ============ события ============ */

flipBtn.addEventListener('click', flipCoin);
resetStatsBtn.addEventListener('click', resetStats);

coinEl.style.transform = 'rotateX(0deg)';

loadCoinStats();
renderStats();
setVerdict(CT.idle, null);

if (reduceMotion) {
  coinEl.style.transitionDuration = '0.18s';
}

document.addEventListener('keydown', (event) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
  if (event.code === 'Space' && !typing) {
    event.preventDefault();
    flipCoin();
  }
});
