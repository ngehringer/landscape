import * as core from '@backwater-systems/core';

import BaseDataSource from './BaseDataSource.js';


/**
 * A `DataSource` that provides data via executing a JavaScript function.
 * @extends BaseDataSource
 */
class FunctionDataSource extends BaseDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${FunctionDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: BaseDataSource.DEFAULTS.DEBUG
    });
  }

  constructor({
    dataFunction,
    debug = FunctionDataSource.DEFAULTS.DEBUG
  }) {
    super({
      debug: debug
    });

    // abort if the specified `dataFunction` parameter value is not a function
    if (typeof dataFunction !== 'function') throw new core.errors.TypeValidationError('dataFunction', Function);

    /**
     * The function that provides the data
     */
    this.dataFunction = dataFunction;
  }

  /**
   * Returns the result of executing the `FunctionDataSource.dataFunction()` function.
   */
  fetchCore() {
    return this.dataFunction();
  }
}


export default FunctionDataSource;