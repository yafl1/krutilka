/* ==========================================================================
   Крутилка — настройки публичной версии.

   Здесь одно место, где включаются рекламные баннеры, счётчик Яндекс
   Метрики и уведомление о cookie. Пока всё выключено, сайт выглядит точно
   так же, как локальный: ни баннеров, ни плашки, ни аналитики.

   Когда рекламная сеть одобрит сайт:
     1. Вставить код баннера в index.html внутрь .ad-slot
        (data-ad-slot="top" — над шапкой, data-ad-slot="bottom" — под колесом).
     2. Поставить ads: true.

   Когда появится Яндекс Метрика:
     Вписать номер счётчика в metrika.id. Скрипт и noscript-картинка
     подставятся сами, править 14 страниц не нужно. Плашка о cookie
     покажется автоматически, потому что Метрика их использует.
   ========================================================================== */

window.KRUTILKA = {
  ads: false,

  metrika: {
    // Номер счётчика Метрики, например 12345678. null — счётчик выключен.
    id: null,
    // Вебвизор по умолчанию выключен: он записывает содержимое страницы,
    // а там лежит список вариантов пользователя. Включать — только если
    // поправить обещание в privacy.html.
    webvisor: false,
  },

  // Ключ в localStorage: пользователь уже нажал «Понятно».
  cookieKey: "krutilka-cookie-ok",
};

(function () {
  "use strict";

  var cfg = window.KRUTILKA;

  function metrikaId() {
    var id = cfg.metrika && cfg.metrika.id;
    if (id === null || id === undefined) return 0;
    id = parseInt(String(id).replace(/\D/g, ""), 10);
    return id > 0 ? id : 0;
  }

  function initAds() {
    var slots = document.querySelectorAll(".ad-slot");
    var show = !!cfg.ads;

    slots.forEach(function (slot) {
      slot.hidden = !show;
    });
  }

  function initMetrika() {
    var id = metrikaId();
    if (!id) return;

    (function (w, d, t, src, name) {
      w[name] = w[name] || function () {
        (w[name].a = w[name].a || []).push(arguments);
      };
      w[name].l = 1 * new Date();

      for (var j = 0; j < d.scripts.length; j += 1) {
        if (d.scripts[j].src === src) return;
      }

      var el = d.createElement(t);
      var first = d.getElementsByTagName(t)[0];
      el.async = 1;
      el.src = src;
      first.parentNode.insertBefore(el, first);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(id, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: !cfg.metrika || cfg.metrika.webvisor !== false,
      trackHash: true,
    });

    // Пиксель для посетителей без JavaScript
    var pixel = document.createElement("img");
    pixel.src = "https://mc.yandex.ru/watch/" + id;
    pixel.alt = "";
    pixel.style.position = "absolute";
    pixel.style.left = "-9999px";
    document.body.appendChild(pixel);
  }

  function initCookieBar() {
    // Плашка нужна, если есть реклама или аналитика: и то и другое ставит cookie.
    if (!cfg.ads && !metrikaId()) return;

    var bar = document.getElementById("cookieBar");
    if (!bar) return;

    var accepted = false;
    try {
      accepted = localStorage.getItem(cfg.cookieKey) === "1";
    } catch (err) {
      // Приватный режим или запрет localStorage — считаем, что не принято.
    }

    if (accepted) {
      bar.hidden = true;
      return;
    }

    bar.hidden = false;

    var ok = document.getElementById("cookieOk");
    if (!ok) return;

    ok.addEventListener("click", function () {
      bar.hidden = true;
      try {
        localStorage.setItem(cfg.cookieKey, "1");
      } catch (err) {
        // Ничего страшного: плашка просто появится в следующий раз.
      }
    });
  }

  function init() {
    initAds();
    initMetrika();
    initCookieBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
