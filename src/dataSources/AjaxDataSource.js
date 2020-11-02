import * as core from '@backwater-systems/core';
import BaseDataSource from './BaseDataSource.js';


/**
 * Provides data that is retrieved via Ajax calls
 * @extends BaseDataSource
 * @param {boolean} [debug=false] Debug mode is enabled
 * @param {Object} [parameters] Request parameters used for retrieving data
 * @param {string} url URL from which the data is retrieved
 */
class AjaxDataSource extends BaseDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${AjaxDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: BaseDataSource.DEFAULTS.DEBUG
    });
  }

  constructor({
    debug = AjaxDataSource.DEFAULTS.DEBUG,
    parameters,
    url
  }) {
    super({
      'debug': debug
    });

    if ( !core.utilities.isNonEmptyString(url) ) throw new core.errors.TypeValidationError('url', String);

    /**
     * URL from which the data is retrieved
     * @type {string}
     * @private
     */
    this.url = url;

    /**
     * Request parameters used for retrieving data
     * @type {string}
     * @private
     */
    this.parameters = core.utilities.isNonEmptyString(url)
      ? parameters
      : null
    ;
  }

  async fetchCore() {
    const data = await core.webUtilities.ajax.get({
      'debug': this.debug,
      'location': this.url,
      'parameters': this.parameters
    });

    return data;
  }
}


export default AjaxDataSource;