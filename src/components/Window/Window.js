import * as core from '@backwater-systems/core';

import * as dataSources from '../../dataSources/index.js';
import ModalLandscapeComponent from '../ModalLandscapeComponent.js';

/**
 * A resizable, minimizable modal window.
 * @extends ModalLandscapeComponent
 */
class Window extends ModalLandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${Window.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: ModalLandscapeComponent.DEFAULTS.DEBUG,
      SIZE: {
        height: null,
        width: null
      }
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
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
    size = Window.DEFAULTS.SIZE,
    targetElement,
    targetHTMLID,
    title = null,
    windowID = null
  }) {
    super({
      closeOnModalOverlayClick: false,
      createTarget: true,
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      /**
       * Whether the window is minimized
       */
      this.minimized = false;

      /**
       * Whether the window is opened
       */
      this.opened = false;

      /**
       * An event callback that fires after the window’s contents are rendered
       */
      this._eventCallbackContentsRender = (typeof contentsRenderEvent === 'function')
        ? contentsRenderEvent.bind(this)
        : null
      ;

      /**
       * An event callback that fires after the window’s `DataSource` emits a `fetch` event
       */
      this._eventCallbackDataSourceFetch = (typeof dataSourceFetchEvent === 'function')
        ? dataSourceFetchEvent
        : null
      ;

      /**
       * The `DataSource` that provides the window’s contents
       */
      this.dataSource = (
        (typeof dataSource === 'object')
        && (dataSource instanceof dataSources.BaseDataSource)
      )
        ? dataSource
        : null
      ;
      if (this.dataSource !== null) {
        // render the window’s contents on the `DataSource`’s `fetch` event
        this.dataSource.registerEventHandler(
          'fetch',
          this._eventDataSourceFetch.bind(this)
        );

        // register the `DataSource`’s `fetchError` event handler
        this.dataSource.registerEventHandler(
          'fetchError',
          this._eventDataSourceFetchError.bind(this)
        );
      }

      /**
       * The height and width (range 0 – 100, in `vh` and `vw` units, respectively) of the window’s contents element, if specified
       */
      this.size = (
        (typeof size === 'object')
        && (
          (
            (typeof size.height === 'number')
            && (size.height >= 0)
            && (size.height <= 100)
          )
          || (size.height === null)
        )
        && (
          (
            (typeof size.width === 'number')
            && (size.width >= 0)
            && (size.width <= 100)
          )
          || (size.width === null)
        )
      )
        ? size
        : Window.DEFAULTS.SIZE
      ;

      /**
       * The title of the window
       */
      this.title = (
        (typeof title === 'string')
        && core.utilities.validation.isNonEmptyString(title)
      )
        ? title
        : null
      ;

      /**
       * A unique identifier for the window (uniqueness is enforced using this value if the window is registered with a window manager)
       */
      this.windowID = (
        (typeof windowID === 'string')
        && core.utilities.validation.isNonEmptyString(windowID)
      )
        ? windowID
        : null
      ;

      // initialize the component
      this._initialize();

      // load the window’s contents and open the window (asynchronously)
      setTimeout(
        async () => {
          try {
            await this.load();
            this.open();
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

  async _eventCloseButtonClick(event) {
    try {
      this.logDebug({
        _functionName: Window.prototype._eventCloseButtonClick.name,
        event: event
      });

      await this.close();
    }
    catch (error) {
      this.logError(error);
    }
  }

  async _eventDataSourceFetch(data) {
    this.logDebug({
      _functionName: Window.prototype._eventDataSourceFetch.name,
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
      _functionName: Window.prototype._eventDataSourceFetchError.name,
      error: error
    });

    // log the error
    this.logError(error);
  }

  async _eventMinimizeButtonClick(event) {
    try {
      this.logDebug({
        _functionName: Window.prototype._eventMinimizeButtonClick.name,
        event: event
      });

      // if the window is minimized …
      if (this.minimized) {
        // … unminimize it
        this.unminimize();
      }
      // if the window is unminimized …
      else {
        // … minimize it
        await this.minimize();
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  _eventTitleBarMousedown(event) {
    try {
      /**
       * The initial (x, y) coordinates of the mouse at the time of the `mousedown` event
       */
      let {
        clientX: previousMouseXCoordinate,
        clientY: previousMouseYCoordinate
      } = event;

      /**
       * A `mousemove` event listener that is attached to the component element during a click-and-drag operation on the window’s title bar, to enable the window to move
       */
      const _eventMousemove = (mousemoveEvent) => {
        try {
          /**
           * The current (x, y) coordinates of the mouse
           */
          const {
            clientX: currentMouseXCoordinate,
            clientY: currentMouseYCoordinate
          } = mousemoveEvent;

          /**
           * The distance that the mouse has moved in the “x” axis since the last event
           */
          const mouseXDelta = currentMouseXCoordinate - previousMouseXCoordinate;

          /**
           * The distance that the mouse has moved in the “y” axis since the last event
           */
          const mouseYDelta = currentMouseYCoordinate - previousMouseYCoordinate;

          this.logDebug({
            _functionName: _eventMousemove.name,
            currentMouseCoordinates: {
              x: currentMouseXCoordinate,
              y: currentMouseYCoordinate
            },
            mouseCoordinatesDelta: {
              x: mouseXDelta,
              y: mouseYDelta
            },
            previousMouseCoordinates: {
              x: previousMouseXCoordinate,
              y: previousMouseYCoordinate
            }
          });

          // abort if no movement has occurred
          if (
            (mouseXDelta === 0)
            && (mouseYDelta === 0)
          ) return;

          // update the mouse’s previous coordinates
          previousMouseXCoordinate = currentMouseXCoordinate;
          previousMouseYCoordinate = currentMouseYCoordinate;

          /**
           * The current coordinates of the window
           */
          const {
            left: currentWindowXCoordinate,
            top: currentWindowYCoordinate
          } = this.element.getBoundingClientRect();

          /**
           * The window’s new coordinates
           */
          const newWindowCoordinates = {
            x: currentWindowXCoordinate + mouseXDelta,
            y: currentWindowYCoordinate + mouseYDelta
          };

          this.logDebug({
            _functionName: _eventMousemove.name,
            mouseCoordinatesDelta: {
              x: mouseXDelta,
              y: mouseYDelta
            },
            newWindowCoordinates: newWindowCoordinates,
            previousMouseCoordinates: {
              x: previousMouseXCoordinate,
              y: previousMouseYCoordinate
            }
          });

          // set the window’s new position
          this.setPosition(newWindowCoordinates);
        }
        catch (error) {
          this.logError(error);
        }
      };

      /**
       * A `mousemove` event listener that is attached to the component element during a click-and-drag operation on the window’s title bar, to end the click-and-drag operation
       */
      const _eventTitleBarMouseup = (mouseupEvent) => {
        try {
          this.logDebug({
            _functionName: _eventTitleBarMouseup.name,
            event: mouseupEvent
          });

          // remove the global `mousemove` event handler
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

      // handle the `mousemove` event (globally, to capture events originating outside of the title bar)
      window.addEventListener(
        'mousemove',
        _eventMousemove
      );

      // handle the next `mouseup` event (globally, … as above)
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
    this.logDebug({
      _functionName: Window.prototype._initialize.name
    });

    // window

    // apply the component’s CSS classes
    this.element.classList.add(
      Window.REFERENCE.HTML_CLASS_NAME._,
      Window.REFERENCE.HTML_CLASS_NAME.SURFACE
    );
    // indicate the component’s initial state
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // title bar

    /**
     * The title bar `Element`
     *
     * It contains the window status indicator, title, minimize button, and close button.
     */
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

    /**
     * The window status indicator `Element`
     *
     * It reflects the `:hover` and `:focus` state of the component.
     */
    this.statusIndicatorElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR}`);

    // create the window’s title bar element, if necessary
    if (this.statusIndicatorElement === null) {
      this.statusIndicatorElement = document.createElement('div');
      this.statusIndicatorElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR);

      // add the title element to the title bar
      this.titleBarElement.appendChild(this.statusIndicatorElement);
    }

    // title

    /**
     * The title `Element`
     *
     * It contains a text node containing the `Window.title` property.
     */
    this.titleElement = this.titleBarElement.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.TITLE}`);

    // create the window’s title element, if necessary
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

    /**
     * The minimize button `Element`
     *
     * It has the `Window._eventMinimizeButtonClick()` function added as a `click` event listener.
     */
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

    /**
     * The close button `Element`
     *
     * It has the `Window._eventCloseButtonClick()` function added as a `click` event listener.
     */
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

    /**
     * The window contents `Element`
     */
    this.contentsElement = this.element.querySelector(`.${Window.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);

    // create the window’s contents element, if necessary
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.CONTENTS);
      this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

      // add the contents element to the component
      this.element.appendChild(this.contentsElement);
    }

    // set the contents element’s dimensions, if necessary
    if (this.size.height !== null) {
      this.contentsElement.style.height = `${this.size.height}vh`;
    }
    if (this.size.width !== null) {
      this.contentsElement.style.width = `${this.size.width}vw`;
    }

    // add the component to the document
    document.body.appendChild(this.element);

    // compute the component element’s style – this materializes values at a baseline value, allowing CSS transitions to fire correctly
    // TODO: Analyze performance hit / potential optimizations
    JSON.stringify( window.getComputedStyle(this.element) );
  }

  async _renderContents(html) {
    this.logDebug({
      _functionName: Window.prototype._renderContents.name,
      htmlByteCount: (typeof html === 'string') ? html.length : 0
    });

    // insert the window contents’ HTML into the window contents element
    core.webUtilities.injectHTML({
      debug: this.debug,
      html: html,
      logger: this.logger,
      replace: true,
      sourceID: this._getLoggingSourceID({ functionName: Window.prototype._renderContents.name }),
      target: this.contentsElement
    });

    // event callback: `contentsRender`
    if (this._eventCallbackContentsRender !== null) {
      await this._eventCallbackContentsRender(html);
    }
  }

  /**
   * Closes the window.
   */
  async close() {
    this.logDebug({
      _functionName: Window.prototype.close.name
    });

    if (!this.opened) {
      this.logWarning('Window is already closed.');

      return;
    }

    // indicate that window is closed
    this.opened = false;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.OPENED, 'false');

    // remove the window’s input focus
    this.element.blur();

    // visually indicate that the window is closed
    this.closeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // trigger the hide animation
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // remove the modal overlay
    await this._unrenderModalOverlay();

    // after the hide animation completes, …
    await core.utilities.delay(Window.REFERENCE.CSS_TRANSITION_DURATION.WINDOW);
    // … remove the window from the document
    this.destroy();
  }

  /**
   * Loads the contents of the window.
   */
  async load() {
    this.logDebug({
      _functionName: Window.prototype.load.name
    });

    /**
     * The window contents’ data
     */
    const data = await this.dataSource.fetch();

    // event callback: `dataSourceFetch`
    if (this._eventCallbackDataSourceFetch !== null) {
      await this._eventCallbackDataSourceFetch(data);
    }
  }

  /**
   * Minimizes the window.
   */
  async minimize() {
    this.logDebug({
      _functionName: Window.prototype.minimize.name
    });

    if (this.minimized) {
      this.logWarning('Window is already minimized.');

      return;
    }

    // indicate that window is minimized
    this.minimized = true;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.MINIMIZED, 'true');

    // remove the window’s input focus
    this.element.blur();

    // visually indicate that the window is minimized
    this.minimizeButtonElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // minimize the window
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.MINIMIZED);

    // remove the window’s contents from the render path
    await core.utilities.delay(Window.REFERENCE.CSS_TRANSITION_DURATION.WINDOW_CONTENTS);
    this.contentsElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // remove the modal overlay
    await this._unrenderModalOverlay();
  }

  /**
   * Opens the window.
   */
  open() {
    this.logDebug({
      _functionName: Window.prototype.open.name
    });

    if (this.opened) {
      this.logWarning('Window is already open.');

      return;
    }

    // indicate that window is opened
    this.opened = true;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.OPENED, 'true');

    // visually indicate that the window is opened
    this.closeButtonElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // add the window to the render path
    this.element.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // render a modal overlay
    this._renderModalOverlay();

    /**
     * The coordinates that center the window in the viewport
     */
    const defaultCoordinates = this._getCenteredCoordinates();

    // center the window in the viewport
    this.setPosition(defaultCoordinates);

    // display the window
    this.element.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // give the window input focus
    this.element.focus();
  }

  /**
   * Unminimizes the window.
   */
  unminimize() {
    this.logDebug({
      _functionName: Window.prototype.unminimize.name
    });

    if (!this.minimized) {
      this.logWarning('Window is already unminimized.');

      return;
    }

    // indicate that window is unminimized
    this.minimized = false;
    this.element.setAttribute(Window.REFERENCE.DATA_ATTRIBUTE_NAME.MINIMIZED, 'false');

    // render a modal overlay
    this._renderModalOverlay();

    // visually indicate that the window is unminimized
    this.minimizeButtonElement.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.ACTIVE);

    // add the window’s contents to the render path
    this.contentsElement.classList.add(Window.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // compute the window’s contents element’s style – this materializes values at a baseline value, allowing CSS transitions to fire correctly
    // TODO: Analyze performance hit / potential optimizations
    JSON.stringify( window.getComputedStyle(this.contentsElement) );

    // unminimize the window
    this.element.classList.remove(Window.REFERENCE.HTML_CLASS_NAME.MINIMIZED);

    // give the window input focus
    this.element.focus();
  }
}


export default Window;