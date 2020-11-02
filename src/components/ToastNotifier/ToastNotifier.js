import * as core from '@backwater-systems/core';
import LandscapeComponent from '../LandscapeComponent.js';


class ToastNotifier extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${ToastNotifier.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG
    });
  }

  static get REFERENCE() {
    return Object.freeze({
      DATA_ATTRIBUTE_NAME: Object.freeze({
        NOTIFICATION_ID: 'data-notification-id'
      }),
      DURATION: Object.freeze({
        MESSAGE_HIDE_ANIMATION: 1000,
        TRANSIENT_MESSAGE_DISPLAY: 8000
      }),
      ENUMERATIONS: Object.freeze({
        MESSAGE_STATUS: Object.freeze({
          CRITICAL_ERROR: 'CRITICAL_ERROR',
          DEBUG: 'DEBUG',
          ERROR: 'ERROR',
          INFORMATION: 'INFORMATION',
          OK: 'OK',
          WARNING: 'WARNING'
        }),
        POSITION: Object.freeze({
          BOTTOM_LEFT: 'bottom-left',
          BOTTOM_RIGHT: 'bottom-right',
          TOP_LEFT: 'top-left',
          TOP_RIGHT: 'top-right'
        })
      }),
      HTML_CLASS_NAME: Object.freeze({
        _: 'Landscape-ToastNotifier',
        ACTIVE: 'Landscape-active',
        CLOSE_BUTTON: 'Landscape-ToastNotifier-close-button',
        CLOSE_BUTTON_CONTAINER: 'Landscape-ToastNotifier-close-button-container',
        HIDDEN: 'Landscape-ToastNotifier-hidden',
        NOTIFICATION: 'Landscape-ToastNotifier-notification',
        NOTIFICATION_CONTAINER: 'Landscape-ToastNotifier-notification-container',
        NOTIFICATION_SPACER: 'Landscape-ToastNotifier-notification-spacer',
        NOTIFICATION_TEXT: 'Landscape-ToastNotifier-notification-text',
        QUEUE: 'Landscape-ToastNotifier-queue',
        STATUS_INDICATOR: 'Landscape-ToastNotifier-status-indicator',
        SURFACE: 'Landscape-surface'
      })
    });
  }

  constructor({
    debug = ToastNotifier.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID,
    position
  }) {
    super({
      'debug': debug,
      'targetElement': targetElement,
      'targetHTMLID': targetHTMLID
    });

    try {
      this.notificationCount = 0;

      // define the notifier’s position on the viewport
      this.position = core.utilities.validateEnumeration(position, ToastNotifier.REFERENCE.ENUMERATIONS.POSITION)
        ? position
        : ToastNotifier.REFERENCE.ENUMERATIONS.POSITION.TOP_LEFT
      ;

      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async _eventCloseButtonClick(event) {
    try {
      const closeButtonElement = event.currentTarget;

      // apply a class to the button to indicate that it has been clicked
      closeButtonElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.ACTIVE);

      // remove the notification from the queue
      const notificationID = closeButtonElement.getAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID);
      await this.remove(notificationID);
    }
    catch (error) {
      this.logError(error);
    }
  }

  _generateMessageID() {
    this.notificationCount += 1;

    return (this.notificationCount).toString();
  }

  _getMessageContainerElement(notificationID) {
    if ( !core.utilities.isNonEmptyString(notificationID) ) throw new Error('Invalid ‘notificationID’ specified.');

    return this.element.querySelector(`.${ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER}[data-notification-id="${notificationID}"]`);
  }

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME._);
    // apply the position CSS class
    this.element.classList.add(`${ToastNotifier.REFERENCE.HTML_CLASS_NAME._}-${this.position}`);

    // create the queue element
    this.queueElement = document.createElement('div');
    this.queueElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.QUEUE);
    this.element.appendChild(this.queueElement);
  }

  _validateMessage(notification) {
    if ( !core.utilities.validateType(notification, Object) ) throw new core.errors.TypeValidationError('notification', Object);

    const _notification = {};

    // ‘message’
    if ( !core.utilities.validateType(notification.message, String) ) throw new core.errors.EnumerationValidationError('notification.message', String);
    _notification.message = notification.message;

    // ‘status’
    if ( !core.utilities.validateEnumeration(notification.status, ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS) ) throw new core.errors.TypeValidationError('notification.status', 'ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS');
    _notification.status = notification.status;

    return _notification;
  }

  add(notification) {
    // validate the notification’s structure
    const _notification = this._validateMessage(notification);
    // assign the notification a unique ID
    _notification.id = this._generateMessageID();

    this.logDebug(`${ToastNotifier.prototype.add.name} → Adding notification “${_notification.id}”.`);

    // create a notification container element
    const notificationContainerElement = document.createElement('div');
    notificationContainerElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER,
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.HIDDEN
    );
    notificationContainerElement.setAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID, _notification.id);

    // create a notification spacer element
    const notificationSpacerElement = document.createElement('div');
    notificationSpacerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_SPACER);
    notificationContainerElement.appendChild(notificationSpacerElement);

    // create a notification element
    const notificationElement = document.createElement('div');
    notificationElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION,
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.SURFACE
    );
    notificationSpacerElement.appendChild(notificationElement);

    // create a status indicator element
    const statusIndicatorElement = document.createElement('div');
    statusIndicatorElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR,
      _notification.status
    );
    notificationElement.appendChild(statusIndicatorElement);

    // create a notification text element
    const notificationTextElement = document.createElement('div');
    notificationTextElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_TEXT);
    notificationTextElement.textContent = _notification.message;
    notificationElement.appendChild(notificationTextElement);

    // create a close button container element
    const closeButtonContainerElement = document.createElement('div');
    closeButtonContainerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON_CONTAINER);
    notificationElement.appendChild(closeButtonContainerElement);

    // create a close button element
    const closeButtonElement = document.createElement('div');
    closeButtonElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON);
    closeButtonElement.setAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID, _notification.id);
    closeButtonElement.addEventListener(
      'click',
      this._eventCloseButtonClick.bind(this)
    );
    closeButtonContainerElement.appendChild(closeButtonElement);

    // add the notification to the DOM
    this.queueElement.appendChild(notificationContainerElement);

    // trigger the display animation
    notificationContainerElement.classList.remove(ToastNotifier.REFERENCE.HTML_CLASS_NAME.HIDDEN);

    // trigger notifications that are not of “ERROR” or “CRITICAL_ERROR” statuses to clear automatically after a set duration
    if (
      !(
        (_notification.status === ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS.ERROR)
        || (_notification.status === ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS.CRITICAL_ERROR)
      )
      ) {
      const notificationRemoveTimeoutID = setTimeout(
        async () => {
          try {
            await this.remove(_notification.id);
          }
          catch (error) {
            this.logError(error);
          }
        },
        ToastNotifier.REFERENCE.DURATION.TRANSIENT_MESSAGE_DISPLAY
      );
    }
  }

  async remove(notificationID) {
    if ( !core.utilities.isNonEmptyString(notificationID) ) throw new Error('Invalid ‘notificationID’ specified.');

    this.logDebug(`${ToastNotifier.prototype.remove.name} → Removing notification “${notificationID}”.`);

    // attempt to retrieve the notification container element from the component element
    const notificationContainerElement = this._getMessageContainerElement(notificationID);
    // if the notification container could not be retrieved, the notification may have manually been removed
    if (notificationContainerElement === null) {
      this.logDebug(`${ToastNotifier.prototype.remove.name} → Could not locate a “${ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER}” element for notification “${notificationID}”.`);

      return;
    }

    // trigger the hide animation
    notificationContainerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.HIDDEN);

    // after the hide animation completes, …
    await this._delay(ToastNotifier.REFERENCE.DURATION.MESSAGE_HIDE_ANIMATION);
    if ( !core.utilities.validateType(notificationContainerElement.parentNode, Element) ) throw new core.errors.TypeValidationError('notificationContainerElement.parentNode', Element);
    // … remove the notification container element from the DOM
    notificationContainerElement.parentNode.removeChild(notificationContainerElement);
  }
}


export default ToastNotifier;