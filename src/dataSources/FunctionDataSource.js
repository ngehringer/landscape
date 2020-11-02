import * as core from '@backwater-systems/core';
import BaseDataSource from './BaseDataSource.js';


/**
 * A data source utilizing a JavaScript function that returns a string as its provider
 * @extends BaseDataSource
 * @param {Function} dataFunction The data provider function
 * @param {boolean} [debug=false] Debug mode is enabled
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
      'debug': debug
    });

    if ( !core.utilities.validateType(dataFunction, Function) ) throw new core.errors.TypeValidationError('dataFunction', Function);

    /**
     * A reference to the data function
     * @type {Function}
     * @private
     */
    this.dataFunction = dataFunction;
  }

  async fetchCore() {
    return this.dataFunction();
  }
}


export default FunctionDataSource;