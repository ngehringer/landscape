import * as core from '@backwater-systems/core';

import BaseDataSource from './BaseDataSource.js';


/**
 * A `DataSource` that provides an encapsulated JavaScript object.
 * @extends BaseDataSource
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
      debug: debug
    });

    // abort if the specified `dataObject` parameter value is not an object
    if (
      (typeof dataObject !== 'object')
      || (dataObject === null)
    ) throw new core.errors.TypeValidationError('dataObject', Object);

    /**
     * A cached reference to the data object
     */
    this.dataObject = dataObject;
  }

  /**
   * Returns the `ObjectDataSource.dataObject` object.
   */
  fetchCore() {
    return this.dataObject;
  }
}


export default ObjectDataSource;