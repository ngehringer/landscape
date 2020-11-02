import * as core from '@backwater-systems/core';
import LandscapeComponent from '../LandscapeComponent.js';


class PhotoViewer extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${PhotoViewer.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    return Object.freeze({
      CSS_TRANSITION_DURATION: Object.freeze({
        INITIAL: 100
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: 'Landscape-PhotoViewer',
        INITIAL: 'Landscape-PhotoViewer-initial'
      })
    });
  }

  constructor({
    debug = PhotoViewer.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID,
    url
  }) {
    super({
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      if ( core.utilities.isNonEmptyString(url) ) throw new core.errors.TypeValidationError('url', String);

      this.url = url;

      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  _eventComponentClick(event) {
    try {
      this.logDebug(`${PhotoViewer.prototype._eventComponentClick.name}`);

      this.close();
    }
    catch (error) {
      this.logError(error);
    }
  }

  _eventComponentKeyup(event) {
    try {
      this.logDebug(`${PhotoViewer.prototype._eventComponentKeyup.name} → event.key: “${event.key}”`);

      if (event.key === 'Escape') {
        this.close();
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  async _eventImageLoad(event) {
    try {
      this.logDebug(`${PhotoViewer.prototype._eventImageLoad.name} → event.currentTarget.src: “${event.currentTarget.src}”`);

      // define the image’s element
      const imageElement = event.currentTarget;

      // display the photo (add it to the PhotoViewer element)
      this.element.appendChild(imageElement);

      // trigger the initial animation
      await this._delay(PhotoViewer.REFERENCE.CSS_TRANSITION_DURATION.INITIAL);
      imageElement.classList.remove('initial');
    }
    catch (error) {
      this.logError(error);
    }
  }

  _initialize() {
    this.logDebug(`${PhotoViewer.prototype._initialize.name}`);

    // apply the component’s CSS class
    this.element.classList.add(PhotoViewer.REFERENCE.HTML_CLASS_NAME._);

    // close the viewer when a click occurs
    this.element.addEventListener(
      'click',
      this._eventComponentClick.bind(this)
    );

    // close the viewer when ‘Escape’ is pressed
    this.element.addEventListener(
      'keyup',
      this._eventComponentKeyup.bind(this)
    );

    // create the image element
    const imageElement = document.createElement('img');
    imageElement.classList.add(PhotoViewer.REFERENCE.HTML_CLASS_NAME.INITIAL);
    imageElement.src = this.url;

    // display the image after it has loaded
    imageElement.addEventListener(
      'load',
      this._eventImageLoad.bind(this)
    );

    // add the PhotoViewer to the DOM
    document.body.appendChild(this.element);
    this.element.tabIndex = 0; // allow the viewer to intercept keyupes …
    this.element.focus(); // … and give it input focus
  }

  close() {
    try {
      this.logDebug(`${PhotoViewer.prototype.close.name}`);

      this.destroy();
    }
    catch (error) {
      this.logError(error);
    }
  }
}


export default PhotoViewer;