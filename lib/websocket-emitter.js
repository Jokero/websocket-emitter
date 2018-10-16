'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events');

var READY_STATE_OPEN = 1;

var WebSocketEmitter = function (_EventEmitter) {
    _inherits(WebSocketEmitter, _EventEmitter);

    function WebSocketEmitter() {
        _classCallCheck(this, WebSocketEmitter);

        var _this = _possibleConstructorReturn(this, (WebSocketEmitter.__proto__ || Object.getPrototypeOf(WebSocketEmitter)).call(this));

        _this._isReconnecting = false;
        return _this;
    }

    /**
     * @param {string}          url
     * @param {string|string[]} [protocols]
     *
     * @returns {Promise}
     */


    _createClass(WebSocketEmitter, [{
        key: 'connect',
        value: function connect(url, protocols) {
            this._options = { url: url, protocols: protocols };
            return this._connect(url, protocols);
        }

        /**
         * @returns {Promise}
         */

    }, {
        key: 'reconnect',
        value: function reconnect() {
            var _this2 = this;

            if (this._ws && !this._isReconnecting) {
                this._isReconnecting = true;

                this._ws.onerror = this._ws.onclose = this._ws.onmessage = function () {};
                this._ws.close();

                var promise = this._connect(this._options.url, this._options.protocols);
                promise.finally(function () {
                    return _this2._isReconnecting = false;
                });

                return promise.then(function () {
                    return { isReconnected: true };
                });
            }

            return Promise.resolve({ isInProgress: true });
        }

        /**
         * @param {number} [code]
         * @param {string} [reason]
         */

    }, {
        key: 'disconnect',
        value: function disconnect(code, reason) {
            if (this._ws) {
                this._ws.close(code, reason);
            }
        }
    }, {
        key: 'emit',


        /**
         * @param {string} eventName
         * @param {*}      [data]
         */
        value: function emit(eventName, data) {
            if (!this.isConnected) {
                throw new Error('WebSocket connection must be opened');
            }

            var message = this.serialize(eventName, data);
            this._ws.send(message);
        }

        /**
         * @param {string} response
         *
         * @returns {Object}
         */

    }, {
        key: 'deserialize',
        value: function deserialize(response) {
            var result = JSON.parse(response);
            return { event: result.event, data: result.data };
        }

        /**
         * @param {string} eventName
         * @param {*}      data
         *
         * @returns {string}
         */

    }, {
        key: 'serialize',
        value: function serialize(eventName, data) {
            return JSON.stringify({ event: eventName, data: data });
        }
    }, {
        key: '_connect',
        value: function _connect(url, protocols) {
            var _this3 = this;

            return new Promise(function (resolve, reject) {
                _this3._ws = new WebSocket(url, protocols);

                _this3._ws.onopen = function () {
                    _this3._emit('open');
                    resolve();
                };

                _this3._ws.onerror = function (event) {
                    _this3._emit('error', event);
                    reject(event);
                };

                _this3._ws.onclose = function (event) {
                    _this3._emit('close', event);
                };

                _this3._ws.onmessage = function (event) {
                    try {
                        var response = _this3.deserialize(event.data);
                        if (response.event) {
                            _this3._emit(response.event, response.data);
                        }
                        _this3._emit('message', response);
                    } catch (err) {
                        _this3._emit('message', event.data);
                    }
                };
            });
        }
    }, {
        key: '_emit',
        value: function _emit() {
            return EventEmitter.prototype.emit.apply(this, arguments);
        }
    }, {
        key: 'isConnected',
        get: function get() {
            if (!this._ws) {
                return false;
            }
            return this._ws.readyState === READY_STATE_OPEN;
        }
    }]);

    return WebSocketEmitter;
}(EventEmitter);

module.exports = WebSocketEmitter;