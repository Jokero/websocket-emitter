'use strict';

const EventEmitter = require('events');

const READY_STATE_OPEN = 1;

class WebSocketEmitter extends EventEmitter {
    constructor() {
        super();
        this._isReconnecting = false;
    }

    /**
     * @param {string}          url
     * @param {string|string[]} [protocols]
     *
     * @returns {Promise}
     */
    connect(url, protocols) {
        this._options = { url, protocols };
        return this._connect(url, protocols);
    }

    /**
     * @returns {Promise}
     */
    reconnect() {
        if (this._ws && !this._isReconnecting) {
            this._isReconnecting = true;

            this._ws.onerror = this._ws.onclose = this._ws.onmessage = () => {};
            this._ws.close();

            const promise = this._connect(this._options.url, this._options.protocols);
            promise.finally(() => this._isReconnecting = false);

            return promise.then(() => ({ isReconnected: true }));
        }

        return Promise.resolve({ isInProgress: true });
    }

    /**
     * @param {number} [code=1000]
     * @param {string} [reason='']
     */
    disconnect(code = 1000, reason = '') {
        if (this._ws) {
            this._ws.close(code, reason);
        }
    }

    get isConnected() {
        if (!this._ws) {
            return false;
        }
        return this._ws.readyState === READY_STATE_OPEN;
    }

    /**
     * @param {string} eventName
     * @param {*}      [data]
     */
    emit(eventName, data) {
        if (!this.isConnected) {
            throw new Error('WebSocket connection must be opened');
        }

        const message = this.serialize(eventName, data);
        this._ws.send(message);
    }

    /**
     * @param {string} response
     *
     * @returns {Object}
     */
    deserialize(response) {
        const result = JSON.parse(response);
        return { event: result.event, data: result.data };
    }

    /**
     * @param {string} eventName
     * @param {*}      data
     *
     * @returns {string}
     */
    serialize(eventName, data) {
        return JSON.stringify({ event: eventName, data: data });
    }

    _connect(url, protocols) {
        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(url, protocols);

            this._ws.onopen = () => {
                this._emit('open');
                resolve();
            };

            this._ws.onerror = event => {
                this._emit('error', event);
                reject(event);
            };

            this._ws.onclose = event => {
                this._emit('close', event);
            };

            this._ws.onmessage = event => {
                try {
                    const response = this.deserialize(event.data);
                    if (response.event) {
                        this._emit(response.event, response.data);
                    }
                    this._emit('message', response);
                } catch (err) {
                    this._emit('message', event.data);
                }
            };
        });
    }

    _emit() {
        return EventEmitter.prototype.emit.apply(this, arguments);
    }
}

module.exports = WebSocketEmitter;