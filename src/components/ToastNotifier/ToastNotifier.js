import * as core from '@backwater-systems/core';

import LandscapeComponent from '../LandscapeComponent.js';

/**
 * A toast-style notifier.
 * @extends LandscapeComponent
 */
class ToastNotifier extends LandscapeComponent {
  static get CLASS_NAME() { return `@backwater-systems/landscape.components.${ToastNotifier.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      DEBUG: LandscapeComponent.DEFAULTS.DEBUG,
      POSITION: ToastNotifier.REFERENCE.ENUMERATIONS.POSITION.TOP_LEFT
    });
  }

  static get REFERENCE() {
    /** The HTML class name of the component */
    const HTML_CLASS_NAME = `Landscape-${ToastNotifier.name}`;

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
        _: HTML_CLASS_NAME,
        ACTIVE: 'Landscape-active',
        CLOSE_BUTTON: `${HTML_CLASS_NAME}-close-button`,
        CLOSE_BUTTON_CONTAINER: `${HTML_CLASS_NAME}-close-button-container`,
        HIDDEN: `${HTML_CLASS_NAME}-hidden`,
        NOTIFICATION: `${HTML_CLASS_NAME}-notification`,
        NOTIFICATION_CONTAINER: `${HTML_CLASS_NAME}-notification-container`,
        NOTIFICATION_SPACER: `${HTML_CLASS_NAME}-notification-spacer`,
        NOTIFICATION_TEXT: `${HTML_CLASS_NAME}-notification-text`,
        QUEUE: `${HTML_CLASS_NAME}-queue`,
        STATUS_INDICATOR: `${HTML_CLASS_NAME}-status-indicator`,
        SURFACE: 'Landscape-surface'
      })
    });
  }

  static _validateMessage(notification) {
    if (
      (typeof notification !== 'object')
      || (notification === null)
    ) throw new core.errors.TypeValidationError('notification', Object);

    /**
     * The message and status of the notification
     */
    const {
      message,
      status
    } = { ...notification };

    // `message`
    if (typeof message !== 'string') throw new core.errors.TypeValidationError('notification.message' === 'string');

    // `status`
    if (
      (typeof status !== 'string')
      || !core.utilities.validation.validateEnumeration(status, ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS)
    ) throw new core.errors.EnumerationValidationError('notification.status', ToastNotifier.REFERENCE.ENUMERATIONS.MESSAGE_STATUS);

    return {
      message: message,
      status: status
    };
  }

  constructor({
    debug = ToastNotifier.DEFAULTS.DEBUG,
    targetElement,
    targetHTMLID,
    position = ToastNotifier.DEFAULTS.POSITION
  }) {
    super({
      debug: debug,
      targetElement: targetElement,
      targetHTMLID: targetHTMLID
    });

    try {
      /**
       * The total number of notifications that have been added to the notifier’s queue
       */
      this.notificationCount = 0;

      /**
       * The position of the notifier in the viewport { `bottom-left` | `bottom-right` | `top-left` | `top-right` }
       */
      this.position = (
        (typeof position === 'string')
        && core.utilities.validation.validateEnumeration(position, ToastNotifier.REFERENCE.ENUMERATIONS.POSITION)
      )
        ? position
        : ToastNotifier.DEFAULTS.POSITION
      ;

      // initialize the component
      this._initialize();
    }
    catch (error) {
      this.logError(error);

      throw error;
    }
  }

  async _eventCloseButtonClick(event) {
    try {
      /**
       * The close button `Element`
       */
      const closeButtonElement = event.currentTarget;

      // apply a class to the button to indicate that it has been clicked
      closeButtonElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.ACTIVE);

      /**
       * The ID of the notification being closed
       */
      const notificationID = closeButtonElement.getAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID);

      // remove the notification from the queue
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

  _initialize() {
    // apply the component’s CSS class
    this.element.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME._);
    // apply the position CSS class
    this.element.classList.add(`${ToastNotifier.REFERENCE.HTML_CLASS_NAME._}-${this.position}`);

    /**
     * The queue `Element`
     *
     * It contains the notifications.
     */
    this.queueElement = document.createElement('div');
    this.queueElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.QUEUE);
    this.element.appendChild(this.queueElement);
  }

  /**
   * Adds a notification to the queue.
   */
  add(notification) {
    /**
     * The notification to add (validated)
     */
    const _notification = ToastNotifier._validateMessage(notification);
    // assign the notification a unique ID
    _notification.id = this._generateMessageID();

    this.logDebug({
      _functionName: ToastNotifier.prototype.add.name,
      notification: _notification
    });

    // create a notification container element
    /**
     * The notification container `Element`
     */
    const notificationContainerElement = document.createElement('div');
    notificationContainerElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER,
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.HIDDEN
    );
    notificationContainerElement.setAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID, _notification.id);

    // create a notification spacer element
    /**
     * The notification spacer `Element`
     */
    const notificationSpacerElement = document.createElement('div');
    notificationSpacerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_SPACER);
    notificationContainerElement.appendChild(notificationSpacerElement);

    // create a notification element
    /**
     * The notification `Element`
     */
    const notificationElement = document.createElement('div');
    notificationElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION,
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.SURFACE
    );
    notificationSpacerElement.appendChild(notificationElement);

    // create a status indicator element
    /**
     * The notification status indicator `Element`
     */
    const statusIndicatorElement = document.createElement('div');
    statusIndicatorElement.classList.add(
      ToastNotifier.REFERENCE.HTML_CLASS_NAME.STATUS_INDICATOR,
      _notification.status
    );
    notificationElement.appendChild(statusIndicatorElement);

    // create a notification text element
    /**
     * The notification text `Element`
     */
    const notificationTextElement = document.createElement('div');
    notificationTextElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_TEXT);
    notificationTextElement.textContent = _notification.message;
    notificationElement.appendChild(notificationTextElement);

    // create a close button container element
    /**
     * The notification close button container `Element`
     */
    const closeButtonContainerElement = document.createElement('div');
    closeButtonContainerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON_CONTAINER);
    notificationElement.appendChild(closeButtonContainerElement);

    // create a close button element
    /**
     * The notification close button `Element`
     */
    const closeButtonElement = document.createElement('div');
    closeButtonElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.CLOSE_BUTTON);
    closeButtonElement.setAttribute(ToastNotifier.REFERENCE.DATA_ATTRIBUTE_NAME.NOTIFICATION_ID, _notification.id);
    closeButtonElement.addEventListener(
      'click',
      this._eventCloseButtonClick.bind(this)
    );
    closeButtonContainerElement.appendChild(closeButtonElement);

    // add the notification to the document
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
      setTimeout(
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

  /**
   * Removes a notification from the queue.
   */
  async remove(notificationID) {
    if (
      (typeof notificationID !== 'string')
      || !core.utilities.validation.isNonEmptyString(notificationID)
    ) throw new core.errors.TypeValidationError('notificationID', String);

    this.logDebug({
      _functionName: ToastNotifier.prototype.remove.name,
      notificationID: notificationID
    });

    /**
     * The notification container `Element`
     */
    const notificationContainerElement = this.element.querySelector(`.${ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER}[data-notification-id="${notificationID}"]`);

    // abort if the notification container could not be retrieved (the notification may have been removed manually)
    if (notificationContainerElement === null) {
      this.logWarning(`Could not locate a “${ToastNotifier.REFERENCE.HTML_CLASS_NAME.NOTIFICATION_CONTAINER}” element for notification “${notificationID}”.`);

      return;
    }

    // trigger the hide animation
    notificationContainerElement.classList.add(ToastNotifier.REFERENCE.HTML_CLASS_NAME.HIDDEN);

    // after the hide animation completes, …
    await core.utilities.delay(ToastNotifier.REFERENCE.DURATION.MESSAGE_HIDE_ANIMATION);
    if (notificationContainerElement.parentNode === null) throw new core.errors.TypeValidationError('notificationContainerElement.parentNode', Element);
    // … remove the notification container element from the document
    notificationContainerElement.parentNode.removeChild(notificationContainerElement);
  }
}


export default ToastNotifier;