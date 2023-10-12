const HtmlWebpackPlugin = require("html-webpack-plugin");

class ReplaceImgWithPicturePlugin {
  constructor(options) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap(
      "ReplaceImgWithPicturePlugin",
      (compilation) => {
        HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
          "ReplaceImgWithPicturePlugin",
          (data, callback) => {
            data.html = data.html.replace(/<img([^>]*)>/g, (match, attrs) => {
              // Отримуємо значення атрибутів src, width, height, та alt
              const srcMatch = /src="([^"]+)"/.exec(attrs);
              const widthMatch = /width="([^"]+)"/.exec(attrs);
              const heightMatch = /height="([^"]+)"/.exec(attrs);
              const altMatch = /alt="([^"]+)"/.exec(attrs);
              const idMatch = /id="([^"]+)"/.exec(attrs);
              const classMatch = /class="([^"]+)"/.exec(attrs);

              // Переносимо їх до тегу <picture>
              const srcAttribute = srcMatch ? ` src="${srcMatch[1]}"` : "";
              const widthAttribute = widthMatch
                ? ` width="${widthMatch[1]}"`
                : "";
              const heightAttribute = heightMatch
                ? ` height="${heightMatch[1]}"`
                : "";
              const altAttribute = altMatch ? ` alt="${altMatch[1]}"` : "";
              const idAttribute = idMatch ? ` id="${idMatch[1]}"` : "";
              const classAttribute = classMatch
                ? ` class="${classMatch[1]}"`
                : "";

              if (srcMatch) {
                const originalSrc = srcMatch[1];
                const webpSrc = originalSrc.replace(/\.\w+$/, ".webp"); // Генеруємо шлях для WebP

                return `<picture><source type="image/webp" srcset="${webpSrc}"><img${srcAttribute}${widthAttribute}${heightAttribute}${altAttribute}${idAttribute}${classAttribute}></picture>`;
              }
            });

            // Обробка зображень з використанням TypeScript
            data.html = data.html.replace(
              /<img id="([^"]+)" class="([^"]+)" src="([^"]+)" alt="([^"]+)" \/>/g,
              (match, id, className, src, alt) => {
                const webpSrc = src.replace(/\.\w+$/, ".webp");
                return `<picture><source type="image/webp" srcset="${webpSrc}"><img id="${id}" class="${className}" src="${src}" alt="${alt}"></picture>`;
              }
            );

            callback(null, data);
          }
        );
      }
    );
  }
}

module.exports = ReplaceImgWithPicturePlugin;
