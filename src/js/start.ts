// Очікуємо завантаження сторінки
window.addEventListener("load", function () {
  // Знаходимо всі елементи <img> з id "webpackimg"
  const images = document.querySelectorAll("img#webpackimg");

  // Ітеруємося по знайдених зображеннях
  images.forEach((image) => {
    // Отримуємо src атрибут
    const src = image.getAttribute("src");

    // Видаляємо розширення файлу
    const srcWithoutExtension = src.replace(/\.\w+$/, "");

    // Створюємо новий елемент <picture>
    const picture = document.createElement("picture");

    // Створюємо <source> для WebP зображення
    const source = document.createElement("source");
    source.setAttribute("type", "image/webp");
    source.setAttribute("srcset", srcWithoutExtension + ".webp"); // додаємо розширення .webp
    picture.appendChild(source);

    // Створюємо <img> з звичайним зображенням
    const img = document.createElement("img");
    img.setAttribute("src", src); // встановлюємо звичайний src зображення
    img.setAttribute("alt", image.getAttribute("alt")); // встановлюємо alt

    // Додаємо <source> та <img> до <picture>
    picture.appendChild(img);

    // Замінюємо <img> на <picture>
    image.parentNode.replaceChild(picture, image);
  });
});
