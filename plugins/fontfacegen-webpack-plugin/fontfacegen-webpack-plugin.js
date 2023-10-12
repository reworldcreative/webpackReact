const fs = require("fs");
const path = require("path");
const fontfacegen = require("../fontfacegen");

class CompileResultSuccess {
  constructor(files) {
    this.files = files;
  }
}

class CompileResultCache {
  constructor(files) {
    this.files = files;
  }
}

// Symbols for data we store in Webpack objects.
const COMPILATION_STATE = Symbol("COMPILATION_STATE");

// Symbols for private fields.
const NAME = Symbol("NAME");
const TASKS = Symbol("TASKS");
const LAST_RESULTS = Symbol("LAST_RESULTS");
const COMPILE = Symbol("COMPILE");
const REUSE = Symbol("REUSE");
const COLLECT_FONTS = Symbol("COLLECT_FONTS");

module.exports = class FontfacegenWebpackPlugin {
  constructor(options = {}) {
    this[NAME] = "fontfacegenWebpackPlugin";

    this[TASKS] = (options.tasks !== undefined ? options.tasks : []).map(
      (task) => {
        if (typeof task === "string") {
          // If task is a string then the user has only provided the source.
          task = {
            src: task,
          };
        } else if (typeof task === "object") {
          // We need to make sure this is a copy.
          task = Object.assign({}, task);
        }

        if (typeof task.src === "string") {
          // The user only provided a single source.
          task.src = [task.src];
        } else if (task.src instanceof Array) {
          // We need to make sure this is a copy.
          task.src = task.src.concat();
        }

        if (
          !(typeof task.subset === "string" || task.subset instanceof Array)
        ) {
          if (options.subset !== undefined) {
            task.subset = options.subset;
          }
        }

        return task;
      }
    );

    // Tracks the results of the last compilation.
    this[LAST_RESULTS] = [];
  }

  apply(compiler) {
    compiler.hooks.make.tapPromise(this[NAME], async (compilation) => {
      let compilationTasks = await Promise.all(
        this[TASKS].map(async (task) => {
          return {
            sourceFiles: await this[COLLECT_FONTS](task),
            subset: task.subset,
            results: [],
          };
        })
      );

      // State initialization.
      compilation[COMPILATION_STATE] = compilationTasks;

      // Discards previous results.
      this[LAST_RESULTS].length = 0;

      for (let ct of compilationTasks) {
        for (let sourceFile of ct.sourceFiles) {
          let friendlyName = path.basename(sourceFile);

          try {
            let result = await this[COMPILE](
              sourceFile,
              compilation.outputOptions.path,
              ct.subset
            );

            if (result instanceof CompileResultSuccess) {
              console.log(
                `Generated fonts for "${friendlyName}" successfully.`
              );

              for (let file of result.files) {
                this[LAST_RESULTS].push(file);
              }
            } else if (result instanceof CompileResultCache) {
              console.log(`Fonts for "${friendlyName}" are up to date.`);
            }

            ct.results.push(result);
          } catch (e) {
            console.error(`Failed to generate "${friendlyName}" fonts`, e);
            // Move on to the next file.
          }
        }
      }
    });

    compiler.hooks.afterCompile.tapPromise(this[NAME], async (compilation) => {
      let compilationTasks = compilation[COMPILATION_STATE];

      if (compilationTasks === undefined) {
        return;
      }

      for (let ct of compilationTasks) {
        for (let result of ct.results) {
          try {
            for (let file of result.files) {
              let fullPath = path.join(compilation.outputOptions.path, file);

              // Paths to the generated font files may be used in the code so we
              // need to remove those from the dependencies list otherwise webpack
              // watch will go in a loop when the fonts get compiled.
              if (compilation.fileDependencies.has(fullPath)) {
                compilation.fileDependencies.delete(fullPath);
              }
            }

            // We need to manually register the source files as dependencies
            // because they might not be referenced in the code. This is what
            // makes the watch command work.
            for (let sourceFile of ct.sourceFiles) {
              compilation.fileDependencies.add(sourceFile);
            }
          } catch (e) {
            console.error(e);
            // Move on to the next result.
          }
        }
      }

      // State deinitialization.
      delete compilation[COMPILATION_STATE];
    });
  }

  /*
   * Compiles a font into various other font formats. src is an absolute path to
   * a file, dst is an absolute path to the directory where the font files will
   * be created and subset is a string of characters that should be included in
   * the generated fonts.
   *
   * It returns an object on success. It will eithe be CompileResultSuccess if
   * the fonts were generated or CompileResultCache if the existing fonts were
   * reused. The object provides a list of the names of the font files that were
   * generated in the given directory.
   */
  async [COMPILE](src, dst, subset = undefined) {
    let extension = path.extname(src);
    let fontname = path.basename(src, extension);

    const files = [
      fontname + ".eot",
      fontname + ".ttf",
      // fontname + ".svg",
      fontname + ".woff",
      fontname + ".woff2",
    ];

    if (await this[REUSE](src, dst, files)) {
      return new CompileResultCache(files);
    }

    fontfacegen({
      source: src,
      dest: dst,
      subset: subset,
      css: "/dev/null",
    });

    // Generate @font-face styles.
    const fontFaceStyles = this.generateFontFaceStyles(fontname);

    // Write the font-face styles to font-styles.css.
    // fs.writeFileSync(path.join(dst, "font-styles.css"), fontFaceStyles);
    fs.writeFileSync(
      path.join(path.dirname(src), "..", "styles", "fonts.scss"),
      fontFaceStyles
    );
    return new CompileResultSuccess(files);
  }

  generateFontFaceStyles(fontname) {
    const formats = ["ttf", "eot", "woff2"];

    const fontFace = `@font-face {
      font-family: "${fontname}";
      src: ${formats
        .map(
          (format) =>
            `url("../fonts/${fontname}.${format}") format("${format}")`
        )
        .join(",\n    ")};
      font-weight: normal;
      font-style: normal;
    }`;

    return fontFace;
  }

  /**
   * Determines whether the previously generated files are still valid and can
   * be reused.
   */
  async [REUSE](src, dst, files) {
    let { mtime: sourceTimestamp } = await fs.promises.stat(src);

    // The null value means that no compilation has occurred before. A Date
    // object holds the time of the last compilation.
    let lastCompilationTimestamp = null;

    for (let file of files) {
      // This is the path to a generated file.
      let generatedFile = path.join(dst, file);

      if (!fs.existsSync(generatedFile)) {
        // A file is missing. We can't reuse existing assets.
        return false;
      }

      let { mtime: modificationTime } = await fs.promises.stat(generatedFile);

      if (
        lastCompilationTimestamp === null ||
        lastCompilationTimestamp.getTime() > modificationTime.getTime()
      ) {
        // Oldest compilation time.
        lastCompilationTimestamp = modificationTime;
      }
    }

    // If the modification date of the source file is less than that of the
    // compiled files then there is a very good chance that it was not changed
    // therefore we can reuse the existing assets.
    return sourceTimestamp.getTime() < lastCompilationTimestamp.getTime();
  }

  /*
   * Generates a list of absolute file paths to the font files referenced in the
   * source list of a task.
   */
  async [COLLECT_FONTS](task) {
    const fontFiles = [];

    for (let src of task.src) {
      const srcStat = await fs.promises.stat(src);

      if (srcStat.isDirectory()) {
        fontFiles.push.apply(
          fontFiles,
          fs
            .readdirSync(src)
            // We only want font files.
            .filter((file) => {
              let extension = path.extname(file);
              return extension == ".ttf" || extension == ".otf";
            })
            // The file names returned by readdirSync don't contain the directory
            // path so we have to put it in.
            .map((file) => path.resolve(src, file))
        );
      } else {
        fontFiles.push(path.resolve(src));
      }
    }

    return fontFiles;
  }

  /**
   * A list of files that were generated in the last compilation. Files are
   * relative to the output path.
   * @returns {string[]}
   */
  lastResults() {
    return this[LAST_RESULTS].concat();
  }
};
