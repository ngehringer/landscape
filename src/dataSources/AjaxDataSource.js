import * as core from '@backwater-systems/core';

import BaseDataSource from './BaseDataSource.js';


/**
 * A `DataSource` that provides data retrieved via Ajax.
 * @extends BaseDataSource
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
      debug: debug
    });

    if (
      (typeof url !== 'string')
      || !core.utilities.validation.isNonEmptyString(url)
    ) throw new core.errors.TypeValidationError('url', String);

    /**
     * The HTTP request parameters for retrieving the data
     */
    this.parameters = (typeof parameters === 'object')
      ? parameters
      : null
    ;

    /**
     * The URL from which the data is retrieved
     */
    this.url = url;
  }

  /**
   * Returns the result of fetching the specified URL with an HTTP `GET` request.
   */
  async fetchCore() {
    /**
     * The result of the HTTP `GET` request to the specified URL
     */
    const data = await core.webUtilities.ajax.get({
      debug: this.debug,
      location: this.url,
      parameters: this.parameters
    });

    return data;
  }
}


export default AjaxDataSource;