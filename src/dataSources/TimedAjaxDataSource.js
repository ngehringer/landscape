import * as core from '@backwater-systems/core';

import AjaxDataSource from './AjaxDataSource.js';


/**
 * An `AjaxDataSource` that fetches data automatically at a specified frequency and for a specified duration.
 * @extends AjaxDataSource
 */
class TimedAjaxDataSource extends AjaxDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${TimedAjaxDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      AUTOMATICALLY_START_TIMER: true,
      DEBUG: AjaxDataSource.DEFAULTS.DEBUG,
      FETCH_TIMEOUT_DURATION: 1200
    });
  }

  constructor({
    automaticallyStartTimer = TimedAjaxDataSource.DEFAULTS.AUTOMATICALLY_START_TIMER,
    debug = TimedAjaxDataSource.DEFAULTS.DEBUG,
    fetchTimeoutDuration = TimedAjaxDataSource.DEFAULTS.FETCH_TIMEOUT_DURATION,
    frequency,
    parameters = null,
    url
  }) {
    super({
      debug: debug,
      parameters: parameters,
      url: url
    });

    /**
     * Whether the timer is started (automatically fetching)
     */
    this.timerStarted = false;

    // abort if the specified `frequency` parameter value is invalid
    if (
      (typeof frequency !== 'number')
      || (frequency <= 0)
    ) throw new core.errors.TypeValidationError('frequency', Number);

    /**
     * Fetch frequency (in seconds)
     */
    this.frequency = frequency;

    /**
     * The amount of time (in seconds) with no interaction before automatic fetching stops
     */
    this.fetchTimeoutDuration = (
      // null: no timeout
      (fetchTimeoutDuration === null)
      // positive number: a duration in seconds
      || (
        (typeof fetchTimeoutDuration === 'number')
        && (fetchTimeoutDuration > 0)
      )
    )
      ? fetchTimeoutDuration
      // default: 20 minutes
      : TimedAjaxDataSource.DEFAULTS.FETCH_TIMEOUT_DURATION
      ;
    if (
      (this.fetchTimeoutDuration !== null)
      && (this.fetchTimeoutDuration < this.frequency)
    ) {
      this.logger.logWarning({
        data: '“timeoutDuration” is less than “frequency”.',
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}`,
        verbose: this.debug
      });
    }

    /**
     * Whether the timer should start automatically after instantiation of the `DataSource`
     */
    const _automaticallyStartTimer = (typeof automaticallyStartTimer === 'boolean')
      ? automaticallyStartTimer
      : TimedAjaxDataSource.DEFAULTS.AUTOMATICALLY_START_TIMER
    ;

    // start the timer automatically, if necessary
    if (_automaticallyStartTimer) {
      setTimeout(
        async () => {
          try {
            await this.startTimer();
          }
          catch (error) {
            this.logger.logError({
              data: error,
              sourceID: `${TimedAjaxDataSource.CLASS_NAME}`,
              verbose: this.debug
            });
          }
        },
        0
      );
    }
  }

  /**
   * Starts fetching at the configured frequency.
   */
  async startTimer() {
    if (this.debug) {
      this.logger.logDebug({
        data: 'Starting the timer.',
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype.startTimer.name}`,
        verbose: this.debug
      });
    }

    // abort if the timer is already started
    if (this.timerStarted) {
      this.logger.logWarning({
        data: 'Aborting; the timer is already started.',
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype.startTimer.name}`,
        verbose: this.debug
      });

      return;
    }

    // indicate that the timer is started (automatically fetching)
    this.timerStarted = true;

    // start automatically fetching the specified URL at the specified frequency
    this._fetchIntervalID = setInterval(
      async () => {
        try {
          await this.fetch();
        }
        catch (error) {
          this.logger.logError({
            data: error,
            sourceID: `${TimedAjaxDataSource.CLASS_NAME}`,
            verbose: this.debug
          });
        }
      },
      this.frequency * 1000
    );

    // stop automatically fetching after the timeout duration has elapsed
    this._startFetchTimeout();

    // emit a `startTimer` event
    await this.sendEvent('startTimer');
  }

  /**
   * Stops fetching at the configured frequency.
   */
  async stopTimer() {
    if (this.debug) {
      this.logger.logDebug({
        data: 'Stopping the timer.',
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype.stopTimer.name}`,
        verbose: this.debug
      });
    }

    // abort if the timer is already stopped
    if (!this.timerStarted) {
      this.logger.logWarning({
        data: 'Aborting; the timer is already stopped.',
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype.stopTimer.name}`,
        verbose: this.debug
      });

      return;
    }

    // indicate that the timer is stopped (not automatically fetching)
    this.timerStarted = false;

    // stop automatically fetching the specified URL at the specified frequency
    clearInterval(this._fetchIntervalID);
    this._fetchIntervalID = null;

    // clear the existing fetch timeout, if any
    this._stopFetchTimeout();

    // emit a `stopTimer` event
    await this.sendEvent('stopTimer');
  }

  _startFetchTimeout() {
    // don’t time out fetching if the timeout duration is null
    if (this.fetchTimeoutDuration === null) return;

    // clear the existing fetch timeout, if any
    this._stopFetchTimeout();

    // stop automatically fetching after the timeout duration has elapsed
    this._fetchTimeoutID = setTimeout(
      async () => {
        try {
          if (this.debug) {
            this.logger.logDebug({
              data: `Automatic fetching timed out after ${core.utilities.formatting.formatNumber(this.fetchTimeoutDuration)} ${core.utilities.formatting.pluralize('second', this.fetchTimeoutDuration)}.`,
              sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype._startFetchTimeout.name}`,
              verbose: this.debug
            });
          }

          await this.stopTimer();
        }
        catch (error) {
          this.logger.logError({
            data: error,
            sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype._startFetchTimeout.name}`,
            verbose: this.debug
          });
        }
      },
      this.fetchTimeoutDuration * 1000
    );

    if (this.debug) {
      this.logger.logDebug({
        data: `Started a timeout for automatic fetching (timeout ID: “${this._fetchTimeoutID}”).`,
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype._startFetchTimeout.name}`,
        verbose: this.debug
      });
    }
  }

  _stopFetchTimeout() {
    // abort if a fetch timeout ID is not defined
    if (typeof this._fetchTimeoutID !== 'number') return;

    if (this.debug) {
      this.logger.logDebug({
        data: `Stopped a timeout for automatic fetching (timeout ID: “${this._fetchTimeoutID}”).`,
        sourceID: `${TimedAjaxDataSource.CLASS_NAME}:${TimedAjaxDataSource.prototype._stopFetchTimeout.name}`,
        verbose: this.debug
      });
    }

    // prevent the automatic fetching from timing out
    clearTimeout(this._fetchTimeoutID);
  }
}


export default TimedAjaxDataSource;