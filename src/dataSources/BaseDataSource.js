import * as core from '@backwater-systems/core';


/**
 * The `DataSource` abstract base class.
 * @abstract
 * @extends EventSource
 */
class BaseDataSource extends core.infrastructure.EventSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${BaseDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: core.infrastructure.EventSource.DEFAULTS.DEBUG,
      LOGGER: core.infrastructure.EventSource.DEFAULTS.LOGGER
    });
  }

  constructor({
    debug = BaseDataSource.DEFAULTS.DEBUG,
    logger = BaseDataSource.DEFAULTS.LOGGER
  }) {
    super({
      debug: debug,
      logger: logger
    });

    // abort if the extending class does not implement a `fetchCore` function
    if (typeof this.fetchCore !== 'function') throw new core.errors.ImplementationError('fetchCore', this.constructor.name);
  }

  _getLoggingSourceID() {
    return `${this.constructor.CLASS_NAME}:${BaseDataSource.prototype.fetch.name}`;
  }

  /**
   * Fetches the data via the extending `DataSource` class’s `fetchCore` function.
   */
  async fetch() {
    try {
      if (this.debug) {
        this.logger.logDebug({
          data: {},
          sourceID: this._getLoggingSourceID(),
          verbose: this.debug
        });
      }

      /**
       * The data fetched from the extending `DataSource` class’s `fetchCore` function
       */
      const data = await this.fetchCore();

      // emit a `fetch` event
      await this.sendEvent('fetch', data);

      return data;
    }
    catch (error) {
      // emit a `fetchError` event
      await this.sendEvent('fetchError', error);

      throw error;
    }
  }

  /**
   * Retrieves (potentially asynchronously) the data.
   * @function fetchCore
   * @abstract
   * @async
   * @protected
   * @return {Object} Data
   */
}


export default BaseDataSource;