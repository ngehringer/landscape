import * as core from '@backwater-systems/core';
import BaseDataSource from './BaseDataSource.js';


/**
 * A data source utilizing an in-memory JavaScript object as its store
 * @extends BaseDataSource
 * @param {Object} dataObject The data object
 * @param {boolean} [debug=false] Debug mode is enabled
 */
class ObjectDataSource extends BaseDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${ObjectDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: BaseDataSource.DEFAULTS.DEBUG
    });
  }

  constructor({
    dataObject,
    debug = ObjectDataSource.DEFAULTS.DEBUG
  }) {
    super({
      'debug': debug
    });

    if ( !core.utilities.validateType(dataObject, Object) ) throw new core.errors.TypeValidationError('dataObject', Object);

    /**
     * A cached reference to the data object
     * @type {Object}
     * @private
     */
    this.dataObject = dataObject;
  }

  fetchCore() {
    return this.dataObject;
  }
}


export default ObjectDataSource;