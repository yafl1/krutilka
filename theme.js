'use strict';

/* ============================================================
   Тема оформления: тёмная и светлая.
   Подключается в <head> до отрисовки, поэтому страница сразу
   открывается в нужной теме, без вспышки белым.
   Выбор запоминается в localStorage; если выбора нет — берётся
   тема системы.
   ============================================================ */

(function () {
  var KEY = 'krutilka-theme';
  var root = document.documentElement;
  var media = null;

  try { media = window.matchMedia('(prefers-color-scheme: light)'); } catch (e) { media = null; }

  function systemTheme() {
    return media && media.matches ? 'light' : 'dark';
  }

  function storedTheme() {
    try {
      var value = localStorage.getItem(KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function paint(theme) {
    root.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#f2f3fa' : '#07070d');

    var next = theme === 'light' ? 'тёмную' : 'светлую';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute('aria-label', 'Включить ' + next + ' тему');
      buttons[i].setAttribute('title', 'Включить ' + next + ' тему');
      buttons[i].setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }
  }

  function apply(theme, remember) {
    paint(theme);
    if (remember) {
      try { localStorage.setItem(KEY, theme); } catch (e) { /* приватный режим */ }
    }
    try {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: theme } }));
    } catch (e) { /* старый браузер */ }
  }

  // тема до первой отрисовки
  paint(storedTheme() || systemTheme());

  // кнопки появляются позже — обновляем их подписи
  document.addEventListener('DOMContentLoaded', function () {
    paint(currentTheme());
  });

  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest('[data-theme-toggle]');
    if (!button) return;
    event.preventDefault();
    apply(currentTheme() === 'light' ? 'dark' : 'light', true);
  });

  // если пользователь ещё не выбирал тему вручную — следуем за системой
  if (media) {
    var onSystemChange = function () {
      if (!storedTheme()) apply(systemTheme(), false);
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  window.KRUTILKA_THEME = { apply: apply, current: currentTheme };
})();
