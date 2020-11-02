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
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.currentTabID = null;
      this.tabList = null;

      this.initialTabID = core.utilities.isNonEmptyString(initialTab)
        ? initialTab
        : null
      ;

      this.style = core.utilities.isNonEmptyString(style)
        ? style
        : null
      ;

      this.tabLoadEvent = core.utilities.validateType(tabLoadEvent, Function)
        ? tabLoadEvent
        : null
      ;

      this.tabSelectEvent = core.utilities.validateType(tabSelectEvent, Function)
        ? tabSelectEvent
        : null
      ;

      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async loadTab(tabID) {
    this.logDebug(`${TabGroup.prototype.loadTab.name} → tabID: ${core.utilities.isNonEmptyString(tabID) ? `“${tabID}”` : '[null]'}`);

    if ( !core.utilities.isNonEmptyString(tabID) ) throw new Error('Invalid ‘tabID’ specified.');

    const tabMetadata = this._getTabMetadata(tabID);

    if (tabMetadata.dataSource !== null) {
      if (tabMetadata.contentsHTMLID === null) throw new Error(`Tab (ID: “${tabMetadata.id}”) does not specify a contents HTML ID.`);
      if (tabMetadata.contentsElement === null) throw new Error(`Tab (ID: “${tabMetadata.id}”) does not have a valid reference to a contents element.`);

      // retrieve the tab’s markup and insert it into the DOM
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
      if ( !core.utilities.isNonEmptyString(tabID) ) throw new Error('Invalid ‘tabID’ specified.');

      this.logDebug(`${TabGroup.prototype.selectTab.name} → tabID: “${tabID}” | current tab: ${(this.currentTabID === null) ? '[null]' : `“${this.currentTabID}”`}`);

      // retrieve the metadata about the tab being selected
      const tabMetadata = this._getTabMetadata(tabID);

      // ensure a new tab is being selected
      if (tabMetadata.id === this.currentTabID) return;

      // retrieve information about the (soon-to-be-previously) current tab
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

      // remove the visual active tab indicator from all tabs
      const activeTabElementList = Array.from(
        this.element.querySelectorAll(`.${TabGroup.REFERENCE.HTML_CLASS_NAME.TAB}.${TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE}`)
      );
      for (const tabElement of activeTabElementList) {
        tabElement.classList.remove(TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE);

        this.logDebug(`${TabGroup.prototype.selectTab.name} → Removed “${TabGroup.REFERENCE.HTML_CLASS_NAME.ACTIVE}” class.`);
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
      await this.selectTab(tabID);
    }
    catch (error) {
      this.logError(error);
    }
  }

  _getTabMetadata(tabID) {
    this.logDebug(`${TabGroup.prototype._getTabMetadata.name} → tabID: ${core.utilities.isNonEmptyString(tabID) ? `“${tabID}”` : '[null]'}`);

    const tab = this.tabList.find(
      (_tab) => (_tab.id === tabID)
    );

    // ensure a valid tab in the group is being selected
    if ( !core.utilities.validateType(tab, Object) ) throw new Error(`Tab (ID: “${tabID}”) does not exist.`);

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
    this.tabList = this._queryElementTabList();

    if (this.tabList.length === 0) throw new Error(`No tabs exist in #${this.htmlID}.`);

    for (const tab of this.tabList) {
      // apply the tab contents element’s CSS class, if applicable
      if (tab.contentsElement !== null) {
        tab.contentsElement.classList.add(TabGroup.REFERENCE.HTML_CLASS_NAME.TAB_CONTENTS);
      }

      // bind the tab’s click event
      tab.element.addEventListener(
        'click',
        this._eventTabClick.bind(this, tab.id)
      );

      // bind the tab data source’s events
      if (
        (tab.dataSource !== null)
        && core.utilities.validateType(tab.contentsElement, Element)
      ) {
        // define the tab data source’s “fetch” event handler
        tab.dataSource.registerEventHandler(
          'fetch',
          (data) => { this._renderTabContents(data.text, tab.contentsElement); }
        );

        // define the tab data source’s “fetchError” event handler
        tab.dataSource.registerEventHandler(
          'fetchError',
          (error) => { this.logError(error); }
        );
      }
    }

    // determine the initial tab
    const initialTabID = (
      // if an initial tab is specified, …
      (this.initialTabID !== null)
      // … ensure it’s valid
      && this.tabList
        .map(
          (tab) => tab.id
        )
        .some(
          (tabID) => (tabID === this.initialTabID)
        )
    )
      ? this.initialTabID
      // default: the first tab in the group
      : this.tabList[0].id
    ;

    this.logDebug(`${TabGroup.prototype._initialize.name} → evaluated initial tab: “${initialTabID}” | configured initial tab: ${(this.initialTabID === null) ? '[null]' : `“${this.initialTabID}”`}`);

    // select the initial tab
    this.selectTab(initialTabID);
  }

  _renderTabContents(html, tabContentsElement) {
    this.logDebug(`${TabGroup.prototype._renderTabContents.name} → html: ${core.utilities.isNonEmptyString(html) ? `${core.utilities.formatNumber(html.length)} ${core.utilities.pluralize('byte', html.length)}` : '[invalid]'}`);

    core.webUtilities.injectHTML({
      'debug': this.debug,
      'html': html,
      'replace': true,
      'target': tabContentsElement
    });
  }

  _queryElementTabList() {
    const tabMetadataList = Array.from(
      this.element.querySelectorAll(`.${TabGroup.REFERENCE.HTML_CLASS_NAME.TAB}`)
    )
      .map(
        (tabElement) => {
          // retrieve the tab’s identifier
          const tabID = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_ID);

          // ensure the tab’s identifier is valid
          if ( !core.utilities.isNonEmptyString(tabID) ) return null;

          // attempt to retrieve the tab contents element’s HTML ID
          let contentsHTMLID = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_CONTENTS_HTML_ID);
          if ( !core.utilities.isNonEmptyString(contentsHTMLID) ) {
            contentsHTMLID = null;
          }

          // attempt to retrieve the tab contents element from the DOM
          let contentsElement = null;
          if (contentsHTMLID !== null) {
            contentsElement = document.querySelector(`#${contentsHTMLID}`);
            if (contentsElement === null) {
              this.logWarning(`Tab (ID: “${tabID}”) contents element (“#${contentsHTMLID}”) does not exist.`);
            }
          }

          // attempt to retrieve the tabs contents’ load state
          const contentsLoaded = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.TAB_CONTENTS_LOADED);

          // attempt to retrieve the tab contents’ URL
          const url = tabElement.getAttribute(TabGroup.REFERENCE.DATA_ATTRIBUTE_NAME.URL);

          // define the tab’s data source
          const dataSource = core.utilities.isNonEmptyString(url)
            ? new dataSources.AjaxDataSource({
              'debug': this.debug,
              'url': url
            })
            : null
          ;

          return {
            'id': tabID,
            'contentsElement': contentsElement,
            'contentsHTMLID': contentsHTMLID,
            'contentsLoaded': (contentsLoaded === 'true') ? true : null,
            'dataSource': dataSource,
            'element': tabElement
          };
        }
      )
      .filter(
        (tabMetadata) => (tabMetadata !== null)
      )
    ;

    return tabMetadataList;
  }
}


export default TabGroup;