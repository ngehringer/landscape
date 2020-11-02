import * as core from '@backwater-systems/core';
import * as dataSources from '../../dataSources/index.js';
import LandscapeComponent from '../LandscapeComponent.js';


class Slideroll extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${Slideroll.name}`; }

  static get DEFAULTS() {
    return Object.freeze(
      {
        ACTIVE_TRANSPORT: false,
        AUTO_SHOW_SLIDE: false,
        DEBUG: LandscapeComponent.DEFAULTS.DEBUG
      }
    );
  }

  static get REFERENCE() {
    const HTML_CLASS_NAME = `Landscape-${Slideroll.name}`;

    return Object.freeze({
      CSS_TRANSITION_DURATION: Object.freeze({
        IN: 800,
        OUT: 800
      }),
      DATA_ATTRIBUTE_NAME: Object.freeze({
          SLIDE_CONTENTS_LOADED: 'data-slide-contents-loaded',
          SLIDE_ID: 'data-slide-id'
      }),
      HTML_CLASS_NAME: Object.freeze({
          _: HTML_CLASS_NAME,
          ANIMATE: `${HTML_CLASS_NAME}-animate`,
          IMAGE_SLIDE: `${HTML_CLASS_NAME}-image-slide`,
          SLIDE: `${HTML_CLASS_NAME}-slide`,
          SLIDE_CONTENTS: `${HTML_CLASS_NAME}-slide-contents`,
          SLIDE_CONTENTS_CONTAINER: `${HTML_CLASS_NAME}-slide-contents-container`,
          VISIBLE: 'Landscape-visible'
      })
    });
  }

  constructor({
    activeTransport = Slideroll.DEFAULTS.ACTIVE_TRANSPORT,
    autoShowSlide = Slideroll.DEFAULTS.AUTO_SHOW_SLIDE,
    debug = Slideroll.DEFAULTS.DEBUG,
    initialSlide = null,
    slideAnimateInEvent = null,
    slideAnimateOutEvent = null,
    slideList,
    slideLoadEvent = null,
    targetElement,
    targetHTMLID
  }) {
    super({
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.currentSlideID = null;

      this.activeTransport = core.utilities.validateType(activeTransport, Boolean)
        ? activeTransport
        : Slideroll.DEFAULTS.ACTIVE_TRANSPORT
      ;

      this._eventCallbackSlideAnimateIn = core.utilities.validateType(slideAnimateInEvent, Function)
        ? slideAnimateInEvent
        : null
      ;

      this._eventCallbackSlideAnimateOut = core.utilities.validateType(slideAnimateOutEvent, Function)
        ? slideAnimateOutEvent
        : null
      ;

      this.initialSlideID = core.utilities.isNonEmptyString(initialSlide)
        ? initialSlide
        : null
      ;

      this._eventCallbackSlideLoad = core.utilities.validateType(slideLoadEvent, Function)
        ? slideLoadEvent
        : null
      ;

      this.slideList = this._constructSlideMetadataList(slideList);

      this._initialize();

      // show the initial slide (asynchronously)
      const _autoShowSlide = core.utilities.validateType(autoShowSlide, Boolean)
        ? autoShowSlide
        : Slideroll.DEFAULTS.AUTO_SHOW_SLIDE
      ;
      if (_autoShowSlide) {
        // HACK
        setTimeout(
          (
            async () => {
              try {
                // determine the initial slide to display
                const initialSlideID = (this.initialSlideID === null)
                  // default: the first slide
                  ? this.slideList[0].id
                  // the specified initial slide
                  : this.initialSlideID
                ;

                this.logDebug(`${Slideroll.prototype._initialize.name} → initialSlideID: “${initialSlideID}”`);

                await this.showSlide(initialSlideID);
              }
              catch (error) {
                this.logError(error);
              }
            }
          ).bind(this),
          0
        );
      }
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async showSlide(slideID) {
    if ( !core.utilities.isNonEmptyString(slideID) ) throw new Error('Invalid ‘slideID’ specified.');

    this.logDebug(`${Slideroll.prototype.showSlide.name} → slideID: “${slideID}” | this.currentSlideID: “${this.currentSlideID}”`);

    // ensure a new slide is being shown
    if (slideID === this.currentSlideID) return;

    // retrieve the slide’s metadata
    const slideMetadata = this._getSlideMetadata(slideID);
    if (slideMetadata === null) throw new Error(`Slide metadata (ID: “${slideID}”) could not be retrieved.`);

    // load the slide’s contents, if necessary
    if (
      this.activeTransport
      && (slideMetadata.element.getAttribute(Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_CONTENTS_LOADED) !== 'true')
    ) {
      await this._loadSlide(slideMetadata);
    }

    // show the slide / trigger the animations
    await this._executeSlideAnimations(slideMetadata);
  }

  async _animateIn(slide, direction) {
    this.logDebug(`${Slideroll.prototype._animateIn.name} → slide.id: “${slide.id}” | direction: “${direction}”`);

    if (slide.element === null) throw new Error(`Slide element (Slide ID: “${slide.id}”) does not exist.`);

    this.currentSlideID = slide.id;

    // execute the animation

    slide.element.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.ANIMATE);
    slide.element.classList.add(direction);

    // make the slide visible
    slide.element.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    // post–“animate in”
    await this._delay(Slideroll.REFERENCE.CSS_TRANSITION_DURATION.IN);

    slide.element.classList.remove(direction);
    slide.element.classList.remove(Slideroll.REFERENCE.HTML_CLASS_NAME.ANIMATE);

    // event callback: “slideAnimateIn”
    if (this._eventCallbackSlideAnimateIn !== null) {
      this._eventCallbackSlideAnimateIn(slide);
    }
  }

  async _animateOut(slide, direction) {
    this.logDebug(`${Slideroll.prototype._animateOut.name} → slide.id: “${slide.id}” | direction: “${direction}”`);

    if (slide.element === null) throw new Error(`Slide element (Slide ID: “${slide.id}”) does not exist.`);

    // execute the animation

    slide.element.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.ANIMATE);
    slide.element.classList.add(direction);

    // post–“animate out”
    await this._delay(Slideroll.REFERENCE.CSS_TRANSITION_DURATION.OUT);

    // make the slide invisible
    slide.element.classList.remove(Slideroll.REFERENCE.HTML_CLASS_NAME.VISIBLE);

    slide.element.classList.remove(direction);
    slide.element.classList.remove(Slideroll.REFERENCE.HTML_CLASS_NAME.ANIMATE);

    // event callback: “slideAnimateOut”
    if (this._eventCallbackSlideAnimateOut !== null) {
      this._eventCallbackSlideAnimateOut(slide);
    }
  }

  _constructSlideMetadataList(slideList) {
    if ( !Array.isArray(slideList) ) return [];

    const slideMetadataList = slideList
      .map(
        (slide, index) => {
          // ‘id’

          if ( !core.utilities.isNonEmptyString(slide.id) ) {
            this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (index: ${index + 1}) has an invalid ‘id’.`);

            return null;
          }

          if (
            slideList
              .filter(
                (_) => (_.id === slide.id)
              )
              .length
            > 1
          ) {
            this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (index: ${index + 1}) has a duplicated ‘id’: “${slide.id}”.`);

            return null;
          }

          // ‘dataSource’
          if ( !core.utilities.validateType(slide.dataSource, dataSources.BaseDataSource) ) {
            this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (ID: “${slide.id}”) has an invalid ‘dataSource’.`);

            return null;
          }

          // define the slide’s metadata
          const slideMetadata = {
            'dataSource': slide.dataSource,
            'element': null,
            'id': slide.id
          };

          // ‘slideLoadEvent’
          if ( !core.utilities.validateType(slide.slideLoadEvent, Function) ) {
            if (typeof slide.slideLoadEvent !== 'undefined') {
              this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (ID: “${slide.id}”) has an invalid ‘slideLoadEvent’.`);
            }
          }
          else {
            slideMetadata.eventCallbackSlideLoad = slide.slideLoadEvent;
          }

          // ‘parentSlideID’
          if ( !core.utilities.isNonEmptyString(slide.parentSlideID) ) {
            if (typeof slide.parentSlideID !== 'undefined') {
              this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (ID: “${slide.id}”) has an invalid ‘parentSlideID’.`);
            }
          }
          else {
            slideMetadata.parentSlideID = slide.parentSlideID;
          }

          // ‘title’
          if ( !core.utilities.isNonEmptyString(slide.title) ) {
            if (typeof slide.title !== 'undefined') {
              this.logDebug(`${Slideroll.prototype._constructSlideMetadataList.name} → Slide (ID: “${slide.id}”) has an invalid ‘title’.`);
            }
          }
          else {
            slideMetadata.title = slide.title;
          }

          // determine if the slide contains an image
          slideMetadata.imageSlide = (
            (slide.dataSource !== null)
            && core.utilities.validateType(slide.dataSource.url, String)
            && (slide.dataSource.url.match(/(\.jpg|\.png)$/) !== null)
          );

          return slideMetadata;
        }
      )
      .filter(
        (slideMetadata) => (slideMetadata !== null)
      )
    ;

    return slideMetadataList;
  }

  _createSlideElement(slideID) {
    // create the slide element
    const slideElement = document.createElement('div');
    slideElement.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE);
    slideElement.setAttribute(Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_ID, slideID);

    // create the slide contents container element
    const slideContentsContainerElement = document.createElement('div');
    slideContentsContainerElement.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS_CONTAINER);
    slideElement.appendChild(slideContentsContainerElement);

    // create the slide contents element
    const slideContentsElement = document.createElement('div');
    slideContentsElement.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS);
    slideContentsContainerElement.appendChild(slideContentsElement);

    // add the slide element to the carousel
    const carouselElement = this.element.querySelector(`.${Slideroll.REFERENCE.HTML_CLASS_NAME._}`);
    if (carouselElement === null) throw new Error('Carousel element does not exist.');
    carouselElement.appendChild(slideElement);

    return slideElement;
  }

  _eventDataSourceFetch(data, slideContentsElement) {
    this.logDebug(`${Slideroll.prototype._eventDataSourceFetch.name}`);

    if ( !core.utilities.validateType(data, Object) ) throw new core.errors.TypeValidationError('data', Object);
    if ( !core.utilities.isNonEmptyString(data.text) ) throw new core.errors.TypeValidationError('data.text', String);
    if ( !core.utilities.validateType(slideContentsElement, Element) ) throw new core.errors.TypeValidationError('slideContentsElement', Element);

    this._renderSlide(data.text, slideContentsElement);
  }

  _eventDataSourceFetchError(error) {
    this.logDebug(`${Slideroll.prototype._eventDataSourceFetchError.name}`);

    // log the error
    this.logError(error);
  }

  async _executeSlideAnimations(slide) {
    if (slide.id === this.currentSlideID) {
      this.logWarning(`Cannot execute animations; the current slide is already “${slide.id}”.`);

      return;
    }

    // determine the directions in which the animations should occur
    const currentSlideMetadata = this._getSlideMetadata(this.currentSlideID);
    const currentSlidePositionIndex = (currentSlideMetadata === null)
      ? -1
      : this._getSlidePositionIndex(currentSlideMetadata.id)
    ;
    const slidePositionIndex = this._getSlidePositionIndex(slide.id);

    let animateInDirection;
    let animateOutDirection;
    // fade ⇡
    if (currentSlidePositionIndex === -1) {
      animateOutDirection = null;
      animateInDirection = 'fadeIn';
    }
    // slide ↑
    else if (currentSlidePositionIndex === 0) {
      animateOutDirection = 'up';
      animateInDirection = 'down';
    }
    // slide ↓
    else if (slidePositionIndex === 0) {
      animateOutDirection = 'down';
      animateInDirection = 'up';
    }
    // slide ←
    else if (slidePositionIndex > currentSlidePositionIndex) {
      animateOutDirection = 'left';
      animateInDirection = 'right';
    }
    // slide →
    else {
      animateOutDirection = 'right';
      animateInDirection = 'left';
    }

    this.logDebug(`${Slideroll.prototype._executeSlideAnimations.name} → currentSlideID: “${this.currentSlideID}” | currentSlidePositionIndex: ${currentSlidePositionIndex} | animateOutDirection: “${animateOutDirection}” | slide.id: “${slide.id}” | slidePositionIndex: ${slidePositionIndex} | animateInDirection: “${animateInDirection}”`);

    // execute the animations

    // don’t trigger the “animate out” animation for the initial slide
    if (animateOutDirection !== null) {
      await this._animateOut(currentSlideMetadata, animateOutDirection);
    }
    await this._animateIn(slide, animateInDirection);
  }

  _getSlideMetadata(slideID) {
    const slide = this.slideList.find(
      (_slide) => (_slide.id === slideID)
    ) || null;

    return slide;
  }

  _getSlideID(slideElement) {
    if ( !core.utilities.validateType(slideElement, Element) ) throw new Error('‘slideElement’ is not an “Element”.');

    return slideElement.getAttribute(Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_ID);
  }

  _getSlidePositionIndex(slideID) {
    const slide = this.slideList.find(
      (_slide) => (_slide.id === slideID)
    );

    if (typeof slide === 'undefined') return -1;

    return this.slideList.indexOf(slide);
  }

  _initialize() {
    // attempt to retrieve the carousel (slide container) element from the component element
    let carouselElement = this.element.querySelector(`.${Slideroll.REFERENCE.HTML_CLASS_NAME._}`);
    // if necessary, create the carousel
    if (carouselElement === null) {
      carouselElement = document.createElement('div');
      carouselElement.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME._);
      this.element.appendChild(carouselElement);
    }

    // attempt to populate the list of slides from the carousel (i.e., DOM)
    if (this.slideList.length === 0) {
      for (
        const slideElement of Array.from(
          carouselElement.querySelectorAll(`.${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE}[${Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_ID}]`)
        )
      ) {
        const slideID = this._getSlideID(slideElement);
        // ensure that the element appears to be a slide
        if (slideID !== null) {
          this.slideList.push({
            'dataSource': null,
            'id': slideID
          });
        }
      }
    }

    // ensure that there are slides in the roll
    if (this.slideList.length === 0) throw new Error('No slides were initialized.');

    // create elements for the slides, if necessary
    for (const slide of this.slideList) {
      let slideElement = this.element.querySelector(`.${Slideroll.REFERENCE.HTML_CLASS_NAME._} .${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE}[${Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_ID}="${slide.id}"]`);
      // create an HTML element for the slide, if one does not exist
      if (slideElement === null) {
        slideElement = this._createSlideElement(slide.id);
      }
      slide.element = slideElement;

      if (slide.dataSource !== null) {
        // retrieve a reference to the slide contents element from the slide element
        const slideContentsElement = slide.element.querySelector(`.${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS}`);
        if (slideContentsElement === null) throw new Error(`Could not locate a “${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS}” element for slide (ID: “${slide.id}”).`);

        // define the slide data source’s “fetch” event handler
        slide.dataSource.registerEventHandler(
          'fetch',
          (data) => {
            this._eventDataSourceFetch(data, slideContentsElement);
          }
        );

        // define the slide data source’s “fetchError” event handler
        slide.dataSource.registerEventHandler(
          'fetchError',
          this._eventDataSourceFetchError.bind(this)
        );
      }
    }
  }

  async _loadSlide(slide) {
    if ( !core.utilities.validateType(slide.element, Element) ) throw new Error('‘slide.element’ is not an “Element”.');

    // load the slide contents

    // HTML
    if (slide.dataSource !== null) {
      await slide.dataSource.fetch();
    }
    // image
    else if (slide.imageSlide) {
      // retrieve a reference to the slide contents element from the slide element
      const slideContentsElement = slide.element.querySelector(`.${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS}`);
      if (slideContentsElement === null) throw new Error(`Could not locate a “${Slideroll.REFERENCE.HTML_CLASS_NAME.SLIDE_CONTENTS}” element for slide (ID: “${slide.id}”).`);

      // indicate that the slide is an image slide
      slide.element.classList.add(Slideroll.REFERENCE.HTML_CLASS_NAME.IMAGE_SLIDE);

      // load the image
      const imageElement = document.createElement('img');
      imageElement.src = slide.dataSource.url;
      // add the image to the slide
      slideContentsElement.appendChild(imageElement);
    }

    // indicate that the slide element’s contents are loaded
    slide.element.setAttribute(Slideroll.REFERENCE.DATA_ATTRIBUTE_NAME.SLIDE_CONTENTS_LOADED, 'true');

    // event callback: “slideLoad”
    // execute the slide’s load event callback, if specified …
    if (slide.eventCallbackSlideLoad !== null) {
      slide.eventCallbackSlideLoad(slide);
    }
    // … otherwise, execute the global event callback
    else if (this._eventCallbackSlideLoad !== null) {
      this._eventCallbackSlideLoad(slide);
    }
  }

  _renderSlide(html, targetElement) {
    this.logDebug(`${Slideroll.prototype._renderSlide.name} → html: ${core.utilities.isNonEmptyString(html) ? `${core.utilities.formatNumber(html.length)} ${core.utilities.pluralize('byte', html.length)}` : '[invalid]'}`);

    core.webUtilities.injectHTML({
      'debug': this.debug,
      'html': html,
      'replace': true,
      'target': targetElement
    });
  }
}


export default Slideroll;