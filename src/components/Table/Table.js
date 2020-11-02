import * as core from '@backwater-systems/core';
import * as dataSources from '../../dataSources/index.js';
import FlyoutPanel from '../FlyoutPanel/FlyoutPanel.js';
import LandscapeComponent from '../LandscapeComponent.js';


class Table extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${Table.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG,
      SERVER_SIDE_RENDERING: false
    });
  }

  static get REFERENCE() {
    const HTML_CLASS_NAME = `Landscape-${Table.name}`;

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
        REFRESH_BUTTON: `${HTML_CLASS_NAME}-refresh-button`,
        TABLE: `${HTML_CLASS_NAME}-table`,
        TABLE_BODY: `${HTML_CLASS_NAME}-table-body`,
        TABLE_CELL: `${HTML_CLASS_NAME}-table-cell`,
        TABLE_CONTAINER: `${HTML_CLASS_NAME}-table-container`,
        TABLE_FOOTER: `${HTML_CLASS_NAME}-table-footer`,
        TABLE_HEADER: `${HTML_CLASS_NAME}-table-header`,
        TABLE_ROW: `${HTML_CLASS_NAME}-table-row`
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
    serverSideRendering = Table.DEFAULTS.SERVER_SIDE_RENDERING,
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

      // define whether the table’s contents will be rendered with pre-generated HTML
      this.serverSideRendering = core.utilities.validateType(serverSideRendering, Boolean)
        ? serverSideRendering
        : Table.DEFAULTS.SERVER_SIDE_RENDERING
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

  async load() {
    this.logDebug(`${Table.prototype.load.name}`);

    const data = await this.dataSource.fetch();

    // event callback: “dataSourceFetch”
    if (this._eventCallbackDataSourceFetch !== null) {
      this._eventCallbackDataSourceFetch(data);
    }
  }

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(Table.REFERENCE.HTML_CLASS_NAME._);

    this.tableContainerElement = this.element.querySelector(`.${Table.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER}`);
    // create the table container element, if necessary
    if (this.tableContainerElement === null) {
      this.tableContainerElement = document.createElement('div');
      this.tableContainerElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.TABLE_CONTAINER);
      // add the table container to the DOM
      this.element.appendChild(this.tableContainerElement);
    }
  }

  _renderTable(data) {
    if (this.serverSideRendering) {
      // render the table with pre-generated HTML
      this._renderTableHTML(data.text);
    }
    else {
      // render the table with HTML generated from JSON data
      this._renderTableJSON(data.json);
    }

    this._renderTablePrimaryControls();
    this._renderTablePaginationControls();
    this._renderTableColumnControls();

    // event callback: “tableRender”
    if (this._eventCallbackTableRender !== null) {
      this._eventCallbackTableRender(this.tableContainerElement);
    }
  }

  _renderTableColumnControls() {
    // render the column sorting and filter controls
    const tableHeaderCellElementList = this.tableContainerElement.querySelectorAll(`.${Table.REFERENCE.HTML_CLASS_NAME.TABLE} .${Table.REFERENCE.HTML_CLASS_NAME.TABLE_HEADER} .${Table.REFERENCE.HTML_CLASS_NAME.TABLE_CELL}`);
    for (let tableHeaderCellElementIndex = 0; tableHeaderCellElementIndex < tableHeaderCellElementList.length; ++tableHeaderCellElementIndex) {
      const tableHeaderCellElement = tableHeaderCellElementList[tableHeaderCellElementIndex];

      const columnID = tableHeaderCellElement.getAttribute(Table.REFERENCE.DATA_ATTRIBUTE_NAME.COLUMN_ID);

      // ensure the associated column can be determined
      if ( !core.utilities.isNonEmptyString(columnID) ) {
        this.logWarning(`Column ${core.utilities.formatNumber(tableHeaderCellElementIndex + 1)} does not specify a valid “${Table.REFERENCE.DATA_ATTRIBUTE_NAME.COLUMN_ID}” attribute value.`);

        return;
      }

      // define the column’s name
      const columnName = tableHeaderCellElement.textContent;

      // remove the header cell’s existing contents
      tableHeaderCellElement.textContent = null;

      // create a flexible column container with centered contents
      const flexColumnContainerElement = document.createElement('div');
      flexColumnContainerElement.classList.add(
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN_CONTAINER,
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN_CONTAINER_CENTERED_CROSS_AXIS
      );
      tableHeaderCellElement.appendChild(flexColumnContainerElement);

      // wrap the column name in a compact flexible column
      const columnNameElement = document.createElement('div');
      columnNameElement.classList.add(
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN,
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN_COMPACT
      );
      columnNameElement.textContent = columnName;
      flexColumnContainerElement.appendChild(columnNameElement);

      // create an element for the column controls flyout panel

      const columnOptionsFlyoutPanelElement = document.createElement('div');
      columnOptionsFlyoutPanelElement.classList.add(
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME._,
        // flexible column (compact)
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN,
        Table.REFERENCE.HTML_CLASS_NAME.FLEX_COLUMN_COMPACT
      );

      const flyoutPanelSwitchElement = document.createElement('div');
      flyoutPanelSwitchElement.classList.add(
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH,
        Table.REFERENCE.HTML_CLASS_NAME.COMPACT
      );
      columnOptionsFlyoutPanelElement.appendChild(flyoutPanelSwitchElement);

      const flyoutPanelContentsElement = document.createElement('div');
      flyoutPanelContentsElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.CONTENTS);
      columnOptionsFlyoutPanelElement.appendChild(flyoutPanelContentsElement);

      // create an element for the column controls menu

      const columnOptionsMenuListElement = document.createElement('ul');
      columnOptionsMenuListElement.classList.add(
        Table.REFERENCE.HTML_CLASS_NAME.MENU,
        Table.REFERENCE.HTML_CLASS_NAME.COMPACT
      );
      flyoutPanelContentsElement.appendChild(columnOptionsMenuListElement);

      // Sorting

      const sortingMenuHeadingListItemElement = document.createElement('li');
      sortingMenuHeadingListItemElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.INACTIVE);
      columnOptionsMenuListElement.appendChild(sortingMenuHeadingListItemElement);

      const sortingHeadingElement = document.createElement('div');
      sortingHeadingElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.MENU_HEADING);
      sortingHeadingElement.textContent = 'Sorting';
      sortingMenuHeadingListItemElement.appendChild(sortingHeadingElement);

      // ↑ Sort Ascending

      const sortAscendingListItemElement = document.createElement('li');
      columnOptionsMenuListElement.appendChild(sortAscendingListItemElement);

      const sortAscendingLabelElement = document.createElement('label');
      sortAscendingLabelElement.title = `Sort the table by the values in “${columnName}” ascending`;
      sortAscendingListItemElement.appendChild(sortAscendingLabelElement);

      const sortAscendingInputElement = document.createElement('input');
      sortAscendingInputElement.name = `sort_${columnID}`;
      sortAscendingInputElement.type = 'radio';
      sortAscendingInputElement.value = 'asc';
      sortAscendingLabelElement.appendChild(sortAscendingInputElement);

      sortAscendingLabelElement.appendChild(
        document.createTextNode(`${Table.REFERENCE.SYMBOLS.ASCENDING_SORT} Sort Ascending`)
      );

      // ↓ Sort Descending

      const sortDescendingListItemElement = document.createElement('li');
      columnOptionsMenuListElement.appendChild(sortDescendingListItemElement);

      const sortDescendingLabelElement = document.createElement('label');
      sortDescendingLabelElement.title = `Sort the table by the values in “${columnName}” descending`;
      sortDescendingListItemElement.appendChild(sortDescendingLabelElement);

      const sortDescendingInputElement = document.createElement('input');
      sortDescendingInputElement.name = `sort_${columnID}`;
      sortDescendingInputElement.type = 'radio';
      sortDescendingInputElement.value = 'desc';
      sortDescendingLabelElement.appendChild(sortDescendingInputElement);

      sortDescendingLabelElement.appendChild(
        document.createTextNode(`${Table.REFERENCE.SYMBOLS.DESCENDING_SORT} Sort Descending`)
      );

      // ↕ Not Sorted

      const notSortedListItemElement = document.createElement('li');
      columnOptionsMenuListElement.appendChild(notSortedListItemElement);

      const notSortedLabelElement = document.createElement('label');
      notSortedLabelElement.title = `Do not sort the table by the values in “${columnName}”`;
      notSortedListItemElement.appendChild(notSortedLabelElement);

      const notSortedInputElement = document.createElement('input');
      notSortedInputElement.name = `sort_${columnID}`;
      notSortedInputElement.type = 'radio';
      notSortedInputElement.value = '';
      notSortedInputElement.checked = true;
      notSortedLabelElement.appendChild(notSortedInputElement);

      notSortedLabelElement.appendChild(
        document.createTextNode(`${Table.REFERENCE.SYMBOLS.NOT_SORTED} Not Sorted`)
      );

      // Filtering

      const filteringMenuHeadingListItemElement = document.createElement('li');
      filteringMenuHeadingListItemElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.INACTIVE);
      columnOptionsMenuListElement.appendChild(filteringMenuHeadingListItemElement);

      const filteringHeadingElement = document.createElement('div');
      filteringHeadingElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.MENU_HEADING);
      filteringHeadingElement.textContent = 'Filtering';
      filteringMenuHeadingListItemElement.appendChild(filteringHeadingElement);

      flexColumnContainerElement.appendChild(columnOptionsFlyoutPanelElement);

      const columnOptionsFlyoutPanel = new FlyoutPanel({
        'debug': this.debug,
        'targetElement': columnOptionsFlyoutPanelElement
      });
      this.columnOptionsFlyoutPanelList.push({
        [columnName]: columnOptionsFlyoutPanel
      });
    }

    // TODO: Finish implementation
  }

  _renderTableHTML(html) {
    this.logDebug(`${Table.prototype._renderTableHTML.name} → html: ${core.utilities.isNonEmptyString(html) ? `${core.utilities.formatNumber(html.length)} ${core.utilities.pluralize('byte', html.length)}` : '[invalid]'}`);

    // insert the fetched markup into the table container element
    core.webUtilities.injectHTML({
      'debug': this.debug,
      'html': html,
      'replace': true,
      'target': this.tableContainerElement
    });
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
  _renderTablePrimaryControls() {
    this.logDebug(`${Table.prototype._renderTablePrimaryControls.name}`);

    // create a table refresh button
    this.rowControlsButtonElement = document.createElement('div');
    this.rowControlsButtonElement.classList.add(Table.REFERENCE.HTML_CLASS_NAME.REFRESH_BUTTON);
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


export default Table;