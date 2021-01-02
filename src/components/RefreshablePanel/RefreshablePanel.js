import * as core from '@backwater-systems/core';

import * as dataSources from '../../dataSources/index.js';
import LandscapeComponent from '../LandscapeComponent.js';

/**
 * A panel with contents that can be refreshed by fetching from a `DataSource`.
 */
class RefreshablePanel extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${RefreshablePanel.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${RefreshablePanel.name}`;

    return Object.freeze({
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        CONTENTS: `${HTML_CLASS_NAME}-contents`,
        INDICATOR: `${HTML_CLASS_NAME}-indicator`
      }),
      SYMBOLS: Object.freeze({
        REFRESH: '⟳',
        STARTED: '◈',
        STOPPED: '◇'
      })
    });
  }

  constructor({
    contentsRenderEvent = null,
    dataSource,
    debug = RefreshablePanel.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID
  }) {
    super({
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      if (
        (typeof dataSource !== 'object')
        || !(dataSource instanceof dataSources.BaseDataSource)
      ) throw new core.errors.TypeValidationError('dataSource', dataSources.BaseDataSource);

      /**
       * An event callback that fires after the panel’s contents are rendered
       */
      this._eventCallbackContentsRender = (typeof contentsRenderEvent === 'function')
        ? contentsRenderEvent.bind(this)
        : null
      ;

      /**
       * The `DataSource` that provides the panel’s contents
       */
      this.dataSource = dataSource;

      /**
       * Indicates whether the panel’s `DataSource` has an automatic fetch timer that can be started and stopped
       */
      this.timedDataSource = (this.dataSource instanceof dataSources.TimedAjaxDataSource);

      // register the `DataSource`’s `fetch` event handler
      this.dataSource.registerEventHandler(
        'fetch',
        this._eventDataSourceFetch.bind(this)
      );

      // register the `DataSource`’s `fetchError` event handler
      this.dataSource.registerEventHandler(
        'fetchError',
        this._eventDataSourceFetchError.bind(this)
      );

      if (this.timedDataSource) {
        // register the `DataSource`’s `startTimer` event handler
        this.dataSource.registerEventHandler(
          'startTimer',
          () => {
            this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STARTED);
          }
        );

        // register the `DataSource`’s `stopTimer` event handler
        this.dataSource.registerEventHandler(
          'stopTimer',
          () => {
            this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STOPPED);
          }
        );
      }

      // initialize the component
      this._initialize();

      // load the panel’s contents (asynchronously)
      setTimeout(
        async () => {
          try {
            await this.refresh();
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

  /**
   * Refreshes the contents of the panel by fetching the component’s `DataSource`.
   */
  async refresh() {
    this.logDebug({
      _functionName: RefreshablePanel.prototype.refresh.name
    });

    await this.dataSource.fetch();
  }

  async _eventDataSourceFetch(data) {
    this.logDebug({
      _functionName: RefreshablePanel.prototype._eventDataSourceFetch.name,
      data: data
    });

    if (
      (typeof data !== 'string')
      || !core.utilities.validation.isNonEmptyString(data)
    ) throw new core.errors.TypeValidationError('data', String);

    await this._renderContents(data);
  }

  _eventDataSourceFetchError(error) {
    this.logDebug({
      _functionName: RefreshablePanel.prototype._eventDataSourceFetchError.name,
      error: error
    });

    // log the error
    this.logError(error);
  }

  async _eventIndicatorClick(event) {
    try {
      this.logDebug({
        _functionName: RefreshablePanel.prototype._eventIndicatorClick.name,
        event: event
      });

      // for a timed `DataSource` …
      if (this.timedDataSource) {
        // … if its timer is started …
        if (this.dataSource.timerStarted) {
          // … stop automatically fetching
          await this.dataSource.stopTimer();
        }
        // … otherwise, if its timer is stopped …
        else {
          // … refresh the panel’s contents …
          await this.refresh();

          // … and start automatically fetching
          await this.dataSource.startTimer();
        }
      }
      // … otherwise, for a non-timed `DataSource` …
      else {
        // … refresh the panel’s contents
        await this.refresh();
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(RefreshablePanel.REFERENCE.HTML_CLASS_NAME._);

    /**
     * The panel status indicator `Element`
     */
    this.indicatorElement = document.createElement('div');
    this.indicatorElement.classList.add(RefreshablePanel.REFERENCE.HTML_CLASS_NAME.INDICATOR);
    // timed `DataSource` …
    if (this.timedDataSource) {
      // … with a started timer
      if (this.dataSource.timerStarted) {
        this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STARTED);
      }
      // … with a stopped timer
      else {
        this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STOPPED);
      }
    }
    // … otherwise, non-timed `DataSource`
    else {
      this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.REFRESH);
    }
    this.element.appendChild(this.indicatorElement);

    // handle the indicator’s `click` event
    this.indicatorElement.addEventListener(
      'click',
      this._eventIndicatorClick.bind(this)
    );

    /**
     * The panel contents `Element`
     */
    this.contentsElement = this.element.querySelector(`.${RefreshablePanel.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);

    // create the contents element, if it doesn’t already exist
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.contentsElement.classList.add(RefreshablePanel.REFERENCE.HTML_CLASS_NAME.CONTENTS);
      this.element.appendChild(this.contentsElement);
    }
  }

  async _renderContents(html) {
    this.logDebug({
      _functionName: RefreshablePanel.prototype._renderContents.name,
      htmlByteCount: core.utilities.validation.isNonEmptyString(html) ? html.length : 0
    });

    // insert the panel contents’ HTML into the panel contents element
    core.webUtilities.injectHTML({
      debug: this.debug,
      html: html,
      logger: this.logger,
      replace: true,
      sourceID: this._getLoggingSourceID({ functionName: RefreshablePanel.prototype._renderContents.name }),
      target: this.contentsElement
    });

    // event callback: `contentsRender`
    if (this._eventCallbackContentsRender !== null) {
      await this._eventCallbackContentsRender(html);
    }
  }

  _renderIndicator(mode) {
    this.logDebug({
      _functionName: RefreshablePanel.prototype._renderIndicator.name,
      mode: mode
    });

    if (mode === RefreshablePanel.REFERENCE.SYMBOLS.REFRESH) {
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.REFRESH;
      this.indicatorElement.title = 'Refresh the contents.';
    }
    else if (mode === RefreshablePanel.REFERENCE.SYMBOLS.STARTED) {
      // visually indicate that the component is automatically refreshing its contents
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.STARTED;
      this.indicatorElement.title = `Contents are automatically refreshing every ${core.utilities.formatting.formatNumber(this.dataSource.frequency)} ${core.utilities.formatting.pluralize('second', this.dataSource.frequency)}.`;
    }
    else if (mode === RefreshablePanel.REFERENCE.SYMBOLS.STOPPED) {
      // visually indicate that the component is not automatically refreshing its contents
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.STOPPED;
      this.indicatorElement.title = 'Contents are not automatically refreshing.';
    }
  }
}


export default RefreshablePanel;