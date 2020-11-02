const del = require('del');
const gulp = require('gulp');
const gulpReplace = require('gulp-replace');


// define the base destination path
const DESTINATION_PATH = './dist';
// define the base source path
const SOURCE_PATH = './src';

// define the paths of the included external assets
const ASSET_PATHS = Object.freeze({
  BACKWATER_CORE: Object.freeze({
    DESTINATION: `${DESTINATION_PATH}/assets/backwater-systems/core/`,
    PACKAGE: `assets/backwater-systems/core/index.js`,
    SOURCE: './node_modules/@backwater-systems/core/dist/'
  })
});

function clean() {
  // remove everything in the destination folder
  return del(`${DESTINATION_PATH}/**`);
}

function packageAssetsBackwaterCore() {
  // copy the Backwater Core library to the destination assets folder
  return gulp
    .src(`${ASSET_PATHS.BACKWATER_CORE.SOURCE}/**`)
    .pipe(
      gulp.dest(`${ASSET_PATHS.BACKWATER_CORE.DESTINATION}`)
    )
  ;
}

function packageCSS() {
  return gulp
    // copy the CSS files in the source folder …
    .src(`${SOURCE_PATH}/**/*.css`)
    .pipe(
      // … and output in the destination folder
      gulp.dest(`${DESTINATION_PATH}/`)
    )
  ;
}

function packageJavaScript() {
  return gulp
    // copy the JavaScript files in the source folder …
    .src(`${SOURCE_PATH}/**/*.js`)
    .pipe(
      // … update the references of the “@backwater-systems/core” package to its package path …
      gulpReplace(
        /import \* as core from '@backwater-systems\/core';/g,
        function (match, offset, text) {
          // determine the relative path of the Backwater Core library
          const depth = Array.from(this.file.relative)
            .map(
              (value) => (value === '/')
                ? 1
                : 0
            )
            .reduce(
              (previousValue, currentValue) => (previousValue + currentValue),
              0
            )
          ;
          const backwaterCoreRelativePath = `${
            [ ...Array(depth) ]
              .map(
                () => '../'
              )
              .join('')
          }${ASSET_PATHS.BACKWATER_CORE.PACKAGE}`;

          const replacement = `import * as core from '${backwaterCoreRelativePath}';`;

          console.log(`Replaced “${match}” with “${replacement}” at (./${this.file.relative}::${offset.toLocaleString()}:${text.length.toLocaleString()}).`);

          return replacement;
        }
      )
    )
    .pipe(
      // … and output in the destination folder
      gulp.dest(`${DESTINATION_PATH}/`)
    )
  ;
}


exports.build = gulp.series(
  clean,
  gulp.parallel(
    // package the application’s external assets …
    gulp.parallel(
      // … Backwater Core
      packageAssetsBackwaterCore
    ),
    // package the application’s CSS
    packageCSS,
    // package the application’s JavaScript source code
    packageJavaScript
  )
);