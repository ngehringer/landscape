import * as core from '@backwater-systems/core';
import * as dataSources from '../../dataSources/index.js';
import ModalLandscapeComponent from '../ModalLandscapeComponent.js';


class Window extends ModalLandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${Window.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: ModalLandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    const HTML_CLASS_NAME = `Landscape-${Window.name}`;

    return Object.freeze({
      CSS_TRANSITION_DURATION: Object.freeze({
        MODAL_OVERLAY: 100,
        WINDOW: 200,
        WINDOW_CONTENTS: 1000
      }),
      DATA_ATTRIBUTE_NAME: Object.freeze({
        MINIMIZED: 'data-minimized',
        OPENED: 'data-opened'
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        ACTIVE: 'Landscape-active',
        CLOSE_BUTTON: `${HTML_CLASS_NAME}-close-button`,
        CONTENTS: `${HTML_CLASS_NAME}-contents`,
        INACTIVE: 'Landscape-inactive',
        MINIMIZE_BUTTON: `${HTML_CLASS_NAME}-minimize-button`,
        MINIMIZED: `${HTML_CLASS_NAME}-minimized`,
        MODAL_OVERLAY: 'Landscape-modal-overlay',
        MOVING: 'Landscape-moving',
        STATUS_INDICATOR: `${HTML_CLASS_NAME}-status-indicator`,
        SURFACE: 'Landscape-surface',
        TITLE: `${HTML_CLASS_NAME}-title`,
        TITLE_BAR: `${HTML_CLASS_NAME}-title-bar`,
        TITLE_BAR_BUTTON: `${HTML_CLASS_NAME}-title-bar-button`,
        VISIBLE: 'Landscape-visible'
      }),
      SYMBOLS: Object.freeze({
        CLOSE: '✖',
        MINIMIZE: '−'
      })
    });
  }

  constructor({
    contentsRenderEvent = null,
    dataSource,
    dataSourceFetchEvent = null,
    debug = Window.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID,
    title = null,
    windowID = null
  }) {
    super({
      'createTarget': true,
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.columnOptionsFlyoutPanelList = [];

      /**
       * Indicates whether the window is opened
       * @type {boolean}
       */
      this.opened = false;

      /**
       * An event callback that fires after the window’s contents are rendered
       * @type {(function|null)}
       */
      this._eventCallbackContentsRender = core.utilities.validateType(contentsRenderEvent, Function)
        ? contentsRenderEvent
        : null
      ;

      /**
       * An event callback that fires after the window’s DataSource emits a “fetch” event
       * @type {(function|null)}
       */
      this._eventCallbackDataSourceFetch = core.utilities.validateType(dataSourceFetchEvent, Function)
        ? dataSourceFetchEvent
        : null
      ;

      /**
       * Provides the contents of the window
       * @type {(DataSource|null)}
       */
      this.dataSource = core.utilities.validateType(dataSource, dataSources.BaseDataSource)
        ? dataSource
        : null
      ;
      if (this.dataSource !== null) {
        // render the window’s contents on the data source’s “fetch” event
        this.dataSource.registerEventHandler(
          'fetch',
          this._eventDataSourceFetch.bind(this)
        );

        // define the data source’s “fetchError” event handler
        this.dataSource.registerEventHandler(
          'fetchError',
          this._eventDataSourceFetchError.bind(this)
        );
      }

      /**
       * The window’s title
       * @type {string}
       */
      this.title = core.utilities.isNonEmptyString(title)
        ? title
        : null
      ;

      /**
       * The window’s identifier (uniqueness is enforced using this value if the window is registered with a window manager)
       * @type {string}
       */
      this.windowID = core.utilities.isNonEmptyString(windowID)
        ? windowID
        : null
      ;

      this._initialize();

      // load the window’s data (asynchronously)
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

  async _eventCloseButtonClick() {
    try {
      this.logDebug(`${Window.prototype._eventCloseButtonClick.name}`);

      await this.close();
    }
    catch (error) {
      this.logError(error);
    }
  }

  _eventDataSourceFetch(data) {
    this.logDebug(`${Window.prototype._eventDataSourceFetch.name}`);

    if ( !core.utilities.validateType(data, Object) ) throw new core.errors.TypeValidationError('data', Object);
    if ( !core.utilities.isNonEmptyString(data.text) ) throw new core.errors.TypeValidationError('data.text', String);

    this._renderContents(data.text);
  }

  _eventDataSourceFetchError(error) {
    this.logDebug(`${Window.prototype._eventDataSourceFetchError.name}`);

    // log the error
    this.logError(error);
  }

  async _eventMinimizeButtonClick() {
    try {
      this.logDebug(`${Window.prototype._eventMinimizeButtonClick.name}`);

      if (this.minimized) {
        this.unminimize();
      }
      else {
        await this.minimize();
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  _eventTitleBarMousedown(event) {
    try {
      // define the mouse’s initial coordinates
      let {
        clientX: previousXCoordinate,
        clientY: previousYCoordinate
      } = event;

      const _eventMousemove = (_event) => {
        try {
          // define the mouse’s current coordinates
          const {
            clientX: currentXCoordinate,
            clientY: currentYCoordinate
          } = _event;

          // calculate the distance that the mouse has moved since the last event
          const xDelta = currentXCoordinate - previousXCoordinate;
          const yDelta = currentYCoordinate - previousYCoordinate;

          // ensure that movement has occurred
          if (
            (xDelta === 0)
            && ( yDelta === 0)
          ) return;

          this.logDebug(`${_eventMousemove.name} → current mouse coordinates: (X: ${currentXCoordinate}, Y: ${currentYCoordinate}); previous mouse coordinates: (X: ${previousXCoordinate}, Y: ${previousYCoordinate}); delta: (X: ${xDelta}, Y: ${yDelta})`);

          // update the mouse’s previous coordinates
          previousXCoordinate = currentXCoordinate;
          previousYCoordinate = currentYCoordinate;

          // define the window’s current position
          const {
            left: windowXCoordinate,
            top: windowYCoordinate
          } = this.element.getBoundingClientRect();

          // calculate and set the window’s new position
          this.setPosition({
            x: windowXCoordinate + xDelta,
            y: windowYCoordinate + yDelta
          });
        }
        catch (error) {
          this.logError(error);
        }
      };

      const _eventTitleBarMouseup = () => {
        try {
          this.logDebug(`${_eventTitleBarMouseup.name}`);

          // remove the global “mousemove” event handler
          window.removeEventListener(
            'mousemove',
            _eventMousemove
          );

          // indicate that the window is no longer in the “moving” state
          this.element.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.MOVING);
        }
        catch (error) {
          this.logError(error);
        }
      };

      // indicate that the window is in the “moving” state
      this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.MOVING);

      // handle the “mousemove” event (globally, to capture events originating outside of the title bar)
      window.addEventListener(
        'mousemove',
        _eventMousemove
      );

      // handle the next “mouseup” event (globally, … as above)
      window.addEventListener(
        'mouseup',
        _eventTitleBarMouseup,
        {
          once: true
        }
      );
    }
    catch (error) {
      this.logError(error);
    }
  }

  _initialize() {
    this.logDebug(`${Window.prototype._initialize.name}`);

    // window

    // apply the component’s CSS classes
    this.element.classList.add(
      Window.REFERENCE.HTML_CLASS_NAME._,
      Window.REFERENCE.HTML_CLASS_NAME.SURFACE
    );
    // indicate the component’s initial state
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // title bar

    this.titleBarElement = this.element.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.TITLE_BAR}`);
    // create the window’s title bar element, if necessary
    if (this.titleBarElement === null) {
      this.titleBarElement = document.createElement('div');
      this.titleBarElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.TITLE_BAR);
      // add the title bar element to the component
      this.element.appendChild(this.titleBarElement);
    }
    // handle the title bar’s mousedown event
    this.titleBarElement.addEventListener(
      'mousedown',
      this._eventTitleBarMousedown.bind(this)
    );

    // status indicator

    this.statusIndicatorElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR}`);
    // create the window’s title bar element, if necessary
    if (this.statusIndicatorElement === null) {
      this.statusIndicatorElement = document.createElement('div');
      this.statusIndicatorElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR);
      // add the title element to the title bar
      this.titleBarElement.appendChild(this.statusIndicatorElement);
    }

    // title

    this.titleElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.TITLE}`);
    // create the window’s title bar element, if necessary
    if (this.titleElement === null) {
      this.titleElement = document.createElement('div');
      this.titleElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.TITLE);
      // set the title’s text
      if (this.title !== null) {
        this.titleElement.textContent = this.title;
        this.titleElement.title = this.title;
      }
      // add the title element to the title bar
      this.titleBarElement.appendChild(this.titleElement);
    }

    // minimize button

    this.minimizeButtonElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.MINIMIZE_BUTTON}`);
    // create the window’s minimize button element, if necessary
    if (this.minimizeButtonElement === null) {
      this.minimizeButtonElement = document.createElement('div');
      this.minimizeButtonElement.textContent = Window.REFERENCE.SYMBOLS.MINIMIZE;
      this.minimizeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.TITLE_BAR_BUTTON);
      this.minimizeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.MINIMIZE_BUTTON);
      this.minimizeButtonElement.title = 'Minimize window';
      // add the minimize button element to the title bar
      this.titleBarElement.appendChild(this.minimizeButtonElement);
    }
    // handle the minimize button’s click event
    this.minimizeButtonElement.addEventListener(
      'click',
      this._eventMinimizeButtonClick.bind(this)
    );

    // close button

    this.closeButtonElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON}`);
    // create the window’s close button element, if necessary
    if (this.closeButtonElement === null) {
      this.closeButtonElement = document.createElement('div');
      this.closeButtonElement.textContent = Window.REFERENCE.SYMBOLS.CLOSE;
      this.closeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.TITLE_BAR_BUTTON);
      this.closeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON);
      this.closeButtonElement.title = 'Close window';
      // add the close button element to the title bar
      this.titleBarElement.appendChild(this.closeButtonElement);
    }
    // handle the close button’s click event
    this.closeButtonElement.addEventListener(
      'click',
      this._eventCloseButtonClick.bind(this)
    );

    // contents

    this.contentsElement = this.element.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);
    // create the window’s contents element, if necessary
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.CONTENTS);
      this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);
      // add the contents element to the component
      this.element.appendChild(this.contentsElement);
    }

    // add the component to the DOM
    document.body.appendChild(this.element);

    // HACK: allow all CSS transitions to fire correctly by calling JSON.stringify() on the element’s style
    // TODO: Decrease heft
    JSON.stringify( window.getComputedStyle(this.element) );
  }

  _renderContents(html) {
    this.logDebug(`${Window.prototype._renderContents.name} → html: ${core.utilities.isNonEmptyString(html) ? `${core.utilities.formatNumber(html.length)} ${core.utilities.pluralize('byte', html.length)}` : '[invalid]'}`);

    // retrieve the table element’s markup from the server, and insert it into the table container element
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

  async close() {
    this.logDebug(`${Window.prototype.close.name}`);

    if (!this.opened) {
      this.logWarning('Window is already closed.');

      return;
    }

    this.opened = false;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.OPENED, 'false');

    // remove the window’s input focus
    this.element.blur();

    // visually indicate that the window is closing
    this.closeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // trigger the hide animation
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // remove the modal overlay
    await this._unrenderModalOverlay();

    // after the hide animation completes, …
    await this._delay(Window.REFERENCE.CSS_TRANSITION_DURATION.WINDOW);
    // … remove the window
    this.destroy();
  }

  async load() {
    this.logDebug(`${Window.prototype.load.name}`);

    const data = await this.dataSource.fetch();

    // event callback: “dataSourceFetch”
    if (this._eventCallbackDataSourceFetch !== null) {
      this._eventCallbackDataSourceFetch(data.text);
    }

    // open the window
    this.open();
  }

  async minimize() {
    this.logDebug(`${Window.prototype.minimize.name}`);

    if (this.minimized) {
      this.logWarning('Window is already minimized.');

      return;
    }

    this.minimized = true;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.MINIMIZED, 'true');

    // remove the window’s input focus
    this.element.blur();

    // visually indicate that the window is minimizing
    this.minimizeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // minimize the window
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.MINIMIZED);

    // remove the window’s contents from the render path
    await this._delay(Window.REFERENCE.CSS_TRANSITION_DURATION.WINDOW_CONTENTS);
    this.contentsElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // remove the modal overlay
    await this._unrenderModalOverlay();
  }

  open() {
    this.logDebug(`${Window.prototype.open.name}`);

    if (this.opened) {
      this.logWarning('Window is already open.');

      return;
    }

    this.opened = true;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.OPENED, 'true');

    // visually indicate that the window is opened
    this.closeButtonElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // add the window to the render path
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // render a modal overlay
    this._renderModalOverlay();

    // center the window in the viewport
    const defaultCoordinates = this._getCenteredCoordinates();
    this.setPosition(defaultCoordinates);

    // display the window
    this.element.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // give the window input focus
    this.element.focus();
  }

  unminimize() {
    this.logDebug(`${Window.prototype.unminimize.name}`);

    if (!this.minimized) {
      this.logWarning('Window is already unminimized.');

      return;
    }

    this.minimized = false;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.MINIMIZED, 'false');

    // render a modal overlay
    this._renderModalOverlay();

    // visually indicate that the window is unminimizing
    this.minimizeButtonElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // add the window’s contents to the render path
    this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // HACK: allow all CSS transitions to fire correctly by calling JSON.stringify() on the contents element’s style
    // TODO: Decrease heft
    JSON.stringify( window.getComputedStyle(this.contentsElement) );

    // unminimize the window
    this.element.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.MINIMIZED);

    // give the window input focus
    this.element.focus();
  }
}


export default Window;