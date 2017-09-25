/* @flow */

import sleep from 'delay';
import warning from 'warning';
import { MessengerClient } from 'messaging-api-messenger';

import type { MessengerSession } from '../bot/MessengerConnector';

import Context from './Context';
import MessengerEvent from './MessengerEvent';
import DelayableJobQueue from './DelayableJobQueue';
import type { PlatformContext } from './PlatformContext';

type Options = {|
  client: MessengerClient,
  event: MessengerEvent,
  session: ?MessengerSession,
|};

class MessengerContext extends Context implements PlatformContext {
  _client: MessengerClient;
  _event: MessengerEvent;
  _session: ?MessengerSession;
  _jobQueue: DelayableJobQueue;

  constructor({ client, event, session }: Options) {
    super({ client, event, session });
    this._jobQueue = new DelayableJobQueue();
    this._jobQueue.beforeEach(async ({ delay, showIndicators = true }) => {
      if (showIndicators) {
        this.typingOn();
      }
      await sleep(delay);
    });
    this._jobQueue.after(async ({ showIndicators = true }) => {
      if (showIndicators) {
        this.typingOff();
      }
    });
    this.setMessageDelay(1000);
  }

  /**
   * The name of the platform.
   *
   */
  get platform(): string {
    return 'messenger';
  }

  /**
   * Delay and show indicators for milliseconds.
   *
   */
  async typing(milliseconds: number): Promise<void> {
    await this.typingOn();
    await sleep(milliseconds);
    await this.typingOff();
  }

  /**
   * Send text to the owner of then session.
   *
   */
  sendText(text: string, options?: Object): Promise<any> {
    if (!this._session) {
      warning(
        false,
        'sendText: should not be called in context without session'
      );
      return Promise.resolve();
    }
    return this._enqueue({
      instance: this._client,
      method: 'sendText',
      args: options
        ? [this._session.user.id, text, options]
        : [this._session.user.id, text],
      delay: this._messageDelay,
      showIndicators: true,
    });
  }

  sendTextWithDelay(delay: number, text: string): Promise<any> {
    if (!this._session) {
      warning(
        false,
        'sendTextWithDelay: should not be called in context without session'
      );
      return Promise.resolve();
    }
    return this._enqueue({
      instance: this._client,
      method: 'sendText',
      args: [this._session.user.id, text],
      delay,
      showIndicators: true,
    });
  }

  typingOn(): Promise<any> {
    if (!this._session) {
      warning(
        false,
        'typingOn: should not be called in context without session'
      );
      return Promise.resolve();
    }
    return this._client.typingOn(this._session.user.id);
  }

  typingOff(): Promise<any> {
    if (!this._session) {
      warning(
        false,
        'typingOff: should not be called in context without session'
      );
      return Promise.resolve();
    }
    return this._client.typingOff(this._session.user.id);
  }

  _enqueue(job: Object): Promise<any> {
    return new Promise((resolve, reject) => {
      this._jobQueue.enqueue({
        ...job,
        onSuccess: resolve,
        onError: reject,
      });
    });
  }
}

const sendMethods = [
  'sendAttachment',
  'sendImage',
  'sendAudio',
  'sendVideo',
  'sendFile',
  'sendQuickReplies',
  'sendGenericTemplate',
  'sendButtonTemplate',
  'sendListTemplate',
  'sendReceiptTemplate',
  'sendAirlineBoardingPassTemplate',
  'sendAirlineCheckinTemplate',
  'sendAirlineItineraryTemplate',
  'sendAirlineFlightUpdateTemplate',
];

sendMethods.forEach(method => {
  Object.defineProperty(MessengerContext.prototype, `${method}`, {
    enumerable: false,
    configurable: true,
    writable: true,
    value(...args) {
      if (!this._session) {
        warning(
          false,
          `${method}: should not be called in context without session`
        );
        return Promise.resolve();
      }

      return this._enqueue({
        instance: this._client,
        method,
        args: [this._session.user.id, ...args],
        delay: this._messageDelay,
        showIndicators: true,
      });
    },
  });

  Object.defineProperty(MessengerContext.prototype, `${method}WithDelay`, {
    enumerable: false,
    configurable: true,
    writable: true,
    value(delay, ...rest) {
      warning(false, `${method}WithDelay is deprecated.`);
      if (!this._session) {
        warning(
          false,
          `${method}WithDelay: should not be called in context without session`
        );
        return Promise.resolve();
      }

      return this._enqueue({
        instance: this._client,
        method,
        args: [this._session.user.id, ...rest],
        delay,
        showIndicators: true,
      });
    },
  });
});

export default MessengerContext;
