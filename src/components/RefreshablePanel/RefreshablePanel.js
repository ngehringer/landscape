import * as core from '@backwater-systems/core';
import * as dataSources from '../../dataSources/index.js';
import LandscapeComponent from '../LandscapeComponent.js';


class RefreshablePanel extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${RefreshablePanel.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
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
    dataSource,
    debug = RefreshablePanel.DEFAULTS.DEBUG,
    contentsRenderEvent = null,
    targetElement,
    targetHTMLID
  }) {
    super({
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      if ( !core.utilities.validateType(dataSource, dataSources.BaseDataSource) ) throw new core.errors.TypeValidationError('dataSource', dataSources.BaseDataSource);

      /**
       * An event callback that fires after the panel’s contents are rendered
       * @type {(function|null)}
       */
      this._eventCallbackContentsRender = core.utilities.validateType(contentsRenderEvent, Function)
        ? contentsRenderEvent
        : null
      ;

      /**
       * Provides the contents of the panel
       * @type {DataSource}
       */
      this.dataSource = dataSource;

      /**
       * Indicates whether the panel’s data source has an automatic fetch timer that can be started and stopped
       * @type {boolean}
       */
      this.timedDataSource = (this.dataSource instanceof dataSources.TimedAjaxDataSource);

      // define the data source’s “fetch” event handler
      this.dataSource.registerEventHandler(
        'fetch',
        this._eventDataSourceFetch.bind(this)
      );

      // define the data source’s “fetchError” event handler
      this.dataSource.registerEventHandler(
        'fetchError',
        this._eventDataSourceFetchError.bind(this)
      );

      if (this.timedDataSource) {
        // define the data source’s “startTimer” event handler
        this.dataSource.registerEventHandler(
          'startTimer',
          () => {
            this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STARTED);
          }
        );

        // define the data source’s “stopTimer” event handler
        this.dataSource.registerEventHandler(
          'stopTimer',
          () => {
            this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.STOPPED);
          }
        );
      }

      this._initialize();

      // load the panel’s contents (asynchronously)
      // HACK
      setTimeout(
        (
          async () => {
            try {
              await this.refresh();
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

  async refresh() {
    this.logDebug(`${RefreshablePanel.prototype.refresh.name}`);

    await this.dataSource.fetch();
  }

  _eventDataSourceFetch(data) {
    this.logDebug(`${RefreshablePanel.prototype._eventDataSourceFetch.name}`);

    if ( !core.utilities.validateType(data, Object) ) throw new core.errors.TypeValidationError('data', Object);
    if ( !core.utilities.isNonEmptyString(data.text) ) throw new core.errors.TypeValidationError('data.text', String);

    this._renderContents(data.text);
  }

  _eventDataSourceFetchError(error) {
    this.logDebug(`${RefreshablePanel.prototype._eventDataSourceFetchError.name}`);

    // log the error
    this.logError(error);
  }

  async _eventIndicatorClick(event) {
    try {
      this.logDebug(`${RefreshablePanel.prototype._eventIndicatorClick.name}`);

      // for a timed data source …
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
      // … otherwise, for a non-timed data source …
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

    // create an indicator to display the component’s status
    this.indicatorElement = document.createElement('div');
    this.indicatorElement.classList.add(RefreshablePanel.REFERENCE.HTML_CLASS_NAME.INDICATOR);
    // timed data source …
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
    // … otherwise, non-timed data source
    else {
      this._renderIndicator(RefreshablePanel.REFERENCE.SYMBOLS.REFRESH);
    }
    this.element.appendChild(this.indicatorElement);

    // handle the indicator’s “click” event
    this.indicatorElement.addEventListener(
      'click',
      this._eventIndicatorClick.bind(this)
    );

    // attempt to retrieve an existing contents element
    this.contentsElement = this.element.querySelector(`.${RefreshablePanel.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);
    // create the contents element, if it doesn’t already exist
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.contentsElement.classList.add(RefreshablePanel.REFERENCE.HTML_CLASS_NAME.CONTENTS);
      this.element.appendChild(this.contentsElement);
    }
  }

  _renderContents(html) {
    this.logDebug(`${RefreshablePanel.prototype._renderContents.name} → html: ${core.utilities.isNonEmptyString(html) ? `${core.utilities.formatNumber(html.length)} ${core.utilities.pluralize('byte', html.length)}` : '[invalid]'}`);

    core.webUtilities.injectHTML({
      'debug': this.debug,
      'html': html,
      'replace': true,
      'target': this.contentsElement
    });

    // event callback: “contentsRender”
    if (this._eventCallbackContentsRender !== null) {
      this._eventCallbackContentsRender();
    }
  }

  _renderIndicator(mode) {
    this.logDebug(`${RefreshablePanel.prototype._renderIndicator.name} → mode: “${mode}”`);

    if (mode === RefreshablePanel.REFERENCE.SYMBOLS.REFRESH) {
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.REFRESH;
      this.indicatorElement.title = 'Refresh the contents.';
    }
    else if (mode === RefreshablePanel.REFERENCE.SYMBOLS.STARTED) {
      // visually indicate that the component is automatically refreshing the contents
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.STARTED;
      this.indicatorElement.title = `Contents are automatically refreshing every ${core.utilities.formatNumber(this.dataSource.frequency)} ${core.utilities.pluralize('second', this.dataSource.frequency)}.`;
    }
    else if (mode === RefreshablePanel.REFERENCE.SYMBOLS.STOPPED) {
      // visually indicate that the component is not automatically refreshing its contents
      this.indicatorElement.textContent = RefreshablePanel.REFERENCE.SYMBOLS.STOPPED;
      this.indicatorElement.title = 'Contents are not automatically refreshing.';
    }
  }
}


export default RefreshablePanel;