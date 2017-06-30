'use strict';

const EventEmitter = require('events');

const READY_STATE_OPEN = 1;

class WebSocketEmitter extends EventEmitter {
    /**
     * @param {string}          url
     * @param {string|string[]} [protocols]
     *
     * @returns {Promise}
     */
    connect(url, protocols) {
        return new Promise((resolve, reject) => {
            this._ws = new WebSocket(url, protocols);

            this._ws.onopen = () => resolve();

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
                } catch (err) {
                    this._emit('error', err);
                }
            };
        });
    }

    /**
     * @param {number} [code]
     * @param {string} [reason]
     */
    disconnect(code, reason) {
        if (this._ws) {
            this._ws.close(code, reason);
        }
    }

    /**
     * @param {string} eventName
     * @param {*}      [data]
     */
    emit(eventName, data) {
        if (!this._ws || this._ws.readyState !== READY_STATE_OPEN) {
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

    _emit() {
        return EventEmitter.prototype.emit.apply(this, arguments);
    }
}

module.exports = WebSocketEmitter;