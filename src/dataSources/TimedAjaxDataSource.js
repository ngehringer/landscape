import * as core from '@backwater-systems/core';
import AjaxDataSource from './AjaxDataSource.js';


class TimedAjaxDataSource extends AjaxDataSource {
  static get CLASS_NAME() { return `@backwater-systems/landscape.dataSources.${TimedAjaxDataSource.name}`; }

  static get DEFAULTS() {
    return Object.freeze({
      AUTO_START_TIMER: true,
      DEBUG: AjaxDataSource.DEFAULTS.DEBUG,
      TIMEOUT_DURATION: 1200
    });
  }

  constructor({
    autoStartTimer = TimedAjaxDataSource.DEFAULTS.AUTO_START_TIMER,
    debug = TimedAjaxDataSource.DEFAULTS.DEBUG,
    frequency,
    parameters = null,
    timeoutDuration = TimedAjaxDataSource.DEFAULTS.TIMEOUT_DURATION,
    url
  }) {
    super({
      'debug': debug,
      'parameters': parameters,
      'url': url
    });

    if ( !core.utilities.isNumber(frequency) || (frequency <= 0) ) throw new Error('Invalid ‘frequency’ specified: must be a positive number.');

    /** Fetch frequency (in seconds)
     * @type {number}
     */
    this.frequency = frequency;

    /** The amount of time (in seconds) with no interaction before automatic fetching stops
     * @type {number}
     */
    this.timeoutDuration = (
      // null: no timeout
      (timeoutDuration === null)
      // positive number: a duration in seconds
      || ( core.utilities.isNumber(timeoutDuration) && (timeoutDuration > 0) )
    )
      ? timeoutDuration
      // default: 20 minutes
      : TimedAjaxDataSource.DEFAULTS.TIMEOUT_DURATION
    ;
    if (
      (this.timeoutDuration !== null)
      && (this.timeoutDuration < this.frequency)
    ) {
      core.logging.Logger.logWarning('‘timeoutDuration’ is less than ‘frequency’.', TimedAjaxDataSource.CLASS_NAME, this.debug);
    }

    const _autoStartTimer = core.utilities.validateType(autoStartTimer, Boolean)
      ? autoStartTimer
      : TimedAjaxDataSource.DEFAULTS.AUTO_START_TIMER
    ;
    // start the timer automatically, if necessary
    if (_autoStartTimer) {
      // HACK
      setTimeout(
        async () => {
          await this.startTimer();
        },
        0
      );
    }
  }

  async startTimer() {
    if (this.debug) {
      core.logging.Logger.logDebug('startTimer', TimedAjaxDataSource.CLASS_NAME, this.debug);
    }

    if (this.timerStarted) {
      core.logging.Logger.logWarning('Aborting; timer is already started.', TimedAjaxDataSource.CLASS_NAME, this.debug);

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
          core.logging.Logger.logError(error, TimedAjaxDataSource.CLASS_NAME, this.debug);
        }
      },
      this.frequency * 1000
    );

    // stop automatically fetching after the timeout duration has elapsed
    this._startFetchTimeout();

    // emit a “startTimer” event
    await this.sendEvent('startTimer');
  }

  async stopTimer() {
    if (this.debug) {
      core.logging.Logger.logDebug('stopTimer', TimedAjaxDataSource.CLASS_NAME, this.debug);
    }

    if (!this.timerStarted) {
      core.logging.Logger.logWarning('Aborting; timer is already stopped.', TimedAjaxDataSource.CLASS_NAME, this.debug);

      return;
    }

    // indicate that the timer is stopped (not automatically fetching)
    this.timerStarted = false;

    // stop automatically fetching the specified URL at the specified frequency
    clearInterval(this._fetchIntervalID);
    this._fetchIntervalID = null;

    // clear the existing fetch timeout, if any
    this._stopFetchTimeout();

    // emit a “stopTimer” event
    await this.sendEvent('stopTimer');
  }

  _startFetchTimeout() {
    // don’t time out fetching if the timeout duration is null
    if (this.timeoutDuration === null) return;

    // clear the existing fetch timeout, if any
    this._stopFetchTimeout();

    // stop automatically fetching after the timeout duration has elapsed
    this._fetchTimeoutID = setTimeout(
      async () => {
        try {
          if (this.debug) {
            core.logging.Logger.logDebug(
              `Automatic fetching timed out after ${core.utilities.formatNumber(this.timeoutDuration)} ${core.utilities.pluralize('second', this.timeoutDuration)}.`,
              TimedAjaxDataSource.CLASS_NAME,
              this.debug
            );
          }

          await this.stopTimer();
        }
        catch (error) {
          core.logging.Logger.logError(error, TimedAjaxDataSource.CLASS_NAME, this.debug);
        }
      },
      this.timeoutDuration * 1000
    );
  }

  _stopFetchTimeout() {
    if ( !core.utilities.isNumber(this._fetchTimeoutID) ) return;

    // prevent the automatic fetching from timing out
    clearTimeout(this._fetchTimeoutID);
  }
}


export default TimedAjaxDataSource;