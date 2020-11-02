import * as core from '@backwater-systems/core';


class LandscapeComponent {
  static get DEFAULTS() {
    return Object.freeze({
      CREATE_TARGET: false,
      DEBUG: false
    });
  }

  constructor({
    createTarget = LandscapeComponent.DEFAULTS.CREATE_TARGET,
    debug = LandscapeComponent.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID
  }) {
    try {
      this.debug = core.utilities.validateType(debug, Boolean)
        ? debug
        : LandscapeComponent.DEFAULTS.DEBUG
      ;

      this.createTarget = core.utilities.validateType(createTarget, Boolean)
        ? createTarget
        : LandscapeComponent.DEFAULTS.CREATE_TARGET
      ;

      this.htmlID = core.utilities.isNonEmptyString(targetHTMLID)
        ? targetHTMLID
        : null
      ;

      if (this.createTarget) {
        this.element = document.createElement('div');
        // set the element’s HTML ID, if specified
        if (this.htmlID !== null) {
          this.element.id = this.htmlID;
        }
        // add the component’s HTML class
        this.element.classList.add(this.constructor.REFERENCE.HTML_CLASS_NAME._);
      }
      else {
        this.element = core.utilities.validateType(targetElement, Element)
          ? targetElement
          // if an element is not specified, …
          : (this.htmlID === null)
            ? null
            // … but an html ID is, attempt to retrieve the element from the DOM
            : document.querySelector(`#${this.htmlID}`)
        ;
      }

      // ensure the component’s element exists
      if (this.element === null) throw new Error(`The component’s specified element is invalid${(this.htmlID === null) ? '' : ` (#${this.htmlID})`}.`);

      if (
        // if an HTML ID was specified, …
        (this.htmlID !== null)
        // … ensure it matches the element’s HTML ID values
        && (this.htmlID !== this.element.id)
      ) throw new Error(`The specified HTML ID (“${this.htmlID}”) and the specified element’s HTML ID (“${this.element.id}”) do not match.`);
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  get _loggingProcessID() {
    const identifierList = [];
    if ( core.utilities.validateType(this.constructor.CLASS_NAME, String) ) {
      identifierList.push(this.constructor.CLASS_NAME);
    }
    if ( core.utilities.validateType(this.htmlID, String) ) {
      identifierList.push(`#${this.htmlID}`);
    }

    return (identifierList.length === 0)
      ? null
      : identifierList.join('|')
    ;
  }

  async _delay(delayMilliseconds) {
    if (
      !core.utilities.isNumber(delayMilliseconds)
      || (delayMilliseconds <= 0)
    ) throw new core.errors.TypeValidationError('delayMilliseconds', Number);

    this.logDebug(`${LandscapeComponent.prototype._delay.name} → delayMilliseconds: ${core.utilities.formatNumber(delayMilliseconds)}`);

    await new Promise(
      (resolve, _reject) => {
        setTimeout(
          () => {
            resolve();
          },
          delayMilliseconds
        );
      }
    );
  }

  _getCenteredCoordinates() {
    // default: the origin (0, 0)
    let x = 0;
    let y = 0;

    // get the element’s dimensions
    const {
      height: elementHeight,
      width: elementWidth
    } = this.element.getBoundingClientRect();

    // get the viewport’s dimensions
    const {
      innerHeight: viewportHeight,
      innerWidth: viewportWidth
    } = window;

    // center the element horizontally if it will fit within the viewport
    if (elementWidth < viewportWidth) {
      x = (viewportWidth - elementWidth) / 2;
    }

    // center the element vertically if it will fit within the viewport
    if (elementHeight < viewportHeight) {
      y = (viewportHeight - elementHeight) / 2;
    }

    return {
      'x': x,
      'y': y
    };
  }

  destroy() {
    try {
      this.logDebug(`${LandscapeComponent.prototype.destroy.name}`);

      if ( !core.utilities.validateType(this.element, Element) ) throw new core.errors.TypeValidationError('element', Element);
      if ( !core.utilities.validateType(this.element.parentNode, Element) ) throw new core.errors.TypeValidationError('element.parentNode', Element);

      // remove the component from the DOM
      this.element.parentNode.removeChild(this.element);
    }
    catch (error) {
      this.logError(error);
    }
  }

  logCriticalError(logItem) {
    try {
      core.logging.Logger.logCriticalError(logItem, this._loggingProcessID, this.debug);
    }
    catch (error) {
      this.logError(error);
    }
  }

  logDebug(logItem) {
    try {
      // only log debug messages if the component was initialized in debug mode
      if (!this.debug) return;

      core.logging.Logger.logDebug(logItem, this._loggingProcessID, this.debug);
    }
    catch (error) {
      this.logError(error);
    }
  }

  logError(logItem) {
    try {
      core.logging.Logger.logError(logItem, this._loggingProcessID, this.debug);
    }
    catch (error) {
      // output logging errors to the console
      console.log(`[${new Date().toISOString()}] {CRITICAL ERROR|${LandscapeComponent.name}.logError} ${error.message}${this.debug ? `\n${error.stack}` : ''}`);
    }
  }

  logInfo(logItem) {
    try {
      core.logging.Logger.logInfo(logItem, this._loggingProcessID, this.debug);
    }
    catch (error) {
      this.logError(error);
    }
  }

  logWarning(logItem) {
    try {
      core.logging.Logger.logWarning(logItem, this._loggingProcessID, this.debug);
    }
    catch (error) {
      this.logError(error);
    }
  }

  setPosition({
    x,
    y
  }) {
    if ( !core.utilities.isNumber(x) ) throw new core.errors.TypeValidationError('x', Number);
    if ( !core.utilities.isNumber(y) ) throw new core.errors.TypeValidationError('y', Number);

    this.logDebug(`${LandscapeComponent.prototype.setPosition.name} → { x: ${x}, y: ${y} }`);

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
}


export default LandscapeComponent;