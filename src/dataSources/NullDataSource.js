import BaseDataSource from './BaseDataSource.js';


/**
 * A `DataSource` that provides `null`.
 * @extends BaseDataSource
 */
class NullDataSource extends BaseDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${NullDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: BaseDataSource.DEFAULTS.DEBUG
    });
  }

  constructor({
    debug = NullDataSource.DEFAULTS.DEBUG
  }) {
    super({
      debug: debug
    });
  }

  /**
   * Returns `null`.
   */
  fetchCore() {
    return null;
  }
}


export default NullDataSource;