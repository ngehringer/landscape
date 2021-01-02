import * as core from '@backwater-systems/core';


/**
 * The `LandscapeComponent` abstract base class.
 * @abstract
 */
class LandscapeComponent {
  static get DEFAULTS() {
    return Object.freeze({
      CREATE_TARGET: false,
      DEBUG: false,
      LOGGER: core.logging.ConsoleLogger
    });
  }

  constructor({
    createTarget = LandscapeComponent.DEFAULTS.CREATE_TARGET,
    debug = LandscapeComponent.DEFAULTS.DEBUG,
    logger = LandscapeComponent.DEFAULTS.LOGGER,
    targetElement,
    targetHTMLID
  }) {
    try {
      /**
       * The logger for the component instance
       */
      this.logger = (
        (typeof logger === 'object')
        && (logger instanceof core.logging.BaseLogger)
      )
        ? logger
        : LandscapeComponent.DEFAULTS.LOGGER
      ;

      /**
       * Whether debug mode is enabled
       * @default false
       */
      this.debug = (typeof debug === 'boolean')
        ? debug
        : LandscapeComponent.DEFAULTS.DEBUG
      ;

      /**
       * Whether the component’s `Element` should be created
       * @default false
       */
      this.createTarget = (typeof createTarget === 'boolean')
        ? createTarget
        : LandscapeComponent.DEFAULTS.CREATE_TARGET
      ;

      /**
       * The HTML ID of the component
       */
      this.htmlID = (
        (typeof targetHTMLID === 'string')
        && core.utilities.validation.isNonEmptyString(targetHTMLID)
      )
        ? targetHTMLID
        : null
      ;

      if (this.createTarget) {
        /**
         * The component `Element`
         *
         * It contains all of the children nodes of the component.
         */
        this.element = document.createElement('div');

        // set the element’s HTML ID, if specified
        if (this.htmlID !== null) {
          this.element.id = this.htmlID;
        }
        // add the component’s HTML class
        this.element.classList.add(this.constructor.REFERENCE.HTML_CLASS_NAME._);
      }
      else {
        this.element = (
          (typeof targetElement === 'object')
          && (targetElement instanceof Element)
        )
            ? targetElement
            // if an element is not specified, …
            : (this.htmlID === null)
              ? null
              // … but an html ID is, attempt to retrieve the element from the document
              : document.querySelector(`#${this.htmlID}`)
        ;
      }

      // abort if the component’s element does not exist
      if (this.element === null) throw new Error(`The component’s specified element is invalid${(this.htmlID === null) ? '' : ` (#${this.htmlID})`}.`);

      if (
        // if an HTML ID was specified, …
        (this.htmlID !== null)
        // … ensure it matches the element’s HTML ID values
        && (this.htmlID !== this.element.id)
      ) throw new core.errors.InvalidParameterValueError({
        parameterName: 'htmlID',
        reason: `The specified HTML ID (“${this.htmlID}”) and the specified element’s HTML ID (“${this.element.id}”) do not match.`
      });
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  _getCenteredCoordinates() {
    // default: the origin (0, 0)

    /**
     * The centered “x” coordinate
     */
    let x = 0;

    /**
     * The centered “y” coordinate
     */
    let y = 0;

    /**
     * The component element’s dimensions
     */
    const {
      height: elementHeight,
      width: elementWidth
    } = this.element.getBoundingClientRect();

    /**
     * The viewport’s dimensions
     */
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
      x: x,
      y: y
    };
  }

  _getLoggingSourceID({
    functionName = null
  }) {
    /**
     * A list of identifiers to include in the logging source ID
     */
    const identifierList = [];

    if (typeof this.constructor.CLASS_NAME === 'string') {
      identifierList.push(this.constructor.CLASS_NAME);
    }
    if (typeof this.htmlID === 'string') {
      identifierList.push(`#${this.htmlID}`);
    }
    if (typeof functionName === 'string') {
      identifierList.push(functionName);
    }

    return (identifierList.length === 0)
      ? null
      : identifierList.join('::')
    ;
  }

  /**
   * Removes the component from the document.
   */
  destroy() {
    try {
      this.logDebug({
        _functionName: LandscapeComponent.prototype.destroy.name
      });

      if (
        (typeof this.element !== 'object')
        || !(this.element instanceof Element)
      ) throw new core.errors.TypeValidationError('element', Element);
      if (this.element.parentNode === null) throw new core.errors.TypeValidationError('element.parentNode', Element);

      // remove the component from the document
      this.element.parentNode.removeChild(this.element);
    }
    catch (error) {
      this.logError(error);
    }
  }

  logCriticalError(data) {
    try {
      let
        _data,
        functionName
      ;
      // extract the “_functionName” property from the logged data
      if (typeof data === 'object') {
        ({
          _functionName: functionName,
          ..._data
        } = { ...data });
      }
      else {
        _data = data;
        functionName = null;
      }

      this.logger.logCriticalError({
        data: _data,
        sourceID: this._getLoggingSourceID({ functionName: functionName }),
        verbose: this.debug
      });
    }
    catch (error) {
      this.logError(error);
    }
  }

  logDebug(data) {
    try {
      // abort if the component was not initialized with debug mode enabled
      if (!this.debug) return;

      let
        _data,
        functionName
      ;
      // extract the “_functionName” property from the logged data
      if (typeof data === 'object') {
        ({
          _functionName: functionName,
          ..._data
        } = { ...data });
      }
      else {
        _data = data;
        functionName = null;
      }

      this.logger.logDebug({
        data: _data,
        sourceID: this._getLoggingSourceID({ functionName: functionName }),
        verbose: this.debug
      });
    }
    catch (error) {
      this.logError(error);
    }
  }

  logError(data) {
    try {
      let
        _data,
        functionName
      ;
      // extract the “_functionName” property from the logged data
      if (typeof data === 'object') {
        ({
          _functionName: functionName,
          ..._data
        } = { ...data });
      }
      else {
        _data = data;
        functionName = null;
      }

      this.logger.logError({
        data: _data,
        sourceID: this._getLoggingSourceID({ functionName: functionName }),
        verbose: this.debug
      });
    }
    catch (error) {
      // write a message describing the logging error to the console
      console.log(`[${new Date().toISOString()}] {CRITICAL ERROR|${LandscapeComponent.name}.logError} ${error.message}${this.debug ? `\n${error.stack}` : ''}`);
    }
  }

  logInfo(data) {
    try {
      let
        _data,
        functionName
      ;
      // extract the “_functionName” property from the logged data
      if (typeof data === 'object') {
        ({
          _functionName: functionName,
          ..._data
        } = { ...data });
      }
      else {
        _data = data;
        functionName = null;
      }

      this.logger.logInfo({
        data: _data,
        sourceID: this._getLoggingSourceID({ functionName: functionName }),
        verbose: this.debug
      });
    }
    catch (error) {
      this.logError(error);
    }
  }

  logWarning(data) {
    try {
      let
        _data,
        functionName
      ;
      // extract the “_functionName” property from the logged data
      if (typeof data === 'object') {
        ({
          _functionName: functionName,
          ..._data
        } = { ...data });
      }
      else {
        _data = data;
        functionName = null;
      }

      this.logger.logWarning({
        data: _data,
        sourceID: this._getLoggingSourceID({ functionName: functionName }),
        verbose: this.debug
      });
    }
    catch (error) {
      this.logError(error);
    }
  }

  /**
   * Sets the position of the component relative to its parent node, using the specified coordinates.
   */
  setPosition({
    x,
    y
  }) {
    if (typeof x !== 'number') throw new core.errors.TypeValidationError('x', Number);
    if (typeof y !== 'number') throw new core.errors.TypeValidationError('y', Number);

    this.logDebug({
      _functionName: LandscapeComponent.prototype.setPosition.name,
      x: x,
      y: y
    });

    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }
}


export default LandscapeComponent;