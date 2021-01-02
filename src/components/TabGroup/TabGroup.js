import * as core from '@backwater-systems/core';

import * as dataSources from '../../dataSources/index.js';
import LandscapeComponent from '../LandscapeComponent.js';


class TabGroup extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${TabGroup.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${TabGroup.name}`;

    return Object.freeze({
      DATA_ATTRIBUTE_NAME: Object.freeze({
        TAB_CONTENTS_HTML_ID: 'data-tab-contents-html-id',
        TAB_CONTENTS_LOADED: 'data-tab-contents-loaded',
        TAB_ID: 'data-tab-id',
        URL: 'data-url'
      }),

      HTML_CLASS_NAME: Object.freeze({
        _: HTML_CLASS_NAME,
        ACTIVE: `${HTML_CLASS_NAME}-active`,
        SURFACE: 'Landscape-surface',
        TAB: `${HTML_CLASS_NAME}-tab`,
        TAB_CONTENTS: `${HTML_CLASS_NAME}-tab-contents`,
        VISIBLE: 'Landscape-visible'
      })
    });
  }

  constructor({
    debug = TabGroup.DEFAULTS.DEBUG,
    initialTab = null,
    style = null,
    tabLoadEvent = null,
    tabSelectEvent = null,
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
       * The ID of the current (active) tab
       */
      this.currentTabID = null;

      /**
       * A list of metadata about the tabs
       */
      this.tabs = null;

      /**
       * The ID of the initial tab
       */
      this.initialTabID = core.utilities.validation.isNonEmptyString(initialTab)
        ? initialTab
        : null
      ;

      /**
       * The style (CSS class suffix) of the component
       */
      this.style = core.utilities.validation.isNonEmptyString(style)
        ? style
        : null
      ;

      /**
       * An event callback that fires after a tab is loaded
       */
      this.tabLoadEvent = (typeof tabLoadEvent === 'function')
        ? tabLoadEvent.bind(this)
        : null
      ;

      /**
       * An event callback that fires after a tab is loaded
       */
      this.tabSelectEvent = (typeof tabSelectEvent === 'function')
        ? tabSelectEvent.bind(this)
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

  async loadTab(tabID) {
    if (
      (typeof tabID !== 'string')
      || !core.utilities.validation.isNonEmptyString(tabID)
    ) throw new core.errors.TypeValidationError('tabID', String);

    this.logDebug({
      _functionName: TabGroup.prototype.loadTab.name,
      tabID: tabID
    });

    /**
     * Metadata about the loading tab
     */
    const tabMetadata = this._getTabMetadata(tabID);

    if (tabMetadata.dataSource !== null) {
      if (tabMetadata.contentsHTMLID === null) throw new Error(`Tab (ID: “${tabMetadata.id}”) does not specify a contents HTML ID.`);
      if (tabMetadata.contentsElement === null) throw new Error(`Tab (ID: “${tabMetadata.id}”) does not have a valid reference to a contents element.`);

      // retrieve the tab contents and insert it into the document
      await tabMetadata.dataSource.fetch();
    }

    // indicate that the tab contents are loaded
    tabMetadata.contentsLoaded = true;

    // invoke the user-specified tab load event handler
    if (this.tabLoadEvent !== null) {
      await this.tabLoadEvent(tabMetadata);
    }
  }

  async selectTab(tabID) {
    try {
      if (
        (typeof tabID !== 'string')
        || !core.utilities.validation.isNonEmptyString(tabID)
      ) throw new core.errors.TypeValidationError('tabID', String);

      this.logDebug({
        _functionName: TabGroup.prototype.selectTab.name,
        currentTabID: this.currentTabID,
        tabID: tabID
      });

      /**
       * Metadata about the selected tab
       */
      const tabMetadata = this._getTabMetadata(tabID);

      // ensure a new tab is being selected
      if (tabMetadata.id === this.currentTabID) return;

      /**
       * Metadata about the (soon-to-be-previously) current tab
       */
      const previousTab = (this.currentTabID === null) ? null : this._getTabMetadata(this.currentTabID);

      // update the current tab
      this.currentTabID = tabMetadata.id;

      // load the selected tab’s contents, if it hasn’t been loaded yet
      if (!tabMetadata.contentsLoaded) {
        await this.loadTab(tabMetadata.id);
      }

      // ensure the the current tab’s contents are visible
      if (tabMetadata.contentsElement !== null) {
        tabMetadata.contentsElement.classList.add(TabGroup.REFERENCE.HTML_CLASS_NAME.VISIBLE);
      }

      // hide the previous tab’s contents, if necessary
      if (
        (previousTab !== null)
        && (previousTab.contentsElement !== null)
      ) {
        previousTab.contentsElement.classList.remove(TabGroup.REFERENCE.HTML_CLASS_NAME.VISIBLE);
      }

      /**
       * A list of the active tab `Element` nodes
       */
      const activeTabElementList = Array.from(
        this.element.querySelectorAll(`.${TabGroup.REFERENCE.HTML_CLASS_NAME.TAB}.${TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE}`)
      );

      // remove the visual active tab indicator from all tabs
      for (const tabElement of activeTabElementList) {
        this.logDebug({
          _functionName: TabGroup.prototype.selectTab.name,
          className: TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE,
          tabID: tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_ID)
        });

        tabElement.classList.remove(TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE);
      }

      // visually indicate the active tab
      tabMetadata.element.classList.add(TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE);

      // invoke the user-specified tab select event handler
      if (this.tabSelectEvent !== null) {
        await this.tabSelectEvent(tabMetadata);
      }
    }
    catch (error) {
      this.logError(error);
    }
  }

  async _eventTabClick(tabID, event) {
    try {
      this.logDebug({
        _functionName: TabGroup.prototype._eventTabClick.name,
        event: event,
        tabID: tabID
      });

      await this.selectTab(tabID);
    }
    catch (error) {
      this.logError(error);
    }
  }

  _getTabMetadata(tabID) {
    this.logDebug({
      _functionName: TabGroup.prototype._getTabMetadata.name,
      tabID: tabID
    });

    /**
     * Metadata about the tab with the specified ID
     */
    const tab = this.tabs.find(
      (_tab) => (_tab.id === tabID)
    );

    // abort if an invalid tab in the group is being selected
    if (
      (typeof tab !== 'object')
      || (tab === null)
    ) throw new Error(`Tab (ID: “${tabID}”) does not exist.`);

    return tab;
  }

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(TabGroup.REFERENCE.HTML_CLASS_NAME._);

    // apply the component’s style CSS class, if applicable
    if (this.style !== null) {
      this.element.classList.add(`${TabGroup.REFERENCE.HTML_CLASS_NAME._}-style-${this.style}`);
    }

    // construct a list of tab metadata from the component element
    this.tabs = this._queryElementTabList();

    if (this.tabs.length === 0) throw new Error(`No tabs exist in #${this.htmlID}.`);

    for (const tab of this.tabs) {
      // apply the tab contents element’s CSS class, if applicable
      if (tab.contentsElement !== null) {
        tab.contentsElement.classList.add(TabGroup.REFERENCE.HTML_CLASS_NAME.TAB_CONTENTS);
      }

      // bind the tab’s click event
      tab.element.addEventListener(
        'click',
        this._eventTabClick.bind(this, tab.id)
      );

      // bind the tab `DataSource`’s events
      if (
        (tab.dataSource !== null)
        && (tab.contentsElement !== null)
      ) {
        // define the tab `DataSource`’s `fetch` event handler
        tab.dataSource.registerEventHandler(
          'fetch',
          (data) => { this._renderTabContents(data, tab.contentsElement); }
        );

        // define the tab `DataSource`’s `fetchError` event handler
        tab.dataSource.registerEventHandler(
          'fetchError',
          (error) => { this.logError(error); }
        );
      }
    }

    /**
     * The ID of the initial tab (evaluated)
     */
    const initialTabID = (
      // if specified, …
      (this.initialTabID !== null)
      // … ensure it’s in the list of tabs
      && this.tabs.some( (tab) => (tab.id === this.initialTabID) )
    )
      ? this.initialTabID
      // default: the first tab in the group
      : this.tabs[0].id
    ;

    if (
      (this.initialTabID !== null)
      && (this.initialTabID !== initialTabID)
    ) {
      this.logWarning(`The evaluated initial tab ID “${initialTabID}” does not match the configured initial tab ID “${this.initialTabID}”.`);
    }

    // select the initial tab
    this.selectTab(initialTabID);
  }

  _renderTabContents(html, tabContentsElement) {
    this.logDebug({
      _functionName: TabGroup.prototype._renderTabContents.name,
      htmlByteCount: core.utilities.validation.isNonEmptyString(html) ? html.length : 0
    });

    // insert the tab contents’ HTML into the tab contents element
    core.webUtilities.injectHTML({
      debug: this.debug,
      html: html,
      logger: this.logger,
      replace: true,
      sourceID: this._getLoggingSourceID({ functionName: TabGroup.prototype._renderTabContents.name }),
      target: tabContentsElement
    });
  }

  _queryElementTabList() {
    /**
     * A list of metadata about the tabs (constructed from the DOM)
     */
    const tabMetadataList = Array.from(
      this.element.querySelectorAll(`.${TabGroup.REFERENCE.HTML_CLASS_NAME.TAB}`)
    )
      .map(
        (tabElement) => {
          /**
           * The ID of the tab (its `Element`’s `data-tab-id` HTML attribute value)
           */
          const tabID = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_ID);

          // ensure the tab’s identifier is valid
          if ( !core.utilities.validation.isNonEmptyString(tabID) ) return null;

          /**
           * The HTML ID of the tab contents `Element`
           */
          let contentsHTMLID = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_CONTENTS_HTML_ID);
          if (
            (typeof contentsHTMLID !== 'string')
            || !core.utilities.validation.isNonEmptyString(contentsHTMLID)
          ) {
            contentsHTMLID = null;
          }

          /**
           * The tab contents `Element`
           */
          let contentsElement;

          // attempt to retrieve the tab contents element from the document
          if (contentsHTMLID !== null) {
            contentsElement = document.querySelector(`#${contentsHTMLID}`);
            if (contentsElement === null) {
              this.logWarning(`Tab (ID: “${tabID}”) contents element (“#${contentsHTMLID}”) does not exist.`);
            }
          }

          /**
           * Whether the tab contents are loaded
           */
          const contentsLoaded = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_CONTENTS_LOADED);

          /**
           * The URL from which the tab contents will be loaded
           */
          const url = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.URL);

          /**
           * The `DataSource` that provides the tab’s contents
           */
          const dataSource = core.utilities.validation.isNonEmptyString(url)
            ? new dataSources.AjaxDataSource({
              debug: this.debug,
              url: url
            })
            : null
          ;

          return {
            contentsElement: contentsElement,
            contentsHTMLID: contentsHTMLID,
            contentsLoaded: (contentsLoaded === 'true') ? true : null,
            dataSource: dataSource,
            element: tabElement,
            id: tabID
          };
        }
      )
      .filter( (tabMetadata) => (tabMetadata !== null) )
    ;

    return tabMetadataList;
  }
}


export default TabGroup;