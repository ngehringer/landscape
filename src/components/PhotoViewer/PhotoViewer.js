import * as core from '@backwater-systems/core';

import ModalLandscapeComponent from '../ModalLandscapeComponent.js';


/**
 * A modal photo viewer.
 * @extends ModalLandscapeComponent
 */
class PhotoViewer extends ModalLandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${PhotoViewer.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: ModalLandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${PhotoViewer.name}`;

    return Object.freeze({
      CSS_TRANSITION_DURATION: Object.freeze({
        INITIAL: 100,
        MODAL_OVERLAY: 700
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        INACTIVE: 'Landscape-inactive',
        INITIAL: `${HTML_CLASS_NAME}-initial`
      })
    });
  }

  constructor({
    debug = PhotoViewer.DEFAULTS.DEBUG,
    url
  }) {
    super({
      closeOnModalOverlayClick: true,
      createTarget: true,
      debug: debug
    });

    try {
      if (
        (typeof url !== 'string')
        || !core.utilities.validation.isNonEmptyString(url)
      ) throw new core.errors.TypeValidationError('url', String);

      /**
       * The URL of the photo
       */
      this.url = url;

      // initialize the component
      this._initialize();

      // open the photo viewer
      this.open();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async _eventImageLoad(event) {
    try {
      this.logDebug({
        _functionName: PhotoViewer.prototype._eventImageLoad.name,
        event: event,
        src: event.currentTarget.src
      });

      /**
       * The image `Element` (`<img>`)
       */
      const imageElement = event.currentTarget;

      // display the photo (add it to the component element)
      this.element.appendChild(imageElement);

      // trigger the initial animation
      await core.utilities.delay(PhotoViewer.REFERENCE.CSS_TRANSITION_DURATION.INITIAL);
      imageElement.classList.remove(PhotoViewer.REFERENCE.HTML_CLASS_NAME.INITIAL);
    }
    catch (error) {
      this.logError(error);
    }
  }

  _initialize() {
    this.logDebug({
      _functionName: PhotoViewer.prototype._initialize.name
    });

    // apply the component’s CSS class
    this.element.classList.add(PhotoViewer.REFERENCE.HTML_CLASS_NAME._);

    // close the component when it is clicked
    this.element.addEventListener(
      'click',
      this._eventModalOverlayClick.bind(this)
    );

    // add the component to the document
    document.body.appendChild(this.element);
  }

  /**
   * Closes the photo viewer.
   */
  close() {
    this.logDebug({
      _functionName: PhotoViewer.prototype.close.name
    });

    // remove the component from the document
    this.destroy();
  }

  /**
   * Opens the photo viewer.
   */
  open() {
    this.logDebug({
      _functionName: PhotoViewer.prototype.open.name
    });

    // render a modal overlay
    this._renderModalOverlay();

    /**
     * The image `Element` (`<img>`)
     */
    const imageElement = document.createElement('img');
    imageElement.classList.add(PhotoViewer.REFERENCE.HTML_CLASS_NAME.INITIAL);
    imageElement.src = this.url;

    // display the image after it has loaded
    imageElement.addEventListener(
      'load',
      this._eventImageLoad.bind(this)
    );

    // give the component input focus
    this.element.focus();
  }
}


export default PhotoViewer;