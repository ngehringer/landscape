import * as dataSources from '../../dataSources/index.js';
import Table from '../Table/Table.js';


/**
 * A table for data input.
 * @extends Table
 */
class InputTable extends Table {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${InputTable.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: Table.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${InputTable.name}`;

    return Object.freeze({
      DATA_ATTRIBUTE_NAME: Object.freeze({
        COLUMN_ID: 'data-column-id'
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        COMPACT: 'Landscape-compact',
        FLEX_COLUMN: 'Landscape-flex-column',
        FLEX_COLUMN_COMPACT: 'Landscape-flex-column-compact',
        FLEX_COLUMN_CONTAINER: 'Landscape-flex-column-container',
        FLEX_COLUMN_CONTAINER_CENTERED_CROSS_AXIS: 'Landscape-flex-column-container-centered-cross-axis',
        INACTIVE: 'Landscape-inactive',
        MENU: 'Landscape-menu',
        MENU_HEADING: 'Landscape-menu-heading',
        TABLE: `${HTML_CLASS_NAME}-table`,
        TABLE_BODY: `${HTML_CLASS_NAME}-table-body`,
        TABLE_CELL: `${HTML_CLASS_NAME}-table-cell`,
        TABLE_CONTAINER: `${HTML_CLASS_NAME}-table-container`,
        TABLE_FOOTER: `${HTML_CLASS_NAME}-table-footer`,
        TABLE_HEADER: `${HTML_CLASS_NAME}-table-header`,
        TABLE_ROW: `${HTML_CLASS_NAME}-table-row`,
        TABLE_ROW_CONTROLS: `${HTML_CLASS_NAME}-table-row-controls`
      }),
      SYMBOLS: Object.freeze({
        ASCENDING_SORT: '↑',
        DESCENDING_SORT: '↓',
        NOT_SORTED: '↕',
        REFRESH: '⟳'
      })
    });
  }

  constructor({
    dataSource,
    dataSourceFetchEvent = null,
    debug = Table.DEFAULTS.DEBUG,
    tableRenderEvent = null,
    targetElement,
    targetHTMLID
  }) {
    super({
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      this.columnOptionsFlyoutPanelList = [];

      /**
       * An event callback that fires after the table’s `DataSource` emits a `fetch` event
       */
      this._eventCallbackDataSourceFetch = (typeof dataSourceFetchEvent === 'function')
        ? dataSourceFetchEvent
        : null
      ;

      /**
       * An event callback that fires after the table’s contents are rendered
       */
      this._eventCallbackTableRender = (typeof tableRenderEvent === 'function')
        ? tableRenderEvent.bind(this)
        : null
      ;

      /**
       * The `DataSource` that provides the input table’s data
       */
      this.dataSource = (
        (typeof dataSource === 'object')
        && (dataSource instanceof dataSources.BaseDataSource)
      )
        ? dataSource
        : null
      ;
      if (this.dataSource !== null) {
        // render the table on its `DataSource`’s `fetch` event
        this.dataSource.registerEventHandler(
          'fetch',
          async (data) => { await this._renderTable(data); }
        );

        // register the `DataSource`’s `fetchError` event handler
        this.dataSource.registerEventHandler(
          'fetchError',
          (error) => { this.logError(error); }
        );
      }

      // initialize the component
      this._initialize();

      // load the table’s data (asynchronously)
      setTimeout(
        async () => {
          try {
            await this.load();
          }
          catch (error) {
            this.logError(error);
          }
        },
        0
      );
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(InputTable.REFERENCE.HTML_CLASS_NAME._);

    /**
     * The table container `Element`
     */
    this.tableContainerElement = this.element.querySelector(`.${InputTable.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER}`);

    // create the table container element, if necessary
    if (this.tableContainerElement === null) {
      this.tableContainerElement = document.createElement('div');
      this.tableContainerElement.classList.add(InputTable.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER);
      // add the table container to the document
      this.element.appendChild(this.tableContainerElement);
    }
  }

  async _renderTable(data) {
    // render the table with HTML generated from JSON data
    this._renderTableJSON(data.json);

    this._renderTablePrimaryControls();
    this._renderTablePaginationControls();
    this._renderTableColumnControls();

    // event callback: `tableRender`
    if (this._eventCallbackTableRender !== null) {
      await this._eventCallbackTableRender(this.tableContainerElement);
    }
  }

  _renderTableJSON(data) {
    this.logDebug({
      _functionName: Table.prototype._renderTableJSON.name,
      data: data
    });

    // TODO: Implement
  }

  _renderTablePaginationControls() {
    // TODO: Implement
  }

  /**
   * Renders the global table controls: global filter, and reload button.
   */
  _renderRowControls() {
    this.logDebug({
      _functionName: Table.prototype._renderTablePrimaryControls.name
    });

    /**
     * The table row controls `Element`
     */
    this.tableRowControlsElement = document.createElement('div');
    this.tableRowControlsElement.classList.add(InputTable.REFERENCE.HTML_CLASS_NAME.TABLE_ROW_CONTROLS);
    this.element.appendChild(this.tableRowControlsElement);
  }
}


export default InputTable;