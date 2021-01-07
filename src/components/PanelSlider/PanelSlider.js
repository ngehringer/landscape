import * as core from '@backwater-systems/core';

import * as dataSources from '../../dataSources/index.js';
import LandscapeComponent from '../LandscapeComponent.js';

/**
 * Displays one of many panels at a time (i.e., a slide carousel).
 * @extends LandscapeComponent
 */
class PanelSlider extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${PanelSlider.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      ASYNCHRONOUS_LOADING: false,
      AUTOMATICALLY_SHOW_INITIAL_PANEL: true,
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${PanelSlider.name}`;

    return Object.freeze({
      ANIMATE_DIRECTIONS: Object.freeze({
        DOWN: 'down',
        IN: 'in',
        LEFT: 'left',
        OUT: 'out',
        RIGHT: 'right',
        UP: 'up'
      }),
      CSS_TRANSITION_DURATION: Object.freeze({
        IN: 800,
        OUT: 800
      }),
      DATA_ATTRIBUTE_NAME: Object.freeze({
        PANEL_CONTENTS_LOADED: 'data-panel-contents-loaded',
        PANEL_ID: 'data-panel-id'
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        ANIMATE: `${HTML_CLASS_NAME}-animate`,
        IMAGE_PANEL: `${HTML_CLASS_NAME}-image-panel`,
        PANEL: `${HTML_CLASS_NAME}-panel`,
        PANEL_CONTENTS: `${HTML_CLASS_NAME}-panel-contents`,
        PANEL_CONTENTS_CONTAINER: `${HTML_CLASS_NAME}-panel-contents-container`,
        VISIBLE: 'Landscape-visible'
      })
    });
  }

  constructor({
    asynchronousLoading = PanelSlider.DEFAULTS.ASYNCHRONOUS_LOADING,
    automaticallyShowInitialPanel = PanelSlider.DEFAULTS.AUTOMATICALLY_SHOW_INITIAL_PANEL,
    debug = PanelSlider.DEFAULTS.DEBUG,
    initialPanelID = null,
    panelAnimateInEvent = null,
    panelAnimateOutEvent = null,
    panelList,
    panelLoadEvent = null,
    targetElement,
    targetHTMLID
  }) {
    super({
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      /**
       * The ID of the current panel
       */
      this.currentPanelID = null;

      /**
       * Whether the contents of the panels are loaded asynchronously
       */
      this.asynchronousLoading = (typeof asynchronousLoading === 'boolean')
        ? asynchronousLoading
        : PanelSlider.DEFAULTS.ASYNCHRONOUS_LOADING
      ;

      /**
       * An event callback that fires after a panel animates in
       */
      this._eventCallbackPanelAnimateIn = (typeof panelAnimateInEvent === 'function')
        ? panelAnimateInEvent.bind(this)
        : null
      ;

      /**
       * An event callback that fires after a panel animates out
       */
      this._eventCallbackPanelAnimateOut = (typeof panelAnimateOutEvent === 'function')
        ? panelAnimateOutEvent.bind(this)
        : null
      ;

      /**
       * The ID of the initial panel
       */
      this.initialPanelID = (
        (typeof initialPanelID === 'string')
        && core.utilities.validation.isNonEmptyString(initialPanelID)
      )
        ? initialPanelID
        : null
      ;

      /**
       * An event callback that fires after a panel loads
       */
      this._eventCallbackPanelLoad = (typeof panelLoadEvent === 'function')
        ? panelLoadEvent.bind(this)
        : null
      ;

      /**
       * A list of panel metadata
       */
      this.panels = this._constructPanelMetadataList(panelList);

      // initialize the component
      this._initialize();

      /**
       * Whether the initial panel should be shown automatically after instantiation
       */
      const _automaticallyShowInitialPanel = (typeof automaticallyShowInitialPanel === 'boolean')
        ? automaticallyShowInitialPanel
        : PanelSlider.DEFAULTS.AUTOMATICALLY_SHOW_INITIAL_PANEL
      ;

      // show the initial panel (asynchronously), if necessary
      if (_automaticallyShowInitialPanel) {
        setTimeout(
          async () => {
            try {
              /**
               * The ID of the initial panel to display
               */
              const _initialPanelID = (this.initialPanelID === null)
                // default: the first panel
                ? this.panels[0].id
                // the specified initial panel
                : this.initialPanelID
              ;

              this.logDebug({
                _functionName: PanelSlider.prototype._initialize.name,
                initialPanelID: _initialPanelID
              });

              await this.showPanel(_initialPanelID);
            }
            catch (error) {
              this.logError(error);
            }
          },
          0
        );
      }
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  /**
   * Shows the panel with the specified ID.
   */
  async showPanel(panelID) {
    if (
      (typeof panelID !== 'string')
      || !core.utilities.validation.isNonEmptyString(panelID)
    ) throw new core.errors.TypeValidationError('panelID', String);

    this.logDebug({
      _functionName: PanelSlider.prototype.showPanel.name,
      currentPanelID: this.currentPanelID,
      panelID: panelID
    });

    // abort if a new panel is not being shown
    if (panelID === this.currentPanelID) {
      this.logWarning(`The current panel is already “${panelID}”.`);

      return;
    }

    /**
     * Metadata about the current panel (or null)
     */
    const currentPanelMetadata = this._getPanelMetadata(this.currentPanelID);

    /**
     * Metadata about the panel being shown
     */
    const panelMetadata = this._getPanelMetadata(panelID);
    if (panelMetadata === null) throw new Error(`Panel metadata (ID: “${panelID}”) could not be retrieved.`);

    // load the panel’s contents, if necessary
    if (
      this.asynchronousLoading
      && (panelMetadata.element.getAttribute(PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_CONTENTS_LOADED) !== 'true')
    ) {
      await this._loadPanel(panelMetadata);
    }

    // update the current panel
    this.currentPanelID = panelMetadata.id;

    // show the panel / trigger the animations
    await this._executePanelAnimations(panelMetadata, currentPanelMetadata);
  }

  async _animateIn(panelMetadata, direction) {
    this.logDebug({
      _functionName: PanelSlider.prototype._animateIn.name,
      direction: direction,
      panelID: panelMetadata.id
    });

    // abort if the specified panel’s element does not exist
    if (panelMetadata.element === null) throw new Error(`Panel element (Panel ID: “${panelMetadata.id}”) does not exist.`);

    // execute the animation

    panelMetadata.element.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.ANIMATE);
    panelMetadata.element.classList.add(direction);

    // make the panel visible
    panelMetadata.element.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // post–“animate in”

    await core.utilities.delay(PanelSlider.REFERENCE.CSS_TRANSITION_DURATION.IN);

    // remove the animation CSS classes from the panel element
    panelMetadata.element.classList.remove(direction);
    panelMetadata.element.classList.remove(PanelSlider.REFERENCE.HTML_CLASS_NAME.ANIMATE);

    // event callback: `panelAnimateIn`
    if (this._eventCallbackPanelAnimateIn !== null) {
      await this._eventCallbackPanelAnimateIn(panelMetadata);
    }
  }

  async _animateOut(panelMetadata, direction) {
    this.logDebug({
      _functionName: PanelSlider.prototype._animateOut.name,
      direction: direction,
      panelID: panelMetadata.id
    });

    // abort if the specified panel’s element does not exist
    if (panelMetadata.element === null) throw new Error(`Panel element (Panel ID: “${panelMetadata.id}”) does not exist.`);

    // execute the animation

    panelMetadata.element.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.ANIMATE);
    panelMetadata.element.classList.add(direction);

    // post–“animate out”

    await core.utilities.delay(PanelSlider.REFERENCE.CSS_TRANSITION_DURATION.OUT);

    // make the panel invisible
    panelMetadata.element.classList.remove(PanelSlider.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // remove the animation CSS classes from the panel element
    panelMetadata.element.classList.remove(direction);
    panelMetadata.element.classList.remove(PanelSlider.REFERENCE.HTML_CLASS_NAME.ANIMATE);

    // event callback: `panelAnimateOut`
    if (this._eventCallbackPanelAnimateOut !== null) {
      await this._eventCallbackPanelAnimateOut(panelMetadata);
    }
  }

  _constructPanelMetadataList(panelList) {
    if ( !Array.isArray(panelList) ) return [];

    /**
     * A list of metadata about the panels in the slider
     */
    const panelMetadataList = panelList
      .map(
        (panelMetadata, index) => {
          if (typeof panelMetadata !== 'object') {
            this.logWarning(`Panel metadata (index: ${index + 1}) is not an “object”.`);

            return null;
          }

          /**
           * Metadata about the panel
           */
          const {
            dataSource,
            id,
            image,
            parentPanelID,
            panelLoadEvent,
            title
          } = { ...panelMetadata };

          // `id`

          if (
            (typeof id !== 'string')
            || !core.utilities.validation.isNonEmptyString(id)
          ) {
            this.logWarning(`Panel (index: ${index + 1}) has an invalid “id”.`);

            return null;
          }

          if (
            panelList
              .filter( (_panel) => (_panel.id === id) )
              .length
            > 1
          ) {
            this.logWarning(`Panel (index: ${index + 1}) has a duplicated “id”: “${id}”.`);

            return null;
          }

          /**
           * The `DataSource` that provides the panel’s contents
           */
          const _dataSource = (
            (typeof dataSource === 'object')
            && (dataSource instanceof dataSources.BaseDataSource)
          )
            ? dataSource
            : null
          ;
          if (
            (typeof dataSource !== 'undefined')
            && (_dataSource === null)
          ) {
            this.logWarning(`Panel (ID: “${id}”) has an invalid “dataSource”.`);
          }

          /**
           * The ID of the parent panel
           */
          const _parentPanelID = (
            (typeof parentPanelID === 'string')
            && core.utilities.validation.isNonEmptyString(parentPanelID)
          )
            ? parentPanelID
            : null
          ;
          if (
            (typeof parentPanelID !== 'undefined')
            && (_parentPanelID === null)
          ) {
            this.logWarning(`Panel (ID: “${id}”) has an invalid “parentPanelID”.`);
          }

          /**
           * An event callback that fires after the panel loads
           */
          const eventCallbackPanelLoad = (typeof panelLoadEvent === 'function')
            ? panelLoadEvent.bind(this)
            : null
          ;
          if (
            (typeof panelLoadEvent !== 'undefined')
            && (eventCallbackPanelLoad === null)
          ) {
            this.logWarning(`Panel (ID: “${id}”) has an invalid “panelLoadEvent”.`);
          }

          /**
           * The title of the panel
           */
          const _title = (
            (typeof title === 'string')
            && core.utilities.validation.isNonEmptyString(title)
          )
            ? title
            : null
          ;
          if (
            (typeof title !== 'undefined')
            && (_title === null)
          ) {
            this.logWarning(`Panel (ID: “${id}”) has an invalid “title”.`);
          }

          /**
           * A list of common image file name extensions
           */
          const imageFileNameExtensions = [
            'gif',
            'jpg',
            'jpeg',
            'png',
            'tif',
            'tiff'
          ];

          /**
           * A list of image file name extensions
           */
          const imageFileNameRegExp = new RegExp(`${imageFileNameExtensions.map( (imageFileNameExtension) => `\\.${imageFileNameExtension}` ).join('|')}$`);

          /**
           * Whether the panel contains only an image
           */
          const _image = (typeof image === 'boolean')
            ? image
            : (
              (typeof panelMetadata.dataSource === 'object')
              && (typeof panelMetadata.dataSource.url === 'string')
              && imageFileNameRegExp.test( panelMetadata.dataSource.url.toLowerCase() )
            )
          ;

          return {
            dataSource: _dataSource,
            element: null,
            eventCallbackPanelLoad: eventCallbackPanelLoad,
            id: id,
            image: _image,
            parentPanelID: _parentPanelID,
            title: _title
          };
        }
      )
      .filter( (panelMetadata) => (panelMetadata !== null) )
    ;

    return panelMetadataList;
  }

  _eventDataSourceFetch(data, panelMetadata) {
    this.logDebug({
      _functionName: PanelSlider.prototype._eventDataSourceFetch.name,
      data: data,
      panelID: panelMetadata.id
    });

    this._renderPanel(data, panelMetadata);
  }

  _eventDataSourceFetchError(error, panelMetadata) {
    this.logDebug({
      _functionName: PanelSlider.prototype._eventDataSourceFetchError.name,
      error: error,
      panelID: panelMetadata.id
    });

    // log the error
    this.logError(error);
  }

  async _executePanelAnimations(newPanelMetadata, currentPanelMetadata) {
    /**
     * The ID of the current panel (or null)
     */
    const currentPanelID = currentPanelMetadata?.id ?? null;

    // abort if the new panel ID is the same as the current panel ID
    if (newPanelMetadata.id === currentPanelID) {
      this.logWarning(`Cannot execute animations; the current panel is already “${newPanelMetadata.id}”.`);

      return;
    }

    // determine the directions in which the animations should occur

    /**
     * The zero-based index of the current panel’s position in the carousel
     */
    const currentPanelPositionIndex = (currentPanelMetadata === null)
      ? -1
      : this._getPanelPositionIndex(currentPanelMetadata.id)
    ;

    /**
     * The zero-based index of the new panel’s position in the carousel
     */
    const newPanelPositionIndex = this._getPanelPositionIndex(newPanelMetadata.id);

    /**
     * The direction that the “animate in” animation should occur
     */
    let animateInDirection;

    /**
     * The direction that the “animate out” animation should occur
     */
    let animateOutDirection;

    // fade ⇡
    if (currentPanelPositionIndex === -1) {
      // don’t trigger the “animate out” animation for the initial panel
      animateOutDirection = null;
      animateInDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.IN;
    }
    // slide ↑
    else if (currentPanelPositionIndex === 0) {
      animateOutDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.UP;
      animateInDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.DOWN;
    }
    // slide ↓
    else if (newPanelPositionIndex === 0) {
      animateOutDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.DOWN;
      animateInDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.UP;
    }
    // slide ←
    else if (newPanelPositionIndex > currentPanelPositionIndex) {
      animateOutDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.LEFT;
      animateInDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.RIGHT;
    }
    // slide →
    else {
      animateOutDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.RIGHT;
      animateInDirection = PanelSlider.REFERENCE.ANIMATE_DIRECTIONS.LEFT;
    }

    this.logDebug({
      _functionName: PanelSlider.prototype._executePanelAnimations.name,
      animateInDirection: animateInDirection,
      animateOutDirection: animateOutDirection,
      currentPanelID: currentPanelID,
      currentPanelPositionIndex: currentPanelPositionIndex,
      newPanelID: newPanelMetadata.id,
      newPanelPositionIndex: newPanelPositionIndex
    });

    // execute the animations
    if (
      (currentPanelMetadata !== null)
      && (animateOutDirection !== null)
    ) {
      await this._animateOut(currentPanelMetadata, animateOutDirection);
    }
    await this._animateIn(newPanelMetadata, animateInDirection);
  }

  _getPanelMetadata(panelID) {
    /**
     * Metadata about the panel with the specified ID
     */
    const panel = this.panels.find(
      (_panel) => (_panel.id === panelID)
    ) ?? null;

    return panel;
  }

  _getPanelPositionIndex(panelID) {
    /**
     * Metadata about the panel with the specified ID
     */
    const panelMetadata = this._getPanelMetadata(panelID);

    if (panelMetadata === null) return -1;

    return this.panels.indexOf(panelMetadata);
  }

  _initialize() {
    // if no panels were specified (or valid) via the constructor, attempt to populate the list of panels from the DOM
    if (this.panels.length === 0) {
      for (
        const panelElement of Array.from(
          this.element.querySelectorAll(`[${PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_ID}]`)
        )
      ) {
        /**
         * The panel ID retrieved from the `Element` (`data-panel-id` attribute)
         */
        const panelID = panelElement.getAttribute(PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_ID);
        if ( core.utilities.validation.isNonEmptyString(panelID) ) {
          this.panels.push({
            dataSource: null,
            element: panelElement,
            eventCallbackPanelLoad: null,
            id: panelID,
            parentPanelID: null,
            title: null
          });
        }
      }
    }

    // abort if there are no panels
    if (this.panels.length === 0) throw new Error('No panels were initialized.');

    /**
     * The carousel `Element`
     *
     * It contains the panels.
     */
    let carouselElement = this.element.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME._}`);

    // if necessary, create the carousel
    if (carouselElement === null) {
      carouselElement = document.createElement('div');
      carouselElement.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME._);
      this.element.appendChild(carouselElement);
    }

    for (const panelMetadata of this.panels) {
      // ensure the panel’s element is initialized
      panelMetadata.element = this._initializePanelElement(panelMetadata);

      if (panelMetadata.dataSource !== null) {
        // register the panel `DataSource`’s `fetch` event handler
        panelMetadata.dataSource.registerEventHandler(
          'fetch',
          (data) => {
            this._eventDataSourceFetch(data, panelMetadata);
          }
        );

        // register the panel `DataSource`’s `fetchError` event handler
        panelMetadata.dataSource.registerEventHandler(
          'fetchError',
          (error) => {
            this._eventDataSourceFetchError(error, panelMetadata);
          }
        );
      }
    }
  }

  _initializePanelElement(panelMetadata) {
    this.logDebug({
      _functionName: PanelSlider.prototype._initializePanelElement.name,
      panelID: panelMetadata.id
    });

    /**
     * The existing panel `Element` (or null)
     */
    const _panelElement = panelMetadata.element;

    // abort if the panel `Element` is already initialized
    if (
      (typeof _panelElement === 'object')
      && (_panelElement instanceof Element)
      // ensure the panel `Element` has a child panel contents container `Element`
      && (_panelElement.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS_CONTAINER}`) !== null)
      // ensure the child panel contents container `Element` has a child panel contents `Element`
      && (_panelElement.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS_CONTAINER}`).querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS}`) !== null)
      // ensure the panel `Element` has the expected `data-panel-id` attribute value
      && (_panelElement.getAttribute(PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_ID) === panelMetadata.id)
    ) {
      this.logDebug({
        _functionName: PanelSlider.prototype._initializePanelElement.name,
        message: `Panel “${panelMetadata.id}” is already initialized.`
      });

      return _panelElement;
    }

    /**
     * The created panel `Element`
     */
    const panelElement = document.createElement('div');
    panelElement.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL);
    panelElement.setAttribute(PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_ID, panelMetadata.id);
    // indicate that the panel is an image panel
    if (panelMetadata.image) {
      panelElement.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.IMAGE_PANEL);
    }

    /**
     * The panel contents container `Element`
     */
    const _panelContentsContainerElement = panelElement.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS_CONTAINER}`);

    /**
     * The panel contents container `Element`
     */
    const panelContentsContainerElement = (_panelContentsContainerElement === null)
      ? document.createElement('div')
      : _panelContentsContainerElement
    ;
    panelContentsContainerElement.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS_CONTAINER);
    panelElement.appendChild(panelContentsContainerElement);

    /**
     * The panel contents `Element`
     */
    const _panelContentsElement = panelContentsContainerElement.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS}`);

    /**
     * The panel contents `Element`
     */
    const panelContentsElement = (_panelContentsElement === null)
      ? (
        (typeof _panelElement === 'object')
        && (_panelElement instanceof Element)
      )
        // use the existing panel `Element` as the panel contents `Element`
        ? _panelElement
        : document.createElement('div')
      : _panelContentsElement
    ;
    panelContentsElement.classList.add(PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS);
    panelContentsContainerElement.appendChild(panelContentsElement);

    /**
     * The carousel `Element`
     */
    const carouselElement = this.element.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME._}`);
    if (carouselElement === null) throw new Error('Carousel element does not exist.');
    carouselElement.appendChild(panelElement);

    return panelElement;
  }

  async _loadPanel(panelMetadata) {
    /**
     * The panel `Element`
     */
    const panelElement = panelMetadata.element;
    if (
      (typeof panelElement !== 'object')
      || !(panelElement instanceof Element)
    ) throw new core.errors.TypeValidationError('panel.element', Element);

    // load the panel contents

    if (panelMetadata.dataSource !== null) {
      await panelMetadata.dataSource.fetch();
    }

    // indicate that the panel element’s contents are loaded
    panelElement.setAttribute(PanelSlider.REFERENCE.DATA_ATTRIBUTE_NAME.PANEL_CONTENTS_LOADED, 'true');

    // event callback: `panelLoad`
    // execute the panel’s load event callback, if specified …
    if (panelMetadata.eventCallbackPanelLoad !== null) {
      await panelMetadata.eventCallbackPanelLoad(panelMetadata);
    }
    // … otherwise, execute the global event callback
    else if (this._eventCallbackPanelLoad !== null) {
      await this._eventCallbackPanelLoad(panelMetadata);
    }
  }

  _renderPanel(data, panelMetadata) {
    this.logDebug({
      _functionName: PanelSlider.prototype._renderPanel.name,
      dataByteCount: (
        () => {
          if (typeof data === 'string') {
            return data.length;
          }

          if (
            (typeof data === 'object')
            && (data instanceof ArrayBuffer)
          ) {
            return data.byteLength;
          }

          return JSON.stringify(data).length;
        }
      )(),
      panelID: panelMetadata.id
    });

    /**
     * The contents `Element` of the panel being rendered
     */
    const panelContentsElement = panelMetadata.element?.querySelector(`.${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS}`);
    if (
      (typeof panelContentsElement !== 'object')
      || !(panelContentsElement instanceof Element)
    ) throw new Error(`Could not locate a “${PanelSlider.REFERENCE.HTML_CLASS_NAME.PANEL_CONTENTS}” element for panel (ID: “${panelMetadata.id}”).`);

    // image panel
    if (panelMetadata.image) {
      /**
       * The panel contents image `Element` (`<img>`)
       */
      const imageElement = document.createElement('img');

      // load the image
      imageElement.src = panelMetadata.dataSource?.url;

      // add the image to the panel
      panelContentsElement.parentElement.replaceChild(imageElement, panelContentsElement.parentElement.firstChild);
    }
    else {
      // abort if the specified `data` parameter value is not a non-empty string
      if (
        (typeof data !== 'string')
        || !core.utilities.validation.isNonEmptyString(data)
      ) throw new core.errors.TypeValidationError('data', String);

      // replace the panel contents element’s markup with the specified HTML
      core.webUtilities.injectHTML({
        debug: this.debug,
        html: data,
        logger: this.logger,
        replace: true,
        sourceID: this._getLoggingSourceID({ functionName: PanelSlider.prototype._renderPanel.name }),
        target: panelContentsElement
      });
    }
  }
}


export default PanelSlider;