import * as core from '@backwater-systems/core';
import LandscapeComponent from './LandscapeComponent.js';


class ModalLandscapeComponent extends LandscapeComponent {
  static get DEFAULTS() {
    return Object.freeze({
      CLOSE_ON_MODAL_OVERLAY_CLICK: false,
      CREATE_TARGET: LandscapeComponent.DEFAULTS.CREATE_TARGET,
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  constructor({
    closeOnModalOverlayClick = ModalLandscapeComponent.DEFAULTS.CLOSE_ON_MODAL_OVERLAY_CLICK,
    createTarget = ModalLandscapeComponent.DEFAULTS.CREATE_TARGET,
    debug = ModalLandscapeComponent.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID
  }) {
    super({
      'createTarget': createTarget,
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.closeOnModalOverlayClick = core.utilities.validateType(closeOnModalOverlayClick, Boolean)
        ? closeOnModalOverlayClick
        : ModalLandscapeComponent.DEFAULTS.CLOSE_ON_MODAL_OVERLAY_CLICK
      ;

      // allow the component to intercept keystrokes (and thus, gain :focus)
      this.element.tabIndex = 0;
      // handle the component’s “keyup” event
      this.element.addEventListener(
        'keyup',
        this._eventKeyup.bind(this)
      );
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async _eventKeyup(event) {
    try {
      this.logDebug(`${ModalLandscapeComponent.prototype._eventKeyup.name}`);

      // Escape: close the component
      if (event.key === 'Escape') {
        await this.close();
      }
      // Enter: …
      else if (event.key === 'Enter') {
        // … if the component can be submitted (e.g., is a dialog), invoke the submit function
        if ( core.utilities.validateType(this.submit, Function) ) {
          await this.submit();
        }
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  async _eventModalOverlayClick() {
    try {
      this.logDebug(`${ModalLandscapeComponent.prototype._eventModalOverlayClick.name}`);

      // close the component
      await this.close();

      // remove the modal overlay
      await this._unrenderModalOverlay();
    }
    catch (error) {
      this.logError(error);
    }
  }

  _renderModalOverlay() {
    this.logDebug(`${ModalLandscapeComponent.prototype._renderModalOverlay.name}`);

    // create the modal overlay element
    this._modalOverlayElement = document.createElement('div');
    this._modalOverlayElement.classList.add(
      this.constructor.REFERENCE.HTML_CLASS_NAME.MODAL_OVERLAY,
      this.constructor.REFERENCE.HTML_CLASS_NAME.INACTIVE
    );

    // add the overlay to the DOM (immediately before the element)
    this.element.parentNode.insertBefore(this._modalOverlayElement, this.element);

    // HACK: allow all CSS transitions to fire correctly by calling JSON.stringify() on the element’s style
    // TODO: Decrease heft
    JSON.stringify( getComputedStyle(this._modalOverlayElement) );

    // remove the overlay’s “inactive” state
    this._modalOverlayElement.classList.remove(this.constructor.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // optionally, close the component if anywhere outside of its boundaries is clicked
    if (this.closeOnModalOverlayClick) {
      this._modalOverlayElement.addEventListener(
        'click',
        this._eventModalOverlayClick.bind(this)
      );
    }
  }

  async _unrenderModalOverlay() {
    this.logDebug(`${ModalLandscapeComponent.prototype._unrenderModalOverlay.name}`);

    // add the overlay’s “inactive” state
    this._modalOverlayElement.classList.add(this.constructor.REFERENCE.HTML_CLASS_NAME.INACTIVE);

    // after the “inactive” transition …
    await this._delay(this.constructor.REFERENCE.CSS_TRANSITION_DURATION.MODAL_OVERLAY);
    // … remove the overlay element from the DOM
    if (this._modalOverlayElement.parentNode !== null) {
      this._modalOverlayElement.parentNode.removeChild(this._modalOverlayElement);
    }
  }
}


export default ModalLandscapeComponent;