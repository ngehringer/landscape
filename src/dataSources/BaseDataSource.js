import * as core from '@backwater-systems/core';


/**
 * The abstract base class for data sources
 * @abstract
 * @param {boolean} [debug=false] Debug mode is enabled
 */
class BaseDataSource extends core.infrastructure.EventSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${BaseDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: core.infrastructure.EventSource.DEFAULTS.DEBUG
    });
  }

  constructor({
    debug = BaseDataSource.DEFAULTS.DEBUG
  }) {
    super({
      'debug': debug
    });

    // ensure the extending class implements a “fetchCore” function
    if ( !core.utilities.validateType(this.fetchCore, Function) ) throw new core.errors.ImplementationError('fetchCore', this.constructor.name);
  }

  async fetch() {
    try {
      if (this.debug) {
        core.logging.Logger.logDebug('fetch', this.constructor.CLASS_NAME, this.debug);
      }

      // retrieve the data
      const data = await this.fetchCore();

      // emit a “fetch” event
      await this.sendEvent('fetch', data);

      return data;
    }
    catch (error) {
      // emit a “fetchError” event
      await this.sendEvent('fetchError', error);

      throw error;
    }
  }

  /**
   * Retrieve (potentially asynchronously) the data
   * @function fetchCore
   * @abstract
   * @async
   * @protected
   * @return {Object} Data
   */
}


export default BaseDataSource;