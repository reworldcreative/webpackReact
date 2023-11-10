const path = require("path");
const htmlWebpackPlugin = require("html-webpack-plugin");
const isProduction = process.env.NODE_ENV === "production";
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const FontfacegenWebpackPlugin = require("./plugins/fontfacegen-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");
const ImageminWebpWebpackPlugin = require("imagemin-webp-webpack-plugin");
const ReplaceImgWithPicturePlugin = require("./plugins/replace-img-with-picture");
const HtmlCriticalWebpackPlugin = require("html-critical-webpack-plugin");
const webpack = require("webpack");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode: isProduction ? "production" : "development",
  devtool: isProduction ? false : "inline-source-map",
  entry: {
    filename: path.resolve(__dirname, "src/index.tsx"),
  },
  output: {
    filename: "[name][contenthash].js",
    path: path.resolve(__dirname, "dist"),
    // assetModuleFilename: "img/[name][ext]",
    assetModuleFilename: (pathData) => {
      return `img/${pathData.filename.split("src/img")[1].slice(1)}`;
    },
    // clean: true,
  },

  optimization: isProduction
    ? {
        minimize: true,
        runtimeChunk: "single",
        splitChunks: {
          chunks: "all",
        },
        usedExports: true,
        moduleIds: "deterministic",
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
              },
              output: {
                comments: false,
                beautify: false,
              },
            },
            extractComments: false,
          }),
        ],
      }
    : {},
  performance: {
    hints: false,
    maxAssetSize: 512000,
    maxEntrypointSize: 512000,
  },
  devServer: {
    port: 3000,
    compress: true,
    hot: true,
    static: {
      directory: path.join(__dirname, "dist"),
    },
    historyApiFallback: true,
  },

  module: {
    rules: [
      {
        test: /\.(jsx|js)?$/,
        // use: "babel-loader",
        use: {
          loader: "babel-loader",
          options: {
            compact: isProduction ? true : false,
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(tsx|ts)?$/,
        // use: ["babel-loader", "ts-loader"],
        use: [
          {
            loader: "babel-loader",
            options: {
              compact: isProduction ? true : false,
            },
          },
          "ts-loader",
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          // "css-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: isProduction ? true : false,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                path: path.resolve(__dirname, "postcss.config.js"),
              },
            },
          },
          // "sass-loader",
          {
            loader: "sass-loader",
            options: {
              sourceMap: isProduction ? true : false,
            },
          },
        ],
      },
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "fonts/[name][ext]",
        },
      },
      {
        test: /\.(png|jpg|jpeg|svg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: (pathData) => {
            return `img/${pathData.filename.split("src/img")[1].slice(1)}`;
          },
          // outputPath: "img/",
        },
        // use: [
        //   {
        //     loader: "file-loader",
        //     options: {
        //       name: "[path][name].[ext]",
        //       outputPath: "img/",
        //       context: path.resolve(__dirname, "src/img"),
        //     },
        //   },
        // ],
      },

      {
        test: /\.html$/i,
        loader: "html-loader",
        options: {
          sources: {
            list: [
              {
                tag: "img",
                attribute: "src",
                type: "src",
              },
            ],
          },
        },
      },
    ],
  },

  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {
      "@": path.resolve(__dirname, "src/"),
    },
  },

  plugins: [
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: ["**/*", "!fonts/**"],
    }),
    new FontfacegenWebpackPlugin({
      tasks: [path.resolve(__dirname, "src/fonts")],
    }),
    new ReplaceImgWithPicturePlugin(),
    new htmlWebpackPlugin({
      filename: "index.html",
      template: "src/index.html",
    }),
    new MiniCssExtractPlugin({
      filename: "[name][contenthash].css",
    }),
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [
            [
              "gifsicle",
              {
                optimizationLevel: 5,
                // interlaced: true,
                // colors: 256,
                // lossy: 80,
              },
            ],
            [
              "jpegtran",
              {
                progressive: true,
                arithmetic: false,
                copy: "none",
                perfect: false,
              },
            ],
            [
              "optipng",
              {
                optimizationLevel: 5,
                buffer: 4096,
                // bitDepthReduction: true,
                // colorTypeReduction: true,
                // paletteReduction: true,
                // interlaced: true,
                verbose: false,
                idat: 3,
              },
            ],
            [
              "svgo",
              {
                plugins: [
                  {
                    name: "preset-default",
                    params: {
                      overrides: {
                        removeViewBox: false,
                        //   removeDimensions: true,
                        // removeAttrs: { attrs: '(stroke|fill)' },
                        // cleanupIDs: true,
                        // addAttributesToSVGElement: {
                        //   params: {
                        //     attributes: [
                        //       { xmlns: "http://www.w3.org/2000/svg" },
                        //     ],
                        //   },
                        // },
                      },
                    },
                  },
                ],
              },
            ],
          ],
        },
        // filename: "img/[name][ext]",
      },
    }),
    new ImageminWebpWebpackPlugin(),
    isProduction
      ? new HtmlCriticalWebpackPlugin({
          base: path.join(path.resolve(__dirname), "dist"),
          src: "index.html",
          dest: "index.html",
          // css: ["./src/styles/main.scss"],
          inline: true,
          minify: true,
          extract: false,
        })
      : false,

    new webpack.ProvidePlugin({
      $: "jquery",
      _: "lodash",
      React: "react",
      ReactDOM: "react-dom",
      ReactRouter: "react-router-dom",
      ReactQuery: "react-query",
      Redux: "redux",
      ReactRedux: "react-redux",
      ReduxToolkit: "@reduxjs/toolkit",
      ReactQueryDevtools: "react-query/devtools",
      ReactRouterConfig: "react-router-config",
      useEffect: ["react", "useEffect"],
      useState: ["react", "useState"],
      useContext: ["react", "useContext"],
      useMemo: ["react", "useMemo"],
      useRef: ["react", "useRef"],
      cssModule: "react-css-modules",
      Promise: "bluebird",
      axios: "axios",
      moment: "moment",
      classNames: "classnames",
      MaterialUIIcons: "@material-ui/icons",
    }),
    new FaviconsWebpackPlugin({
      persistentCache: true,
      // logo: "./src/img/webpack.jpg",
      logo: "./src/favicon.jpg",
      prefix: "img/",
      emitStats: false,

      favicons: {
        appName: "webpack react",
        appDescription: "webpack react application",
        developerURL: null,
        background: "rgba(0, 0, 0, 0)",
        icons: {
          android: true,
          appleIcon: true,
          appleStartup: false,
          coast: false,
          favicons: true,
          windows: true,
          yandex: false,
        },

        // sizes: {
        //   android: [36, 48, 72, 96, 144, 192, 512],
        //   appleIcon: [57, 60, 72, 76, 114, 120, 144, 152, 180],
        //   favicons: [16, 32, 96],
        //   windows: [16, 32, 48, 62],
        // },
      },
    }),
  ],
};
