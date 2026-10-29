/* ==========================================================================
   Готовые наборы вариантов для колеса.

   Каждый набор открывается ссылкой вида index.html?preset=eda — app.js
   подставит список в колесо. Свои варианты при этом не стираются: набор
   живёт только до первой правки списка.

   Ключи наборов одинаковые для обоих языков (eda, posuda, …), поэтому
   ссылка ?preset=eda работает и на русской, и на английской странице —
   подставляется только текст на нужном языке.

   Ограничения из app.js: не больше 24 вариантов, название до 60 символов.
   ========================================================================== */

(function () {
  var RU = {
    eda: {
      title: "Что поесть",
      items: ["Пицца", "Суши", "Бургеры", "Паста", "Шаурма", "Салат", "Плов", "Борщ"],
    },

    posuda: {
      title: "Кто моет посуду",
      items: ["Я", "Ты", "Кто готовил", "Кто мыл вчера", "Оба сразу", "Завтра"],
    },

    video: {
      title: "Тема для следующего видео",
      items: [
        "Обзор за 5 минут",
        "Топ-5",
        "Челлендж",
        "Разбор ошибок",
        "Ответы на вопросы",
        "Влог",
        "Эксперимент",
      ],
    },

    film: {
      title: "Фильм на вечер",
      items: ["Комедия", "Триллер", "Фантастика", "Драма", "Ужасы", "Мультфильм", "Детектив"],
    },

    kuda: {
      title: "Куда пойти",
      items: ["В кино", "В кафе", "На прогулку", "В музей", "В гости", "Остаться дома"],
    },

    odezhda: {
      title: "Что надеть",
      items: ["Футболка и джинсы", "Худи", "Рубашка", "Спортивный костюм", "Куртка и кеды", "Свитер"],
    },

    igra: {
      title: "Во что сыграть",
      items: ["Шутер", "Стратегия", "Гонки", "Инди", "Кооператив", "Настолка"],
    },

    dela: {
      title: "Что сделать сейчас",
      items: ["Прогулка", "Книга", "Уборка", "Тренировка", "Готовка", "Поспать"],
    },

    pokupka: {
      title: "На что потратить",
      items: ["Отложить", "На технику", "На еду", "На поездку", "На игру", "На подарок"],
    },
  };

  var EN = {
    eda: {
      title: "What to eat",
      items: ["Pizza", "Sushi", "Burgers", "Pasta", "Shawarma", "Salad", "Pilaf", "Borscht"],
    },

    posuda: {
      title: "Who does the dishes",
      items: ["Me", "You", "Whoever cooked", "Whoever did them yesterday", "Both at once", "Tomorrow"],
    },

    video: {
      title: "Next video topic",
      items: [
        "5-minute review",
        "Top 5",
        "Challenge",
        "Mistakes breakdown",
        "Q&A",
        "Vlog",
        "Experiment",
      ],
    },

    film: {
      title: "Movie for tonight",
      items: ["Comedy", "Thriller", "Sci-fi", "Drama", "Horror", "Animation", "Detective"],
    },

    kuda: {
      title: "Where to go",
      items: ["Cinema", "Cafe", "A walk", "Museum", "Visit friends", "Stay home"],
    },

    odezhda: {
      title: "What to wear",
      items: ["T-shirt and jeans", "Hoodie", "Shirt", "Tracksuit", "Jacket and sneakers", "Sweater"],
    },

    igra: {
      title: "What to play",
      items: ["Shooter", "Strategy", "Racing", "Indie", "Co-op", "Board game"],
    },

    dela: {
      title: "What to do now",
      items: ["A walk", "Read a book", "Clean up", "Work out", "Cook", "Take a nap"],
    },

    pokupka: {
      title: "What to spend on",
      items: ["Save it", "Gadgets", "Food", "A trip", "A game", "A gift"],
    },
  };

  window.KRUTILKA_PRESETS =
    document.documentElement.lang === "en" ? EN : RU;
})();
