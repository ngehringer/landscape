import * as core from '@backwater-systems/core';
import ModalLandscapeComponent from '../ModalLandscapeComponent.js';


class FlyoutPanel extends ModalLandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${FlyoutPanel.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: ModalLandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
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
        SWITCH_ACTIVE: '▲',
        SWITCH_INACTIVE: '▼'
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
      'closeOnModalOverlayClick': true,
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.closed = true;

      this.closeEvent = core.utilities.validateType(closeEvent, Function)
        ? closeEvent
        : null
      ;

      this.openEvent = core.utilities.validateType(openEvent, Function)
        ? openEvent
        : null
      ;

      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  _calculatePosition() {
    // determine the dimensions of the viewport
    const {
      innerHeight: viewportHeight,
      innerWidth: viewportWidth
    } = window;

    // determine the dimensions of the panel
    const {
      offsetHeight: contentsElementHeight,
      offsetWidth: contentsElementWidth
    } = this.contentsElement;

    // determine the coordinates of the panel’s switch
    const {
      bottom: switchElementY2,
      left: switchElementX1,
      right: switchElementX2,
      top: switchElementY1
    } = this.switchElement.getBoundingClientRect();

    this.logDebug(`${FlyoutPanel.prototype._calculatePosition.name} → viewport (width, height): (${viewportWidth}, ${viewportHeight}) | contents element (width, height): (${contentsElementWidth}, ${contentsElementHeight}) | switch element (X1, X2, Y1, Y2): (${switchElementX1}, ${switchElementX2}, ${switchElementY1}, ${switchElementY2})`);

    let left, right;
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

    let bottom, top;
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

    this.contentsElement.style.top = top;
    this.contentsElement.style.bottom = bottom;
    this.contentsElement.style.left = left;
    this.contentsElement.style.right = right;

    this.logDebug(`${FlyoutPanel.prototype._calculatePosition.name} → top: ${top} | bottom: ${bottom} | left: ${left} | right: ${right}`);
  }

  async _eventSwitchClick() {
    try {
      this.logDebug(`${FlyoutPanel.prototype._eventSwitchClick.name} → this.closed: ${this.closed}`);

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
    this.logDebug(`${FlyoutPanel.prototype._initialize.name}`);

    // apply the component’s CSS class
    this.element.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME._);

    // attempt to retrieve the switch element from the component element
    this.switchElement = this.element.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH}`);
    // create the switch element, if necessary
    if (this.switchElement === null) {
      this.switchElement = document.createElement('div');
      this.switchElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH);
      this.switchElement.text = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH_INACTIVE;
      this.element.insertBefore(this.switchElement, this.element.firstChild);
    }
    // handle the switch element’s “click” event
    this.switchElement.addEventListener(
      'click',
      this._eventSwitchClick.bind(this)
    );

    // attempt to retrieve the switch symbol element from the switch
    this.switchSymbolElement = this.switchElement.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH_SYMBOL}`);
    // create the switch symbol element, if necessary
    if (this.switchSymbolElement === null) {
      this.switchSymbolElement = document.createElement('span');
      this.switchSymbolElement.classList.add(
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME.SWITCH_SYMBOL,
        FlyoutPanel.REFERENCE.HTML_CLASS_NAME.INTERACTIVE,
      );
      this.switchSymbolElement.textContent = this.closed
        ? FlyoutPanel.REFERENCE.SYMBOLS.SWITCH_INACTIVE
        : FlyoutPanel.REFERENCE.SYMBOLS.SWITCH_ACTIVE
      ;
      this.switchElement.insertBefore(this.switchSymbolElement, this.switchElement.firstChild);
    }

    // attempt to retrieve the contents element from the component element
    this.contentsElement = this.element.querySelector(`.${FlyoutPanel.REFERENCE.HTML_CLASS_NAME.CONTENTS}`);
    // create the contents element, if necessary
    if (this.contentsElement === null) {
      this.contentsElement = document.createElement('div');
      this.element.appendChild(this.contentsElement);
    }
  }

  async close() {
    this.logDebug(`${FlyoutPanel.prototype.close.name} → this.closed: ${this.closed}`);

    // ensure that the panel is not already closed
    if (this.closed) return;

    // indicate that the panel is closed
    this.closed = true;

    // hide the contents
    this.contentsElement.classList.remove(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // remove the modal overlay
    await this._unrenderModalOverlay();

    // update the switch’s symbol
    this.switchElement.firstChild.textContent = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH_INACTIVE;
  }

  open() {
    this.logDebug(`${FlyoutPanel.prototype.open.name} → this.closed: ${this.closed}`);

    // ensure that the panel is not already open
    if (!this.closed) return;

    // indicate that the panel is opened
    this.closed = false;

    // render the modal overlay
    this._renderModalOverlay();

    // determine the panel’s initial position in the viewport (the panel is hidden, so its height and width are 0)
    this._calculatePosition();

    // show the panel’s contents
    this.contentsElement.classList.add(FlyoutPanel.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // reposition the panel in the viewport, accounting for its actual height and width value
    this._calculatePosition();

    // update the switch’s symbol
    this.switchElement.firstChild.textContent = FlyoutPanel.REFERENCE.SYMBOLS.SWITCH_ACTIVE;
  }
}


export default FlyoutPanel;