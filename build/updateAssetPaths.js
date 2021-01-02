import * as fs from 'fs/promises';
import replaceInFile from 'replace-in-file';


/** The path of the “@backwater-systems/core” mode asset */
const BACKWATER_SYSTEMS_CORE_ASSET_PATH = 'assets/backwater-systems/core/index.js';

/**
 * Updates the `import` references of the `@backwater-systems/core` module with the appropriate relative path.
 */
const replaceInPath = async (path) => {
  const replaceRegExp = /import \* as core from '@backwater-systems\/core';/g;

  const directoryDepth = Array.from(path).reduce(
    (accumulator, character) => (accumulator += (character === '/') ? 1 : 0),
    0
  );

  const replacement = `import * as core from '${[ ...Array(directoryDepth) ].map( () => '../' ).join('')}${BACKWATER_SYSTEMS_CORE_ASSET_PATH}';`;

  const replaceInFileResults = await replaceInFile({
    allowEmptyPaths: true,
    countMatches: true,
    files: `${path}/*.js`,
    from: replaceRegExp,
    to: replacement
  });

  const replacementSummaries = replaceInFileResults
    .filter( (replaceInFileResult) => replaceInFileResult.hasChanged )
    .map(
      (replaceInFileResult) => ({
        fileName: replaceInFileResult.file,
        matchRegExp: replaceRegExp.source,
        replacementCount: replaceInFileResult.numReplacements,
        replacementString: replacement
      })
    )
  ;

  for (const replacementSummary of replacementSummaries) {
    console.log(`${replacementSummary.fileName}: Made ${replacementSummary.replacementCount.toLocaleString()} replacement${(replacementSummary.replacementCount === 1) ? '' : 's'} of /${replacementSummary.matchRegExp}/ with “${replacementSummary.replacementString}”.`);
  }

  // execute recursively in child directories …
  const childPaths = (
    await fs.readdir(
      path,
      {
        withFileTypes: true
      }
    )
  )
    .filter( (dirent) => dirent.isDirectory() )
    .map( (dirent) => dirent.name )
  ;
  for (const childPath of childPaths) {
    await replaceInPath(`${path}/${childPath}`);
  }
};

(
  async () => {
    try {
      await replaceInPath('dist');
    }
    catch (error) {
      console.log(error);
    }
  }
)();