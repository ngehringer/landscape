import * as core from '@backwater-systems/core';
import * as dataSources from '../../dataSources/index.js';
import Table from '../Table/Table.js';


class InputTable extends Table {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${InputTable.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: Table.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
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
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.columnOptionsFlyoutPanelList = [];

      this._eventCallbackDataSourceFetch = core.utilities.validateType(dataSourceFetchEvent, Function)
        ? dataSourceFetchEvent
        : null
      ;

      this._eventCallbackTableRender = core.utilities.validateType(tableRenderEvent, Function)
        ? tableRenderEvent
        : null
      ;

      // define the table’s data source
      this.dataSource = core.utilities.validateType(dataSource, dataSources.BaseDataSource)
        ? dataSource
        : null
      ;
      if (this.dataSource !== null) {
        // render the table on its data source’s “fetch” event
        this.dataSource.registerEventHandler(
          'fetch',
          (data) => { this._renderTable(data); }
        );

        // define the data source’s “fetchError” event handler
        this.dataSource.registerEventHandler(
          'fetchError',
          (error) => { this.logError(error); }
        );
      }

      this._initialize();

      // load the table’s data (asynchronously)
      // HACK
      setTimeout(
        (
          async () => {
            try {
              await this.load();
            }
            catch (error) {
              this.logError(error);
            }
          }
        ).bind(this),
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

    this.tableContainerElement = this.element.querySelector(`.${InputTable.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER}`);
    // create the table container element, if necessary
    if (this.tableContainerElement === null) {
      this.tableContainerElement = document.createElement('div');
      this.tableContainerElement.classList.add(InputTable.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER);
      // add the table container to the DOM
      this.element.appendChild(this.tableContainerElement);
    }
  }

  _renderTable(data) {
    // render the table with HTML generated from JSON data
    this._renderTableJSON(data.json);

    this._renderTablePrimaryControls();
    this._renderTablePaginationControls();
    this._renderTableColumnControls();

    // event callback: “tableRender”
    if (this._eventCallbackTableRender !== null) {
      this._eventCallbackTableRender(this.tableContainerElement);
    }
  }

  _renderTableJSON(data) {
    this.logDebug(`${Table.prototype._renderTableJSON.name}`);

    // TODO: Implement
    console.log(data);
  }

  _renderTablePaginationControls() {
    // TODO: Implement
  }

  /**
   * Renders the global table controls: global filter, and reload button.
   * @return {void}
   */
  _renderRowControls() {
    this.logDebug(`${Table.prototype._renderTablePrimaryControls.name}`);

    // create a row controls button
    this.rowControlsButtonElement = document.createElement('button');
    this.rowControlsButtonElement.classList.add(InputTable.REFERENCE.HTML_CLASS_NAME.ROW_CONTROLS_BUTTON);
    this.rowControlsButtonElement.textContent = Table.REFERENCE.SYMBOLS.REFRESH;
    this.rowControlsButtonElement.title = 'Refresh the table contents.';
    this.element.appendChild(this.rowControlsButtonElement);

    this.rowControlsButtonElement.addEventListener(
      'click',
      async (event) => {
        try {
          await this.load();
        }
        catch (error) {
          this.logError(error);
        }
      }
    );
  }
}


export default InputTable;