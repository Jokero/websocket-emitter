const EventEmitter = require('events');

class WebSocketEmitter extends EventEmitter {
    /**
     * @param {String}          url
     * @param {String|String[]} [protocols]
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
                    const response = this.parse(event.data);
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
     * @param {Number} [code]
     * @param {String} [reason]
     */
    disconnect(code, reason) {
        if (this._ws) {
            this._ws.close(code, reason);
        }
    }

    /**
     * @param {String} eventName
     * @param {*}      [data]
     */
    emit(eventName, data) {
        if (!this._ws || this._ws.readyState !== 1 /* OPEN */) {
            throw new Error('WebSocket connection must be opened');
        }

        const message = this.stringify(eventName, data);
        this._ws.send(message);
    }

    /**
     * @param {String} response
     *
     * @returns {Object}
     */
    parse(response) {
        const result = JSON.parse(response);
        return { event: result.event, data: result.data };
    }

    /**
     * @param {String} eventName
     * @param {*}      data
     *
     * @returns {String}
     */
    stringify(eventName, data) {
        return JSON.stringify({ event: eventName, data: data });
    }

    _emit() {
        return EventEmitter.prototype.emit.apply(this, arguments);
    }
}

module.exports = WebSocketEmitter;