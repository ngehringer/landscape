import ModalLandscapeComponent from '../ModalLandscapeComponent.js';


/**
 * A modal flyout panel.
 * @extends ModalLandscapeComponent
 */
class FlyoutPanel extends ModalLandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${FlyoutPanel.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: ModalLandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${FlyoutPanel.name}`;

    return Object.freeze({
      CSS_TRANSITION_DURATION: Object.freeze({
        MODAL_OVERLAY: 100
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        ACTIVE: 'Landscape-active',
        CONTENTS: `${HTML_CLASS_NAME}-contents`,
        INACTIVE: 'Landscape-inactive',
        INTERACTIVE: 'Landscape-interactive',
        MODAL_OVERLAY: 'Landscape-modal-overlay',
        SURFACE: 'Landscape-surface',
        SWITCH: `${HTML_CLASS_NAME}-switch`,
        SWITCH_SYMBOL: `${HTML_CLASS_NAME}-switch-symbol`,
        VISIBLE: 'Landscape-visible'
      }),
      SYMBOLS: Object.freeze({
        SWITCH: Object.freeze({
          OFF: '▼',
          ON: '▲'
        })
      })
    });
  }

  constructor({
    closeEvent = null,
    debug = FlyoutPanel.DEFAULTS.DEBUG,
    openEvent = null,
    targetElement,
    targetHTMLID
  }) {
    super({
      closeOnModalOverlayClick: true,
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      /**
       * Whether the panel is closed
       */
      this.closed = true;

      /**
       * An event callback that fires after the panel is closed
       */
      this.closeEvent = (typeof closeEvent === 'function')
        ? closeEvent.bind(this)
        : null
      ;

      /**
       * An event callback that fires after the panel is opened
       */
      this.openEvent = (typeof openEvent === 'function')
        ? openEvent.bind(this)
        : null
      ;

      // initialize the component
      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  _calculatePosition() {
    /**
     * The dimensions (height, width) of the viewport
     */
    const {
      innerHeight: viewportHeight,
      innerWidth: viewportWidth
    } = window;

    /**
     * The dimensions (height, width) of the contents
     */
    const {
      offsetHeight: contentsElementHeight,
      offsetWidth: contentsElementWidth
    } = this.contentsElement;

    /**
     * The coordinates (bottom, left, right, top) of the panel switch
     */
    const {
      bottom: switchElementY2,
      left: switchElementX1,
      right: switchElementX2,
      top: switchElementY1
    } = this.switchElement.getBoundingClientRect();

    this.logDebug({
      _functionName: FlyoutPanel.prototype._calculatePosition.name,
      contentsElement: {
        height: contentsElementHeight,
        width: contentsElementWidth
      },
      switchElement: {
        x1: switchElementX1,
        x2: switchElementX2,
        y1: switchElementY1,
        y2: switchElementY2
      },
      viewport: {
        height: viewportHeight,
        width: viewportWidth
      }
    });

    /**
     * The left offset of the contents element
     */
    let left;

    /**
     * The right offset of the contents element
     */
    let right;

    // contents overflow the right side of the viewport
    if (switchElementX1 + contentsElementWidth > viewportWidth) {
      right = `${(viewportWidth - switchElementX2)}px`;
      left = null;
    }
    // contents fit within the width of the viewport
    else {
      left = `${switchElementX1}px`;
      right = null;
    }

    /**
     * The bottom offset of the contents element
     */
    let bottom;

    /**
     * The top offset of the contents element
     */
    let top;

    // contents overflow the bottom of the viewport
    if (switchElementY2 + contentsElementHeight > viewportHeight) {
      bottom = `${(viewportHeight - switchElementY1)}px`;
      top = null;
    }
    // contents fit within the height of the viewport
    else {
      top = `${switchElementY2}px`;
      bottom = null;
    }

    this.logDebug({
      _functionName: FlyoutPanel.prototype._calculatePosition.name,
      bottom: bottom,
      left: left,
      right: right,
      top: top
    });

    // set the position of the contents element
    this.contentsElement.style.top = top;
    this.contentsElement.style.bottom = bottom;
    this.contentsElement.style.left = left;
    this.contentsElement.style.right = right;
  }

  async _eventSwitchClick(event) {
    try {
      this.logDebug({
        _functionName: FlyoutPanel.prototype._eventSwitchClick.name,
        closed: this.closed,
        event: event
      });

      if (this.closed) {
        this.open();
      }
      else {
        await this.close();
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  _initialize() {
    this.logDebug({
      _functionName: FlyoutPanel.prototype._initialize.name
    });

    // apply the component’s CSS class
    this.element.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME._);

    /**
     * The panel switch `Element`
     *
     * It has the `FlyoutPanel._eventSwitchClick()` function added as a `click` event listener.
     */
    this.switchElement = this.element.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH}`);

    // create the switch element, if necessary
    if (this.switchElement === null) {
      this.switchElement = document.createElement('div');
      this.switchElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH);
      this.switchElement.textContent = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH.OFF;
      this.element.insertBefore(this.switchElement, this.element.firstChild);
    }

    // handle the switch element’s `click` event
    this.switchElement.addEventListener(
      'click',
      this._eventSwitchClick.bind(this)
    );

    /**
     * The panel switch symbol `Element`
     *
     * It contains a text node containing one of the `FlyoutPanel.REFERENCE.SYMBOLS.SWITCH` values.
     */
    this.switchSymbolElement = this.switchElement.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH_SYMBOL}`);

    // create the switch symbol element, if necessary
    if (this.switchSymbolElement === null) {
      this.switchSymbolElement = document.createElement('span');
      this.switchSymbolElement.classList.add(
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH_SYMBOL,
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME.INTERACTIVE
      );
      this.switchSymbolElement.textContent = this.closed
        ? FlyoutPanel.REFERENCE.SYMBOLS.SWITCH.OFF
        : FlyoutPanel.REFERENCE.SYMBOLS.SWITCH.ON
      ;
      this.switchElement.insertBefore(this.switchSymbolElement, this.switchElement.firstChild);
    }

    /**
     * The panel contents `Element`
     */
    this.contentsElement = this.element.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);

    // create the contents element, if necessary
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.element.appendChild(this.contentsElement);
    }
  }

  /**
   * Closes the panel.
   */
  async close() {
    this.logDebug({
      _functionName: FlyoutPanel.prototype.close.name,
      closed: this.closed
    });

    // abort if the panel is already closed
    if (this.closed) return;

    // indicate that the panel is closed
    this.closed = true;

    // hide the contents
    this.contentsElement.classList.remove(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // remove the modal overlay
    await this._unrenderModalOverlay();

    // update the switch
    this.switchElement.classList.remove(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.ACTIVE);
    this.switchElement.firstChild.textContent = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH.OFF;
  }

  /**
   * Opens the panel.
   */
  open() {
    this.logDebug({
      _functionName: FlyoutPanel.prototype.open.name,
      closed: this.closed
    });

    // abort if the panel is not already open
    if (!this.closed) return;

    // indicate that the panel is opened
    this.closed = false;

    // render a modal overlay
    this._renderModalOverlay();

    // determine the panel’s initial position in the viewport (the panel is not visible, so its height and width are 0)
    this._calculatePosition();

    // show the panel’s contents
    this.contentsElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // reposition the panel in the viewport, accounting for its actual height and width value now that it is visible
    this._calculatePosition();

    // update the switch
    this.switchElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.ACTIVE);
    this.switchElement.firstChild.textContent = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH.ON;
  }
}


export default FlyoutPanel;