if (typeof Promise !== "undefined" && !Promise.prototype.finally) {
  Promise.prototype.finally = function(callback) {
    const promise = this.constructor;
    return this.then(
      (value) => promise.resolve(callback()).then(() => value),
      (reason) => promise.resolve(callback()).then(() => {
        throw reason;
      })
    );
  };
}
;
if (typeof uni !== "undefined" && uni && uni.requireGlobal) {
  const global2 = uni.requireGlobal();
  ArrayBuffer = global2.ArrayBuffer;
  Int8Array = global2.Int8Array;
  Uint8Array = global2.Uint8Array;
  Uint8ClampedArray = global2.Uint8ClampedArray;
  Int16Array = global2.Int16Array;
  Uint16Array = global2.Uint16Array;
  Int32Array = global2.Int32Array;
  Uint32Array = global2.Uint32Array;
  Float32Array = global2.Float32Array;
  Float64Array = global2.Float64Array;
  BigInt64Array = global2.BigInt64Array;
  BigUint64Array = global2.BigUint64Array;
}
;
if (uni.restoreGlobal) {
  uni.restoreGlobal(Vue, weex, plus, setTimeout, clearTimeout, setInterval, clearInterval);
}
(function(vue) {
  "use strict";
  function formatAppLog(type, filename, ...args) {
    if (uni.__log__) {
      uni.__log__(type, filename, ...args);
    } else {
      console[type].apply(console, [...args, filename]);
    }
  }
  function resolveEasycom(component, easycom) {
    return typeof component === "string" ? easycom : component;
  }
  const config = {
    development: {
      BASE_URL: "http://localhost:5000/api",
      SOCKET_URL: "http://localhost:5000"
    },
    production: {
      BASE_URL: "http://100.80.119.36:5000/api",
      SOCKET_URL: "http://100.80.119.36:5000"
    }
  };
  const env = "production";
  const config$1 = config[env];
  const BASE_URL = `${config$1.BASE_URL}`;
  const requestInterceptor = {
    /**
      * 请求预处理
      * @param {Object} options - 请求配置
      * @returns {Object} 处理后的请求配置
      */
    invoke(options) {
      options.header = {
        "Content-Type": "application/json",
        ...options.header || {},
        "Authorization": `Bearer ${uni.getStorageSync("access_token") || ""}`
      };
      if (!options.url.startsWith("http") && !options.url.startsWith("//")) {
        options.url = `${BASE_URL}${options.url.startsWith("/") ? "" : "/"}${options.url}`;
      }
      return options;
    }
  };
  const responseInterceptor = {
    /**
      * 请求成功处理 (状态码200)
      * @param {Object} res - 响应对象
      * @returns {Promise}
      */
    success(res2) {
      const { statusCode, data } = res2;
      if (statusCode !== 200) {
        return handleNetworkError(statusCode);
      }
      return handleBusinessCode(data);
    },
    /**
      * 请求失败处理
      * @param {Error} err - 错误对象
      */
    fail(err) {
      return handleNetworkError(err.errMsg || "网络请求失败");
    }
  };
  uni.addInterceptor("request", requestInterceptor);
  uni.addInterceptor("uploadFile", requestInterceptor);
  uni.addInterceptor("downloadFile", requestInterceptor);
  const request = (options) => {
    const {
      showLoading = false,
      loadingText = "加载中...",
      ...realOptions
    } = options;
    const token = uni.getStorageSync("access_token");
    formatAppLog("log", "at utils/request.js:111", "token", token);
    realOptions.header = options.header || {};
    if (token) {
      realOptions.header["Authorization"] = `Bearer ${token}`;
    }
    if (showLoading) {
      uni.showLoading({
        title: loadingText,
        mask: true
      });
    }
    return new Promise((resolve, reject) => {
      uni.request({
        ...realOptions,
        success: (res2) => {
          if (showLoading)
            uni.hideLoading();
          responseInterceptor.success(res2).then(resolve).catch(reject);
        },
        fail: (err) => {
          if (showLoading)
            uni.hideLoading();
          responseInterceptor.fail(err).then(resolve).catch(reject);
        }
      });
    });
  };
  const get = (url2, data = {}, options = {}) => request({ url: url2, data, method: "GET", ...options });
  const post = (url2, data = {}, options = {}) => request({ url: url2, data, method: "POST", ...options });
  const put = (url2, data = {}, options = {}) => request({ url: url2, data, method: "PUT", ...options });
  const del = (url2, data = {}, options = {}) => request({ url: url2, data, method: "DELETE", ...options });
  function showToast(message) {
    uni.showToast({
      title: message,
      icon: "none",
      duration: 2e3
    });
  }
  function handleTokenExpired(message) {
    var _a;
    uni.removeStorageSync("access_token");
    uni.removeStorageSync("user_info");
    const pages = getCurrentPages();
    const currentPage = (_a = pages[pages.length - 1]) == null ? void 0 : _a.route;
    if (currentPage !== "pages/login/login") {
      uni.navigateTo({
        url: "/pages/login/login?redirect=/" + currentPage
      });
    }
    showToast(message || "登录已过期");
  }
  function handleNetworkError(statusCode) {
    const errorMap = {
      400: "请求参数错误",
      401: "未授权",
      403: "禁止访问",
      404: "资源不存在",
      409: "信息不匹配",
      500: "服务器内部错误",
      502: "网关错误"
    };
    const errMsg = errorMap[statusCode] || `网络错误[${statusCode}]`;
    showToast(errMsg);
    return Promise.reject(new Error(errMsg));
  }
  function handleBusinessCode(data) {
    switch (data == null ? void 0 : data.code) {
      case 200:
        formatAppLog("log", "at utils/request.js:305", "业务码200", data);
        return Promise.resolve(data);
      case 401:
        handleTokenExpired(data.message);
        return Promise.reject(new Error(data.message || "请重新登录"));
      case 403:
        showToast("无访问权限");
        return Promise.reject(new Error("无权限"));
      case 409:
        showToast("信息不匹配");
        return Promise.reject(new Error("信息不匹配"));
      default:
        const errMsg = (data == null ? void 0 : data.message) || `业务错误[${data == null ? void 0 : data.code}]`;
        showToast(errMsg);
        return Promise.reject(new Error(errMsg));
    }
  }
  const authApi = {
    /**
      * 注册用户
      * @param {Object} data 注册参数
      * @returns Promise
      */
    register(data) {
      formatAppLog("log", "at api/auth.js:10", "📮 注册请求开始 -----");
      formatAppLog("log", "at api/auth.js:11", "请求数据:", data);
      return post("/auth/register", data, {
        showLoading: true,
        loadingText: "正在注册..."
      });
    },
    /**
         * 用户登录
         * @param {Object} data 登录参数
         * @returns Promise
         */
    login(data) {
      return post("/auth/login", data, {
        showLoading: true,
        loadingText: "正在登录..."
      });
    }
  };
  const PACKET_TYPES = /* @__PURE__ */ Object.create(null);
  PACKET_TYPES["open"] = "0";
  PACKET_TYPES["close"] = "1";
  PACKET_TYPES["ping"] = "2";
  PACKET_TYPES["pong"] = "3";
  PACKET_TYPES["message"] = "4";
  PACKET_TYPES["upgrade"] = "5";
  PACKET_TYPES["noop"] = "6";
  const PACKET_TYPES_REVERSE = /* @__PURE__ */ Object.create(null);
  Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
  });
  const ERROR_PACKET = { type: "error", data: "parser error" };
  const withNativeBlob$1 = typeof Blob === "function" || typeof Blob !== "undefined" && Object.prototype.toString.call(Blob) === "[object BlobConstructor]";
  const withNativeArrayBuffer$2 = typeof ArrayBuffer === "function";
  const isView$1 = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj && obj.buffer instanceof ArrayBuffer;
  };
  const encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob$1 && data instanceof Blob) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(data, callback);
      }
    } else if (withNativeArrayBuffer$2 && (data instanceof ArrayBuffer || isView$1(data))) {
      if (supportsBinary) {
        return callback(data);
      } else {
        return encodeBlobAsBase64(new Blob([data]), callback);
      }
    }
    return callback(PACKET_TYPES[type] + (data || ""));
  };
  const encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const content = fileReader.result.split(",")[1];
      callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
  };
  function toArray(data) {
    if (data instanceof Uint8Array) {
      return data;
    } else if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    } else {
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
  }
  let TEXT_ENCODER;
  function encodePacketToBinary(packet, callback) {
    if (withNativeBlob$1 && packet.data instanceof Blob) {
      return packet.data.arrayBuffer().then(toArray).then(callback);
    } else if (withNativeArrayBuffer$2 && (packet.data instanceof ArrayBuffer || isView$1(packet.data))) {
      return callback(toArray(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
      if (!TEXT_ENCODER) {
        TEXT_ENCODER = new TextEncoder();
      }
      callback(TEXT_ENCODER.encode(encoded));
    });
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup$1 = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup$1[chars.charCodeAt(i)] = i;
  }
  const decode$1 = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === "=") {
      bufferLength--;
      if (base64[base64.length - 2] === "=") {
        bufferLength--;
      }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
      encoded1 = lookup$1[base64.charCodeAt(i)];
      encoded2 = lookup$1[base64.charCodeAt(i + 1)];
      encoded3 = lookup$1[base64.charCodeAt(i + 2)];
      encoded4 = lookup$1[base64.charCodeAt(i + 3)];
      bytes[p++] = encoded1 << 2 | encoded2 >> 4;
      bytes[p++] = (encoded2 & 15) << 4 | encoded3 >> 2;
      bytes[p++] = (encoded3 & 3) << 6 | encoded4 & 63;
    }
    return arraybuffer;
  };
  const withNativeArrayBuffer$1 = typeof ArrayBuffer === "function";
  const decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
      return {
        type: "message",
        data: mapBinary(encodedPacket, binaryType)
      };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
      return {
        type: "message",
        data: decodeBase64Packet(encodedPacket.substring(1), binaryType)
      };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
      return ERROR_PACKET;
    }
    return encodedPacket.length > 1 ? {
      type: PACKET_TYPES_REVERSE[type],
      data: encodedPacket.substring(1)
    } : {
      type: PACKET_TYPES_REVERSE[type]
    };
  };
  const decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer$1) {
      const decoded = decode$1(data);
      return mapBinary(decoded, binaryType);
    } else {
      return { base64: true, data };
    }
  };
  const mapBinary = (data, binaryType) => {
    switch (binaryType) {
      case "blob":
        if (data instanceof Blob) {
          return data;
        } else {
          return new Blob([data]);
        }
      case "arraybuffer":
      default:
        if (data instanceof ArrayBuffer) {
          return data;
        } else {
          return data.buffer;
        }
    }
  };
  const SEPARATOR = String.fromCharCode(30);
  const encodePayload = (packets, callback) => {
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
      encodePacket(packet, false, (encodedPacket) => {
        encodedPackets[i] = encodedPacket;
        if (++count === length) {
          callback(encodedPackets.join(SEPARATOR));
        }
      });
    });
  };
  const decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
      const decodedPacket = decodePacket(encodedPackets[i], binaryType);
      packets.push(decodedPacket);
      if (decodedPacket.type === "error") {
        break;
      }
    }
    return packets;
  };
  function createPacketEncoderStream() {
    return new TransformStream({
      transform(packet, controller) {
        encodePacketToBinary(packet, (encodedPacket) => {
          const payloadLength = encodedPacket.length;
          let header;
          if (payloadLength < 126) {
            header = new Uint8Array(1);
            new DataView(header.buffer).setUint8(0, payloadLength);
          } else if (payloadLength < 65536) {
            header = new Uint8Array(3);
            const view = new DataView(header.buffer);
            view.setUint8(0, 126);
            view.setUint16(1, payloadLength);
          } else {
            header = new Uint8Array(9);
            const view = new DataView(header.buffer);
            view.setUint8(0, 127);
            view.setBigUint64(1, BigInt(payloadLength));
          }
          if (packet.data && typeof packet.data !== "string") {
            header[0] |= 128;
          }
          controller.enqueue(header);
          controller.enqueue(encodedPacket);
        });
      }
    });
  }
  let TEXT_DECODER;
  function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  }
  function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
      return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
      buffer[i] = chunks[0][j++];
      if (j === chunks[0].length) {
        chunks.shift();
        j = 0;
      }
    }
    if (chunks.length && j < chunks[0].length) {
      chunks[0] = chunks[0].slice(j);
    }
    return buffer;
  }
  function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
      TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0;
    let expectedLength = -1;
    let isBinary2 = false;
    return new TransformStream({
      transform(chunk, controller) {
        chunks.push(chunk);
        while (true) {
          if (state === 0) {
            if (totalLength(chunks) < 1) {
              break;
            }
            const header = concatChunks(chunks, 1);
            isBinary2 = (header[0] & 128) === 128;
            expectedLength = header[0] & 127;
            if (expectedLength < 126) {
              state = 3;
            } else if (expectedLength === 126) {
              state = 1;
            } else {
              state = 2;
            }
          } else if (state === 1) {
            if (totalLength(chunks) < 2) {
              break;
            }
            const headerArray = concatChunks(chunks, 2);
            expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
            state = 3;
          } else if (state === 2) {
            if (totalLength(chunks) < 8) {
              break;
            }
            const headerArray = concatChunks(chunks, 8);
            const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
            const n = view.getUint32(0);
            if (n > Math.pow(2, 53 - 32) - 1) {
              controller.enqueue(ERROR_PACKET);
              break;
            }
            expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
            state = 3;
          } else {
            if (totalLength(chunks) < expectedLength) {
              break;
            }
            const data = concatChunks(chunks, expectedLength);
            controller.enqueue(decodePacket(isBinary2 ? data : TEXT_DECODER.decode(data), binaryType));
            state = 0;
          }
          if (expectedLength === 0 || expectedLength > maxPayload) {
            controller.enqueue(ERROR_PACKET);
            break;
          }
        }
      }
    });
  }
  const protocol$1 = 4;
  function Emitter(obj) {
    if (obj)
      return mixin(obj);
  }
  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }
  Emitter.prototype.on = Emitter.prototype.addEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    (this._callbacks["$" + event] = this._callbacks["$" + event] || []).push(fn);
    return this;
  };
  Emitter.prototype.once = function(event, fn) {
    function on2() {
      this.off(event, on2);
      fn.apply(this, arguments);
    }
    on2.fn = fn;
    this.on(event, on2);
    return this;
  };
  Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function(event, fn) {
    this._callbacks = this._callbacks || {};
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }
    var callbacks = this._callbacks["$" + event];
    if (!callbacks)
      return this;
    if (1 == arguments.length) {
      delete this._callbacks["$" + event];
      return this;
    }
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    if (callbacks.length === 0) {
      delete this._callbacks["$" + event];
    }
    return this;
  };
  Emitter.prototype.emit = function(event) {
    this._callbacks = this._callbacks || {};
    var args = new Array(arguments.length - 1), callbacks = this._callbacks["$" + event];
    for (var i = 1; i < arguments.length; i++) {
      args[i - 1] = arguments[i];
    }
    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }
    return this;
  };
  Emitter.prototype.emitReserved = Emitter.prototype.emit;
  Emitter.prototype.listeners = function(event) {
    this._callbacks = this._callbacks || {};
    return this._callbacks["$" + event] || [];
  };
  Emitter.prototype.hasListeners = function(event) {
    return !!this.listeners(event).length;
  };
  const nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
      return (cb) => Promise.resolve().then(cb);
    } else {
      return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
  })();
  const globalThisShim = (() => {
    if (typeof self !== "undefined") {
      return self;
    } else if (typeof window !== "undefined") {
      return window;
    } else {
      return Function("return this")();
    }
  })();
  const defaultBinaryType = "arraybuffer";
  function createCookieJar() {
  }
  function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
      if (obj.hasOwnProperty(k)) {
        acc[k] = obj[k];
      }
      return acc;
    }, {});
  }
  const NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
  const NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
  function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
      obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
      obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    } else {
      obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
      obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
  }
  const BASE64_OVERHEAD = 1.33;
  function byteLength(obj) {
    if (typeof obj === "string") {
      return utf8Length(obj);
    }
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
  }
  function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
      c = str.charCodeAt(i);
      if (c < 128) {
        length += 1;
      } else if (c < 2048) {
        length += 2;
      } else if (c < 55296 || c >= 57344) {
        length += 3;
      } else {
        i++;
        length += 4;
      }
    }
    return length;
  }
  function randomString() {
    return Date.now().toString(36).substring(3) + Math.random().toString(36).substring(2, 5);
  }
  function encode(obj) {
    let str = "";
    for (let i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (str.length)
          str += "&";
        str += encodeURIComponent(i) + "=" + encodeURIComponent(obj[i]);
      }
    }
    return str;
  }
  function decode(qs) {
    let qry = {};
    let pairs = qs.split("&");
    for (let i = 0, l = pairs.length; i < l; i++) {
      let pair = pairs[i].split("=");
      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
  }
  class TransportError extends Error {
    constructor(reason, description, context) {
      super(reason);
      this.description = description;
      this.context = context;
      this.type = "TransportError";
    }
  }
  class Transport extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
      super();
      this.writable = false;
      installTimerFunctions(this, opts);
      this.opts = opts;
      this.query = opts.query;
      this.socket = opts.socket;
      this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
      super.emitReserved("error", new TransportError(reason, description, context));
      return this;
    }
    /**
     * Opens the transport.
     */
    open() {
      this.readyState = "opening";
      this.doOpen();
      return this;
    }
    /**
     * Closes the transport.
     */
    close() {
      if (this.readyState === "opening" || this.readyState === "open") {
        this.doClose();
        this.onClose();
      }
      return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
      if (this.readyState === "open") {
        this.write(packets);
      }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
      this.readyState = "open";
      this.writable = true;
      super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
      const packet = decodePacket(data, this.socket.binaryType);
      this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
      super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
      this.readyState = "closed";
      super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) {
    }
    createUri(schema, query = {}) {
      return schema + "://" + this._hostname() + this._port() + this.opts.path + this._query(query);
    }
    _hostname() {
      const hostname = this.opts.hostname;
      return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
      if (this.opts.port && (this.opts.secure && Number(this.opts.port !== 443) || !this.opts.secure && Number(this.opts.port) !== 80)) {
        return ":" + this.opts.port;
      } else {
        return "";
      }
    }
    _query(query) {
      const encodedQuery = encode(query);
      return encodedQuery.length ? "?" + encodedQuery : "";
    }
  }
  class Polling extends Transport {
    constructor() {
      super(...arguments);
      this._polling = false;
    }
    get name() {
      return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
      this._poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
      this.readyState = "pausing";
      const pause = () => {
        this.readyState = "paused";
        onPause();
      };
      if (this._polling || !this.writable) {
        let total = 0;
        if (this._polling) {
          total++;
          this.once("pollComplete", function() {
            --total || pause();
          });
        }
        if (!this.writable) {
          total++;
          this.once("drain", function() {
            --total || pause();
          });
        }
      } else {
        pause();
      }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    _poll() {
      this._polling = true;
      this.doPoll();
      this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
      const callback = (packet) => {
        if ("opening" === this.readyState && packet.type === "open") {
          this.onOpen();
        }
        if ("close" === packet.type) {
          this.onClose({ description: "transport closed by the server" });
          return false;
        }
        this.onPacket(packet);
      };
      decodePayload(data, this.socket.binaryType).forEach(callback);
      if ("closed" !== this.readyState) {
        this._polling = false;
        this.emitReserved("pollComplete");
        if ("open" === this.readyState) {
          this._poll();
        }
      }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
      const close = () => {
        this.write([{ type: "close" }]);
      };
      if ("open" === this.readyState) {
        close();
      } else {
        this.once("open", close);
      }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
      this.writable = false;
      encodePayload(packets, (data) => {
        this.doWrite(data, () => {
          this.writable = true;
          this.emitReserved("drain");
        });
      });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "https" : "http";
      const query = this.query || {};
      if (false !== this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary && !query.sid) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  }
  let value = false;
  try {
    value = typeof XMLHttpRequest !== "undefined" && "withCredentials" in new XMLHttpRequest();
  } catch (err) {
  }
  const hasCORS = value;
  function empty() {
  }
  class BaseXHR extends Polling {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
      super(opts);
      if (typeof location !== "undefined") {
        const isSSL = "https:" === location.protocol;
        let port = location.port;
        if (!port) {
          port = isSSL ? "443" : "80";
        }
        this.xd = typeof location !== "undefined" && opts.hostname !== location.hostname || port !== opts.port;
      }
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
      const req = this.request({
        method: "POST",
        data
      });
      req.on("success", fn);
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr post error", xhrStatus, context);
      });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
      const req = this.request();
      req.on("data", this.onData.bind(this));
      req.on("error", (xhrStatus, context) => {
        this.onError("xhr poll error", xhrStatus, context);
      });
      this.pollXhr = req;
    }
  }
  class Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(createRequest, uri, opts) {
      super();
      this.createRequest = createRequest;
      installTimerFunctions(this, opts);
      this._opts = opts;
      this._method = opts.method || "GET";
      this._uri = uri;
      this._data = void 0 !== opts.data ? opts.data : null;
      this._create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    _create() {
      var _a;
      const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
      opts.xdomain = !!this._opts.xd;
      const xhr = this._xhr = this.createRequest(opts);
      try {
        xhr.open(this._method, this._uri, true);
        try {
          if (this._opts.extraHeaders) {
            xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
            for (let i in this._opts.extraHeaders) {
              if (this._opts.extraHeaders.hasOwnProperty(i)) {
                xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
              }
            }
          }
        } catch (e) {
        }
        if ("POST" === this._method) {
          try {
            xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
          } catch (e) {
          }
        }
        try {
          xhr.setRequestHeader("Accept", "*/*");
        } catch (e) {
        }
        (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
        if ("withCredentials" in xhr) {
          xhr.withCredentials = this._opts.withCredentials;
        }
        if (this._opts.requestTimeout) {
          xhr.timeout = this._opts.requestTimeout;
        }
        xhr.onreadystatechange = () => {
          var _a2;
          if (xhr.readyState === 3) {
            (_a2 = this._opts.cookieJar) === null || _a2 === void 0 ? void 0 : _a2.parseCookies(
              // @ts-ignore
              xhr.getResponseHeader("set-cookie")
            );
          }
          if (4 !== xhr.readyState)
            return;
          if (200 === xhr.status || 1223 === xhr.status) {
            this._onLoad();
          } else {
            this.setTimeoutFn(() => {
              this._onError(typeof xhr.status === "number" ? xhr.status : 0);
            }, 0);
          }
        };
        xhr.send(this._data);
      } catch (e) {
        this.setTimeoutFn(() => {
          this._onError(e);
        }, 0);
        return;
      }
      if (typeof document !== "undefined") {
        this._index = Request.requestsCount++;
        Request.requests[this._index] = this;
      }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    _onError(err) {
      this.emitReserved("error", err, this._xhr);
      this._cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    _cleanup(fromError) {
      if ("undefined" === typeof this._xhr || null === this._xhr) {
        return;
      }
      this._xhr.onreadystatechange = empty;
      if (fromError) {
        try {
          this._xhr.abort();
        } catch (e) {
        }
      }
      if (typeof document !== "undefined") {
        delete Request.requests[this._index];
      }
      this._xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    _onLoad() {
      const data = this._xhr.responseText;
      if (data !== null) {
        this.emitReserved("data", data);
        this.emitReserved("success");
        this._cleanup();
      }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
      this._cleanup();
    }
  }
  Request.requestsCount = 0;
  Request.requests = {};
  if (typeof document !== "undefined") {
    if (typeof attachEvent === "function") {
      attachEvent("onunload", unloadHandler);
    } else if (typeof addEventListener === "function") {
      const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
      addEventListener(terminationEvent, unloadHandler, false);
    }
  }
  function unloadHandler() {
    for (let i in Request.requests) {
      if (Request.requests.hasOwnProperty(i)) {
        Request.requests[i].abort();
      }
    }
  }
  const hasXHR2 = function() {
    const xhr = newRequest({
      xdomain: false
    });
    return xhr && xhr.responseType !== null;
  }();
  class XHR extends BaseXHR {
    constructor(opts) {
      super(opts);
      const forceBase64 = opts && opts.forceBase64;
      this.supportsBinary = hasXHR2 && !forceBase64;
    }
    request(opts = {}) {
      Object.assign(opts, { xd: this.xd }, this.opts);
      return new Request(newRequest, this.uri(), opts);
    }
  }
  function newRequest(opts) {
    const xdomain = opts.xdomain;
    try {
      if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
        return new XMLHttpRequest();
      }
    } catch (e) {
    }
    if (!xdomain) {
      try {
        return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
      } catch (e) {
      }
    }
  }
  const isReactNative = typeof navigator !== "undefined" && typeof navigator.product === "string" && navigator.product.toLowerCase() === "reactnative";
  class BaseWS extends Transport {
    get name() {
      return "websocket";
    }
    doOpen() {
      const uri = this.uri();
      const protocols = this.opts.protocols;
      const opts = isReactNative ? {} : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
      if (this.opts.extraHeaders) {
        opts.headers = this.opts.extraHeaders;
      }
      try {
        this.ws = this.createSocket(uri, protocols, opts);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this.ws.binaryType = this.socket.binaryType;
      this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
      this.ws.onopen = () => {
        if (this.opts.autoUnref) {
          this.ws._socket.unref();
        }
        this.onOpen();
      };
      this.ws.onclose = (closeEvent) => this.onClose({
        description: "websocket connection closed",
        context: closeEvent
      });
      this.ws.onmessage = (ev) => this.onData(ev.data);
      this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        encodePacket(packet, this.supportsBinary, (data) => {
          try {
            this.doWrite(packet, data);
          } catch (e) {
          }
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      if (typeof this.ws !== "undefined") {
        this.ws.onerror = () => {
        };
        this.ws.close();
        this.ws = null;
      }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
      const schema = this.opts.secure ? "wss" : "ws";
      const query = this.query || {};
      if (this.opts.timestampRequests) {
        query[this.opts.timestampParam] = randomString();
      }
      if (!this.supportsBinary) {
        query.b64 = 1;
      }
      return this.createUri(schema, query);
    }
  }
  const WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
  class WS extends BaseWS {
    createSocket(uri, protocols, opts) {
      return !isReactNative ? protocols ? new WebSocketCtor(uri, protocols) : new WebSocketCtor(uri) : new WebSocketCtor(uri, protocols, opts);
    }
    doWrite(_packet, data) {
      this.ws.send(data);
    }
  }
  class WT extends Transport {
    get name() {
      return "webtransport";
    }
    doOpen() {
      try {
        this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
      } catch (err) {
        return this.emitReserved("error", err);
      }
      this._transport.closed.then(() => {
        this.onClose();
      }).catch((err) => {
        this.onError("webtransport error", err);
      });
      this._transport.ready.then(() => {
        this._transport.createBidirectionalStream().then((stream) => {
          const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
          const reader = stream.readable.pipeThrough(decoderStream).getReader();
          const encoderStream = createPacketEncoderStream();
          encoderStream.readable.pipeTo(stream.writable);
          this._writer = encoderStream.writable.getWriter();
          const read = () => {
            reader.read().then(({ done, value: value2 }) => {
              if (done) {
                return;
              }
              this.onPacket(value2);
              read();
            }).catch((err) => {
            });
          };
          read();
          const packet = { type: "open" };
          if (this.query.sid) {
            packet.data = `{"sid":"${this.query.sid}"}`;
          }
          this._writer.write(packet).then(() => this.onOpen());
        });
      });
    }
    write(packets) {
      this.writable = false;
      for (let i = 0; i < packets.length; i++) {
        const packet = packets[i];
        const lastPacket = i === packets.length - 1;
        this._writer.write(packet).then(() => {
          if (lastPacket) {
            nextTick(() => {
              this.writable = true;
              this.emitReserved("drain");
            }, this.setTimeoutFn);
          }
        });
      }
    }
    doClose() {
      var _a;
      (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
    }
  }
  const transports = {
    websocket: WS,
    webtransport: WT,
    polling: XHR
  };
  const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
  const parts = [
    "source",
    "protocol",
    "authority",
    "userInfo",
    "user",
    "password",
    "host",
    "port",
    "relative",
    "path",
    "directory",
    "file",
    "query",
    "anchor"
  ];
  function parse$1(str) {
    if (str.length > 8e3) {
      throw "URI too long";
    }
    const src = str, b = str.indexOf("["), e = str.indexOf("]");
    if (b != -1 && e != -1) {
      str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ";") + str.substring(e, str.length);
    }
    let m = re.exec(str || ""), uri = {}, i = 14;
    while (i--) {
      uri[parts[i]] = m[i] || "";
    }
    if (b != -1 && e != -1) {
      uri.source = src;
      uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ":");
      uri.authority = uri.authority.replace("[", "").replace("]", "").replace(/;/g, ":");
      uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri["path"]);
    uri.queryKey = queryKey(uri, uri["query"]);
    return uri;
  }
  function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == "/" || path.length === 0) {
      names.splice(0, 1);
    }
    if (path.slice(-1) == "/") {
      names.splice(names.length - 1, 1);
    }
    return names;
  }
  function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function($0, $1, $2) {
      if ($1) {
        data[$1] = $2;
      }
    });
    return data;
  }
  const withEventListeners = typeof addEventListener === "function" && typeof removeEventListener === "function";
  const OFFLINE_EVENT_LISTENERS = [];
  if (withEventListeners) {
    addEventListener("offline", () => {
      OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
    }, false);
  }
  class SocketWithoutUpgrade extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts) {
      super();
      this.binaryType = defaultBinaryType;
      this.writeBuffer = [];
      this._prevBufferLen = 0;
      this._pingInterval = -1;
      this._pingTimeout = -1;
      this._maxPayload = -1;
      this._pingTimeoutTime = Infinity;
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = null;
      }
      if (uri) {
        const parsedUri = parse$1(uri);
        opts.hostname = parsedUri.host;
        opts.secure = parsedUri.protocol === "https" || parsedUri.protocol === "wss";
        opts.port = parsedUri.port;
        if (parsedUri.query)
          opts.query = parsedUri.query;
      } else if (opts.host) {
        opts.hostname = parse$1(opts.host).host;
      }
      installTimerFunctions(this, opts);
      this.secure = null != opts.secure ? opts.secure : typeof location !== "undefined" && "https:" === location.protocol;
      if (opts.hostname && !opts.port) {
        opts.port = this.secure ? "443" : "80";
      }
      this.hostname = opts.hostname || (typeof location !== "undefined" ? location.hostname : "localhost");
      this.port = opts.port || (typeof location !== "undefined" && location.port ? location.port : this.secure ? "443" : "80");
      this.transports = [];
      this._transportsByName = {};
      opts.transports.forEach((t2) => {
        const transportName = t2.prototype.name;
        this.transports.push(transportName);
        this._transportsByName[transportName] = t2;
      });
      this.opts = Object.assign({
        path: "/engine.io",
        agent: false,
        withCredentials: false,
        upgrade: true,
        timestampParam: "t",
        rememberUpgrade: false,
        addTrailingSlash: true,
        rejectUnauthorized: true,
        perMessageDeflate: {
          threshold: 1024
        },
        transportOptions: {},
        closeOnBeforeunload: false
      }, opts);
      this.opts.path = this.opts.path.replace(/\/$/, "") + (this.opts.addTrailingSlash ? "/" : "");
      if (typeof this.opts.query === "string") {
        this.opts.query = decode(this.opts.query);
      }
      if (withEventListeners) {
        if (this.opts.closeOnBeforeunload) {
          this._beforeunloadEventListener = () => {
            if (this.transport) {
              this.transport.removeAllListeners();
              this.transport.close();
            }
          };
          addEventListener("beforeunload", this._beforeunloadEventListener, false);
        }
        if (this.hostname !== "localhost") {
          this._offlineEventListener = () => {
            this._onClose("transport close", {
              description: "network connection lost"
            });
          };
          OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
        }
      }
      if (this.opts.withCredentials) {
        this._cookieJar = createCookieJar();
      }
      this._open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
      const query = Object.assign({}, this.opts.query);
      query.EIO = protocol$1;
      query.transport = name;
      if (this.id)
        query.sid = this.id;
      const opts = Object.assign({}, this.opts, {
        query,
        socket: this,
        hostname: this.hostname,
        secure: this.secure,
        port: this.port
      }, this.opts.transportOptions[name]);
      return new this._transportsByName[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    _open() {
      if (this.transports.length === 0) {
        this.setTimeoutFn(() => {
          this.emitReserved("error", "No transports available");
        }, 0);
        return;
      }
      const transportName = this.opts.rememberUpgrade && SocketWithoutUpgrade.priorWebsocketSuccess && this.transports.indexOf("websocket") !== -1 ? "websocket" : this.transports[0];
      this.readyState = "opening";
      const transport = this.createTransport(transportName);
      transport.open();
      this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
      if (this.transport) {
        this.transport.removeAllListeners();
      }
      this.transport = transport;
      transport.on("drain", this._onDrain.bind(this)).on("packet", this._onPacket.bind(this)).on("error", this._onError.bind(this)).on("close", (reason) => this._onClose("transport close", reason));
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
      this.readyState = "open";
      SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === this.transport.name;
      this.emitReserved("open");
      this.flush();
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    _onPacket(packet) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.emitReserved("packet", packet);
        this.emitReserved("heartbeat");
        switch (packet.type) {
          case "open":
            this.onHandshake(JSON.parse(packet.data));
            break;
          case "ping":
            this._sendPacket("pong");
            this.emitReserved("ping");
            this.emitReserved("pong");
            this._resetPingTimeout();
            break;
          case "error":
            const err = new Error("server error");
            err.code = packet.data;
            this._onError(err);
            break;
          case "message":
            this.emitReserved("data", packet.data);
            this.emitReserved("message", packet.data);
            break;
        }
      }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
      this.emitReserved("handshake", data);
      this.id = data.sid;
      this.transport.query.sid = data.sid;
      this._pingInterval = data.pingInterval;
      this._pingTimeout = data.pingTimeout;
      this._maxPayload = data.maxPayload;
      this.onOpen();
      if ("closed" === this.readyState)
        return;
      this._resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    _resetPingTimeout() {
      this.clearTimeoutFn(this._pingTimeoutTimer);
      const delay = this._pingInterval + this._pingTimeout;
      this._pingTimeoutTime = Date.now() + delay;
      this._pingTimeoutTimer = this.setTimeoutFn(() => {
        this._onClose("ping timeout");
      }, delay);
      if (this.opts.autoUnref) {
        this._pingTimeoutTimer.unref();
      }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    _onDrain() {
      this.writeBuffer.splice(0, this._prevBufferLen);
      this._prevBufferLen = 0;
      if (0 === this.writeBuffer.length) {
        this.emitReserved("drain");
      } else {
        this.flush();
      }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
      if ("closed" !== this.readyState && this.transport.writable && !this.upgrading && this.writeBuffer.length) {
        const packets = this._getWritablePackets();
        this.transport.send(packets);
        this._prevBufferLen = packets.length;
        this.emitReserved("flush");
      }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    _getWritablePackets() {
      const shouldCheckPayloadSize = this._maxPayload && this.transport.name === "polling" && this.writeBuffer.length > 1;
      if (!shouldCheckPayloadSize) {
        return this.writeBuffer;
      }
      let payloadSize = 1;
      for (let i = 0; i < this.writeBuffer.length; i++) {
        const data = this.writeBuffer[i].data;
        if (data) {
          payloadSize += byteLength(data);
        }
        if (i > 0 && payloadSize > this._maxPayload) {
          return this.writeBuffer.slice(0, i);
        }
        payloadSize += 2;
      }
      return this.writeBuffer;
    }
    /**
     * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
     *
     * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
     * `write()` method then the message would not be buffered by the Socket.IO client.
     *
     * @return {boolean}
     * @private
     */
    /* private */
    _hasPingExpired() {
      if (!this._pingTimeoutTime)
        return true;
      const hasExpired = Date.now() > this._pingTimeoutTime;
      if (hasExpired) {
        this._pingTimeoutTime = 0;
        nextTick(() => {
          this._onClose("ping timeout");
        }, this.setTimeoutFn);
      }
      return hasExpired;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a message. Alias of {@link Socket#write}.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    send(msg, options, fn) {
      this._sendPacket("message", msg, options, fn);
      return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    _sendPacket(type, data, options, fn) {
      if ("function" === typeof data) {
        fn = data;
        data = void 0;
      }
      if ("function" === typeof options) {
        fn = options;
        options = null;
      }
      if ("closing" === this.readyState || "closed" === this.readyState) {
        return;
      }
      options = options || {};
      options.compress = false !== options.compress;
      const packet = {
        type,
        data,
        options
      };
      this.emitReserved("packetCreate", packet);
      this.writeBuffer.push(packet);
      if (fn)
        this.once("flush", fn);
      this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
      const close = () => {
        this._onClose("forced close");
        this.transport.close();
      };
      const cleanupAndClose = () => {
        this.off("upgrade", cleanupAndClose);
        this.off("upgradeError", cleanupAndClose);
        close();
      };
      const waitForUpgrade = () => {
        this.once("upgrade", cleanupAndClose);
        this.once("upgradeError", cleanupAndClose);
      };
      if ("opening" === this.readyState || "open" === this.readyState) {
        this.readyState = "closing";
        if (this.writeBuffer.length) {
          this.once("drain", () => {
            if (this.upgrading) {
              waitForUpgrade();
            } else {
              close();
            }
          });
        } else if (this.upgrading) {
          waitForUpgrade();
        } else {
          close();
        }
      }
      return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    _onError(err) {
      SocketWithoutUpgrade.priorWebsocketSuccess = false;
      if (this.opts.tryAllTransports && this.transports.length > 1 && this.readyState === "opening") {
        this.transports.shift();
        return this._open();
      }
      this.emitReserved("error", err);
      this._onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    _onClose(reason, description) {
      if ("opening" === this.readyState || "open" === this.readyState || "closing" === this.readyState) {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        this.transport.removeAllListeners("close");
        this.transport.close();
        this.transport.removeAllListeners();
        if (withEventListeners) {
          if (this._beforeunloadEventListener) {
            removeEventListener("beforeunload", this._beforeunloadEventListener, false);
          }
          if (this._offlineEventListener) {
            const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
            if (i !== -1) {
              OFFLINE_EVENT_LISTENERS.splice(i, 1);
            }
          }
        }
        this.readyState = "closed";
        this.id = null;
        this.emitReserved("close", reason, description);
        this.writeBuffer = [];
        this._prevBufferLen = 0;
      }
    }
  }
  SocketWithoutUpgrade.protocol = protocol$1;
  class SocketWithUpgrade extends SocketWithoutUpgrade {
    constructor() {
      super(...arguments);
      this._upgrades = [];
    }
    onOpen() {
      super.onOpen();
      if ("open" === this.readyState && this.opts.upgrade) {
        for (let i = 0; i < this._upgrades.length; i++) {
          this._probe(this._upgrades[i]);
        }
      }
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    _probe(name) {
      let transport = this.createTransport(name);
      let failed = false;
      SocketWithoutUpgrade.priorWebsocketSuccess = false;
      const onTransportOpen = () => {
        if (failed)
          return;
        transport.send([{ type: "ping", data: "probe" }]);
        transport.once("packet", (msg) => {
          if (failed)
            return;
          if ("pong" === msg.type && "probe" === msg.data) {
            this.upgrading = true;
            this.emitReserved("upgrading", transport);
            if (!transport)
              return;
            SocketWithoutUpgrade.priorWebsocketSuccess = "websocket" === transport.name;
            this.transport.pause(() => {
              if (failed)
                return;
              if ("closed" === this.readyState)
                return;
              cleanup();
              this.setTransport(transport);
              transport.send([{ type: "upgrade" }]);
              this.emitReserved("upgrade", transport);
              transport = null;
              this.upgrading = false;
              this.flush();
            });
          } else {
            const err = new Error("probe error");
            err.transport = transport.name;
            this.emitReserved("upgradeError", err);
          }
        });
      };
      function freezeTransport() {
        if (failed)
          return;
        failed = true;
        cleanup();
        transport.close();
        transport = null;
      }
      const onerror = (err) => {
        const error = new Error("probe error: " + err);
        error.transport = transport.name;
        freezeTransport();
        this.emitReserved("upgradeError", error);
      };
      function onTransportClose() {
        onerror("transport closed");
      }
      function onclose() {
        onerror("socket closed");
      }
      function onupgrade(to) {
        if (transport && to.name !== transport.name) {
          freezeTransport();
        }
      }
      const cleanup = () => {
        transport.removeListener("open", onTransportOpen);
        transport.removeListener("error", onerror);
        transport.removeListener("close", onTransportClose);
        this.off("close", onclose);
        this.off("upgrading", onupgrade);
      };
      transport.once("open", onTransportOpen);
      transport.once("error", onerror);
      transport.once("close", onTransportClose);
      this.once("close", onclose);
      this.once("upgrading", onupgrade);
      if (this._upgrades.indexOf("webtransport") !== -1 && name !== "webtransport") {
        this.setTimeoutFn(() => {
          if (!failed) {
            transport.open();
          }
        }, 200);
      } else {
        transport.open();
      }
    }
    onHandshake(data) {
      this._upgrades = this._filterUpgrades(data.upgrades);
      super.onHandshake(data);
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    _filterUpgrades(upgrades) {
      const filteredUpgrades = [];
      for (let i = 0; i < upgrades.length; i++) {
        if (~this.transports.indexOf(upgrades[i]))
          filteredUpgrades.push(upgrades[i]);
      }
      return filteredUpgrades;
    }
  }
  let Socket$1 = class Socket extends SocketWithUpgrade {
    constructor(uri, opts = {}) {
      const o = typeof uri === "object" ? uri : opts;
      if (!o.transports || o.transports && typeof o.transports[0] === "string") {
        o.transports = (o.transports || ["polling", "websocket", "webtransport"]).map((transportName) => transports[transportName]).filter((t2) => !!t2);
      }
      super(uri, o);
    }
  };
  function url(uri, path = "", loc) {
    let obj = uri;
    loc = loc || typeof location !== "undefined" && location;
    if (null == uri)
      uri = loc.protocol + "//" + loc.host;
    if (typeof uri === "string") {
      if ("/" === uri.charAt(0)) {
        if ("/" === uri.charAt(1)) {
          uri = loc.protocol + uri;
        } else {
          uri = loc.host + uri;
        }
      }
      if (!/^(https?|wss?):\/\//.test(uri)) {
        if ("undefined" !== typeof loc) {
          uri = loc.protocol + "//" + uri;
        } else {
          uri = "https://" + uri;
        }
      }
      obj = parse$1(uri);
    }
    if (!obj.port) {
      if (/^(http|ws)$/.test(obj.protocol)) {
        obj.port = "80";
      } else if (/^(http|ws)s$/.test(obj.protocol)) {
        obj.port = "443";
      }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    obj.href = obj.protocol + "://" + host + (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
  }
  const withNativeArrayBuffer = typeof ArrayBuffer === "function";
  const isView = (obj) => {
    return typeof ArrayBuffer.isView === "function" ? ArrayBuffer.isView(obj) : obj.buffer instanceof ArrayBuffer;
  };
  const toString = Object.prototype.toString;
  const withNativeBlob = typeof Blob === "function" || typeof Blob !== "undefined" && toString.call(Blob) === "[object BlobConstructor]";
  const withNativeFile = typeof File === "function" || typeof File !== "undefined" && toString.call(File) === "[object FileConstructor]";
  function isBinary(obj) {
    return withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj)) || withNativeBlob && obj instanceof Blob || withNativeFile && obj instanceof File;
  }
  function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
      return false;
    }
    if (Array.isArray(obj)) {
      for (let i = 0, l = obj.length; i < l; i++) {
        if (hasBinary(obj[i])) {
          return true;
        }
      }
      return false;
    }
    if (isBinary(obj)) {
      return true;
    }
    if (obj.toJSON && typeof obj.toJSON === "function" && arguments.length === 1) {
      return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
        return true;
      }
    }
    return false;
  }
  function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length;
    return { packet: pack, buffers };
  }
  function _deconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (isBinary(data)) {
      const placeholder = { _placeholder: true, num: buffers.length };
      buffers.push(data);
      return placeholder;
    } else if (Array.isArray(data)) {
      const newData = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        newData[i] = _deconstructPacket(data[i], buffers);
      }
      return newData;
    } else if (typeof data === "object" && !(data instanceof Date)) {
      const newData = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          newData[key] = _deconstructPacket(data[key], buffers);
        }
      }
      return newData;
    }
    return data;
  }
  function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments;
    return packet;
  }
  function _reconstructPacket(data, buffers) {
    if (!data)
      return data;
    if (data && data._placeholder === true) {
      const isIndexValid = typeof data.num === "number" && data.num >= 0 && data.num < buffers.length;
      if (isIndexValid) {
        return buffers[data.num];
      } else {
        throw new Error("illegal attachments");
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        data[i] = _reconstructPacket(data[i], buffers);
      }
    } else if (typeof data === "object") {
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          data[key] = _reconstructPacket(data[key], buffers);
        }
      }
    }
    return data;
  }
  const RESERVED_EVENTS$1 = [
    "connect",
    "connect_error",
    "disconnect",
    "disconnecting",
    "newListener",
    "removeListener"
    // used by the Node.js EventEmitter
  ];
  const protocol = 5;
  var PacketType;
  (function(PacketType2) {
    PacketType2[PacketType2["CONNECT"] = 0] = "CONNECT";
    PacketType2[PacketType2["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType2[PacketType2["EVENT"] = 2] = "EVENT";
    PacketType2[PacketType2["ACK"] = 3] = "ACK";
    PacketType2[PacketType2["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType2[PacketType2["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType2[PacketType2["BINARY_ACK"] = 6] = "BINARY_ACK";
  })(PacketType || (PacketType = {}));
  class Encoder {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
      this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
      if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
        if (hasBinary(obj)) {
          return this.encodeAsBinary({
            type: obj.type === PacketType.EVENT ? PacketType.BINARY_EVENT : PacketType.BINARY_ACK,
            nsp: obj.nsp,
            data: obj.data,
            id: obj.id
          });
        }
      }
      return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
      let str = "" + obj.type;
      if (obj.type === PacketType.BINARY_EVENT || obj.type === PacketType.BINARY_ACK) {
        str += obj.attachments + "-";
      }
      if (obj.nsp && "/" !== obj.nsp) {
        str += obj.nsp + ",";
      }
      if (null != obj.id) {
        str += obj.id;
      }
      if (null != obj.data) {
        str += JSON.stringify(obj.data, this.replacer);
      }
      return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
      const deconstruction = deconstructPacket(obj);
      const pack = this.encodeAsString(deconstruction.packet);
      const buffers = deconstruction.buffers;
      buffers.unshift(pack);
      return buffers;
    }
  }
  function isObject$1(value2) {
    return Object.prototype.toString.call(value2) === "[object Object]";
  }
  class Decoder extends Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
      super();
      this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
      let packet;
      if (typeof obj === "string") {
        if (this.reconstructor) {
          throw new Error("got plaintext data when reconstructing a packet");
        }
        packet = this.decodeString(obj);
        const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
        if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
          packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
          this.reconstructor = new BinaryReconstructor(packet);
          if (packet.attachments === 0) {
            super.emitReserved("decoded", packet);
          }
        } else {
          super.emitReserved("decoded", packet);
        }
      } else if (isBinary(obj) || obj.base64) {
        if (!this.reconstructor) {
          throw new Error("got binary data when not reconstructing a packet");
        } else {
          packet = this.reconstructor.takeBinaryData(obj);
          if (packet) {
            this.reconstructor = null;
            super.emitReserved("decoded", packet);
          }
        }
      } else {
        throw new Error("Unknown type: " + obj);
      }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
      let i = 0;
      const p = {
        type: Number(str.charAt(0))
      };
      if (PacketType[p.type] === void 0) {
        throw new Error("unknown packet type " + p.type);
      }
      if (p.type === PacketType.BINARY_EVENT || p.type === PacketType.BINARY_ACK) {
        const start = i + 1;
        while (str.charAt(++i) !== "-" && i != str.length) {
        }
        const buf = str.substring(start, i);
        if (buf != Number(buf) || str.charAt(i) !== "-") {
          throw new Error("Illegal attachments");
        }
        p.attachments = Number(buf);
      }
      if ("/" === str.charAt(i + 1)) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if ("," === c)
            break;
          if (i === str.length)
            break;
        }
        p.nsp = str.substring(start, i);
      } else {
        p.nsp = "/";
      }
      const next = str.charAt(i + 1);
      if ("" !== next && Number(next) == next) {
        const start = i + 1;
        while (++i) {
          const c = str.charAt(i);
          if (null == c || Number(c) != c) {
            --i;
            break;
          }
          if (i === str.length)
            break;
        }
        p.id = Number(str.substring(start, i + 1));
      }
      if (str.charAt(++i)) {
        const payload = this.tryParse(str.substr(i));
        if (Decoder.isPayloadValid(p.type, payload)) {
          p.data = payload;
        } else {
          throw new Error("invalid payload");
        }
      }
      return p;
    }
    tryParse(str) {
      try {
        return JSON.parse(str, this.reviver);
      } catch (e) {
        return false;
      }
    }
    static isPayloadValid(type, payload) {
      switch (type) {
        case PacketType.CONNECT:
          return isObject$1(payload);
        case PacketType.DISCONNECT:
          return payload === void 0;
        case PacketType.CONNECT_ERROR:
          return typeof payload === "string" || isObject$1(payload);
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          return Array.isArray(payload) && (typeof payload[0] === "number" || typeof payload[0] === "string" && RESERVED_EVENTS$1.indexOf(payload[0]) === -1);
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          return Array.isArray(payload);
      }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
      if (this.reconstructor) {
        this.reconstructor.finishedReconstruction();
        this.reconstructor = null;
      }
    }
  }
  class BinaryReconstructor {
    constructor(packet) {
      this.packet = packet;
      this.buffers = [];
      this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
      this.buffers.push(binData);
      if (this.buffers.length === this.reconPack.attachments) {
        const packet = reconstructPacket(this.reconPack, this.buffers);
        this.finishedReconstruction();
        return packet;
      }
      return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
      this.reconPack = null;
      this.buffers = [];
    }
  }
  const parser = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    Decoder,
    Encoder,
    get PacketType() {
      return PacketType;
    },
    protocol
  }, Symbol.toStringTag, { value: "Module" }));
  function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
      obj.off(ev, fn);
    };
  }
  const RESERVED_EVENTS = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1
  });
  class Socket extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
      super();
      this.connected = false;
      this.recovered = false;
      this.receiveBuffer = [];
      this.sendBuffer = [];
      this._queue = [];
      this._queueSeq = 0;
      this.ids = 0;
      this.acks = {};
      this.flags = {};
      this.io = io;
      this.nsp = nsp;
      if (opts && opts.auth) {
        this.auth = opts.auth;
      }
      this._opts = Object.assign({}, opts);
      if (this.io._autoConnect)
        this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:129',socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:133',socket.disconnected); // true
     * });
     */
    get disconnected() {
      return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
      if (this.subs)
        return;
      const io = this.io;
      this.subs = [
        on(io, "open", this.onopen.bind(this)),
        on(io, "packet", this.onpacket.bind(this)),
        on(io, "error", this.onerror.bind(this)),
        on(io, "close", this.onclose.bind(this))
      ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * __f__('log','at node_modules/socket.io-client/build/esm/socket.js:161',socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     __f__('log','at node_modules/socket.io-client/build/esm/socket.js:166',socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:169',socket.active); // true
     * });
     */
    get active() {
      return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
      if (this.connected)
        return this;
      this.subEvents();
      if (!this.io["_reconnecting"])
        this.io.open();
      if ("open" === this.io._readyState)
        this.onopen();
      return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
      return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
      args.unshift("message");
      this.emit.apply(this, args);
      return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
      var _a, _b, _c;
      if (RESERVED_EVENTS.hasOwnProperty(ev)) {
        throw new Error('"' + ev.toString() + '" is a reserved event name');
      }
      args.unshift(ev);
      if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
        this._addToQueue(args);
        return this;
      }
      const packet = {
        type: PacketType.EVENT,
        data: args
      };
      packet.options = {};
      packet.options.compress = this.flags.compress !== false;
      if ("function" === typeof args[args.length - 1]) {
        const id = this.ids++;
        const ack = args.pop();
        this._registerAckCallback(id, ack);
        packet.id = id;
      }
      const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
      const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
      const discardPacket = this.flags.volatile && !isTransportWritable;
      if (discardPacket)
        ;
      else if (isConnected) {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      } else {
        this.sendBuffer.push(packet);
      }
      this.flags = {};
      return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
      var _a;
      const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
      if (timeout === void 0) {
        this.acks[id] = ack;
        return;
      }
      const timer = this.io.setTimeoutFn(() => {
        delete this.acks[id];
        for (let i = 0; i < this.sendBuffer.length; i++) {
          if (this.sendBuffer[i].id === id) {
            this.sendBuffer.splice(i, 1);
          }
        }
        ack.call(this, new Error("operation has timed out"));
      }, timeout);
      const fn = (...args) => {
        this.io.clearTimeoutFn(timer);
        ack.apply(this, args);
      };
      fn.withError = true;
      this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
      return new Promise((resolve, reject) => {
        const fn = (arg1, arg2) => {
          return arg1 ? reject(arg1) : resolve(arg2);
        };
        fn.withError = true;
        args.push(fn);
        this.emit(ev, ...args);
      });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
      let ack;
      if (typeof args[args.length - 1] === "function") {
        ack = args.pop();
      }
      const packet = {
        id: this._queueSeq++,
        tryCount: 0,
        pending: false,
        args,
        flags: Object.assign({ fromQueue: true }, this.flags)
      };
      args.push((err, ...responseArgs) => {
        if (packet !== this._queue[0]) {
          return;
        }
        const hasError = err !== null;
        if (hasError) {
          if (packet.tryCount > this._opts.retries) {
            this._queue.shift();
            if (ack) {
              ack(err);
            }
          }
        } else {
          this._queue.shift();
          if (ack) {
            ack(null, ...responseArgs);
          }
        }
        packet.pending = false;
        return this._drainQueue();
      });
      this._queue.push(packet);
      this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
      if (!this.connected || this._queue.length === 0) {
        return;
      }
      const packet = this._queue[0];
      if (packet.pending && !force) {
        return;
      }
      packet.pending = true;
      packet.tryCount++;
      this.flags = packet.flags;
      this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
      packet.nsp = this.nsp;
      this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
      if (typeof this.auth == "function") {
        this.auth((data) => {
          this._sendConnectPacket(data);
        });
      } else {
        this._sendConnectPacket(this.auth);
      }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
      this.packet({
        type: PacketType.CONNECT,
        data: this._pid ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data) : data
      });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
      if (!this.connected) {
        this.emitReserved("connect_error", err);
      }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
      this.connected = false;
      delete this.id;
      this.emitReserved("disconnect", reason, description);
      this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
      Object.keys(this.acks).forEach((id) => {
        const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
        if (!isBuffered) {
          const ack = this.acks[id];
          delete this.acks[id];
          if (ack.withError) {
            ack.call(this, new Error("socket has been disconnected"));
          }
        }
      });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
      const sameNamespace = packet.nsp === this.nsp;
      if (!sameNamespace)
        return;
      switch (packet.type) {
        case PacketType.CONNECT:
          if (packet.data && packet.data.sid) {
            this.onconnect(packet.data.sid, packet.data.pid);
          } else {
            this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
          }
          break;
        case PacketType.EVENT:
        case PacketType.BINARY_EVENT:
          this.onevent(packet);
          break;
        case PacketType.ACK:
        case PacketType.BINARY_ACK:
          this.onack(packet);
          break;
        case PacketType.DISCONNECT:
          this.ondisconnect();
          break;
        case PacketType.CONNECT_ERROR:
          this.destroy();
          const err = new Error(packet.data.message);
          err.data = packet.data.data;
          this.emitReserved("connect_error", err);
          break;
      }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
      const args = packet.data || [];
      if (null != packet.id) {
        args.push(this.ack(packet.id));
      }
      if (this.connected) {
        this.emitEvent(args);
      } else {
        this.receiveBuffer.push(Object.freeze(args));
      }
    }
    emitEvent(args) {
      if (this._anyListeners && this._anyListeners.length) {
        const listeners = this._anyListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, args);
        }
      }
      super.emit.apply(this, args);
      if (this._pid && args.length && typeof args[args.length - 1] === "string") {
        this._lastOffset = args[args.length - 1];
      }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
      const self2 = this;
      let sent = false;
      return function(...args) {
        if (sent)
          return;
        sent = true;
        self2.packet({
          type: PacketType.ACK,
          id,
          data: args
        });
      };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
      const ack = this.acks[packet.id];
      if (typeof ack !== "function") {
        return;
      }
      delete this.acks[packet.id];
      if (ack.withError) {
        packet.data.unshift(null);
      }
      ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
      this.id = id;
      this.recovered = pid && this._pid === pid;
      this._pid = pid;
      this.connected = true;
      this.emitBuffered();
      this.emitReserved("connect");
      this._drainQueue(true);
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
      this.receiveBuffer.forEach((args) => this.emitEvent(args));
      this.receiveBuffer = [];
      this.sendBuffer.forEach((packet) => {
        this.notifyOutgoingListeners(packet);
        this.packet(packet);
      });
      this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
      this.destroy();
      this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
      if (this.subs) {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs = void 0;
      }
      this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // __f__('log','at node_modules/socket.io-client/build/esm/socket.js:643',reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
      if (this.connected) {
        this.packet({ type: PacketType.DISCONNECT });
      }
      this.destroy();
      if (this.connected) {
        this.onclose("io client disconnect");
      }
      return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
      return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
      this.flags.compress = compress;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
      this.flags.volatile = true;
      return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
      this.flags.timeout = timeout;
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:719',`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:735',`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
      this._anyListeners = this._anyListeners || [];
      this._anyListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:750',`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
      if (!this._anyListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
      return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:796',`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.push(listener);
      return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:814',`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
      this._anyOutgoingListeners = this._anyOutgoingListeners || [];
      this._anyOutgoingListeners.unshift(listener);
      return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   __f__('log','at node_modules/socket.io-client/build/esm/socket.js:829',`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
      if (!this._anyOutgoingListeners) {
        return this;
      }
      if (listener) {
        const listeners = this._anyOutgoingListeners;
        for (let i = 0; i < listeners.length; i++) {
          if (listener === listeners[i]) {
            listeners.splice(i, 1);
            return this;
          }
        }
      } else {
        this._anyOutgoingListeners = [];
      }
      return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
      return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
      if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
        const listeners = this._anyOutgoingListeners.slice();
        for (const listener of listeners) {
          listener.apply(this, packet.data);
        }
      }
    }
  }
  function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 1e4;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }
  Backoff.prototype.duration = function() {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var rand = Math.random();
      var deviation = Math.floor(rand * this.jitter * ms);
      ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
  };
  Backoff.prototype.reset = function() {
    this.attempts = 0;
  };
  Backoff.prototype.setMin = function(min) {
    this.ms = min;
  };
  Backoff.prototype.setMax = function(max) {
    this.max = max;
  };
  Backoff.prototype.setJitter = function(jitter) {
    this.jitter = jitter;
  };
  class Manager extends Emitter {
    constructor(uri, opts) {
      var _a;
      super();
      this.nsps = {};
      this.subs = [];
      if (uri && "object" === typeof uri) {
        opts = uri;
        uri = void 0;
      }
      opts = opts || {};
      opts.path = opts.path || "/socket.io";
      this.opts = opts;
      installTimerFunctions(this, opts);
      this.reconnection(opts.reconnection !== false);
      this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
      this.reconnectionDelay(opts.reconnectionDelay || 1e3);
      this.reconnectionDelayMax(opts.reconnectionDelayMax || 5e3);
      this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
      this.backoff = new Backoff({
        min: this.reconnectionDelay(),
        max: this.reconnectionDelayMax(),
        jitter: this.randomizationFactor()
      });
      this.timeout(null == opts.timeout ? 2e4 : opts.timeout);
      this._readyState = "closed";
      this.uri = uri;
      const _parser = opts.parser || parser;
      this.encoder = new _parser.Encoder();
      this.decoder = new _parser.Decoder();
      this._autoConnect = opts.autoConnect !== false;
      if (this._autoConnect)
        this.open();
    }
    reconnection(v) {
      if (!arguments.length)
        return this._reconnection;
      this._reconnection = !!v;
      if (!v) {
        this.skipReconnect = true;
      }
      return this;
    }
    reconnectionAttempts(v) {
      if (v === void 0)
        return this._reconnectionAttempts;
      this._reconnectionAttempts = v;
      return this;
    }
    reconnectionDelay(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelay;
      this._reconnectionDelay = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
      return this;
    }
    randomizationFactor(v) {
      var _a;
      if (v === void 0)
        return this._randomizationFactor;
      this._randomizationFactor = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
      return this;
    }
    reconnectionDelayMax(v) {
      var _a;
      if (v === void 0)
        return this._reconnectionDelayMax;
      this._reconnectionDelayMax = v;
      (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
      return this;
    }
    timeout(v) {
      if (!arguments.length)
        return this._timeout;
      this._timeout = v;
      return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
      if (!this._reconnecting && this._reconnection && this.backoff.attempts === 0) {
        this.reconnect();
      }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
      if (~this._readyState.indexOf("open"))
        return this;
      this.engine = new Socket$1(this.uri, this.opts);
      const socket = this.engine;
      const self2 = this;
      this._readyState = "opening";
      this.skipReconnect = false;
      const openSubDestroy = on(socket, "open", function() {
        self2.onopen();
        fn && fn();
      });
      const onError = (err) => {
        this.cleanup();
        this._readyState = "closed";
        this.emitReserved("error", err);
        if (fn) {
          fn(err);
        } else {
          this.maybeReconnectOnOpen();
        }
      };
      const errorSub = on(socket, "error", onError);
      if (false !== this._timeout) {
        const timeout = this._timeout;
        const timer = this.setTimeoutFn(() => {
          openSubDestroy();
          onError(new Error("timeout"));
          socket.close();
        }, timeout);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
      this.subs.push(openSubDestroy);
      this.subs.push(errorSub);
      return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
      return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
      this.cleanup();
      this._readyState = "open";
      this.emitReserved("open");
      const socket = this.engine;
      this.subs.push(
        on(socket, "ping", this.onping.bind(this)),
        on(socket, "data", this.ondata.bind(this)),
        on(socket, "error", this.onerror.bind(this)),
        on(socket, "close", this.onclose.bind(this)),
        // @ts-ignore
        on(this.decoder, "decoded", this.ondecoded.bind(this))
      );
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
      this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
      try {
        this.decoder.add(data);
      } catch (e) {
        this.onclose("parse error", e);
      }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
      nextTick(() => {
        this.emitReserved("packet", packet);
      }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
      this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
      let socket = this.nsps[nsp];
      if (!socket) {
        socket = new Socket(this, nsp, opts);
        this.nsps[nsp] = socket;
      } else if (this._autoConnect && !socket.active) {
        socket.connect();
      }
      return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
      const nsps = Object.keys(this.nsps);
      for (const nsp of nsps) {
        const socket2 = this.nsps[nsp];
        if (socket2.active) {
          return;
        }
      }
      this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
      const encodedPackets = this.encoder.encode(packet);
      for (let i = 0; i < encodedPackets.length; i++) {
        this.engine.write(encodedPackets[i], packet.options);
      }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
      this.subs.forEach((subDestroy) => subDestroy());
      this.subs.length = 0;
      this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
      this.skipReconnect = true;
      this._reconnecting = false;
      this.onclose("forced close");
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
      return this._close();
    }
    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    onclose(reason, description) {
      var _a;
      this.cleanup();
      (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
      this.backoff.reset();
      this._readyState = "closed";
      this.emitReserved("close", reason, description);
      if (this._reconnection && !this.skipReconnect) {
        this.reconnect();
      }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
      if (this._reconnecting || this.skipReconnect)
        return this;
      const self2 = this;
      if (this.backoff.attempts >= this._reconnectionAttempts) {
        this.backoff.reset();
        this.emitReserved("reconnect_failed");
        this._reconnecting = false;
      } else {
        const delay = this.backoff.duration();
        this._reconnecting = true;
        const timer = this.setTimeoutFn(() => {
          if (self2.skipReconnect)
            return;
          this.emitReserved("reconnect_attempt", self2.backoff.attempts);
          if (self2.skipReconnect)
            return;
          self2.open((err) => {
            if (err) {
              self2._reconnecting = false;
              self2.reconnect();
              this.emitReserved("reconnect_error", err);
            } else {
              self2.onreconnect();
            }
          });
        }, delay);
        if (this.opts.autoUnref) {
          timer.unref();
        }
        this.subs.push(() => {
          this.clearTimeoutFn(timer);
        });
      }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
      const attempt = this.backoff.attempts;
      this._reconnecting = false;
      this.backoff.reset();
      this.emitReserved("reconnect", attempt);
    }
  }
  const cache = {};
  function lookup(uri, opts) {
    if (typeof uri === "object") {
      opts = uri;
      uri = void 0;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew || opts["force new connection"] || false === opts.multiplex || sameNamespace;
    let io;
    if (newConnection) {
      io = new Manager(source, opts);
    } else {
      if (!cache[id]) {
        cache[id] = new Manager(source, opts);
      }
      io = cache[id];
    }
    if (parsed.query && !opts.query) {
      opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
  }
  Object.assign(lookup, {
    Manager,
    Socket,
    io: lookup,
    connect: lookup
  });
  class SocketIOService {
    /**
      * @param {Object} options - 配置选项
      * @param {string} options.url - 服务器地址
      * @param {string} [options.path='/socket.io'] - Socket.IO路径
      * @param {boolean} [options.autoConnect=true] - 是否自动连接
      * @param {Object} [options.auth] - 认证信息
      * @param {number} [options.reconnectionDelay=1000] - 重连延迟(ms)
      * @param {number} [options.pingTimeout=20000] - 心跳超时(ms)
      */
    constructor(options) {
      this.defaultOptions = {
        path: "",
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1e3,
        reconnectionDelayMax: 5e3,
        randomizationFactor: 0.5,
        timeout: 2e4,
        transports: ["websocket"],
        pingTimeout: 2e4,
        pingInterval: 25e3,
        ...options
      };
      this.socket = null;
      this.eventListeners = /* @__PURE__ */ new Map();
      this.connected = false;
      this.reconnectTimer = null;
      this.pingCheckTimer = null;
      this._log("初始化配置:", this.defaultOptions);
    }
    /**
     * 更新认证信息
     * @param {String|Object} [auth] - 动态认证信息
     */
    updateAuth(token) {
      this.defaultOptions.auth.token = token;
      if (this.socket) {
        this.socket.auth = { token };
        this.socket.io.opts.query = { token };
      }
    }
    /**
     * 初始化Socket连接
     * @param {String|Object} [auth] - 动态认证信息
     * @returns {Promise<void>}
     */
    connect(auth) {
      return new Promise((resolve, reject) => {
        if (this.socket && this.connected) {
          this._log("已连接，跳过重复连接");
          return resolve();
        }
        const normalizedAuth = this.normalizeAuth(auth);
        const token = normalizedAuth.token;
        const finalOptions = {
          ...this.defaultOptions,
          auth: normalizedAuth,
          query: { token },
          transportOptions: {
            polling: {
              extraHeaders: {
                Authorization: `Bearer ${normalizedAuth.token}`
              }
            }
          }
        };
        this._log("正在建立连接，完整参数:", finalOptions);
        this.socket = lookup(finalOptions.url, finalOptions);
        this.socket.on("connect", () => {
          this.connected = true;
          this._log(`✅ 连接成功 (ID: ${this.socket.id})`);
          this._startPingCheck();
          resolve();
          this._emitEvent("connect");
          this.emit("test_event", { content: "测试连接" });
        });
        this.socket.on("connect_error", (error) => {
          this._log(`❌ 连接失败: ${error.message}`, error);
          this._emitEvent("connect_error", error);
          reject(error);
        });
        this.socket.on("disconnect", (reason) => {
          this.connected = false;
          this._log(`⚠️ 连接断开: ${reason}`);
          this._stopPingCheck();
          this._emitEvent("disconnect", reason);
        });
        this.socket.on("reconnect_attempt", (attempt) => {
          formatAppLog("log", "at utils/socket_io.js:116", `[SocketIO] 第 ${attempt} 次重连尝试`);
          this._emitEvent("reconnecting", attempt);
        });
        this.socket.onAny((event, ...args) => {
          this._emitEvent(event, ...args);
        });
      });
    }
    /**
     * 断开连接
     */
    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
        this._cleanup();
        this.connected = false;
      }
    }
    /**
     * 发送消息
     * @param {string} event - 事件名称
     * @param {any} data - 发送数据
     * @param {Object} [options] - 选项
     * @param {number} [options.timeout=30000] - 超时时间(ms)
     * @returns {Promise<any>}
     */
    emit(event, data, options = {}) {
      return new Promise((resolve, reject) => {
        if (!this.socket || !this.connected) {
          reject(new Error("Socket is not connected"));
          return;
        }
        const timeout = options.timeout || 3e4;
        const timeoutId = setTimeout(() => {
          reject(new Error(`Request timeout after ${timeout}ms`));
        }, timeout);
        this.socket.emit(event, data, (response) => {
          clearTimeout(timeoutId);
          if (response == null ? void 0 : response.error) {
            const err = new Error(response.message || "Server error");
            err.code = response.code;
            reject(err);
          } else {
            resolve(response);
          }
        });
      });
    }
    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
      formatAppLog("log", "at utils/socket_io.js:178", "register", event);
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, /* @__PURE__ */ new Set());
      }
      this.eventListeners.get(event).add(callback);
      if (this.socket) {
        this.socket.on(event, callback);
      }
    }
    /**
    * 取消监听
    * @param {string} event - 事件名称
    * @param {Function} [callback] - 回调函数(不传则移除所有监听)
    */
    off(event, callback) {
      if (!this.eventListeners.has(event))
        return;
      if (callback) {
        this.eventListeners.get(event).delete(callback);
        if (this.socket) {
          this.socket.off(event, callback);
        }
      } else {
        this.eventListeners.get(event).forEach((cb) => {
          if (this.socket) {
            this.socket.off(event, cb);
          }
        });
        this.eventListeners.delete(event);
      }
    }
    /* 私有方法 */
    _emitEvent(event, ...args) {
      if (this.eventListeners.has(event)) {
        this.eventListeners.get(event).forEach((cb) => {
          try {
            formatAppLog("log", "at utils/socket_io.js:218", "调用事件监听函数");
            cb(...args);
          } catch (err) {
            formatAppLog("error", "at utils/socket_io.js:221", `[SocketIO] 事件处理错误 (${event}):`, err);
          }
        });
      }
    }
    _startPingCheck() {
      this._stopPingCheck();
      this.pingCheckTimer = setInterval(() => {
        var _a, _b, _c;
        if (!this.connected)
          return;
        const now = Date.now();
        const lastPing = ((_b = (_a = this.socket) == null ? void 0 : _a.io) == null ? void 0 : _b.lastPing) || now;
        if (now - lastPing > this.defaultOptions.pingTimeout) {
          formatAppLog("warn", "at utils/socket_io.js:236", "[SocketIO] 心跳检测失败，主动断开连接");
          (_c = this.socket) == null ? void 0 : _c.disconnect();
        }
      }, this.defaultOptions.pingTimeout / 2);
    }
    _stopPingCheck() {
      if (this.pingCheckTimer) {
        clearInterval(this.pingCheckTimer);
        this.pingCheckTimer = null;
      }
    }
    _cleanup() {
      this._stopPingCheck();
      this.connected = false;
      this.eventListeners.clear();
      this.socket = null;
    }
    _log(message, ...args) {
      formatAppLog("log", "at utils/socket_io.js:257", `[SocketIO][${(/* @__PURE__ */ new Date()).toISOString()}] ${message}`, ...args);
    }
    /**
     * 标准化认证信息
     * @param {string|Object} auth 
     * @returns {Object} 标准化的auth对象
     */
    normalizeAuth(auth) {
      if (!auth)
        return { token: "" };
      if (typeof auth === "string") {
        return { token: auth };
      }
      if (typeof auth === "object" && auth.token) {
        return auth;
      }
      formatAppLog("warn", "at utils/socket_io.js:276", "无效的auth参数，使用默认空token");
      return { token: "" };
    }
  }
  const SocketService = new SocketIOService({
    url: `${config$1.SOCKET_URL}`,
    auth: {
      token: uni.getStorageSync("token")
    }
  });
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main$m = {
    data() {
      return {
        credentials: {
          username: "",
          password: ""
        },
        showWelcome: true,
        loading: false
      };
    },
    mounted() {
      setTimeout(() => {
        this.showWelcome = false;
      }, 500);
    },
    methods: {
      login() {
        if (!this.credentials.username || !this.credentials.password) {
          uni.showToast({
            title: "用户名和密码不能为空",
            icon: "none"
          });
          return;
        }
        uni.showLoading({ title: "登录中...", mask: true });
        authApi.login({
          username: this.credentials.username,
          password: this.credentials.password
        }).then((res2) => {
          formatAppLog("log", "at pages/index/login.vue:78", "登陆成功", res2);
          uni.setStorageSync("access_token", res2.data.access_token);
          uni.setStorageSync("user_info", res2.data.user);
          formatAppLog("log", "at pages/index/login.vue:83", "user_info", uni.getStorageSync("user_info"));
          SocketService.connect(res2.data.access_token).then(() => formatAppLog("log", "at pages/index/login.vue:87", "连接成功")).catch((err) => formatAppLog("error", "at pages/index/login.vue:88", "连接失败:", err));
        }).then(() => {
          this.goToHome();
        }).catch((err) => {
          var _a;
          formatAppLog("log", "at pages/index/login.vue:94", "登陆失败：", err);
          uni.showToast({
            title: ((_a = err.data) == null ? void 0 : _a.message) || "登录失败",
            icon: "none"
          });
        }).finally(() => {
          uni.hideLoading();
        });
      },
      goToRegister() {
        uni.navigateTo({
          url: "/pages/index/register"
        });
      },
      goToHome() {
        uni.navigateTo({
          url: "/pages/index/home"
        });
      }
    }
  };
  function _sfc_render$l(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("div", null, [
      vue.createCommentVNode(" 欢迎界面 "),
      $data.showWelcome ? (vue.openBlock(), vue.createElementBlock("div", {
        key: 0,
        class: "welcome-screen"
      })) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 登录界面 "),
      !$data.showWelcome ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "container"
      }, [
        vue.createElementVNode("view", { class: "card" }, [
          vue.createElementVNode("view", { class: "card-title" }, "用户登录"),
          vue.createElementVNode("view", { class: "card-body" }, [
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.credentials.username = $event),
                  placeholder: "请输入用户名",
                  type: "text",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.credentials.username]
              ])
            ]),
            vue.createElementVNode("view", { class: "input-group" }, [
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.credentials.password = $event),
                  placeholder: "请输入密码",
                  type: "password",
                  class: "input"
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, $data.credentials.password]
              ])
            ]),
            vue.createElementVNode("view", { class: "button-group" }, [
              vue.createElementVNode("button", {
                class: "primary-button",
                onClick: _cache[2] || (_cache[2] = (...args) => $options.login && $options.login(...args))
              }, "登录")
            ]),
            vue.createElementVNode("view", { class: "register-link" }, [
              vue.createElementVNode("button", {
                class: "default-button",
                onClick: _cache[3] || (_cache[3] = (...args) => $options.goToRegister && $options.goToRegister(...args))
              }, "没有账号？去注册")
            ])
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesIndexLogin = /* @__PURE__ */ _export_sfc(_sfc_main$m, [["render", _sfc_render$l], ["__scopeId", "data-v-fa14255b"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/login.vue"]]);
  const _imports_0$4 = "/static/car-icon.png";
  const _imports_1$5 = "/static/launch-icon.png";
  const _imports_2$3 = "/static/chatlist.png";
  const _imports_3$2 = "/static/person-icon.png";
  const _imports_4$1 = "/static/manage-icon.png";
  const _sfc_main$l = {
    data() {
      return {
        is_manager: 0
        // 默认值为 0
      };
    },
    computed: {
      isManager() {
        return this.is_manager === 1;
      }
    },
    created() {
      const user_info = uni.getStorageSync("user_info");
      this.is_manager = user_info.is_manager ? 1 : 0;
    },
    methods: {
      home() {
        uni.navigateTo({
          url: "/pages/index/home"
          // 登录成功后的跳转
        });
      },
      launch() {
        uni.navigateTo({
          url: "/pages/index/order_launch"
          // 跳转到注册页面
        });
      },
      person() {
        uni.navigateTo({
          url: "/pages/index/person"
          // 登录成功后的跳转
        });
      },
      manage() {
        uni.navigateTo({
          url: "/pages/index/manage"
          // 跳转到管理页面
        });
      },
      chatlist() {
        uni.navigateTo({
          url: "/pages/index/chatlist"
          // 跳转到聊天列表页面
        });
      }
    }
  };
  function _sfc_render$k(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("div", { class: "nav-bar" }, [
      vue.createElementVNode("div", { class: "icon-container" }, [
        vue.createElementVNode("image", {
          src: _imports_0$4,
          class: "icon",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.home && $options.home(...args))
        }),
        vue.createElementVNode("image", {
          src: _imports_1$5,
          class: "icon",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.launch && $options.launch(...args))
        }),
        vue.createElementVNode("image", {
          src: _imports_2$3,
          class: "icon",
          onClick: _cache[2] || (_cache[2] = (...args) => $options.chatlist && $options.chatlist(...args))
        }),
        vue.createElementVNode("image", {
          src: _imports_3$2,
          class: "icon",
          onClick: _cache[3] || (_cache[3] = (...args) => $options.person && $options.person(...args))
        }),
        vue.createCommentVNode(" 根据 isManager 显示或隐藏 manage-icon "),
        $options.isManager ? (vue.openBlock(), vue.createElementBlock("image", {
          key: 0,
          src: _imports_4$1,
          class: "icon",
          onClick: _cache[4] || (_cache[4] = (...args) => $options.manage && $options.manage(...args))
        })) : vue.createCommentVNode("v-if", true)
      ])
    ]);
  }
  const NavigationBar = /* @__PURE__ */ _export_sfc(_sfc_main$l, [["render", _sfc_render$k], ["__scopeId", "data-v-e29e7744"], ["__file", "E:/Projects/SE/ride-sharing-se/components/NavigationBar.vue"]]);
  const fetchUserBaseInfo = () => {
    return get(`/user/basic`).then((res2) => {
      return {
        ...res2.data,
        age: typeof res2.data.age === "number" ? res2.data.age : null,
        avatar: res2.data.avatar || getDefaultAvatar()
      };
    });
  };
  const fetchUserModifiableData = () => {
    return get(`/user/modifiable_data`).then((res2) => {
      formatAppLog("log", "at api/user.js:39", res2.data);
      return {
        ...res2.data,
        avatar: res2.data.avatar || getDefaultAvatar()
      };
    });
  };
  const fetchCars = () => {
    return get("/user/cars");
  };
  const updateUserInfo = (data) => {
    return post("/user/update", data, {
      showLoading: true,
      loadingText: "正在更新用户信息..."
    });
  };
  const uploadUserAvatar = (userId, base64Data) => {
    return post(`/user/upload_avatar/${userId}`, {
      base64_data: base64Data
    }, {
      showLoading: true,
      loadingText: "正在上传头像..."
    });
  };
  const fetchUserAvatar = () => {
    formatAppLog("log", "at api/user.js:90", "获取头像");
    return get(`/user/avatar`).then((res2) => {
      if (!res2 || !res2.data) {
        formatAppLog("error", "at api/user.js:93", "Invalid data received for user avatar:", res2);
        return getUserDefaultAvatar();
      }
      return res2.data.avatar_url || getUserDefaultAvatar();
    }).catch((error) => {
      formatAppLog("error", "at api/user.js:98", "Error fetching user avatar:", error);
      return getUserDefaultAvatar();
    });
  };
  const fetchBasicUserInfo = () => {
    return get("/user/basic");
  };
  const getUserDefaultAvatar = () => {
    return "../../static/user.jpeg";
  };
  const fetchUserConversations = () => {
    return get("/chat/conversations").then((res2) => {
      formatAppLog("log", "at api/chat.js:12", "后端原始数据", res2);
      return res2.data.map((conversation) => {
        var _a;
        return {
          id: conversation.conversation_id,
          type: conversation.type || "private",
          title: conversation.title || "",
          tripId: conversation.trip_id || null,
          lastMessage: conversation.last_message || null,
          lastMessageTime: conversation.last_message_time ? new Date(conversation.last_message_time) : null,
          unreadCount: conversation.unread_count || 0,
          participants: ((_a = conversation.participants) == null ? void 0 : _a.map((p) => ({
            userId: p.user_id,
            username: p.username || "",
            avatar: p.avatar || getUserDefaultAvatar()
          }))) || []
        };
      });
    });
  };
  const fetchConversationMessages = async (conversationId, params = {}) => {
    return get(`/chat/conversations/${conversationId}/messages`).then((res2) => {
      formatAppLog("log", "at api/chat.js:41", "后端原始数据", res2);
      return res2;
    });
  };
  function sendMessage(conversationId, content, type = "text") {
    SocketService.emit("send_message", {
      conversationId,
      content,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  SocketService.on("private_message", (data) => {
    formatAppLog("log", "at api/chat.js:55", `收到来自${data.from}的消息：${data.content}`);
  });
  const _imports_1$4 = "/static/empty.png";
  const _sfc_main$k = {
    components: {
      NavigationBar
    },
    data() {
      return {
        currentUser: {
          username: "测试者",
          avatar: "../../static/user_2.jpg"
        },
        ConversationList: [],
        // 会话列表 -- 从后端获取
        groupAvatarCache: {},
        // 缓存已生成的群聊头像
        processedListWithAvatars: []
        // 新增：存储已处理好的聊天列表
      };
    },
    computed: {
      username() {
        return this.currentUser.username;
      },
      avatar() {
        return this.currentUser.avatar;
      }
    },
    async created() {
      await this.fetchCurrentUser();
      await this.fetchConversationListData();
      await this.processConversationList();
    },
    methods: {
      async fetchCurrentUser() {
        fetchBasicUserInfo().then((res2) => {
          this.currentUser.username = res2.data.username;
          this.currentUser.avatar = res2.data.avatar;
        }).catch((err) => {
          formatAppLog("log", "at pages/index/chatlist.vue:95", "获取用户基本信息失败：", err);
        });
      },
      async fetchConversationListData() {
        try {
          const res2 = await fetchUserConversations();
          formatAppLog("log", "at pages/index/chatlist.vue:102", "会话列表数据:", res2);
          this.ConversationList = res2;
        } catch (err) {
          formatAppLog("log", "at pages/index/chatlist.vue:105", "获取用户会话列表失败：", err);
        }
      },
      async processConversationList() {
        var _a, _b, _c;
        try {
          const processed = [];
          const currentUserId = uni.getStorageSync("user_info").user_id;
          for (const conversation of this.ConversationList) {
            const processedConversation = {
              id: conversation.id || void 0,
              isGroup: conversation.type === "group",
              lastMessage: ((_a = conversation.lastMessage) == null ? void 0 : _a.content) || "",
              time: this.formatTime((_b = conversation.lastMessage) == null ? void 0 : _b.created_at),
              unreadCount: conversation.unreadCount || 0,
              tripId: conversation.tripId || null
            };
            if (!processedConversation.isGroup) {
              const isValidParticipant = (p) => (p == null ? void 0 : p.userId) && p.userId !== currentUserId;
              const otherParticipant = ((_c = conversation.participants) == null ? void 0 : _c.find(isValidParticipant)) || null;
              processedConversation.username = (otherParticipant == null ? void 0 : otherParticipant.realname) || (otherParticipant == null ? void 0 : otherParticipant.username) || "未知用户";
              processedConversation.avatar = (otherParticipant == null ? void 0 : otherParticipant.avatar) ? "data:image/jpeg;base64," + otherParticipant.avatar : "../../static/user.jpeg";
            } else {
              processedConversation.username = conversation.title || "群聊";
              const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
              const memberAvatars = participants.filter((p) => p).map((p) => ({
                avatar: p.avatar ? `data:image/jpeg;base64,${p.avatar}` : "../../static/user.jpeg"
              }));
              processedConversation.members = memberAvatars;
              try {
                processedConversation.avatar = memberAvatars.length > 0 ? await this.generateGroupAvatar(conversation.id, memberAvatars) : "../../static/default_group_avatar.png";
                formatAppLog("log", "at pages/index/chatlist.vue:153", processedConversation.avatar);
              } catch (e) {
                formatAppLog("error", "at pages/index/chatlist.vue:155", "生成群头像失败:", e);
                processedConversation.avatar = "../../static/default_group_avatar.png";
              }
            }
            processed.push(processedConversation);
          }
          ;
          processed.sort((a, b) => {
            var _a2, _b2;
            const timeA = new Date(((_a2 = a.lastMessage) == null ? void 0 : _a2.created_at) || 0).getTime();
            const timeB = new Date(((_b2 = b.lastMessage) == null ? void 0 : _b2.created_at) || 0).getTime();
            return timeB - timeA;
          });
          this.processedListWithAvatars = processed;
          formatAppLog("log", "at pages/index/chatlist.vue:171", "处理后的会话列表:", processed);
        } catch (err) {
          formatAppLog("error", "at pages/index/chatlist.vue:173", "处理会话列表失败:", err);
        }
      },
      async generateGroupAvatar(groupId, members) {
        if (this.groupAvatarCache[groupId]) {
          return this.groupAvatarCache[groupId];
        }
        const validAvatars = members.slice(0, 4).filter((member) => member == null ? void 0 : member.avatar).map((m) => m.avatar);
        if (validAvatars.length === 0) {
          const defaultAvatar = "../../static/default_group_avatar.png";
          this.groupAvatarCache[groupId] = defaultAvatar;
          return defaultAvatar;
        }
        if (validAvatars.length === 1) {
          this.groupAvatarCache[groupId] = avatars[0];
          return avatars[0];
        }
        try {
          const tempFilePath = await this.drawGroupAvatar(validAvatars);
          this.groupAvatarCache[groupId] = tempFilePath;
          return tempFilePath;
        } catch (error) {
          formatAppLog("error", "at pages/index/chatlist.vue:207", "生成群聊头像失败:", error);
          return "../../static/default_group_avatar.png";
        }
      },
      async drawGroupAvatar(avatarUrls) {
        return new Promise((resolve, reject) => {
          const ctx = uni.createCanvasContext("groupAvatarCanvas");
          const canvasWidth = 100;
          const canvasHeight = 100;
          const avatarCount = avatarUrls.length;
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.setFillStyle("#ffffff");
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          const drawPromises = [];
          if (avatarCount === 2) {
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth / 2, canvasHeight));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], canvasWidth / 2, 0, canvasWidth / 2, canvasHeight));
          } else if (avatarCount === 3) {
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth, canvasHeight / 2));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], 0, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[2], canvasWidth / 2, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2));
          } else if (avatarCount >= 4) {
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth / 2, canvasHeight / 2));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], canvasWidth / 2, 0, canvasWidth / 2, canvasHeight / 2));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[2], 0, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2));
            drawPromises.push(this.drawAvatar(ctx, avatarUrls[3], canvasWidth / 2, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2));
          }
          Promise.all(drawPromises).then(() => {
            ctx.draw(false, () => {
              uni.canvasToTempFilePath({
                canvasId: "groupAvatarCanvas",
                success: (res2) => {
                  resolve(res2.tempFilePath);
                },
                fail: (err) => {
                  formatAppLog("error", "at pages/index/chatlist.vue:251", "Canvas导出失败:", err);
                  reject(err);
                }
              });
            });
          });
        });
      },
      drawAvatar(ctx, avatarUrl, x, y, width, height) {
        return new Promise((resolve) => {
          uni.getImageInfo({
            src: avatarUrl,
            success: (res2) => {
              ctx.save();
              ctx.beginPath();
              const radius = Math.min(width, height) / 2;
              const centerX = x + width / 2;
              const centerY = y + height / 2;
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.drawImage(res2.path, x, y, width, height);
              ctx.restore();
              resolve();
            },
            fail: () => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(x + width / 2, y + height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              ctx.setFillStyle("#cccccc");
              ctx.fillRect(x, y, width, height);
              ctx.restore();
              resolve();
            }
          });
        });
      },
      goToChat(conversation) {
        uni.navigateTo({
          url: `/pages/index/chat?conversationId=${conversation.id}`,
          success: () => {
            formatAppLog("log", "at pages/index/chatlist.vue:301", "跳转成功");
          },
          fail: (err) => {
            formatAppLog("error", "at pages/index/chatlist.vue:304", "跳转失败:", err);
          }
        });
      },
      // 辅助函数：截断消息显示长度
      truncateMessage(text, maxLength = 15) {
        if (!text)
          return "";
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
      },
      // 辅助函数：格式化时间显示
      formatTime(timestamp) {
        if (!timestamp)
          return "";
        const now = /* @__PURE__ */ new Date();
        const date = new Date(timestamp);
        const diffDays = Math.floor((now - date) / (1e3 * 60 * 60 * 24));
        if (diffDays === 0) {
          return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays === 1) {
          return "昨天";
        } else if (diffDays < 7) {
          return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
        } else {
          return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        }
      }
    }
  };
  function _sfc_render$j(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createCommentVNode(" 添加一个外层容器专门用于背景色 "),
        vue.createElementVNode("view", { class: "page-container" }, [
          vue.createElementVNode("view", { class: "flex-col page" }, [
            vue.createVNode(_component_NavigationBar),
            vue.createElementVNode("view", {
              class: "flex-row align-items-center section",
              style: { "position": "relative", "height": "40px" }
            }, [
              vue.createElementVNode(
                "text",
                {
                  class: "font text ml-39-5",
                  style: { "color": "white", "font-size": "20px", "margin-left": "10px" }
                },
                vue.toDisplayString($options.username),
                1
                /* TEXT */
              ),
              vue.createElementVNode("image", {
                class: "avatar",
                src: $options.avatar,
                style: { "position": "absolute", "right": "20rpx", "height": "40px", "width": "40px" }
              }, null, 8, ["src"])
            ]),
            vue.createCommentVNode(" 聊天列表 "),
            vue.createElementVNode("scroll-view", {
              class: "chat-list",
              "scroll-y": "true"
            }, [
              vue.createElementVNode("view", { class: "chat-list-content" }, [
                vue.createCommentVNode(" 空状态提示 "),
                $data.processedListWithAvatars.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "empty-chat-tip"
                }, [
                  vue.createElementVNode("image", {
                    class: "empty-chat-icon",
                    src: _imports_1$4
                  }),
                  vue.createElementVNode("text", { class: "empty-chat-text" }, "暂无聊天记录"),
                  vue.createElementVNode("text", { class: "empty-chat-hint" }, "快去和司机/乘客聊聊吧")
                ])) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 聊天列表 "),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.processedListWithAvatars, (chat, index) => {
                    return vue.openBlock(), vue.createElementBlock("view", {
                      key: index,
                      class: "chat-item",
                      onClick: ($event) => $options.goToChat(chat)
                    }, [
                      vue.createElementVNode("image", {
                        class: "avatar",
                        src: chat.avatar || "../../static/user.jpeg"
                      }, null, 8, ["src"]),
                      vue.createElementVNode("view", { class: "chat-content" }, [
                        vue.createElementVNode("view", { class: "chat-header" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "username" },
                            vue.toDisplayString(chat.username),
                            1
                            /* TEXT */
                          ),
                          vue.createElementVNode(
                            "text",
                            { class: "time" },
                            vue.toDisplayString(chat.time),
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode("view", { class: "message-preview" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "message" },
                            vue.toDisplayString($options.truncateMessage(chat.lastMessage, 75)),
                            1
                            /* TEXT */
                          ),
                          chat.unreadCount > 0 ? (vue.openBlock(), vue.createElementBlock(
                            "text",
                            {
                              key: 0,
                              class: "unread-count"
                            },
                            vue.toDisplayString(chat.unreadCount),
                            1
                            /* TEXT */
                          )) : vue.createCommentVNode("v-if", true)
                        ])
                      ])
                    ], 8, ["onClick"]);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ]),
            vue.createCommentVNode(" 隐藏的Canvas用于生成群聊头像 "),
            vue.createElementVNode("canvas", {
              "canvas-id": "groupAvatarCanvas",
              style: { "position": "absolute", "left": "-9999px", "width": "100px", "height": "100px" }
            })
          ])
        ])
      ],
      2112
      /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
    );
  }
  const PagesIndexChatlist = /* @__PURE__ */ _export_sfc(_sfc_main$k, [["render", _sfc_render$j], ["__scopeId", "data-v-c2d98f75"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/chatlist.vue"]]);
  const _imports_4 = "/static/close.png";
  const _imports_1$3 = "/static/clock.png";
  const _imports_1$2 = "/static/start.png";
  const _imports_2$2 = "/static/dest.png";
  const _sfc_main$j = {
    props: {
      isVisible: {
        type: Boolean,
        default: true
      },
      username: {
        type: String,
        default: "测试者"
      },
      time: {
        type: String,
        default: "2025年3月24日13:49"
      },
      start_loc: {
        type: String,
        default: "同济大学（嘉定校区）"
      },
      dest_loc: {
        type: String,
        default: "同济大学（四平校区）"
      },
      username_2: {
        type: String,
        default: "JYD"
      },
      avatar_url: {
        type: String,
        default: "../static/user_2.jpg"
      },
      isUserInOrder: {
        type: Boolean,
        default: false
        // 判断用户是否已经在订单中
      }
    },
    data() {
      return {
        showVehiclePopup: false,
        // 控制车辆选择弹窗的显示
        selectedVehicle: null,
        // 用户选择的车辆
        vehicles: []
        // 用户的车辆列表
      };
    },
    methods: {
      closePopup() {
        this.$emit("close");
      },
      handleAcceptInvite() {
        if (this.username_2 === "乘客") {
          this.fetchUserVehicles();
          this.showVehiclePopup = true;
        } else {
          this.acceptInvite();
        }
      },
      fetchUserVehicles() {
        this.vehicles = [
          { id: 1, plate_number: "沪A12345" },
          { id: 2, plate_number: "沪B67890" }
        ];
      },
      confirmVehicleSelection() {
        if (!this.selectedVehicle) {
          uni.showToast({ title: "请选择车辆", icon: "none" });
          return;
        }
        this.acceptInvite();
        this.showVehiclePopup = false;
      },
      acceptInvite() {
        uni.showToast({
          title: "添加成功",
          icon: "success"
        });
        this.closePopup();
      }
    }
  };
  function _sfc_render$i(_ctx, _cache, $props, $setup, $data, $options) {
    return $props.isVisible ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "flex-col justify-center items-center page-overlay"
    }, [
      vue.createElementVNode("view", { class: "flex-col section" }, [
        vue.createElementVNode("image", {
          class: "self-start image_2",
          src: _imports_4,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.closePopup && $options.closePopup(...args))
        }),
        vue.createElementVNode("view", { class: "flex-col group" }, [
          vue.createElementVNode("view", { class: "flex-col justify-between self-stretch" }, [
            vue.createElementVNode("image", {
              class: "avatar",
              src: $props.avatar_url
            }, null, 8, ["src"])
          ]),
          vue.createElementVNode(
            "text",
            { class: "self-start text mt-28-5" },
            vue.toDisplayString($props.username) + "发起的拼车邀约",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "flex-col mt-37-5" }, [
          vue.createElementVNode("view", { class: "flex-col self-stretch relative section_2" }, [
            vue.createElementVNode("view", {
              class: "flex-row justify-center items-center self-start relative group_2",
              style: { "width": "270px", "margin-left": "0px" }
            }, [
              vue.createElementVNode("image", {
                class: "image_3",
                src: _imports_1$3
              }),
              vue.createElementVNode(
                "text",
                {
                  class: "font text_2",
                  style: { "margin-left": "10px" }
                },
                vue.toDisplayString($props.time),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "flex-row items-center self-stretch group_3" }, [
              vue.createElementVNode("image", {
                class: "image_4",
                src: _imports_1$2
              }),
              vue.createElementVNode(
                "text",
                { class: "font_2 ml-35-5" },
                vue.toDisplayString($props.start_loc),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", { class: "flex-row items-center self-stretch group_4" }, [
              vue.createElementVNode("image", {
                class: "image_4",
                src: _imports_2$2
              }),
              vue.createElementVNode(
                "text",
                { class: "font_2 ml-35-5" },
                vue.toDisplayString($props.dest_loc),
                1
                /* TEXT */
              )
            ])
          ]),
          vue.createElementVNode("view", { class: "self-start group_5 mt-43" }, [
            vue.createElementVNode("text", { class: "font text_4" }, "参与人："),
            vue.createElementVNode(
              "text",
              { class: "text_5" },
              vue.toDisplayString($props.username_2),
              1
              /* TEXT */
            )
          ]),
          vue.createCommentVNode(" 接受邀约按钮 "),
          !$props.isUserInOrder ? (vue.openBlock(), vue.createElementBlock("button", {
            key: 0,
            class: "flex-col justify-center items-center self-stretch button mt-43",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.handleAcceptInvite && $options.handleAcceptInvite(...args))
          }, [
            vue.createElementVNode("text", { class: "font text_6" }, "接 受 邀 约")
          ])) : vue.createCommentVNode("v-if", true)
        ])
      ]),
      vue.createCommentVNode(" 车辆选择弹窗 "),
      $data.showVehiclePopup ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "custom-popup-mask",
        onClick: _cache[5] || (_cache[5] = ($event) => $data.showVehiclePopup = false)
      }, [
        vue.createElementVNode("view", {
          class: "custom-popup-content",
          onClick: _cache[4] || (_cache[4] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "popup-header" }, [
            vue.createElementVNode("text", { style: { "font-size": "16px", "font-weight": "bold" } }, "选择车辆"),
            vue.createElementVNode("image", {
              src: _imports_4,
              onClick: _cache[2] || (_cache[2] = ($event) => $data.showVehiclePopup = false),
              style: { "width": "40rpx", "height": "40rpx" }
            })
          ]),
          vue.createElementVNode("scroll-view", {
            "scroll-y": "true",
            style: { "height": "60vh", "margin-top": "20rpx" }
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.vehicles, (vehicle, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: vehicle.id,
                  class: vue.normalizeClass(["order-item", { "selected-order": $data.selectedVehicle && $data.selectedVehicle.id === vehicle.id }]),
                  onClick: ($event) => $data.selectedVehicle = vehicle
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "order-text" },
                    vue.toDisplayString(vehicle.plate_number),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.vehicles.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-tip"
            }, [
              vue.createElementVNode("text", null, "暂无可用车辆")
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          $data.selectedVehicle ? (vue.openBlock(), vue.createElementBlock("button", {
            key: 0,
            class: "send-btn",
            onClick: _cache[3] || (_cache[3] = (...args) => $options.confirmVehicleSelection && $options.confirmVehicleSelection(...args))
          }, " 确认选择 ")) : vue.createCommentVNode("v-if", true)
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ])) : vue.createCommentVNode("v-if", true);
  }
  const OrderInvite = /* @__PURE__ */ _export_sfc(_sfc_main$j, [["render", _sfc_render$i], ["__scopeId", "data-v-91acc05e"], ["__file", "E:/Projects/SE/ride-sharing-se/components/OrderInvite.vue"]]);
  const _imports_0$3 = "/static/back.png";
  const _imports_1$1 = "/static/photo.png";
  const _imports_2$1 = "/static/send.png";
  const _imports_3$1 = "/static/icon-order.png";
  const _sfc_main$i = {
    components: {
      OrderInvite
    },
    data() {
      return {
        conversationId: null,
        // 会话ID
        userAvatar: "../../static/user_2.jpg",
        otherAvatar: "../../static/user.jpeg",
        username: "测试者",
        // 当前用户
        other_username: "JYD777",
        // 对方用户
        inputMessage: "",
        // 消息输入框信息
        messages: [],
        // 消息列表
        driverOrders: [],
        // 车找人的订单
        passengerOrders: [],
        // 人找车的订单
        invites: [],
        // 拼车邀请信息
        showInvite: false,
        currentInvite: {},
        selectedOrderId: null,
        orderType: "driver",
        showOrderPopupFlag: false,
        isPreviewing: false,
        previewImageSrc: "",
        showVehiclePopup: false,
        // 控制车辆选择弹窗的显示
        selectedVehicle: null,
        // 用户选择的车辆
        vehicles: [],
        // 用户的车辆列表
        hasJoined: false
      };
    },
    computed: {
      filteredOrders() {
        return this.orderType === "driver" ? this.driverOrders : this.passengerOrders;
      }
    },
    onLoad(options) {
      this.conversationId = options.conversationId;
      this.initChatPage();
      SocketService.off("new_message", this.handleNewMessage);
      SocketService.off("message_error");
      SocketService.on("new_message", this.handleNewMessage);
      SocketService.on("message_error", (error) => {
        uni.showToast({ title: error.error, icon: "none" });
      });
      if (!this.hasJoined) {
        SocketService.emit("join_conversation", { conversationId: this.conversationId });
        this.hasJoined = true;
      }
    },
    onUnload() {
      SocketService.emit("leave_conversation", { conversationId: this.conversationId });
      SocketService.off("new_message");
      SocketService.off("message_error");
      this.hasJoined = false;
    },
    methods: {
      goBack() {
        uni.navigateBack();
      },
      async initChatPage() {
        formatAppLog("log", "at pages/index/chat.vue:305", "初始化聊天界面");
        try {
          await this.fetchMessages();
        } catch (err) {
          formatAppLog("error", "at pages/index/chat.vue:309", "初始化失败", err);
        }
      },
      // 获取会话消息
      async fetchMessages() {
        try {
          const currentUserId = uni.getStorageSync("user_info").userId;
          const currentUsername = uni.getStorageSync("user_info").username;
          const res2 = await fetchConversationMessages(this.conversationId);
          this.messages = res2.data.map((msg) => {
            const isCurrentUser = msg.sender.user_id === currentUserId;
            return {
              id: msg.message_id,
              sender: isCurrentUser ? "user" : "other",
              content: msg.content,
              type: msg.type,
              createdAt: new Date(msg.created_at),
              senderInfo: {
                username: isCurrentUser ? currentUsername : msg.sender.username,
                avatar: msg.sender.avatar,
                realname: msg.sender.realname,
                userId: msg.sender.user_id
              }
            };
          });
        } catch (err) {
          uni.showToast({
            title: "加载消息失败",
            icon: "none"
          });
        }
      },
      // 发送消息
      sendMessage() {
        const msg = this.inputMessage.trim();
        if (!msg)
          return;
        this.inputMessage = "";
        formatAppLog("log", "at pages/index/chat.vue:352", "发送消息");
        this.scrollToBottom();
        sendMessage(this.conversationId, msg);
      },
      // 处理新消息
      handleNewMessage(msg) {
        if (this.messages.some((m) => m.id === msg.id)) {
          return;
        }
        formatAppLog("log", "at pages/index/chat.vue:363", "新消息", msg);
        const sender_id = msg.sender.id;
        const my_id = uni.getStorageSync("user_info").userId;
        if (!sender_id || !my_id) {
          return;
        }
        const isCurrentUser = String(sender_id) === String(my_id);
        if (msg.conversationId === this.conversationId) {
          const newMsg = {
            id: msg.id,
            sender: isCurrentUser ? "user" : "other",
            content: msg.content,
            createdAt: new Date(msg.createdAt),
            senderInfo: msg.sender
          };
          this.messages = [...this.messages, newMsg];
        }
        this.$nextTick(() => {
          this.scrollToBottom();
        });
      },
      getRandomReply() {
        const replies = [
          "收到你的消息了",
          "好的，我知道了",
          "这个问题我需要想想",
          "谢谢你的分享",
          "我们稍后再聊这个话题"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
      },
      scrollToBottom() {
        formatAppLog("log", "at pages/index/chat.vue:402", "滚动到底部");
        if (this.messages.length > 0) {
          this.lastMsgId = "msg-" + this.messages[this.messages.length - 1].id;
        }
      },
      // 订单相关方法
      showOrderPopup() {
        this.selectedOrderId = null;
        this.showOrderPopupFlag = true;
      },
      closeOrderPopup() {
        this.showOrderPopupFlag = false;
      },
      switchOrderType(type) {
        this.orderType = type;
        this.selectedOrderId = null;
      },
      previewImage(src) {
        this.previewImageSrc = src;
        this.isPreviewing = true;
      },
      closePreview() {
        this.isPreviewing = false;
      },
      getAvailableOrders() {
        this.driverOrders = [
          {
            id: 1,
            start_loc: "同济大学（嘉定校区）",
            dest_loc: "同济大学（四平校区）",
            time: "今天 14:30",
            status: "待出发",
            role: "driver",
            username: this.username
          },
          {
            id: 2,
            start_loc: "嘉定新城地铁站",
            dest_loc: "虹桥机场",
            time: "明天 08:00",
            status: "待出发",
            role: "driver",
            username: this.username
          }
        ];
        this.passengerOrders = [
          {
            id: 101,
            start_loc: "人民广场",
            dest_loc: "浦东机场",
            time: "后天 10:00",
            status: "寻找司机",
            role: "passenger",
            username: this.other_username
            // 使用对方用户名
          },
          {
            id: 102,
            start_loc: "静安寺",
            dest_loc: "虹桥火车站",
            time: "大后天 15:30",
            status: "寻找司机",
            role: "passenger",
            username: this.other_username
            // 使用对方用户名
          }
        ];
      },
      selectOrder(order) {
        this.selectedOrderId = order.id;
      },
      sendInvite() {
        if (!this.selectedOrderId)
          return;
        const allOrders = [...this.driverOrders, ...this.passengerOrders];
        const order = allOrders.find((o) => o.id === this.selectedOrderId);
        if (order) {
          if (order.role === "passenger") {
            this.fetchUserVehicles();
            this.showVehiclePopup = true;
            return;
          }
          this.invites.push({
            ...order,
            type: "invite",
            inviter: order.role === "driver" ? this.username : this.other_username,
            inviter_avatar: order.role === "driver" ? this.userAvatar : this.otherAvatar
          });
          this.closeOrderPopup();
          this.scrollToBottom();
          uni.showToast({
            title: "邀请已发送",
            icon: "success"
          });
        }
      },
      confirmVehicleSelection() {
        if (!this.selectedVehicle) {
          uni.showToast({ title: "请选择车辆", icon: "none" });
          return;
        }
        const allOrders = [...this.driverOrders, ...this.passengerOrders];
        const order = allOrders.find((o) => o.id === this.selectedOrderId);
        if (order) {
          this.invites.push({
            ...order,
            type: "invite",
            vehicle: this.selectedVehicle.plate_number,
            // 添加车辆信息
            inviter: this.username,
            inviter_avatar: this.userAvatar
          });
          this.showVehiclePopup = false;
          this.closeOrderPopup();
          this.scrollToBottom();
          uni.showToast({
            title: "邀请已发送",
            icon: "success"
          });
        }
      },
      showInvitePopup(invite) {
        this.currentInvite = {
          ...invite,
          // 确保用户名正确
          username: invite.role === "driver" ? this.username : this.other_username
        };
        this.showInvite = true;
      },
      closeInvitePopup() {
        this.showInvite = false;
      },
      chooseImage() {
        uni.chooseImage({
          count: 1,
          success: (res2) => {
            this.messages.push({
              sender: "user",
              image: res2.tempFilePaths[0]
            });
            this.scrollToBottom();
          }
        });
      },
      focusInput() {
        setTimeout(() => {
          this.scrollToBottom();
        }, 300);
      },
      blurInput() {
      }
    }
  };
  function _sfc_render$h(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_OrderInvite = vue.resolveComponent("OrderInvite");
    return vue.openBlock(), vue.createElementBlock("view", { class: "flex-col page" }, [
      vue.createCommentVNode(" 聊天顶部 "),
      vue.createElementVNode("view", {
        class: "flex-row align-items-center section",
        style: { "position": "relative", "height": "30px" }
      }, [
        vue.createElementVNode("image", {
          class: "back",
          src: _imports_0$3,
          onClick: _cache[0] || (_cache[0] = (...args) => $options.goBack && $options.goBack(...args))
        }),
        vue.createCommentVNode(" 显示聊天的Title "),
        vue.createElementVNode(
          "text",
          {
            class: "font text ml-39-5",
            style: { "color": "white", "font-size": "20px" }
          },
          vue.toDisplayString($data.other_username),
          1
          /* TEXT */
        ),
        vue.createCommentVNode(" 显示聊天的头像 "),
        vue.createElementVNode("image", {
          class: "otherAvatar",
          src: $data.otherAvatar,
          style: { "position": "absolute", "right": "70rpx" }
        }, null, 8, ["src"])
      ]),
      vue.createCommentVNode(" 滚动视图 "),
      vue.createElementVNode("scroll-view", {
        class: "message-container",
        "scroll-y": "",
        "scroll-into-view": _ctx.lastMsgId,
        "scroll-with-animation": true
      }, [
        vue.createCommentVNode(" 显示消息 "),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.messages, (message, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              id: "msg-" + message.id,
              key: index,
              class: vue.normalizeClass(["flex-row", message.sender === "user" ? "justify-end" : "justify-start"]),
              style: { "display": "flex", "width": "100%", "align-items": "center" }
            }, [
              vue.createCommentVNode(" 对方消息：头像在左，气泡在右 "),
              message.sender === "other" ? (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 0 },
                [
                  vue.createElementVNode("view", { class: "avatar-container" }, [
                    vue.createElementVNode("image", {
                      class: "otherAvatar",
                      src: $data.otherAvatar
                    }, null, 8, ["src"])
                  ]),
                  vue.createElementVNode("view", { class: "message-bubble message-bubble-other" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "font text" },
                      vue.toDisplayString(message.content),
                      1
                      /* TEXT */
                    ),
                    message.image ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 0,
                      src: message.image,
                      style: { "width": "200rpx", "height": "200rpx", "margin-top": "10rpx" },
                      mode: "aspectFill",
                      onClick: ($event) => $options.previewImage(message.image)
                    }, null, 8, ["src", "onClick"])) : vue.createCommentVNode("v-if", true)
                  ])
                ],
                64
                /* STABLE_FRAGMENT */
              )) : (vue.openBlock(), vue.createElementBlock(
                vue.Fragment,
                { key: 1 },
                [
                  vue.createCommentVNode(" 用户消息：气泡在左，头像在右 "),
                  vue.createElementVNode("view", { class: "message-bubble message-bubble-user" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "font text" },
                      vue.toDisplayString(message.content),
                      1
                      /* TEXT */
                    ),
                    message.image ? (vue.openBlock(), vue.createElementBlock("image", {
                      key: 0,
                      src: message.image,
                      style: { "width": "200rpx", "height": "200rpx", "margin-top": "10rpx" },
                      mode: "aspectFill",
                      onClick: ($event) => $options.previewImage(message.image)
                    }, null, 8, ["src", "onClick"])) : vue.createCommentVNode("v-if", true)
                  ]),
                  vue.createElementVNode("view", { class: "avatar-container" }, [
                    vue.createElementVNode("image", {
                      class: "userAvatar",
                      src: $data.userAvatar
                    }, null, 8, ["src"])
                  ])
                ],
                64
                /* STABLE_FRAGMENT */
              ))
            ], 10, ["id"]);
          }),
          128
          /* KEYED_FRAGMENT */
        )),
        vue.createCommentVNode(" 拼车邀请消息 "),
        (vue.openBlock(true), vue.createElementBlock(
          vue.Fragment,
          null,
          vue.renderList($data.invites, (invite, index) => {
            return vue.openBlock(), vue.createElementBlock("view", {
              key: "invite-" + index,
              class: "flex-row justify-end",
              style: { "display": "flex", "width": "100%", "align-items": "center" }
            }, [
              vue.createElementVNode("view", {
                class: "message-bubble message-bubble-user",
                onClick: ($event) => $options.showInvitePopup(invite)
              }, [
                vue.createElementVNode("text", { class: "font text" }, "拼车邀请"),
                vue.createElementVNode("view", { style: { "margin-top": "10rpx", "padding": "10rpx", "background-color": "#f0f8ff", "border-radius": "10rpx" } }, [
                  vue.createElementVNode(
                    "text",
                    { style: { "font-size": "12px", "color": "black" } },
                    vue.toDisplayString(invite.start_loc) + " → " + vue.toDisplayString(invite.dest_loc),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("br"),
                  vue.createElementVNode(
                    "text",
                    { style: { "font-size": "12px", "color": "black" } },
                    "时间: " + vue.toDisplayString(invite.time),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { style: { "font-size": "12px", "color": "#666", "display": "block", "margin-top": "5rpx" } },
                    vue.toDisplayString(invite.role === "driver" ? "我发起的司机订单" : "对方发起的乘客订单"),
                    1
                    /* TEXT */
                  )
                ])
              ], 8, ["onClick"]),
              vue.createElementVNode("view", { class: "avatar-container" }, [
                vue.createElementVNode("image", {
                  class: "userAvatar",
                  src: $data.userAvatar
                }, null, 8, ["src"])
              ])
            ]);
          }),
          128
          /* KEYED_FRAGMENT */
        ))
      ], 8, ["scroll-into-view"]),
      vue.createCommentVNode(" 底部输入框（固定位置） "),
      vue.createElementVNode("view", { class: "flex-row items-center section_4" }, [
        vue.createElementVNode("image", {
          class: "photo",
          src: _imports_1$1,
          onClick: _cache[1] || (_cache[1] = (...args) => $options.chooseImage && $options.chooseImage(...args))
        }),
        vue.withDirectives(vue.createElementVNode(
          "input",
          {
            class: "ml-20 flex-1 input_mes",
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.inputMessage = $event),
            placeholder: "输入消息...",
            focus: "",
            onFocus: _cache[3] || (_cache[3] = (...args) => $options.focusInput && $options.focusInput(...args)),
            onBlur: _cache[4] || (_cache[4] = (...args) => $options.blurInput && $options.blurInput(...args))
          },
          null,
          544
          /* NEED_HYDRATION, NEED_PATCH */
        ), [
          [vue.vModelText, $data.inputMessage]
        ]),
        vue.createElementVNode("image", {
          class: "send",
          src: _imports_2$1,
          onClick: _cache[5] || (_cache[5] = (...args) => $options.sendMessage && $options.sendMessage(...args))
        }),
        vue.createElementVNode("image", {
          class: "order",
          src: _imports_3$1,
          onClick: _cache[6] || (_cache[6] = (...args) => $options.showOrderPopup && $options.showOrderPopup(...args))
        })
      ]),
      vue.createCommentVNode(" 订单选择弹窗 "),
      $data.showOrderPopupFlag ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "custom-popup-mask",
        onClick: _cache[12] || (_cache[12] = (...args) => $options.closeOrderPopup && $options.closeOrderPopup(...args))
      }, [
        vue.createElementVNode("view", {
          class: "custom-popup-content",
          onClick: _cache[11] || (_cache[11] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "popup-header" }, [
            vue.createElementVNode("text", { style: { "font-size": "16px", "font-weight": "bold" } }, "选择拼车订单"),
            vue.createElementVNode("image", {
              src: _imports_4,
              onClick: _cache[7] || (_cache[7] = (...args) => $options.closeOrderPopup && $options.closeOrderPopup(...args)),
              style: { "width": "40rpx", "height": "40rpx" }
            })
          ]),
          vue.createCommentVNode(" 订单类型切换 "),
          vue.createElementVNode("view", { class: "order-type-tabs" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["order-type-tab", { active: $data.orderType === "driver" }]),
                onClick: _cache[8] || (_cache[8] = ($event) => $options.switchOrderType("driver"))
              },
              " 我的订单(司机) ",
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["order-type-tab", { active: $data.orderType === "passenger" }]),
                onClick: _cache[9] || (_cache[9] = ($event) => $options.switchOrderType("passenger"))
              },
              " 对方订单(乘客) ",
              2
              /* CLASS */
            )
          ]),
          vue.createElementVNode("scroll-view", {
            "scroll-y": "true",
            style: { "height": "60vh", "margin-top": "20rpx" }
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.filteredOrders, (order, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: index,
                  class: vue.normalizeClass(["order-item", { "selected-order": $data.selectedOrderId === order.id }]),
                  onClick: ($event) => $options.selectOrder(order)
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "order-text" },
                    vue.toDisplayString(order.start_loc) + " → " + vue.toDisplayString(order.dest_loc),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "order-time" },
                    "发车时间: " + vue.toDisplayString(order.time),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "order-status" },
                    "状态: " + vue.toDisplayString(order.status),
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode(
                    "text",
                    { class: "order-role" },
                    vue.toDisplayString(order.role === "driver" ? "(我的司机订单)" : "(对方乘客订单)"),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $options.filteredOrders.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-tip"
            }, [
              vue.createElementVNode("text", null, "暂无可用订单")
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          $data.selectedOrderId ? (vue.openBlock(), vue.createElementBlock("button", {
            key: 0,
            class: "send-btn",
            onClick: _cache[10] || (_cache[10] = (...args) => $options.sendInvite && $options.sendInvite(...args))
          }, " 发送邀请 ")) : vue.createCommentVNode("v-if", true)
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 拼车邀请详情弹窗 "),
      $data.showInvite ? (vue.openBlock(), vue.createBlock(_component_OrderInvite, {
        key: 1,
        isVisible: $data.showInvite,
        username: $data.currentInvite.role === "driver" ? $data.username : $data.other_username,
        time: $data.currentInvite.time,
        start_loc: $data.currentInvite.start_loc,
        dest_loc: $data.currentInvite.dest_loc,
        username_2: $data.currentInvite.role === "driver" ? $data.other_username : $data.username,
        avatar_url: $data.currentInvite.role === "driver" ? $data.userAvatar : $data.otherAvatar,
        onClose: $options.closeInvitePopup
      }, null, 8, ["isVisible", "username", "time", "start_loc", "dest_loc", "username_2", "avatar_url", "onClose"])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 全屏显示图片 "),
      $data.isPreviewing ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "preview-container",
        onClick: _cache[13] || (_cache[13] = (...args) => $options.closePreview && $options.closePreview(...args))
      }, [
        vue.createElementVNode("image", {
          class: "preview-image",
          src: $data.previewImageSrc,
          mode: "widthFix"
        }, null, 8, ["src"])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 展示车辆列表的弹窗 "),
      $data.showVehiclePopup ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 3,
        class: "custom-popup-mask",
        onClick: _cache[17] || (_cache[17] = ($event) => $data.showVehiclePopup = false)
      }, [
        vue.createElementVNode("view", {
          class: "custom-popup-content",
          onClick: _cache[16] || (_cache[16] = vue.withModifiers(() => {
          }, ["stop"]))
        }, [
          vue.createElementVNode("view", { class: "popup-header" }, [
            vue.createElementVNode("text", { style: { "font-size": "16px", "font-weight": "bold" } }, "选择车辆"),
            vue.createElementVNode("image", {
              src: _imports_4,
              onClick: _cache[14] || (_cache[14] = ($event) => $data.showVehiclePopup = false),
              style: { "width": "40rpx", "height": "40rpx" }
            })
          ]),
          vue.createElementVNode("scroll-view", {
            "scroll-y": "true",
            style: { "height": "60vh", "margin-top": "20rpx" }
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.vehicles, (vehicle, index) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  key: vehicle.id,
                  class: vue.normalizeClass(["order-item", { "selected-order": $data.selectedVehicle && $data.selectedVehicle.id === vehicle.id }]),
                  onClick: ($event) => $data.selectedVehicle = vehicle
                }, [
                  vue.createElementVNode(
                    "text",
                    { class: "order-text" },
                    vue.toDisplayString(vehicle.plate_number),
                    1
                    /* TEXT */
                  )
                ], 10, ["onClick"]);
              }),
              128
              /* KEYED_FRAGMENT */
            )),
            $data.vehicles.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-tip"
            }, [
              vue.createElementVNode("text", null, "暂无可用车辆")
            ])) : vue.createCommentVNode("v-if", true)
          ]),
          $data.selectedVehicle ? (vue.openBlock(), vue.createElementBlock("button", {
            key: 0,
            class: "send-btn",
            onClick: _cache[15] || (_cache[15] = (...args) => $options.confirmVehicleSelection && $options.confirmVehicleSelection(...args))
          }, " 确认选择 ")) : vue.createCommentVNode("v-if", true)
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesIndexChat = /* @__PURE__ */ _export_sfc(_sfc_main$i, [["render", _sfc_render$h], ["__scopeId", "data-v-8595e4ae"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/chat.vue"]]);
  const publishOrder = (orderData) => {
    return post("/orders", orderData);
  };
  const fetchOrderList = () => {
    return get("orders/list");
  };
  const payOrder = (orderId) => {
    return post(`/orders/${orderId}/paid`);
  };
  const fetchTripDetail = (orderId) => {
    return get(`/orders/${orderId}`);
  };
  const submitTripRating = (orderId, payload) => {
    return post(`/orders/${orderId}/rate`, payload);
  };
  const fetchCalendarTrips = (year, month, userId) => {
    return get(`/orders/calendar/${userId}`, {
      params: { year, month }
    }).then((response) => {
      return response.data.map((trip) => ({
        id: trip.order_id,
        order_id: trip.order_id,
        start_time: trip.start_time,
        start_loc: trip.start_loc,
        dest_loc: trip.dest_loc,
        date: trip.start_time,
        startPoint: trip.start_loc,
        endPoint: trip.dest_loc,
        price: trip.price,
        car_type: trip.car_type,
        carType: trip.car_type || "未接单",
        status: trip.status,
        userAvatar: trip.initiator.avatar || "../../static/user.jpeg",
        orderCount: trip.participants_count || 0,
        initiator: trip.initiator
      }));
    });
  };
  function fetchUserTrips() {
    return get(`/orders/user/trips`);
  }
  const fetchManagedOrders = (params) => {
    formatAppLog("log", "at api/order.js:60", params.status || "all");
    return get("/orders/manage/list", {
      params: {
        status: params.status || "all",
        type: params.type || "all",
        year: params.year || "",
        month: params.month || ""
      }
    }).then((response) => {
      formatAppLog("log", "at api/order.js:69", response.data);
      return response.data.map((order) => ({
        id: order.id,
        date: order.date,
        startPoint: order.startPoint,
        endPoint: order.endPoint,
        price: order.price,
        carType: order.carType || "未接单",
        status: order.status,
        publisher: order.publisher,
        userAvatar: order.userAvatar || "../../static/user.jpeg",
        rejectReason: order.rejectReason
      }));
    });
  };
  const approveOrder = (orderId) => {
    return post(`/orders/manage/${orderId}/approve`);
  };
  const rejectOrder = (orderId, reason) => {
    return post(`/orders/manage/${orderId}/reject`, { reason });
  };
  const acceptOrder = (data) => {
    return post("/orders/driver/accept", data);
  };
  const applyOrder = (data) => {
    formatAppLog("log", "at api/order.js:110", "applyOrder接口被调用");
    return post("/orders/passenger/apply", data);
  };
  const _sfc_main$h = {
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      amount: {
        type: Number,
        required: true
      },
      orderId: {
        type: Number,
        required: true
      }
    },
    methods: {
      closeModal() {
        this.$emit("close");
      },
      confirmPayment() {
        if (!this.orderId) {
          uni.showToast({ title: "订单ID丢失，无法支付", icon: "error" });
          return;
        }
        payOrder(this.orderId).then(() => {
          uni.showToast({ title: "支付成功", icon: "success" });
          this.$emit("refresh");
          this.closeModal();
        }).catch((err) => {
          formatAppLog("error", "at components/PaymentModal.vue:51", "支付失败:", err);
          uni.showToast({ title: "支付失败，请重试", icon: "none" });
        });
      }
    }
  };
  function _sfc_render$g(_ctx, _cache, $props, $setup, $data, $options) {
    return $props.visible ? (vue.openBlock(), vue.createElementBlock("view", {
      key: 0,
      class: "modal"
    }, [
      vue.createElementVNode("view", { class: "modal-content" }, [
        vue.createElementVNode("view", { class: "modal-header" }, [
          vue.createElementVNode(
            "text",
            null,
            "请支付 " + vue.toDisplayString($props.amount) + " 元",
            1
            /* TEXT */
          )
        ]),
        vue.createElementVNode("view", { class: "modal-footer" }, [
          vue.createElementVNode("button", {
            class: "close-button",
            onClick: _cache[0] || (_cache[0] = (...args) => $options.closeModal && $options.closeModal(...args))
          }, "关闭付款"),
          vue.createElementVNode("button", {
            class: "confirm-button",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.confirmPayment && $options.confirmPayment(...args))
          }, "确认支付")
        ])
      ])
    ])) : vue.createCommentVNode("v-if", true);
  }
  const PaymentModal = /* @__PURE__ */ _export_sfc(_sfc_main$h, [["render", _sfc_render$g], ["__scopeId", "data-v-d0c78149"], ["__file", "E:/Projects/SE/ride-sharing-se/components/PaymentModal.vue"]]);
  const _sfc_main$g = {
    components: {
      NavigationBar,
      PaymentModal
    },
    data() {
      return {
        isLoading: true,
        // 加载状态
        mapContext: null,
        centerLng: 121.214345,
        // 默认中心点
        centerLat: 31.285985,
        // 默认中心点
        orderId: null,
        // 当前页面显示的订单ID
        tripData: {
          // 用于存储从 API 获取的行程数据
          id: null,
          date: "",
          startPoint: "",
          endPoint: "",
          price: 0,
          carType: "",
          orderCount: 0,
          userAvatar: "",
          // 默认头像
          state: "",
          driverUserId: null
          // 添加司机ID，用于评价
        },
        showPaymentModal: false,
        showRateModal: false,
        currentRating: 0,
        // 当前评分
        ratingComment: "",
        // 评价评论 (可选)
        isSubmittingRating: false,
        // 防止重复提交评价
        markers: [],
        polyline: []
      };
    },
    onLoad(options) {
      if (options && options.id) {
        this.orderId = parseInt(options.id);
        formatAppLog("log", "at pages/index/trip_info.vue:133", "接收到的参数 id (赋值给 orderId):", this.orderId);
        this.fetchTripDetails();
      } else {
        formatAppLog("error", "at pages/index/trip_info.vue:136", "未接收到有效的 id 参数！");
        uni.showToast({ title: "无法加载行程信息", icon: "error" });
        this.isLoading = false;
      }
    },
    mounted() {
      this.initMap();
    },
    methods: {
      // 状态映射方法
      getStatusText(state) {
        const statusMap = {
          "pending": "待审核",
          "completed": "已完成",
          "rejected": "已拒绝",
          "not-started": "未开始",
          "in-progress": "进行中",
          "to-pay": "待付款",
          "to-review": "待评价"
        };
        return statusMap[state] || "未知状态";
      },
      // 1. 获取行程详情
      fetchTripDetails() {
        if (!this.orderId)
          return;
        this.isLoading = true;
        fetchTripDetail(this.orderId).then((res2) => {
          formatAppLog("log", "at pages/index/trip_info.vue:165", "行程详情获取成功:", res2);
          this.tripData = res2.data;
          formatAppLog("log", "at pages/index/trip_info.vue:167", this.tripData);
          this.drawRoute();
        }).catch((err) => {
          formatAppLog("error", "at pages/index/trip_info.vue:171", "获取行程详情失败:", err);
          uni.showToast({ title: "加载失败，请重试", icon: "none" });
          this.tripData = {};
        }).finally(() => {
          this.isLoading = false;
        });
      },
      initMap() {
        this.$nextTick(() => {
          this.mapContext = uni.createMapContext("uni-map", this);
          if (!this.mapContext) {
            formatAppLog("error", "at pages/index/trip_info.vue:185", "创建 map context 失败");
          }
        });
      },
      // --- 2. 绘制地图路线 (依赖 API 数据) ---
      async drawRoute() {
        formatAppLog("log", "at pages/index/trip_info.vue:193", this.tripData.startPoint, this.tripData.endPoint);
        if (!this.tripData || !this.tripData.startPoint || !this.tripData.endPoint) {
          formatAppLog("warn", "at pages/index/trip_info.vue:195", "缺少起点或终点信息，无法绘制路线");
          return;
        }
        const { startPoint, endPoint } = this.tripData;
        formatAppLog("log", "at pages/index/trip_info.vue:200", "绘制路线起点:", startPoint);
        formatAppLog("log", "at pages/index/trip_info.vue:201", "绘制路线终点:", endPoint);
        const [startPos, endPos] = await Promise.all([
          this.transFormAddress(startPoint),
          this.transFormAddress(endPoint)
        ]);
        if (!startPos || !endPos) {
          formatAppLog("error", "at pages/index/trip_info.vue:210", "地址解析失败，无法绘制路线");
          uni.showToast({ title: "地址解析失败", icon: "none" });
          return;
        }
        formatAppLog("log", "at pages/index/trip_info.vue:214", "起点坐标:", startPos);
        formatAppLog("log", "at pages/index/trip_info.vue:215", "终点坐标:", endPos);
        this.centerLng = startPos[0];
        this.centerLat = startPos[1];
        this.markers = [
          {
            id: 1,
            latitude: startPos[1],
            longitude: startPos[0],
            title: "起点",
            iconPath: "../../static/start.png",
            // 确保路径正确
            width: 25,
            height: 25
          },
          {
            id: 2,
            latitude: endPos[1],
            longitude: endPos[0],
            title: "终点",
            iconPath: "../../static/dest.png",
            // 确保路径正确
            width: 25,
            height: 25
          }
        ];
        formatAppLog("log", "at pages/index/trip_info.vue:239", "更新 markers:", this.markers);
        const route = await this.getDrivingRoute(startPos, endPos);
        if (route && route.paths && route.paths.length > 0 && route.paths[0].steps) {
          formatAppLog("log", "at pages/index/trip_info.vue:244", "获取到高德路线规划:", route);
          let pointsArr = [];
          route.paths[0].steps.forEach((step) => {
            if (step.polyline) {
              const stepPoints = step.polyline.split(";");
              stepPoints.forEach((pointStr) => {
                if (pointStr) {
                  const coords = pointStr.split(",");
                  if (coords.length === 2) {
                    pointsArr.push({
                      longitude: parseFloat(coords[0]),
                      latitude: parseFloat(coords[1])
                    });
                  }
                }
              });
            }
          });
          if (pointsArr.length > 0) {
            this.polyline = [{
              points: pointsArr,
              color: "#007AFF",
              // 蓝色路线
              width: 6
              // dottedLine: true // 实线通常更清晰
            }];
            formatAppLog("log", "at pages/index/trip_info.vue:271", "更新 polyline 点数:", pointsArr.length);
          } else {
            formatAppLog("warn", "at pages/index/trip_info.vue:273", "解析出的路线点为空");
            this.polyline = [];
          }
        } else {
          formatAppLog("error", "at pages/index/trip_info.vue:278", "高德路线规划失败或无有效路径:", route);
          this.polyline = [];
        }
      },
      getDrivingRoute(startPos, endPos) {
        return new Promise((resolve, reject) => {
          uni.request({
            url: "https://restapi.amap.com/v3/direction/driving",
            data: {
              origin: startPos.join(","),
              destination: endPos.join(","),
              key: "9979fdc383e13ee57c582bc869dbd690"
              // !!! 替换成你自己的 Key !!!
            },
            success: (res2) => {
              formatAppLog("log", "at pages/index/trip_info.vue:294", "高德驾车路线API响应:", res2.data);
              if (res2.data.status === "1" && res2.data.route) {
                resolve(res2.data.route);
              } else {
                formatAppLog("error", "at pages/index/trip_info.vue:298", "驾车路径规划失败:", res2.data.info || "未知错误");
                resolve(null);
              }
            },
            fail: (err) => {
              formatAppLog("error", "at pages/index/trip_info.vue:303", "驾车路径规划请求失败:", err);
              resolve(null);
            }
          });
        });
      },
      transFormAddress(address) {
        return new Promise((resolve, reject) => {
          uni.request({
            url: "https://restapi.amap.com/v3/geocode/geo",
            data: {
              address,
              key: "9979fdc383e13ee57c582bc869dbd690",
              // !!! 替换成你自己的 Key !!!
              output: "JSON"
            },
            success: (res2) => {
              formatAppLog("log", "at pages/index/trip_info.vue:319", `地址解析 "${address}" 响应:`, res2.data);
              if (res2.data && res2.data.info === "OK" && res2.data.geocodes && res2.data.geocodes.length > 0) {
                let { location: location2 } = res2.data.geocodes[0];
                let addrArr = location2.split(",");
                resolve([parseFloat(addrArr[0]), parseFloat(addrArr[1])]);
              } else {
                formatAppLog("error", "at pages/index/trip_info.vue:325", `地址解析失败 "${address}":`, res2.data.info || "无结果");
                resolve(null);
              }
            },
            fail: (err) => {
              formatAppLog("error", "at pages/index/trip_info.vue:330", `地址解析请求失败 "${address}":`, err);
              resolve(null);
            }
          });
        });
      },
      // --- (旧的 geocodeAddress 方法不再需要，因为我们从 transFormAddress 获取坐标) ---
      // --- 3. 处理按钮点击 ---
      handlePayClick() {
        if (!this.orderId) {
          formatAppLog("error", "at pages/index/trip_info.vue:341", "订单ID丢失，无法打开支付弹窗");
          uni.showToast({ title: "订单ID丢失", icon: "error" });
          return;
        }
        this.showPaymentModal = true;
      },
      handleRateClick() {
        formatAppLog("log", "at pages/index/trip_info.vue:348", "评价按钮点击");
        this.showRatingModal();
      },
      // --- 4. 评价相关方法 ---
      showRatingModal() {
        formatAppLog("log", "at pages/index/trip_info.vue:354", "显示评价弹窗");
        this.showRateModal = true;
        this.currentRating = 0;
        this.ratingComment = "";
      },
      setRating(rating) {
        formatAppLog("log", "at pages/index/trip_info.vue:360", "设置评分:", rating);
        this.currentRating = this.currentRating === rating ? 0 : rating;
      },
      cancelRating() {
        formatAppLog("log", "at pages/index/trip_info.vue:365", "取消评价");
        this.showRateModal = false;
      },
      submitRating() {
        if (this.currentRating === 0) {
          uni.showToast({ title: "请选择星级", icon: "none" });
          return;
        }
        if (!this.orderId) {
          uni.showToast({ title: "无法提交评价，订单ID丢失", icon: "error" });
          return;
        }
        if (this.isSubmittingRating)
          return;
        this.isSubmittingRating = true;
        const payload = {
          rating_value: this.currentRating
        };
        submitTripRating(this.orderId, payload).then((res2) => {
          formatAppLog("log", "at pages/index/trip_info.vue:387", "评价提交成功:", res2);
          uni.showToast({
            title: "评价成功！",
            icon: "success"
          });
          this.showRateModal = false;
          this.fetchTripDetails();
        }).catch((err) => {
          formatAppLog("error", "at pages/index/trip_info.vue:396", "评价提交失败:", err);
          uni.showToast({ title: "评价失败，请重试", icon: "none" });
        }).finally(() => {
          this.isSubmittingRating = false;
        });
      },
      // --- 5. 其他辅助方法 ---
      closePaymentModal() {
        this.showPaymentModal = false;
      },
      handleAvatarError(event) {
        formatAppLog("warn", "at pages/index/trip_info.vue:409", "头像加载失败，使用默认头像");
        event.target.src = "../../static/user.jpeg";
      }
    }
  };
  function _sfc_render$f(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    const _component_PaymentModal = vue.resolveComponent("PaymentModal");
    return vue.openBlock(), vue.createElementBlock("div", null, [
      vue.createCommentVNode(" 使用 NavigationBar 组件 "),
      vue.createVNode(_component_NavigationBar),
      vue.createCommentVNode(" 支付弹窗 "),
      vue.createVNode(_component_PaymentModal, {
        visible: $data.showPaymentModal,
        amount: $data.tripData.price,
        orderId: $data.orderId,
        onClose: $options.closePaymentModal,
        onRefresh: $options.fetchTripDetails
      }, null, 8, ["visible", "amount", "orderId", "onClose", "onRefresh"]),
      vue.createCommentVNode(" 评价弹窗 "),
      $data.showRateModal ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "rate-modal"
      }, [
        vue.createElementVNode("view", { class: "rate-content" }, [
          vue.createElementVNode("text", { class: "rate-title" }, "请为本次行程评分"),
          vue.createElementVNode("view", { class: "stars-container" }, [
            (vue.openBlock(), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList(5, (i) => {
                return vue.createElementVNode("view", {
                  key: i,
                  onClick: ($event) => $options.setRating(i),
                  class: "star"
                }, [
                  vue.createElementVNode("image", {
                    src: i <= $data.currentRating ? "../../static/star-filled.png" : "../../static/star-empty.png",
                    class: "star-icon"
                  }, null, 8, ["src"])
                ], 8, ["onClick"]);
              }),
              64
              /* STABLE_FRAGMENT */
            ))
          ]),
          vue.createElementVNode("view", { class: "rate-buttons" }, [
            vue.createElementVNode("button", {
              class: "cancel-button",
              onClick: _cache[0] || (_cache[0] = (...args) => $options.cancelRating && $options.cancelRating(...args))
            }, "取消"),
            vue.createElementVNode("button", {
              class: "submit-button",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.submitRating && $options.submitRating(...args)),
              disabled: $data.isSubmittingRating
            }, "提交评价", 8, ["disabled"])
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true),
      vue.createCommentVNode(" 地图容器 "),
      !$data.isLoading ? (vue.openBlock(), vue.createElementBlock("map", {
        key: 1,
        id: "uni-map",
        class: "map-container",
        longitude: $data.centerLng,
        latitude: $data.centerLat,
        markers: $data.markers,
        polyline: $data.polyline,
        scale: 14
      }, null, 8, ["longitude", "latitude", "markers", "polyline"])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 2,
        class: "loading-placeholder"
      }, "地图加载中...")),
      vue.createCommentVNode(" 行程详情 "),
      !$data.isLoading && $data.tripData.id ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 3,
        class: "order-scroll",
        "scroll-y": "true"
      }, [
        vue.createElementVNode("view", { class: "order-info" }, [
          vue.createCommentVNode(" 移除 v-for，因为只显示一个行程 "),
          vue.createElementVNode("view", { class: "order-card" }, [
            vue.createElementVNode("view", { class: "order-header" }, [
              vue.createElementVNode(
                "text",
                null,
                vue.toDisplayString($data.tripData.date),
                1
                /* TEXT */
              ),
              vue.createElementVNode("view", { class: "button-container" }, [
                vue.createCommentVNode(" “评价”按钮：只有在 state 为 '待评价' 时显示 "),
                $data.tripData.state === "to-review" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 0,
                  class: "rate-button",
                  onClick: _cache[2] || (_cache[2] = (...args) => $options.handleRateClick && $options.handleRateClick(...args))
                }, "评价")) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" “付款”按钮：只有在 state 为 '待付款' 时显示 "),
                $data.tripData.state === "to-pay" ? (vue.openBlock(), vue.createElementBlock("button", {
                  key: 1,
                  class: "rate-button",
                  onClick: _cache[3] || (_cache[3] = (...args) => $options.handlePayClick && $options.handlePayClick(...args))
                }, "付款")) : vue.createCommentVNode("v-if", true),
                vue.createCommentVNode(" 状态/操作按钮，动态映射状态 "),
                vue.createElementVNode(
                  "button",
                  {
                    class: vue.normalizeClass(["state-button", "status-" + $data.tripData.state])
                  },
                  vue.toDisplayString($options.getStatusText($data.tripData.state)),
                  3
                  /* TEXT, CLASS */
                )
              ])
            ]),
            vue.createElementVNode("view", { class: "order-details" }, [
              vue.createElementVNode("view", { class: "start-point" }, [
                vue.createElementVNode("image", {
                  src: _imports_1$2,
                  class: "icon",
                  style: { "height": "20px", "width": "20px" }
                }),
                vue.createElementVNode(
                  "text",
                  { class: "order-text" },
                  vue.toDisplayString($data.tripData.startPoint),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "departure-point" }, [
                vue.createElementVNode("image", {
                  src: _imports_2$2,
                  class: "icon",
                  style: { "height": "20px", "width": "20px" }
                }),
                vue.createElementVNode(
                  "text",
                  { class: "order-text" },
                  vue.toDisplayString($data.tripData.endPoint),
                  1
                  /* TEXT */
                )
              ])
            ]),
            vue.createElementVNode("view", { class: "separator" }),
            vue.createElementVNode("view", { class: "order-summary" }, [
              vue.createElementVNode("view", { class: "summary-content" }, [
                vue.createElementVNode("image", {
                  src: $data.tripData.userAvatar,
                  class: "user-avatar",
                  onError: _cache[4] || (_cache[4] = (...args) => $options.handleAvatarError && $options.handleAvatarError(...args))
                }, null, 40, ["src"]),
                vue.createCommentVNode(" 添加错误处理 "),
                vue.createElementVNode("view", { class: "car-info" }, [
                  vue.createElementVNode("view", { class: "car-type-summary" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "car-type" },
                      vue.toDisplayString($data.tripData.carType),
                      1
                      /* TEXT */
                    )
                  ]),
                  vue.createElementVNode("view", { class: "order-count-summary" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "order-count" },
                      "接单" + vue.toDisplayString($data.tripData.orderCount) + "次",
                      1
                      /* TEXT */
                    )
                  ])
                ]),
                vue.createElementVNode("view", { class: "price-info" }, [
                  vue.createElementVNode(
                    "text",
                    {
                      class: "price-text",
                      style: { "color": "#003366", "font-weight": "bold" }
                    },
                    "预估" + vue.toDisplayString($data.tripData.price) + "元",
                    1
                    /* TEXT */
                  )
                ])
              ])
            ])
          ])
        ])
      ])) : $data.isLoading ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 4,
        class: "loading-placeholder"
      }, " 行程信息加载中... ")) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 5,
        class: "loading-placeholder"
      }, " 加载行程信息失败或无信息。 "))
    ]);
  }
  const PagesIndexTripInfo = /* @__PURE__ */ _export_sfc(_sfc_main$g, [["render", _sfc_render$f], ["__scopeId", "data-v-c77841f1"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/trip_info.vue"]]);
  const _sfc_main$f = {
    data() {
      return {
        user: {
          username: "",
          true_username: "",
          identity_num: "",
          gender: "",
          telephone: "",
          password: "",
          confirmPassword: ""
        },
        genderList: [
          { name: "男", value: "male" },
          { name: "女", value: "female" }
        ],
        selectedGender: null
      };
    },
    methods: {
      handleGenderChange(event) {
        const selectedGenderIndex = event.detail.value;
        this.selectedGender = this.genderList[selectedGenderIndex];
        this.user.gender = this.selectedGender.value;
      },
      register() {
        if (this.user.username && this.user.true_username && this.user.identity_num && this.user.gender && this.user.telephone && this.user.password && this.user.password === this.user.confirmPassword) {
          authApi.register({
            username: this.user.username,
            realname: this.user.true_username,
            identity_id: this.user.identity_num,
            gender: this.user.gender,
            telephone: this.user.telephone,
            password: this.user.password
          }).then((res2) => {
            formatAppLog("log", "at pages/index/register.vue:155", "注册成功", res2);
            this.goToLogin();
          }).catch((err) => {
            formatAppLog("log", "at pages/index/register.vue:158", "注册失败：", err.message);
          });
        } else {
          uni.showToast({
            title: "请填写所有必填项，并确保两次密码一致！",
            icon: "none"
          });
        }
      },
      goToLogin() {
        uni.navigateTo({
          url: "/pages/index/login"
        });
      }
    }
  };
  function _sfc_render$e(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "container" }, [
      vue.createElementVNode("view", { class: "card" }, [
        vue.createElementVNode("view", { class: "card-title text-h5" }, "用户注册"),
        vue.createElementVNode("view", { class: "card-body" }, [
          vue.createElementVNode(
            "form",
            { ref: "form" },
            [
              vue.createCommentVNode(" 用户名 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "username" }, "用户名"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "username",
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.user.username = $event),
                    type: "text",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.username]
                ])
              ]),
              vue.createCommentVNode(" 真实姓名 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "true_username" }, "真实姓名"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "true_username",
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => $data.user.true_username = $event),
                    type: "text",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.true_username]
                ])
              ]),
              vue.createCommentVNode(" 身份证号 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "identity_num" }, "身份证号"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "identity_num",
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.user.identity_num = $event),
                    type: "text",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.identity_num]
                ])
              ]),
              vue.createCommentVNode(" 性别选择 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "gender" }, "性别"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.genderList,
                  "range-key": "name",
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.handleGenderChange && $options.handleGenderChange(...args)),
                  class: "info-picker"
                }, [
                  vue.createElementVNode(
                    "view",
                    { class: "picker-text" },
                    vue.toDisplayString($data.selectedGender ? $data.selectedGender.name : "请选择性别"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"])
              ]),
              vue.createCommentVNode(" 电话号码 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "telephone" }, "电话号码"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "telephone",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.user.telephone = $event),
                    type: "text",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.telephone]
                ])
              ]),
              vue.createCommentVNode(" 密码 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "password" }, "密码"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "password",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.user.password = $event),
                    type: "password",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.password]
                ])
              ]),
              vue.createCommentVNode(" 确认密码 "),
              vue.createElementVNode("div", { class: "input-group" }, [
                vue.createElementVNode("label", { for: "confirmPassword" }, "确认密码"),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    id: "confirmPassword",
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.user.confirmPassword = $event),
                    type: "password",
                    class: "input",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.user.confirmPassword]
                ])
              ]),
              vue.createCommentVNode(" 注册按钮 "),
              vue.createElementVNode("div", { class: "button-group" }, [
                vue.createElementVNode("button", {
                  class: "primary-button",
                  onClick: _cache[7] || (_cache[7] = vue.withModifiers((...args) => $options.register && $options.register(...args), ["prevent"]))
                }, " 注册 ")
              ])
            ],
            512
            /* NEED_PATCH */
          )
        ]),
        vue.createElementVNode("view", { class: "register-link" }, [
          vue.createElementVNode("button", {
            class: "default-button",
            onClick: _cache[8] || (_cache[8] = (...args) => $options.goToLogin && $options.goToLogin(...args))
          }, " 已有账号？去登录 ")
        ])
      ])
    ]);
  }
  const PagesIndexRegister = /* @__PURE__ */ _export_sfc(_sfc_main$f, [["render", _sfc_render$e], ["__scopeId", "data-v-224dede7"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/register.vue"]]);
  const addCar = async (carData) => {
    try {
      const res2 = await post("/user/cars/add", carData, {
        showLoading: true,
        loadingText: "正在添加车辆..."
      });
      return res2;
    } catch (error) {
      formatAppLog("error", "at api/car.js:13", "添加车辆失败:", error);
      throw error;
    }
  };
  const updateCar = async (userId, oldPlateNumber, carData) => {
    try {
      const res2 = await put(`/user/cars/${userId}/${oldPlateNumber}`, carData, {
        showLoading: true,
        loadingText: "正在更新车辆信息..."
      });
      return res2;
    } catch (error) {
      formatAppLog("error", "at api/car.js:27", "更新车辆失败:", error);
      throw error;
    }
  };
  const unbindCar = async (userId, plateNumber) => {
    try {
      const res2 = await del(`/user/cars/${userId}/${plateNumber}`, {}, {
        showLoading: true,
        loadingText: "正在解绑车辆..."
      });
      return res2;
    } catch (error) {
      formatAppLog("error", "at api/car.js:41", "解绑车辆失败:", error);
      throw error;
    }
  };
  const validatePlateNumber = (plateNumber) => {
    const pattern = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-HJ-NP-Z]([A-HJ-NP-Z0-9]{4}[A-HJ-NP-Z0-9挂学警港澳]|[0-9]{5})$/;
    return pattern.test(plateNumber);
  };
  const _sfc_main$e = {
    components: {
      NavigationBar
    },
    data() {
      return {
        user: {
          avatar: "/static/user.jpeg",
          name: "jyd777",
          age: 20,
          gender: "女"
        },
        userCars: [],
        showModal: false,
        modalTitle: "添加车牌",
        submitButtonText: "确定",
        isEditing: false,
        editingPlateNumber: "",
        provinces: ["沪", "京", "津", "渝", "冀", "晋", "辽", "吉", "黑", "苏", "浙", "皖", "闽", "赣", "鲁", "豫", "鄂", "湘", "粤", "琼", "川", "贵", "云", "陕", "甘", "青", "蒙", "桂", "宁", "新", "藏", "港", "澳"],
        lettersNumbers: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
        plateInputs: Array(7).fill(""),
        plateColor: "blue",
        colorOptions: ["蓝牌", "黄牌", "白牌", "黑牌", "绿牌", "黄绿牌", "临牌"],
        colorMap: {
          blue: "#1E90FF",
          yellow: "#FFD700",
          white: "#FFFFFF",
          black: "#000000",
          green: "#32CD32",
          "yellow-green": "#ADFF2F",
          temporary: "#FFA500"
        },
        isLoading: false,
        seatCount: 4
      };
    },
    mounted() {
      this.fetchUserCars();
    },
    methods: {
      // 颜色选择变化
      onColorChange(e) {
        const colorKeys = Object.keys(this.colorMap);
        this.plateColor = colorKeys[e.detail.value];
      },
      // 省份选择变化
      onProvinceChange(e) {
        this.plateInputs[0] = this.provinces[e.detail.value];
      },
      // 字母选择变化
      onLetterChange(e) {
        this.plateInputs[1] = this.lettersNumbers[e.detail.value];
      },
      getColorName(colorName) {
        const map = {
          "yellow-green": "黄绿牌",
          "temporary": "临牌",
          "blue": "蓝牌",
          "yellow": "黄牌",
          "white": "白牌",
          "black": "黑牌",
          "green": "绿牌"
        };
        return map[colorName] || colorName + "牌";
      },
      openAddPlateModal() {
        this.modalTitle = "添加车牌";
        this.submitButtonText = "确定";
        this.isEditing = false;
        this.showModal = true;
      },
      openEditModal(plate) {
        this.modalTitle = "修改车辆信息";
        this.submitButtonText = "保存";
        this.isEditing = true;
        this.editingPlateNumber = plate.number;
        this.plateInputs = [
          plate.number.substring(0, 1),
          // 省份
          plate.number.substring(1, 2),
          // 字母
          ...plate.number.substring(2).split("")
          // 剩余字符
        ];
        this.plateColor = plate.color;
        this.carModel = plate.model || "";
        this.seatCount = plate.seats || 4;
        this.showModal = true;
      },
      closeModal() {
        this.showModal = false;
        this.resetPlateForm();
      },
      resetPlateForm() {
        this.plateInputs = Array(7).fill("");
        this.plateColor = "blue";
        this.carModel = "";
        this.seatCount = 4;
        this.isEditing = false;
        this.editingPlateNumber = "";
      },
      async fetchUserCars() {
        this.isLoading = true;
        try {
          const res2 = await fetchCars();
          formatAppLog("log", "at pages/index/car_manage.vue:233", "fetch car res", res2);
          if (res2.data.count === 0) {
            formatAppLog("log", "at pages/index/car_manage.vue:237", "车辆列表为空");
            this.userCars = [];
            return;
          }
          const carsArray = Object.values(res2.data.vehicles);
          this.userCars = carsArray.map((car) => ({
            car_id: car.car_id,
            number: car.plate_number,
            model: car.brand_model,
            color: car.color || "blue",
            // 默认颜色
            seats: car.seats || 4
            // 默认座位数
          }));
          formatAppLog("log", "at pages/index/car_manage.vue:254", this.userCars);
          if (this.userCars.length === 0) {
            uni.showToast({
              title: "您还没有添加车辆，请点击下方按钮添加",
              icon: "none",
              duration: 3e3
            });
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/car_manage.vue:265", "获取车辆列表失败:", error);
          this.userCars = [];
          uni.showToast({
            title: "获取车辆列表失败，请稍后重试",
            icon: "none",
            duration: 2e3
          });
        } finally {
          this.isLoading = false;
        }
      },
      // 新的按钮点击处理方法
      handleButtonClick() {
        if (!this.validateForm()) {
          return;
        }
        if (this.isEditing) {
          this.updatePlate();
        } else {
          this.addPlate();
        }
      },
      // 表单验证方法
      validateForm() {
        const plateNumber = this.plateInputs.join("");
        if (!validatePlateNumber(plateNumber)) {
          uni.showToast({
            title: "请输入有效的车牌号",
            icon: "none",
            duration: 2e3
          });
          return false;
        }
        if (!this.plateColor || !this.carModel || !this.seatCount) {
          uni.showToast({
            title: "请填写完整信息",
            icon: "none",
            duration: 2e3
          });
          return false;
        }
        return true;
      },
      // 修改 addPlate 方法
      async addPlate() {
        const plateNumber = this.plateInputs.join("");
        if (!validatePlateNumber(plateNumber)) {
          uni.showToast({
            title: "请输入有效的车牌号",
            icon: "none",
            duration: 2e3
          });
          return;
        }
        this.isLoading = true;
        try {
          const request_data = {
            number: plateNumber,
            color: this.plateColor,
            model: this.carModel,
            seats: this.seatCount
          };
          const res2 = await addCar(request_data);
          let failMsg = "车辆信息不匹配";
          formatAppLog("log", "at pages/index/car_manage.vue:344", res2.message);
          if (res2.message === "车辆信息不匹配") {
            failMsg = "车辆信息不匹配";
            uni.showToast({
              title: failMsg,
              icon: "none",
              duration: 2e3
            });
          } else {
            let successMsg = "添加成功";
            if (res2.message === "关联成功") {
              successMsg = "关联成功";
            } else if (res2.message === "车辆已关联") {
              successMsg = "该车辆已关联";
            }
            uni.showToast({
              title: successMsg,
              icon: "success",
              duration: 2e3
            });
            await this.fetchUserCars();
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/car_manage.vue:369", "操作失败:", error);
          uni.showToast({
            title: "操作失败，请稍后重试",
            icon: "none",
            duration: 2e3
          });
        } finally {
          this.closeModal();
          this.isLoading = false;
        }
      },
      // 修改 updatePlate 方法
      async updatePlate() {
        const plateNumber = this.plateInputs.join("");
        if (!validatePlateNumber(plateNumber)) {
          uni.showToast({
            title: "请输入有效的车牌号",
            icon: "none",
            duration: 2e3
          });
          return;
        }
        this.isLoading = true;
        try {
          const userId = uni.getStorageSync("user_id");
          const res2 = await updateCar(userId, this.editingPlateNumber, {
            number: plateNumber,
            color: this.plateColor,
            model: this.carModel,
            seats: this.seatCount
          });
          let failMsg = "车辆信息不匹配";
          formatAppLog("log", "at pages/index/car_manage.vue:405", res2.message);
          if (res2.message === "车辆信息不匹配") {
            failMsg = "车辆信息不匹配";
            uni.showToast({
              title: failMsg,
              icon: "none",
              duration: 2e3
            });
          } else {
            let successMsg = "修改成功";
            if (res2.message === "合并成功") {
              successMsg = "车辆信息已合并";
            }
            formatAppLog("log", "at pages/index/car_manage.vue:418", "ok");
            uni.showToast({
              title: successMsg,
              icon: "success",
              duration: 2e3
            });
            await this.fetchUserCars();
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/car_manage.vue:428", "修改车牌失败:", error);
          uni.showToast({
            title: "操作失败，请稍后重试",
            icon: "none",
            duration: 2e3
          });
        } finally {
          this.closeModal();
          this.isLoading = false;
        }
      },
      // 修改 unbindCar 方法
      unbindCar(plateNumber) {
        uni.showModal({
          title: "提示",
          content: "确定要解绑车牌吗？",
          success: async (res2) => {
            if (res2.confirm) {
              this.isLoading = true;
              try {
                const userId = uni.getStorageSync("user_id");
                const response = await unbindCar(userId, plateNumber);
                if (response.code === 200) {
                  uni.showToast({
                    title: "解绑成功",
                    icon: "success",
                    duration: 2e3
                  });
                  await this.fetchUserCars();
                } else {
                  uni.showToast({
                    title: response.message || "解绑失败",
                    icon: "none",
                    duration: 2e3
                  });
                }
              } catch (error) {
                formatAppLog("error", "at pages/index/car_manage.vue:467", "解绑车牌失败:", error);
                uni.showToast({
                  title: "操作失败，请稍后重试",
                  icon: "none",
                  duration: 2e3
                });
              } finally {
                this.isLoading = false;
              }
            }
          }
        });
      }
    }
  };
  function _sfc_render$d(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock("div", { class: "user-profile-container" }, [
      vue.createVNode(_component_NavigationBar),
      vue.createCommentVNode(" 车牌信息卡片 "),
      vue.createElementVNode("div", { class: "car-info-card" }, [
        vue.createElementVNode("div", { class: "car-scroll" }, [
          vue.createCommentVNode(" 已登记的车牌列表 "),
          vue.createElementVNode("div", { id: "plateList" }, [
            $data.userCars.length === 0 ? (vue.openBlock(), vue.createElementBlock("div", {
              key: 0,
              class: "no-plate-tip"
            }, [
              vue.createElementVNode("text", null, "暂无绑定车牌")
            ])) : vue.createCommentVNode("v-if", true),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.userCars, (plate) => {
                return vue.openBlock(), vue.createElementBlock("div", {
                  class: "plate-item",
                  key: plate.number
                }, [
                  vue.createElementVNode("div", { class: "plate-info" }, [
                    vue.createElementVNode("i", { class: "fa-solid fa-car" }),
                    vue.createElementVNode(
                      "span",
                      {
                        class: "plate-number",
                        style: { "font-weight": "bold" }
                      },
                      vue.toDisplayString(plate.number),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode(
                      "span",
                      {
                        class: "color-badge",
                        style: vue.normalizeStyle({
                          backgroundColor: $data.colorMap[plate.color] || plate.color,
                          border: "2px solid rgb(100, 100, 100)"
                        })
                      },
                      null,
                      4
                      /* STYLE */
                    ),
                    plate.model ? (vue.openBlock(), vue.createElementBlock(
                      "span",
                      {
                        key: 0,
                        class: "car-model"
                      },
                      vue.toDisplayString(plate.model),
                      1
                      /* TEXT */
                    )) : vue.createCommentVNode("v-if", true)
                  ]),
                  vue.createElementVNode("div", { class: "plate-actions" }, [
                    vue.createElementVNode("button", {
                      class: "edit-button",
                      onClick: ($event) => $options.openEditModal(plate)
                    }, "修改", 8, ["onClick"]),
                    vue.createElementVNode("button", {
                      class: "unbind-button",
                      onClick: ($event) => $options.unbindCar(plate.number)
                    }, "解绑", 8, ["onClick"])
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ]),
        vue.createCommentVNode(" 添加车牌按钮 "),
        vue.createElementVNode("button", {
          class: "add-plate-button",
          onClick: _cache[0] || (_cache[0] = (...args) => $options.openAddPlateModal && $options.openAddPlateModal(...args))
        }, "添加车牌")
      ]),
      vue.createCommentVNode(" 添加车牌模态窗口 "),
      $data.showModal ? (vue.openBlock(), vue.createElementBlock("div", {
        key: 0,
        class: "modal"
      }, [
        vue.createElementVNode("div", { class: "modal-content" }, [
          vue.createElementVNode("span", {
            class: "close",
            onClick: _cache[1] || (_cache[1] = (...args) => $options.closeModal && $options.closeModal(...args))
          }, "×"),
          vue.createElementVNode(
            "h2",
            { style: { "margin-bottom": "20px" } },
            vue.toDisplayString($data.modalTitle),
            1
            /* TEXT */
          ),
          vue.createElementVNode("div", { class: "form-container" }, [
            vue.createElementVNode("div", { class: "form-group" }, [
              vue.createElementVNode("label", { for: "plateNumber" }, "车牌号码:"),
              vue.createElementVNode("div", { class: "plate-input-group" }, [
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.provinces,
                  onChange: _cache[2] || (_cache[2] = (...args) => $options.onProvinceChange && $options.onProvinceChange(...args)),
                  class: "plate-picker"
                }, [
                  vue.createElementVNode(
                    "div",
                    { class: "picker-content" },
                    vue.toDisplayString($data.plateInputs[0] || "省份"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"]),
                vue.createCommentVNode(" 字母选择器 "),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.lettersNumbers,
                  onChange: _cache[3] || (_cache[3] = (...args) => $options.onLetterChange && $options.onLetterChange(...args)),
                  class: "plate-picker"
                }, [
                  vue.createElementVNode(
                    "div",
                    { class: "picker-content" },
                    vue.toDisplayString($data.plateInputs[1] || "字母"),
                    1
                    /* TEXT */
                  )
                ], 40, ["range"]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.plateInputs[2] = $event),
                    class: "plate-input",
                    maxlength: "1",
                    pattern: "[A-Z0-9]",
                    placeholder: "A",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.plateInputs[2]]
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.plateInputs[3] = $event),
                    class: "plate-input",
                    maxlength: "1",
                    pattern: "[A-Z0-9]",
                    placeholder: "1",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.plateInputs[3]]
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.plateInputs[4] = $event),
                    class: "plate-input",
                    maxlength: "1",
                    pattern: "[A-Z0-9]",
                    placeholder: "2",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.plateInputs[4]]
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => $data.plateInputs[5] = $event),
                    class: "plate-input",
                    maxlength: "1",
                    pattern: "[A-Z0-9]",
                    placeholder: "3",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.plateInputs[5]]
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    type: "text",
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => $data.plateInputs[6] = $event),
                    class: "plate-input",
                    maxlength: "1",
                    pattern: "[A-Z0-9]",
                    placeholder: "4",
                    required: ""
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.plateInputs[6]]
                ])
              ])
            ]),
            vue.createElementVNode("div", { class: "form-group" }, [
              vue.createElementVNode("label", { for: "plateColor" }, "车牌颜色:"),
              vue.createElementVNode("picker", {
                mode: "selector",
                range: $data.colorOptions,
                onChange: _cache[9] || (_cache[9] = (...args) => $options.onColorChange && $options.onColorChange(...args)),
                class: "color-picker"
              }, [
                vue.createElementVNode("div", { class: "picker-content" }, [
                  vue.createCommentVNode(" 移除动态颜色样式 "),
                  vue.createTextVNode(
                    " " + vue.toDisplayString($options.getColorName($data.plateColor) || "选择颜色"),
                    1
                    /* TEXT */
                  )
                ])
              ], 40, ["range"])
            ]),
            vue.createElementVNode("div", { class: "form-group" }, [
              vue.createElementVNode("label", { for: "carModel" }, "车辆型号:"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  type: "text",
                  "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => _ctx.carModel = $event),
                  id: "carModel",
                  class: "color-select",
                  placeholder: "请输入车辆型号",
                  required: ""
                },
                null,
                512
                /* NEED_PATCH */
              ), [
                [vue.vModelText, _ctx.carModel]
              ])
            ]),
            vue.createElementVNode("div", { class: "form-group" }, [
              vue.createElementVNode("label", { for: "seatCount" }, "座位数量:"),
              vue.withDirectives(vue.createElementVNode(
                "input",
                {
                  type: "number",
                  "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $data.seatCount = $event),
                  id: "seatCount",
                  class: "color-select",
                  min: "1",
                  max: "20",
                  placeholder: "请输入座位数",
                  required: "",
                  onKeypress: _cache[12] || (_cache[12] = (...args) => _ctx.validateNumberInput && _ctx.validateNumberInput(...args))
                },
                null,
                544
                /* NEED_HYDRATION, NEED_PATCH */
              ), [
                [
                  vue.vModelText,
                  $data.seatCount,
                  void 0,
                  { number: true }
                ]
              ])
            ]),
            vue.createElementVNode(
              "button",
              {
                class: "confirm-btn",
                onClick: _cache[13] || (_cache[13] = (...args) => $options.handleButtonClick && $options.handleButtonClick(...args))
              },
              vue.toDisplayString($data.submitButtonText),
              1
              /* TEXT */
            )
          ])
        ])
      ])) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const PagesIndexCarManage = /* @__PURE__ */ _export_sfc(_sfc_main$e, [["render", _sfc_render$d], ["__scopeId", "data-v-f62f82f0"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/car_manage.vue"]]);
  const _imports_0$2 = "/static/arrow-down.png";
  const _sfc_main$d = {
    data() {
      return {
        statusOptions: [
          { name: "全部", value: "all" },
          { name: "待审核", value: "pending" },
          { name: "已通过", value: "approved" },
          { name: "已拒绝", value: "rejected" }
        ],
        statusIndex: 1,
        // 默认显示待审核
        typeOptions: [
          { name: "全部", value: "all" },
          { name: "乘客", value: "passenger" },
          { name: "车主", value: "driver" }
        ],
        typeIndex: 0,
        years: ["", "2023", "2024", "2025"],
        yearIndex: 0,
        months: ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        monthIndex: 0,
        orders: []
        // 初始化为空数组，从API获取数据
      };
    },
    computed: {
      filteredOrders() {
        let filtered = this.orders;
        return filtered;
      }
    },
    methods: {
      async fetchOrders() {
        try {
          const params = {
            status: this.statusOptions[this.statusIndex].value,
            type: this.typeOptions[this.typeIndex].value,
            year: this.years[this.yearIndex] || "",
            month: this.months[this.monthIndex] || ""
          };
          const orders = await fetchManagedOrders(params);
          this.orders = orders;
        } catch (error) {
          uni.showToast({
            title: error.message || "获取订单失败",
            icon: "none"
          });
          formatAppLog("error", "at pages/index/manage.vue:146", "获取订单失败:", error);
        } finally {
          this.loading = false;
        }
      },
      async approveOrder(orderId) {
        try {
          await approveOrder(orderId);
          uni.showToast({
            title: "已通过审核",
            icon: "success"
          });
          this.fetchOrders();
        } catch (error) {
          uni.showToast({
            title: error.message || "操作失败",
            icon: "none"
          });
          formatAppLog("error", "at pages/index/manage.vue:165", "审核通过失败:", error);
        }
      },
      async rejectOrder(orderId) {
        uni.showModal({
          title: "输入拒绝原因",
          editable: true,
          placeholderText: "请输入拒绝原因",
          success: async (res2) => {
            if (res2.confirm && res2.content) {
              try {
                await rejectOrder(orderId, res2.content);
                uni.showToast({
                  title: "已拒绝该订单",
                  icon: "success"
                });
                this.fetchOrders();
              } catch (error) {
                uni.showToast({
                  title: error.message || "操作失败",
                  icon: "none"
                });
                formatAppLog("error", "at pages/index/manage.vue:188", "拒绝订单失败:", error);
              }
            }
          }
        });
      },
      getStatusClass(status) {
        return {
          "status-pending": status === "pending",
          "status-approved": status !== "pending" && status !== "rejected",
          "status-rejected": status === "rejected"
        };
      },
      getStatusText(status) {
        if (status === "pending")
          return "待审核";
        if (status === "rejected")
          return "已拒绝";
        return "已通过";
      },
      onStatusChange(e) {
        this.statusIndex = e.detail.value;
        this.fetchOrders();
      },
      onTypeChange(e) {
        this.typeIndex = e.detail.value;
        this.fetchOrders();
      },
      onYearChange(e) {
        this.yearIndex = e.detail.value;
        this.monthIndex = 0;
        this.fetchOrders();
      },
      onMonthChange(e) {
        this.monthIndex = e.detail.value;
        this.fetchOrders();
      }
    },
    mounted() {
      this.fetchOrders();
    },
    components: {
      NavigationBar
    }
  };
  function _sfc_render$c(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createElementVNode("div", null, [
          vue.createCommentVNode(" 使用 NavigationBar 组件 "),
          vue.createVNode(_component_NavigationBar),
          vue.createCommentVNode(" 其他内容 ")
        ]),
        vue.createElementVNode("view", { class: "container" }, [
          vue.createElementVNode("view", { class: "filter-bar" }, [
            vue.createElementVNode("view", { class: "filter-group" }, [
              vue.createElementVNode("picker", {
                onChange: _cache[0] || (_cache[0] = (...args) => $options.onStatusChange && $options.onStatusChange(...args)),
                value: $data.statusIndex,
                range: $data.statusOptions,
                "range-key": "name"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    " 审核状态: " + vue.toDisplayString($data.statusOptions[$data.statusIndex].name) + " ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"])
            ]),
            vue.createElementVNode("view", { class: "time-filters" }, [
              vue.createElementVNode("picker", {
                onChange: _cache[1] || (_cache[1] = (...args) => $options.onYearChange && $options.onYearChange(...args)),
                value: $data.yearIndex,
                range: $data.years,
                class: "time-picker"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    vue.toDisplayString($data.years[$data.yearIndex] || "--") + "年 ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"]),
              vue.createElementVNode("picker", {
                onChange: _cache[2] || (_cache[2] = (...args) => $options.onMonthChange && $options.onMonthChange(...args)),
                value: $data.monthIndex,
                range: $data.months,
                class: "time-picker"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    vue.toDisplayString($data.months[$data.monthIndex] || "--") + "月 ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"])
            ]),
            vue.createElementVNode("view", { class: "filter-group" }, [
              vue.createElementVNode("picker", {
                onChange: _cache[3] || (_cache[3] = (...args) => $options.onTypeChange && $options.onTypeChange(...args)),
                value: $data.typeIndex,
                range: $data.typeOptions,
                "range-key": "name"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    " 订单类型: " + vue.toDisplayString($data.typeOptions[$data.typeIndex].name) + " ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"])
            ])
          ]),
          vue.createElementVNode("scroll-view", {
            class: "order-scroll",
            "scroll-y": "true",
            style: { "height": "calc(100vh - 200px)" }
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.filteredOrders, (order) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "order-info",
                  key: order.id
                }, [
                  vue.createElementVNode("view", { class: "order-card" }, [
                    vue.createElementVNode("view", { class: "order-header" }, [
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString(order.date),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode(
                        "view",
                        {
                          class: vue.normalizeClass(["status-badge", $options.getStatusClass(order.status)])
                        },
                        vue.toDisplayString($options.getStatusText(order.status)),
                        3
                        /* TEXT, CLASS */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "order-details" }, [
                      vue.createElementVNode("view", { class: "start-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_1$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.startPoint),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "departure-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_2$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.endPoint),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "separator" }),
                    vue.createElementVNode("view", { class: "order-summary" }, [
                      vue.createElementVNode("view", { class: "summary-content" }, [
                        vue.createElementVNode("image", {
                          src: order.userAvatar,
                          class: "user-avatar"
                        }, null, 8, ["src"]),
                        vue.createElementVNode("view", { class: "car-info" }, [
                          vue.createElementVNode("view", { class: "car-type-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "car-type" },
                              vue.toDisplayString(order.carType || "无车辆信息"),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "order-count-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "order-count" },
                              "发布人: " + vue.toDisplayString(order.publisher),
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "price-info" }, [
                          vue.createElementVNode(
                            "text",
                            {
                              class: "price-text",
                              style: { "color": "#003366", "font-weight": "bold" }
                            },
                            vue.toDisplayString(order.price) + "元",
                            1
                            /* TEXT */
                          )
                        ])
                      ])
                    ]),
                    order.status === "pending" ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "audit-actions"
                    }, [
                      vue.createElementVNode("view", { class: "action-buttons" }, [
                        vue.createElementVNode("button", {
                          class: "reject-btn",
                          onClick: ($event) => $options.rejectOrder(order.id)
                        }, "拒绝", 8, ["onClick"]),
                        vue.createElementVNode("button", {
                          class: "approve-btn",
                          onClick: ($event) => $options.approveOrder(order.id)
                        }, "通过", 8, ["onClick"])
                      ])
                    ])) : vue.createCommentVNode("v-if", true),
                    order.status === "rejected" && order.rejectReason ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 1,
                      class: "audit-reason"
                    }, [
                      vue.createElementVNode(
                        "text",
                        null,
                        "拒绝原因: " + vue.toDisplayString(order.rejectReason),
                        1
                        /* TEXT */
                      )
                    ])) : vue.createCommentVNode("v-if", true)
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexManage = /* @__PURE__ */ _export_sfc(_sfc_main$d, [["render", _sfc_render$c], ["__scopeId", "data-v-4652816d"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/manage.vue"]]);
  const _sfc_main$c = {
    components: {
      NavigationBar
    },
    data() {
      return {
        identity: "driver",
        // 默认身份 'driver' 或 'passenger'
        order_type: "车找人",
        // 订单类型 "车找人" "人找车"
        startAddress: "",
        // 起点名称
        endAddress: "",
        // 终点名称
        startSuggestions: [],
        // 起点建议列表
        endSuggestions: [],
        // 终点建议列表
        startPos: null,
        // 起点坐标 [经度, 纬度]
        endPos: null,
        // 终点坐标 [经度, 纬度]
        centerLat: 31.238,
        // 默认地图中心纬度 (上海市大致中心)
        centerLng: 121.48,
        // 默认地图中心经度 (上海市大致中心)
        zoom: 14,
        // 地图缩放级别
        markers: [],
        // 地图标记点
        polyline: [],
        // 地图路线
        departureDate: "",
        // 出发日期 YYYY-MM-DD
        departureTime: "",
        // 出发时间 HH:MM
        vehiclePlateNumbers: [],
        // 用户车辆列表 (从后端获取)
        selectedVehicle: null,
        // 用户选择的车辆对象 { id, plateNumber, seats, carType }
        availableSeats: [],
        // 可选的剩余座位数 [1, 2, ...]
        selectedSeats: null,
        // 司机选择的剩余座位数 (数字)
        price: "",
        // 价格预期 (字符串，后端处理为数字)
        currentDate: "",
        // 当前日期，用于限制日期选择器的起始日期
        mapContext: null,
        // 地图上下文对象
        passengerCount: 1,
        // 乘客选择的同乘人数 (默认1)
        passengerCountOptions: Array.from({ length: 10 }, (_, i) => i + 1),
        // 可选同乘人数 [1, 2, ..., 10]
        isPublishing: false,
        // 是否正在发布中 (防止重复点击)
        userId: null,
        // 当前登录用户的 ID (需要从本地存储获取)
        amapKey: "fa43ec73e8fbb3d4177fbe51747d764b"
        // 高德Web服务API Key
      };
    },
    onLoad() {
      const storedUserId = uni.getStorageSync("user_info").userId;
      if (storedUserId) {
        this.userId = parseInt(storedUserId);
        formatAppLog("log", "at pages/index/order_launch.vue:229", "当前用户 ID:", this.userId);
        this.fetchVehicleList();
      } else {
        formatAppLog("error", "at pages/index/order_launch.vue:232", "未能获取到用户 ID，请确保用户已登录!");
        uni.showModal({
          title: "提示",
          content: "您尚未登录，无法发布订单。是否前往登录？",
          success: (res2) => {
            if (res2.confirm) {
              uni.navigateTo({ url: "/pages/login" });
            } else {
              uni.navigateBack();
            }
          }
        });
      }
    },
    mounted() {
      this.initCurrentDateTime();
      this.initMap();
    },
    methods: {
      initCurrentDateTime() {
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, "0");
        const day = now.getDate().toString().padStart(2, "0");
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        this.currentDate = `${year}-${month}-${day}`;
        this.departureDate = this.currentDate;
        this.departureTime = `${hours}:${minutes}`;
      },
      initMap() {
        this.$nextTick(() => {
          this.mapContext = uni.createMapContext("uni-map", this);
          if (!this.mapContext) {
            formatAppLog("error", "at pages/index/order_launch.vue:267", "创建 map context 失败");
          }
        });
      },
      async fetchVehicleList() {
        if (!this.userId)
          return;
        uni.showLoading({ title: "加载车辆..." });
        try {
          const res2 = await fetchCars();
          if (Array.isArray(res2.data.vehicles)) {
            this.vehicleList = res2.data.vehicles;
            this.vehiclePlateNumbers = res2.data.vehicles.map((vehicle) => vehicle.plate_number);
            formatAppLog("log", "at pages/index/order_launch.vue:281", "从后端获取车辆列表成功:", this.vehicleList);
            if (this.vehicleList.length === 0 && this.identity === "driver") {
              uni.showToast({ title: "您还未添加车辆信息", icon: "none" });
            }
          } else {
            formatAppLog("error", "at pages/index/order_launch.vue:286", "获取车辆列表失败:", res2);
            uni.showToast({ title: "加载车辆失败", icon: "none" });
            this.vehicleList = [];
            this.vehiclePlateNumbers = [];
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/order_launch.vue:292", "请求车辆列表接口异常:", error);
          uni.showToast({ title: "网络错误，加载车辆失败", icon: "none" });
          this.vehicleList = [];
          this.vehiclePlateNumbers = [];
        } finally {
          uni.hideLoading();
        }
      },
      handleStartInput() {
        if (this.startAddress.length > 1) {
          this.searchAddress(this.startAddress, "start");
        } else {
          this.startSuggestions = [];
        }
      },
      handleEndInput() {
        if (this.endAddress.length > 1) {
          this.searchAddress(this.endAddress, "end");
        } else {
          this.endSuggestions = [];
        }
      },
      async searchAddress(query, type) {
        try {
          const res2 = await uni.request({
            url: "https://restapi.amap.com/v3/assistant/inputtips",
            data: {
              keywords: query,
              key: this.amapKey,
              city: "上海",
              output: "JSON"
            }
          });
          if (res2.statusCode === 200 && res2.data.status === "1" && Array.isArray(res2.data.tips)) {
            const suggestions = res2.data.tips.filter((tip) => tip.location && typeof tip.location === "string" && tip.location.includes(",")).map((tip) => ({
              name: tip.name,
              address: tip.address || "",
              location: tip.location.split(",")
            }));
            if (type === "start") {
              this.startSuggestions = suggestions;
            } else {
              this.endSuggestions = suggestions;
            }
          } else {
            if (type === "start")
              this.startSuggestions = [];
            else
              this.endSuggestions = [];
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/order_launch.vue:345", "地址搜索 API 请求失败:", error);
          if (type === "start")
            this.startSuggestions = [];
          else
            this.endSuggestions = [];
        }
      },
      selectStartAddress(item) {
        this.startAddress = item.name;
        const lng = parseFloat(item.location[0]);
        const lat = parseFloat(item.location[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          this.startPos = [lng, lat];
        } else {
          formatAppLog("error", "at pages/index/order_launch.vue:357", "选择的起点坐标无效:", item.location);
          this.startPos = null;
          uni.showToast({ title: "起点位置信息无效", icon: "none" });
        }
        this.startSuggestions = [];
        this.updateMap();
      },
      selectEndAddress(item) {
        this.endAddress = item.name;
        const lng = parseFloat(item.location[0]);
        const lat = parseFloat(item.location[1]);
        if (!isNaN(lng) && !isNaN(lat)) {
          this.endPos = [lng, lat];
        } else {
          formatAppLog("error", "at pages/index/order_launch.vue:371", "选择的终点坐标无效:", item.location);
          this.endPos = null;
          uni.showToast({ title: "终点位置信息无效", icon: "none" });
        }
        this.endSuggestions = [];
        this.updateMap();
      },
      async updateMap() {
        if (this.startPos && this.endPos) {
          this.centerLng = this.startPos[0];
          this.centerLat = this.startPos[1];
          this.markers = [
            {
              id: 1,
              latitude: this.startPos[1],
              longitude: this.startPos[0],
              title: "起点",
              iconPath: "../../static/start.png",
              width: 20,
              height: 20
            },
            {
              id: 2,
              latitude: this.endPos[1],
              longitude: this.endPos[0],
              title: "终点",
              iconPath: "../../static/dest.png",
              width: 20,
              height: 20
            }
          ];
          await this.drawRoute();
        }
      },
      async drawRoute() {
        if (!this.startPos || !this.endPos || isNaN(this.startPos[0]) || isNaN(this.startPos[1]) || isNaN(this.endPos[0]) || isNaN(this.endPos[1])) {
          this.polyline = [];
          return;
        }
        try {
          const res2 = await uni.request({
            url: "https://restapi.amap.com/v3/direction/driving",
            data: {
              origin: this.startPos.join(","),
              destination: this.endPos.join(","),
              key: this.amapKey
            }
          });
          if (res2.statusCode === 200 && res2.data.status === "1" && res2.data.route && res2.data.route.paths && res2.data.route.paths.length > 0) {
            const path = res2.data.route.paths[0];
            let pointsArr = [];
            path.steps.forEach((step) => {
              if (step.polyline) {
                step.polyline.split(";").forEach((pointStr) => {
                  if (pointStr) {
                    const coords = pointStr.split(",");
                    if (coords.length === 2) {
                      const lng = parseFloat(coords[0]);
                      const lat = parseFloat(coords[1]);
                      if (!isNaN(lng) && !isNaN(lat)) {
                        pointsArr.push({ latitude: lat, longitude: lng });
                      }
                    }
                  }
                });
              }
            });
            if (pointsArr.length > 0) {
              this.polyline = [{
                points: pointsArr,
                color: "#007AFF",
                width: 6,
                dottedLine: false
              }];
            } else {
              this.polyline = [];
            }
          } else {
            formatAppLog("warn", "at pages/index/order_launch.vue:456", "高德路线规划失败或无路径:", res2.data.info);
            this.polyline = [];
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/order_launch.vue:460", "路线规划 API 请求失败:", error);
          this.polyline = [];
        }
      },
      handleDateChange(e) {
        this.departureDate = e.detail.value;
      },
      handleTimeChange(e) {
        this.departureTime = e.detail.value;
      },
      handleVehicleChange(e) {
        const index = parseInt(e.detail.value);
        formatAppLog("log", "at pages/index/order_launch.vue:472", "选择的车辆索引:", index);
        if (isNaN(index) || index < 0 || index >= this.vehicleList.length) {
          this.selectedVehicle = null;
          this.availableSeats = ["请先选择车辆"];
        } else {
          this.selectedVehicle = this.vehicleList[index];
          formatAppLog("log", "at pages/index/order_launch.vue:478", "选择的车辆:", this.selectedVehicle);
          if (this.selectedVehicle && this.selectedVehicle.seats > 1) {
            this.availableSeats = Array.from(
              { length: this.selectedVehicle.seats - 1 },
              (_, i) => i + 1
            );
          } else {
            this.availableSeats = [];
          }
        }
        this.selectedSeats = null;
      },
      handleSeatChange(e) {
        if (!this.selectedVehicle) {
          uni.showToast({ title: "请先选择车辆", icon: "none" });
          return;
        }
        const index = parseInt(e.detail.value);
        if (!isNaN(index) && index >= 0 && index < this.availableSeats.length) {
          const selectedSeat = this.availableSeats[index];
          if (selectedSeat === "请先选择车辆") {
            uni.showToast({ title: "请先选择车辆", icon: "none" });
            this.selectedSeats = null;
          } else {
            this.selectedSeats = selectedSeat;
          }
        } else {
          this.selectedSeats = null;
        }
      },
      handlePassengerCountChange(e) {
        const index = parseInt(e.detail.value);
        if (!isNaN(index) && index >= 0 && index < this.passengerCountOptions.length) {
          this.passengerCount = this.passengerCountOptions[index];
        } else {
          this.passengerCount = 1;
        }
      },
      async handlePublish() {
        if (this.isPublishing)
          return;
        if (!this.userId) {
          uni.showToast({ title: "无法获取用户信息，请重新登录", icon: "none" });
          return;
        }
        if (!this.startAddress || !this.endAddress || !this.startPos || !this.endPos) {
          uni.showToast({ title: "请选择有效的起点和终点", icon: "none" });
          return;
        }
        if (!this.departureDate || !this.departureTime) {
          uni.showToast({ title: "请选择出发日期和时间", icon: "none" });
          return;
        }
        const selectedDateTime = /* @__PURE__ */ new Date(`${this.departureDate} ${this.departureTime}`);
        if (selectedDateTime < /* @__PURE__ */ new Date()) {
          uni.showToast({ title: "出发时间不能早于当前时间", icon: "none" });
          return;
        }
        const priceFloat = parseFloat(this.price);
        if (isNaN(priceFloat) || priceFloat <= 0) {
          uni.showToast({ title: "请输入有效的价格 (大于0)", icon: "none" });
          return;
        }
        if (this.identity === "driver") {
          if (!this.selectedVehicle) {
            uni.showToast({ title: "请选择车辆", icon: "none" });
            return;
          }
          if (!this.selectedSeats) {
            uni.showToast({ title: "请选择提供的余座数", icon: "none" });
            return;
          }
        } else {
          if (!this.passengerCount || this.passengerCount < 1) {
            uni.showToast({ title: "请选择有效的同乘人数", icon: "none" });
            return;
          }
        }
        this.order_type = this.identity === "driver" ? "车找人" : "人找车";
        const orderData = {
          initiator_id: this.userId,
          identity: this.identity,
          order_type: this.order_type,
          startAddress: this.startAddress,
          endAddress: this.endAddress,
          departureTime: `${this.departureDate} ${this.departureTime}:00`,
          price: priceFloat,
          vehicleId: this.identity === "driver" ? this.selectedVehicle.id : null,
          availableSeats: this.identity === "driver" ? this.selectedSeats : null,
          carType: this.identity === "driver" && this.selectedVehicle ? this.selectedVehicle.brand_model : null,
          passengerCount: this.identity === "passenger" ? this.passengerCount : null
        };
        formatAppLog("log", "at pages/index/order_launch.vue:576", "准备发送到后端的订单数据:", orderData);
        this.isPublishing = true;
        uni.showLoading({ title: "正在发布..." });
        try {
          const res2 = await publishOrder(orderData);
          uni.hideLoading();
          if (res2.code === 200) {
            formatAppLog("log", "at pages/index/order_launch.vue:587", "订单发布成功");
            uni.showToast({
              title: `发布成功`,
              icon: "success",
              duration: 2e3
            });
            setTimeout(() => {
              uni.navigateBack();
            }, 1500);
          } else {
            formatAppLog("error", "at pages/index/order_launch.vue:599", "订单发布失败，后端返回:", res2);
            const errorMsg = res2.message || "订单发布失败，请检查信息或稍后重试";
            uni.showToast({
              title: errorMsg,
              icon: "none",
              duration: 3e3
            });
          }
        } catch (error) {
          uni.hideLoading();
          formatAppLog("error", "at pages/index/order_launch.vue:609", error);
        } finally {
          this.isPublishing = false;
        }
      }
    }
  };
  function _sfc_render$b(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createVNode(_component_NavigationBar),
        vue.createElementVNode("view", { class: "container" }, [
          vue.createCommentVNode(" 身份选择 "),
          vue.createElementVNode("view", { class: "identity-selector" }, [
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["identity-option", { "selected": $data.identity === "driver" }]),
                onClick: _cache[0] || (_cache[0] = ($event) => $data.identity = "driver")
              },
              " 我是车主/找乘客 ",
              2
              /* CLASS */
            ),
            vue.createElementVNode(
              "view",
              {
                class: vue.normalizeClass(["identity-option", { "selected": $data.identity === "passenger" }]),
                onClick: _cache[1] || (_cache[1] = ($event) => $data.identity = "passenger")
              },
              " 我是乘客/找车主 ",
              2
              /* CLASS */
            )
          ]),
          vue.createCommentVNode(" 地图容器 "),
          vue.createElementVNode("view", { class: "map-container" }, [
            vue.createElementVNode("map", {
              id: "uni-map",
              class: "map",
              latitude: $data.centerLat,
              longitude: $data.centerLng,
              markers: $data.markers,
              polyline: $data.polyline,
              "show-location": ""
            }, null, 8, ["latitude", "longitude", "markers", "polyline"])
          ]),
          vue.createCommentVNode(" 地址输入 "),
          vue.createElementVNode("view", { class: "address-container" }, [
            vue.createElementVNode("view", { class: "address-input" }, [
              vue.createElementVNode("view", { class: "input-group" }, [
                vue.createElementVNode("view", { class: "label-container" }, [
                  vue.createElementVNode("image", {
                    src: _imports_1$2,
                    class: "input-icon"
                  }),
                  vue.createElementVNode("text", { class: "input-label" }, "起点")
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.startAddress = $event),
                    onInput: _cache[3] || (_cache[3] = (...args) => $options.handleStartInput && $options.handleStartInput(...args)),
                    placeholder: "请输入起点",
                    class: "address-input-field"
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.startAddress]
                ]),
                vue.createCommentVNode(" 起点建议列表 "),
                $data.startSuggestions.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "suggestions"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.startSuggestions, (item, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: index,
                        onClick: ($event) => $options.selectStartAddress(item),
                        class: "suggestion-item"
                      }, [
                        vue.createTextVNode(
                          vue.toDisplayString(item.name) + " ",
                          1
                          /* TEXT */
                        ),
                        item.address ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            style: { "font-size": "22rpx", "color": "#888" }
                          },
                          " (" + vue.toDisplayString(item.address) + ")",
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true)
                      ], 8, ["onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : vue.createCommentVNode("v-if", true)
              ]),
              vue.createElementVNode("view", { class: "input-group" }, [
                vue.createElementVNode("view", { class: "label-container" }, [
                  vue.createElementVNode("image", {
                    src: _imports_2$2,
                    class: "input-icon"
                  }),
                  vue.createElementVNode("text", { class: "input-label" }, "终点")
                ]),
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.endAddress = $event),
                    onInput: _cache[5] || (_cache[5] = (...args) => $options.handleEndInput && $options.handleEndInput(...args)),
                    placeholder: "请输入终点",
                    class: "address-input-field"
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ), [
                  [vue.vModelText, $data.endAddress]
                ]),
                vue.createCommentVNode(" 终点建议列表 "),
                $data.endSuggestions.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
                  key: 0,
                  class: "suggestions"
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList($data.endSuggestions, (item, index) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        key: index,
                        onClick: ($event) => $options.selectEndAddress(item),
                        class: "suggestion-item"
                      }, [
                        vue.createTextVNode(
                          vue.toDisplayString(item.name) + " ",
                          1
                          /* TEXT */
                        ),
                        item.address ? (vue.openBlock(), vue.createElementBlock(
                          "text",
                          {
                            key: 0,
                            style: { "font-size": "22rpx", "color": "#888" }
                          },
                          " (" + vue.toDisplayString(item.address) + ")",
                          1
                          /* TEXT */
                        )) : vue.createCommentVNode("v-if", true)
                      ], 8, ["onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ])) : vue.createCommentVNode("v-if", true)
              ])
            ])
          ]),
          vue.createCommentVNode(" 订单信息 "),
          vue.createElementVNode("view", { class: "order-info" }, [
            vue.createElementVNode("view", { class: "info-item" }, [
              vue.createElementVNode("text", { class: "info-label" }, "出发时间"),
              vue.createCommentVNode(" 日期选择 "),
              vue.createElementVNode("picker", {
                mode: "date",
                value: $data.departureDate,
                start: $data.currentDate,
                onChange: _cache[6] || (_cache[6] = (...args) => $options.handleDateChange && $options.handleDateChange(...args)),
                class: "info-picker date-picker"
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-text" },
                  vue.toDisplayString($data.departureDate),
                  1
                  /* TEXT */
                )
              ], 40, ["value", "start"]),
              vue.createCommentVNode(" 时间选择 "),
              vue.createElementVNode("picker", {
                mode: "time",
                value: $data.departureTime,
                onChange: _cache[7] || (_cache[7] = (...args) => $options.handleTimeChange && $options.handleTimeChange(...args)),
                class: "info-picker time-picker"
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-text" },
                  vue.toDisplayString($data.departureTime),
                  1
                  /* TEXT */
                )
              ], 40, ["value"])
            ]),
            vue.createCommentVNode(" 司机特定选项 "),
            $data.identity === "driver" ? (vue.openBlock(), vue.createElementBlock("view", { key: 0 }, [
              vue.createElementVNode("view", { class: "info-item" }, [
                vue.createElementVNode("text", { class: "info-label" }, "车辆选择"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.vehiclePlateNumbers,
                  "range-key": "plateNumber",
                  onChange: _cache[8] || (_cache[8] = (...args) => $options.handleVehicleChange && $options.handleVehicleChange(...args)),
                  class: "info-picker",
                  disabled: $data.vehiclePlateNumbers.length === 0
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-text", { "picker-placeholder": !$data.selectedVehicle }])
                    },
                    [
                      vue.createCommentVNode(" 显示车牌号和车型 "),
                      vue.createTextVNode(
                        " " + vue.toDisplayString($data.selectedVehicle ? `${$data.selectedVehicle.plate_number} ` : $data.vehiclePlateNumbers.length === 0 ? "无可用车辆" : "请选择车辆"),
                        1
                        /* TEXT */
                      )
                    ],
                    2
                    /* CLASS */
                  )
                ], 40, ["range", "disabled"])
              ]),
              vue.createElementVNode("view", { class: "info-item" }, [
                vue.createElementVNode("text", { class: "info-label" }, "余座"),
                vue.createElementVNode("picker", {
                  mode: "selector",
                  range: $data.availableSeats,
                  onChange: _cache[9] || (_cache[9] = (...args) => $options.handleSeatChange && $options.handleSeatChange(...args)),
                  class: "info-picker",
                  disabled: !$data.selectedVehicle
                }, [
                  vue.createElementVNode(
                    "view",
                    {
                      class: vue.normalizeClass(["picker-text", { "picker-placeholder": !$data.selectedSeats }])
                    },
                    vue.toDisplayString($data.selectedSeats ? $data.selectedSeats + " 座" : "请选择余座"),
                    3
                    /* TEXT, CLASS */
                  )
                ], 40, ["range", "disabled"])
              ])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 乘客特定选项 "),
            $data.identity === "passenger" ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 1,
              class: "info-item"
            }, [
              vue.createElementVNode("text", { class: "info-label" }, "同乘人数"),
              vue.createElementVNode("picker", {
                mode: "selector",
                range: $data.passengerCountOptions,
                onChange: _cache[10] || (_cache[10] = (...args) => $options.handlePassengerCountChange && $options.handlePassengerCountChange(...args)),
                class: "info-picker"
              }, [
                vue.createElementVNode(
                  "view",
                  { class: "picker-text" },
                  vue.toDisplayString($data.passengerCount) + " 人 ",
                  1
                  /* TEXT */
                )
              ], 40, ["range"])
            ])) : vue.createCommentVNode("v-if", true),
            vue.createCommentVNode(" 价格 "),
            vue.createElementVNode("view", { class: "info-item" }, [
              vue.createElementVNode("text", { class: "info-label" }, "价格预期"),
              vue.createElementVNode("view", { class: "price-input-container" }, [
                vue.withDirectives(vue.createElementVNode(
                  "input",
                  {
                    "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => $data.price = $event),
                    type: "digit",
                    placeholder: "请输入价格",
                    class: "price-input"
                  },
                  null,
                  512
                  /* NEED_PATCH */
                ), [
                  [vue.vModelText, $data.price]
                ]),
                vue.createElementVNode("text", { class: "price-unit" }, "元")
              ])
            ])
          ]),
          vue.createCommentVNode(" 发布按钮 "),
          vue.createElementVNode("button", {
            class: "publish-button",
            onClick: _cache[12] || (_cache[12] = (...args) => $options.handlePublish && $options.handlePublish(...args)),
            disabled: $data.isPublishing
          }, vue.toDisplayString($data.isPublishing ? "发布中..." : "发布"), 9, ["disabled"])
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexOrderLaunch = /* @__PURE__ */ _export_sfc(_sfc_main$c, [["render", _sfc_render$b], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/order_launch.vue"]]);
  const _imports_0$1 = "/static/info-manage.png";
  const _imports_1 = "/static/car-manage.png";
  const _imports_2 = "/static/calendar.png";
  const _imports_3 = "/static/see-all.png";
  const _sfc_main$b = {
    components: {
      NavigationBar
    },
    name: "App",
    data() {
      return {
        user: {
          avatar: "../../static/user.jpeg",
          name: "加载中...",
          age: 0,
          gender: ""
        },
        isEditing: false,
        trips: []
      };
    },
    computed: {
      recentTrips() {
        return this.trips;
      }
    },
    methods: {
      info_manage() {
        uni.navigateTo({
          url: "/pages/index/info_manage"
        });
      },
      car_manage() {
        uni.navigateTo({
          url: "/pages/index/car_manage"
        });
      },
      calendar() {
        uni.navigateTo({
          url: "/pages/index/calendar"
        });
      },
      formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
      },
      viewAllTrips() {
        uni.navigateTo({
          url: "/pages/index/record"
        });
      },
      async fetchUserData() {
        const cacheUser = uni.getStorageSync("user_info");
        if (cacheUser) {
          this.user.name = cacheUser.username;
          this.user.avatar = cacheUser.avatar;
          this.user.age = cacheUser.age;
          this.user.gender = cacheUser.gender;
        }
        fetchUserBaseInfo().then((res2) => {
          const newUserData = {
            user_id: res2.user_id,
            name: res2.username,
            avatar: res2.avatar,
            age: res2.age,
            gender: res2.gender,
            userId: res2.user_id
          };
          if (JSON.stringify(this.user) !== JSON.stringify(newUserData)) {
            this.user = newUserData;
            uni.setStorageSync("user_info", newUserData);
          }
        }).catch((error) => {
          formatAppLog("error", "at pages/index/person.vue:184", "获取用户数据失败:", error);
        });
      },
      viewDetails(tripId) {
        uni.navigateTo({
          url: `/pages/index/trip_info?id=${tripId}`
        });
      },
      toggleEdit() {
        this.isEditing = !this.isEditing;
      },
      saveChanges() {
        formatAppLog("log", "at pages/index/person.vue:196", "保存修改:", this.user);
        this.isEditing = false;
      },
      openFileInput() {
        this.$refs.fileInput.click();
      },
      uploadAvatar(event) {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.user.avatar = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      },
      async fetchUserTrips() {
        try {
          const res2 = await fetchUserTrips();
          if (res2.code === 200) {
            this.trips = res2.data.map((trip) => ({
              id: trip.id,
              date: trip.date,
              startPoint: trip.startPoint,
              endPoint: trip.endPoint,
              price: trip.price,
              carType: trip.carType || "未接单",
              userAvatar: trip.userAvatar,
              orderCount: trip.orderCount,
              status: trip.status
            }));
          } else {
            formatAppLog("error", "at pages/index/person.vue:228", "获取行程数据失败:", res2.error);
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/person.vue:231", "获取行程数据异常:", error);
        }
      }
    },
    mounted() {
      this.fetchUserData();
      this.fetchUserTrips();
    }
  };
  function _sfc_render$a(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createCommentVNode(" 使用 NavigationBar 组件 "),
        vue.createVNode(_component_NavigationBar),
        vue.createCommentVNode(" 其他内容 "),
        vue.createElementVNode("view", { class: "flex-col self-start group" }, [
          vue.createElementVNode("view", { class: "flex-col section" }, [
            vue.createElementVNode("view", { class: "flex-row justify-between items-center group_2" }, [
              vue.createElementVNode("image", {
                class: "user_avatar",
                src: $data.user.avatar
              }, null, 8, ["src"]),
              vue.createElementVNode("view", { class: "flex-col group_3" }, [
                vue.createElementVNode(
                  "text",
                  { class: "self-start user-name" },
                  vue.toDisplayString($data.user.name),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("view", { class: "flex-row items-center self-stretch user-info" }, [
                  vue.createElementVNode("image", {
                    class: "gender-icon",
                    src: $data.user.gender === "男" || $data.user.gender === "male" ? "../../static/male.png" : "../../static/female.png"
                  }, null, 8, ["src"]),
                  vue.createElementVNode(
                    "text",
                    { class: "user-age" },
                    vue.toDisplayString($data.user.age) + "岁",
                    1
                    /* TEXT */
                  )
                ])
              ])
            ]),
            vue.createCommentVNode(" 修改 menu-items 部分的代码 "),
            vue.createElementVNode("view", { class: "flex-row menu-items" }, [
              vue.createElementVNode("view", {
                class: "flex-col items-center equal-division-item",
                onClick: _cache[0] || (_cache[0] = (...args) => $options.info_manage && $options.info_manage(...args))
              }, [
                vue.createElementVNode("image", {
                  class: "menu-icon",
                  src: _imports_0$1
                }),
                vue.createElementVNode("text", { class: "menu-text" }, "信息编辑")
              ]),
              vue.createElementVNode("view", {
                class: "flex-col items-center equal-division-item",
                onClick: _cache[1] || (_cache[1] = (...args) => $options.car_manage && $options.car_manage(...args))
              }, [
                vue.createElementVNode("image", {
                  class: "menu-icon",
                  src: _imports_1
                }),
                vue.createElementVNode("text", { class: "menu-text" }, "车牌管理")
              ]),
              vue.createElementVNode("view", {
                class: "flex-col items-center equal-division-item",
                onClick: _cache[2] || (_cache[2] = (...args) => $options.calendar && $options.calendar(...args))
              }, [
                vue.createElementVNode("image", {
                  class: "menu-icon",
                  src: _imports_2
                }),
                vue.createElementVNode("text", { class: "menu-text" }, "出行日历")
              ])
            ])
          ]),
          vue.createCommentVNode(" 查看所有其他的订单 "),
          vue.createElementVNode("div", { class: "trip-info-card" }, [
            vue.createElementVNode("div", { class: "trip-scroll" }, [
              vue.createCommentVNode(" 添加悬浮按钮 "),
              vue.createElementVNode("button", {
                class: "floating-button",
                onClick: _cache[3] || (_cache[3] = (...args) => $options.viewAllTrips && $options.viewAllTrips(...args))
              }, [
                vue.createElementVNode("image", {
                  src: _imports_3,
                  class: "floating-icon"
                }),
                vue.createElementVNode("text", { class: "floating-text" }, "所有")
              ]),
              vue.createCommentVNode(" 空状态提示 "),
              $options.recentTrips.length === 0 ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 0,
                class: "empty-tip"
              }, [
                vue.createElementVNode("image", {
                  src: _imports_1$4,
                  class: "empty-icon"
                }),
                vue.createElementVNode("text", { class: "empty-text" }, "暂无行程记录")
              ])) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" 行程卡片列表 "),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($options.recentTrips, (trip) => {
                  return vue.openBlock(), vue.createElementBlock("div", {
                    class: "trip-card",
                    key: trip.id
                  }, [
                    vue.createElementVNode("div", { class: "trip-header" }, [
                      vue.createElementVNode(
                        "text",
                        { class: "trip-date" },
                        vue.toDisplayString($options.formatDate(trip.date)),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("button", {
                        class: "view-details-button",
                        onClick: ($event) => $options.viewDetails(trip.id)
                      }, "查看详情", 8, ["onClick"])
                    ]),
                    vue.createElementVNode("div", { class: "trip-details" }, [
                      vue.createElementVNode("div", { class: "start-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_1$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "trip-text" },
                          vue.toDisplayString(trip.startPoint),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("div", { class: "departure-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_2$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "trip-text" },
                          vue.toDisplayString(trip.endPoint),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    vue.createElementVNode("div", { class: "separator" }),
                    vue.createElementVNode("div", { class: "trip-summary" }, [
                      vue.createElementVNode("div", { class: "summary-content" }, [
                        vue.createElementVNode("image", {
                          src: trip.userAvatar,
                          class: "user-avatar"
                        }, null, 8, ["src"]),
                        vue.createElementVNode("div", { class: "car-info" }, [
                          vue.createElementVNode("div", { class: "car-type-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "car-type" },
                              vue.toDisplayString(trip.carType),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("div", { class: "trip-count-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "trip-count" },
                              "接单" + vue.toDisplayString(trip.orderCount) + "次",
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createElementVNode("div", { class: "price-info" }, [
                          vue.createElementVNode(
                            "text",
                            {
                              class: "price-text",
                              style: { "color": "#003366", "font-weight": "bold" }
                            },
                            vue.toDisplayString(trip.price) + "元",
                            1
                            /* TEXT */
                          )
                        ])
                      ])
                    ])
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexPerson = /* @__PURE__ */ _export_sfc(_sfc_main$b, [["render", _sfc_render$a], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/person.vue"]]);
  var calendar = {
    /**
        * 农历1900-2100的润大小信息表
        * @Array Of Property
        * @return Hex
        */
    lunarInfo: [
      19416,
      19168,
      42352,
      21717,
      53856,
      55632,
      91476,
      22176,
      39632,
      21970,
      // 1900-1909
      19168,
      42422,
      42192,
      53840,
      119381,
      46400,
      54944,
      44450,
      38320,
      84343,
      // 1910-1919
      18800,
      42160,
      46261,
      27216,
      27968,
      109396,
      11104,
      38256,
      21234,
      18800,
      // 1920-1929
      25958,
      54432,
      59984,
      28309,
      23248,
      11104,
      100067,
      37600,
      116951,
      51536,
      // 1930-1939
      54432,
      120998,
      46416,
      22176,
      107956,
      9680,
      37584,
      53938,
      43344,
      46423,
      // 1940-1949
      27808,
      46416,
      86869,
      19872,
      42416,
      83315,
      21168,
      43432,
      59728,
      27296,
      // 1950-1959
      44710,
      43856,
      19296,
      43748,
      42352,
      21088,
      62051,
      55632,
      23383,
      22176,
      // 1960-1969
      38608,
      19925,
      19152,
      42192,
      54484,
      53840,
      54616,
      46400,
      46752,
      103846,
      // 1970-1979
      38320,
      18864,
      43380,
      42160,
      45690,
      27216,
      27968,
      44870,
      43872,
      38256,
      // 1980-1989
      19189,
      18800,
      25776,
      29859,
      59984,
      27480,
      23232,
      43872,
      38613,
      37600,
      // 1990-1999
      51552,
      55636,
      54432,
      55888,
      30034,
      22176,
      43959,
      9680,
      37584,
      51893,
      // 2000-2009
      43344,
      46240,
      47780,
      44368,
      21977,
      19360,
      42416,
      86390,
      21168,
      43312,
      // 2010-2019
      31060,
      27296,
      44368,
      23378,
      19296,
      42726,
      42208,
      53856,
      60005,
      54576,
      // 2020-2029
      23200,
      30371,
      38608,
      19195,
      19152,
      42192,
      118966,
      53840,
      54560,
      56645,
      // 2030-2039
      46496,
      22224,
      21938,
      18864,
      42359,
      42160,
      43600,
      111189,
      27936,
      44448,
      // 2040-2049
      /** Add By JJonline@JJonline.Cn**/
      84835,
      37744,
      18936,
      18800,
      25776,
      92326,
      59984,
      27424,
      108228,
      43744,
      // 2050-2059
      41696,
      53987,
      51552,
      54615,
      54432,
      55888,
      23893,
      22176,
      42704,
      21972,
      // 2060-2069
      21200,
      43448,
      43344,
      46240,
      46758,
      44368,
      21920,
      43940,
      42416,
      21168,
      // 2070-2079
      45683,
      26928,
      29495,
      27296,
      44368,
      84821,
      19296,
      42352,
      21732,
      53600,
      // 2080-2089
      59752,
      54560,
      55968,
      92838,
      22224,
      19168,
      43476,
      41680,
      53584,
      62034,
      // 2090-2099
      54560
    ],
    // 2100
    /**
        * 公历每个月份的天数普通表
        * @Array Of Property
        * @return Number
        */
    solarMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    /**
        * 天干地支之天干速查表
        * @Array Of Property trans["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
        * @return Cn string
        */
    Gan: ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"],
    /**
        * 天干地支之地支速查表
        * @Array Of Property
        * @trans["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]
        * @return Cn string
        */
    Zhi: ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"],
    /**
        * 天干地支之地支速查表<=>生肖
        * @Array Of Property
        * @trans["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"]
        * @return Cn string
        */
    Animals: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"],
    /**
        * 24节气速查表
        * @Array Of Property
        * @trans["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"]
        * @return Cn string
        */
    solarTerm: ["小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"],
    /**
        * 1900-2100各年的24节气日期速查表
        * @Array Of Property
        * @return 0x string For splice
        */
    sTermInfo: [
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c3598082c95f8c965cc920f",
      "97bd0b06bdb0722c965ce1cfcc920f",
      "b027097bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c359801ec95f8c965cc920f",
      "97bd0b06bdb0722c965ce1cfcc920f",
      "b027097bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c359801ec95f8c965cc920f",
      "97bd0b06bdb0722c965ce1cfcc920f",
      "b027097bd097c36b0b6fc9274c91aa",
      "9778397bd19801ec9210c965cc920e",
      "97b6b97bd19801ec95f8c965cc920f",
      "97bd09801d98082c95f8e1cfcc920f",
      "97bd097bd097c36b0b6fc9210c8dc2",
      "9778397bd197c36c9210c9274c91aa",
      "97b6b97bd19801ec95f8c965cc920e",
      "97bd09801d98082c95f8e1cfcc920f",
      "97bd097bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36c9210c9274c91aa",
      "97b6b97bd19801ec95f8c965cc920e",
      "97bcf97c3598082c95f8e1cfcc920f",
      "97bd097bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36c9210c9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c3598082c95f8c965cc920f",
      "97bd097bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c3598082c95f8c965cc920f",
      "97bd097bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c359801ec95f8c965cc920f",
      "97bd097bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c359801ec95f8c965cc920f",
      "97bd097bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf97c359801ec95f8c965cc920f",
      "97bd097bd07f595b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9210c8dc2",
      "9778397bd19801ec9210c9274c920e",
      "97b6b97bd19801ec95f8c965cc920f",
      "97bd07f5307f595b0b0bc920fb0722",
      "7f0e397bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36c9210c9274c920e",
      "97b6b97bd19801ec95f8c965cc920f",
      "97bd07f5307f595b0b0bc920fb0722",
      "7f0e397bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36c9210c9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bd07f1487f595b0b0bc920fb0722",
      "7f0e397bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf7f1487f595b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf7f1487f595b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf7f1487f531b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c965cc920e",
      "97bcf7f1487f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b97bd19801ec9210c9274c920e",
      "97bcf7f0e47f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "9778397bd097c36b0b6fc9210c91aa",
      "97b6b97bd197c36c9210c9274c920e",
      "97bcf7f0e47f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "9778397bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36c9210c9274c920e",
      "97b6b7f0e47f531b0723b0b6fb0722",
      "7f0e37f5307f595b0b0bc920fb0722",
      "7f0e397bd097c36b0b6fc9210c8dc2",
      "9778397bd097c36b0b70c9274c91aa",
      "97b6b7f0e47f531b0723b0b6fb0721",
      "7f0e37f1487f595b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc9210c8dc2",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f595b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "9778397bd097c36b0b6fc9274c91aa",
      "97b6b7f0e47f531b0723b0787b0721",
      "7f0e27f0e47f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "9778397bd097c36b0b6fc9210c91aa",
      "97b6b7f0e47f149b0723b0787b0721",
      "7f0e27f0e47f531b0723b0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "9778397bd097c36b0b6fc9210c8dc2",
      "977837f0e37f149b0723b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0722",
      "7f0e37f5307f595b0b0bc920fb0722",
      "7f0e397bd097c35b0b6fc9210c8dc2",
      "977837f0e37f14998082b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e37f1487f595b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc9210c8dc2",
      "977837f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "977837f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd097c35b0b6fc920fb0722",
      "977837f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "977837f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "977837f0e37f14998082b0787b06bd",
      "7f07e7f0e47f149b0723b0787b0721",
      "7f0e27f0e47f531b0b0bb0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "977837f0e37f14998082b0723b06bd",
      "7f07e7f0e37f149b0723b0787b0721",
      "7f0e27f0e47f531b0723b0b6fb0722",
      "7f0e397bd07f595b0b0bc920fb0722",
      "977837f0e37f14898082b0723b02d5",
      "7ec967f0e37f14998082b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0722",
      "7f0e37f1487f595b0b0bb0b6fb0722",
      "7f0e37f0e37f14898082b0723b02d5",
      "7ec967f0e37f14998082b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0722",
      "7f0e37f1487f531b0b0bb0b6fb0722",
      "7f0e37f0e37f14898082b0723b02d5",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e37f1487f531b0b0bb0b6fb0722",
      "7f0e37f0e37f14898082b072297c35",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e37f0e37f14898082b072297c35",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e37f0e366aa89801eb072297c35",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f149b0723b0787b0721",
      "7f0e27f1487f531b0b0bb0b6fb0722",
      "7f0e37f0e366aa89801eb072297c35",
      "7ec967f0e37f14998082b0723b06bd",
      "7f07e7f0e47f149b0723b0787b0721",
      "7f0e27f0e47f531b0723b0b6fb0722",
      "7f0e37f0e366aa89801eb072297c35",
      "7ec967f0e37f14998082b0723b06bd",
      "7f07e7f0e37f14998083b0787b0721",
      "7f0e27f0e47f531b0723b0b6fb0722",
      "7f0e37f0e366aa89801eb072297c35",
      "7ec967f0e37f14898082b0723b02d5",
      "7f07e7f0e37f14998082b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0722",
      "7f0e36665b66aa89801e9808297c35",
      "665f67f0e37f14898082b0723b02d5",
      "7ec967f0e37f14998082b0787b0721",
      "7f07e7f0e47f531b0723b0b6fb0722",
      "7f0e36665b66a449801e9808297c35",
      "665f67f0e37f14898082b0723b02d5",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e36665b66a449801e9808297c35",
      "665f67f0e37f14898082b072297c35",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e26665b66a449801e9808297c35",
      "665f67f0e37f1489801eb072297c35",
      "7ec967f0e37f14998082b0787b06bd",
      "7f07e7f0e47f531b0723b0b6fb0721",
      "7f0e27f1487f531b0b0bb0b6fb0722"
    ],
    /**
        * 数字转中文速查表
        * @Array Of Property
        * @trans ['日','一','二','三','四','五','六','七','八','九','十']
        * @return Cn string
        */
    nStr1: ["日", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"],
    /**
        * 日期转农历称呼速查表
        * @Array Of Property
        * @trans ['初','十','廿','卅']
        * @return Cn string
        */
    nStr2: ["初", "十", "廿", "卅"],
    /**
        * 月份转农历称呼速查表
        * @Array Of Property
        * @trans ['正','一','二','三','四','五','六','七','八','九','十','冬','腊']
        * @return Cn string
        */
    nStr3: ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"],
    /**
        * 返回农历y年一整年的总天数
        * @param lunar Year
        * @return Number
        * @eg:var count = calendar.lYearDays(1987) ;//count=387
        */
    lYearDays: function(y) {
      var i;
      var sum = 348;
      for (i = 32768; i > 8; i >>= 1) {
        sum += this.lunarInfo[y - 1900] & i ? 1 : 0;
      }
      return sum + this.leapDays(y);
    },
    /**
        * 返回农历y年闰月是哪个月；若y年没有闰月 则返回0
        * @param lunar Year
        * @return Number (0-12)
        * @eg:var leapMonth = calendar.leapMonth(1987) ;//leapMonth=6
        */
    leapMonth: function(y) {
      return this.lunarInfo[y - 1900] & 15;
    },
    /**
        * 返回农历y年闰月的天数 若该年没有闰月则返回0
        * @param lunar Year
        * @return Number (0、29、30)
        * @eg:var leapMonthDay = calendar.leapDays(1987) ;//leapMonthDay=29
        */
    leapDays: function(y) {
      if (this.leapMonth(y)) {
        return this.lunarInfo[y - 1900] & 65536 ? 30 : 29;
      }
      return 0;
    },
    /**
        * 返回农历y年m月（非闰月）的总天数，计算m为闰月时的天数请使用leapDays方法
        * @param lunar Year
        * @return Number (-1、29、30)
        * @eg:var MonthDay = calendar.monthDays(1987,9) ;//MonthDay=29
        */
    monthDays: function(y, m) {
      if (m > 12 || m < 1) {
        return -1;
      }
      return this.lunarInfo[y - 1900] & 65536 >> m ? 30 : 29;
    },
    /**
        * 返回公历(!)y年m月的天数
        * @param solar Year
        * @return Number (-1、28、29、30、31)
        * @eg:var solarMonthDay = calendar.leapDays(1987) ;//solarMonthDay=30
        */
    solarDays: function(y, m) {
      if (m > 12 || m < 1) {
        return -1;
      }
      var ms = m - 1;
      if (ms == 1) {
        return y % 4 == 0 && y % 100 != 0 || y % 400 == 0 ? 29 : 28;
      } else {
        return this.solarMonth[ms];
      }
    },
    /**
       * 农历年份转换为干支纪年
       * @param  lYear 农历年的年份数
       * @return Cn string
       */
    toGanZhiYear: function(lYear) {
      var ganKey = (lYear - 3) % 10;
      var zhiKey = (lYear - 3) % 12;
      if (ganKey == 0)
        ganKey = 10;
      if (zhiKey == 0)
        zhiKey = 12;
      return this.Gan[ganKey - 1] + this.Zhi[zhiKey - 1];
    },
    /**
       * 公历月、日判断所属星座
       * @param  cMonth [description]
       * @param  cDay [description]
       * @return Cn string
       */
    toAstro: function(cMonth, cDay) {
      var s = "魔羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手魔羯";
      var arr = [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22];
      return s.substr(cMonth * 2 - (cDay < arr[cMonth - 1] ? 2 : 0), 2) + "座";
    },
    /**
        * 传入offset偏移量返回干支
        * @param offset 相对甲子的偏移量
        * @return Cn string
        */
    toGanZhi: function(offset) {
      return this.Gan[offset % 10] + this.Zhi[offset % 12];
    },
    /**
        * 传入公历(!)y年获得该年第n个节气的公历日期
        * @param y公历年(1900-2100)；n二十四节气中的第几个节气(1~24)；从n=1(小寒)算起
        * @return day Number
        * @eg:var _24 = calendar.getTerm(1987,3) ;//_24=4;意即1987年2月4日立春
        */
    getTerm: function(y, n) {
      if (y < 1900 || y > 2100) {
        return -1;
      }
      if (n < 1 || n > 24) {
        return -1;
      }
      var _table = this.sTermInfo[y - 1900];
      var _info = [
        parseInt("0x" + _table.substr(0, 5)).toString(),
        parseInt("0x" + _table.substr(5, 5)).toString(),
        parseInt("0x" + _table.substr(10, 5)).toString(),
        parseInt("0x" + _table.substr(15, 5)).toString(),
        parseInt("0x" + _table.substr(20, 5)).toString(),
        parseInt("0x" + _table.substr(25, 5)).toString()
      ];
      var _calday = [
        _info[0].substr(0, 1),
        _info[0].substr(1, 2),
        _info[0].substr(3, 1),
        _info[0].substr(4, 2),
        _info[1].substr(0, 1),
        _info[1].substr(1, 2),
        _info[1].substr(3, 1),
        _info[1].substr(4, 2),
        _info[2].substr(0, 1),
        _info[2].substr(1, 2),
        _info[2].substr(3, 1),
        _info[2].substr(4, 2),
        _info[3].substr(0, 1),
        _info[3].substr(1, 2),
        _info[3].substr(3, 1),
        _info[3].substr(4, 2),
        _info[4].substr(0, 1),
        _info[4].substr(1, 2),
        _info[4].substr(3, 1),
        _info[4].substr(4, 2),
        _info[5].substr(0, 1),
        _info[5].substr(1, 2),
        _info[5].substr(3, 1),
        _info[5].substr(4, 2)
      ];
      return parseInt(_calday[n - 1]);
    },
    /**
        * 传入农历数字月份返回汉语通俗表示法
        * @param lunar month
        * @return Cn string
        * @eg:var cnMonth = calendar.toChinaMonth(12) ;//cnMonth='腊月'
        */
    toChinaMonth: function(m) {
      if (m > 12 || m < 1) {
        return -1;
      }
      var s = this.nStr3[m - 1];
      s += "月";
      return s;
    },
    /**
        * 传入农历日期数字返回汉字表示法
        * @param lunar day
        * @return Cn string
        * @eg:var cnDay = calendar.toChinaDay(21) ;//cnMonth='廿一'
        */
    toChinaDay: function(d) {
      var s;
      switch (d) {
        case 10:
          s = "初十";
          break;
        case 20:
          s = "二十";
          break;
        case 30:
          s = "三十";
          break;
        default:
          s = this.nStr2[Math.floor(d / 10)];
          s += this.nStr1[d % 10];
      }
      return s;
    },
    /**
        * 年份转生肖[!仅能大致转换] => 精确划分生肖分界线是“立春”
        * @param y year
        * @return Cn string
        * @eg:var animal = calendar.getAnimal(1987) ;//animal='兔'
        */
    getAnimal: function(y) {
      return this.Animals[(y - 4) % 12];
    },
    /**
        * 传入阳历年月日获得详细的公历、农历object信息 <=>JSON
        * @param y  solar year
        * @param m  solar month
        * @param d  solar day
        * @return JSON object
        * @eg:__f__('log','at uni_modules/uni-calendar/components/uni-calendar/calendar.js:379',calendar.solar2lunar(1987,11,01));
        */
    solar2lunar: function(y, m, d) {
      if (y < 1900 || y > 2100) {
        return -1;
      }
      if (y == 1900 && m == 1 && d < 31) {
        return -1;
      }
      if (!y) {
        var objDate = /* @__PURE__ */ new Date();
      } else {
        var objDate = new Date(y, parseInt(m) - 1, d);
      }
      var i;
      var leap = 0;
      var temp = 0;
      var y = objDate.getFullYear();
      var m = objDate.getMonth() + 1;
      var d = objDate.getDate();
      var offset = (Date.UTC(objDate.getFullYear(), objDate.getMonth(), objDate.getDate()) - Date.UTC(1900, 0, 31)) / 864e5;
      for (i = 1900; i < 2101 && offset > 0; i++) {
        temp = this.lYearDays(i);
        offset -= temp;
      }
      if (offset < 0) {
        offset += temp;
        i--;
      }
      var isTodayObj = /* @__PURE__ */ new Date();
      var isToday = false;
      if (isTodayObj.getFullYear() == y && isTodayObj.getMonth() + 1 == m && isTodayObj.getDate() == d) {
        isToday = true;
      }
      var nWeek = objDate.getDay();
      var cWeek = this.nStr1[nWeek];
      if (nWeek == 0) {
        nWeek = 7;
      }
      var year = i;
      var leap = this.leapMonth(i);
      var isLeap = false;
      for (i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i == leap + 1 && isLeap == false) {
          --i;
          isLeap = true;
          temp = this.leapDays(year);
        } else {
          temp = this.monthDays(year, i);
        }
        if (isLeap == true && i == leap + 1) {
          isLeap = false;
        }
        offset -= temp;
      }
      if (offset == 0 && leap > 0 && i == leap + 1) {
        if (isLeap) {
          isLeap = false;
        } else {
          isLeap = true;
          --i;
        }
      }
      if (offset < 0) {
        offset += temp;
        --i;
      }
      var month = i;
      var day = offset + 1;
      var sm = m - 1;
      var gzY = this.toGanZhiYear(year);
      var firstNode = this.getTerm(y, m * 2 - 1);
      var secondNode = this.getTerm(y, m * 2);
      var gzM = this.toGanZhi((y - 1900) * 12 + m + 11);
      if (d >= firstNode) {
        gzM = this.toGanZhi((y - 1900) * 12 + m + 12);
      }
      var isTerm = false;
      var Term = null;
      if (firstNode == d) {
        isTerm = true;
        Term = this.solarTerm[m * 2 - 2];
      }
      if (secondNode == d) {
        isTerm = true;
        Term = this.solarTerm[m * 2 - 1];
      }
      var dayCyclical = Date.UTC(y, sm, 1, 0, 0, 0, 0) / 864e5 + 25567 + 10;
      var gzD = this.toGanZhi(dayCyclical + d - 1);
      var astro = this.toAstro(m, d);
      return { "lYear": year, "lMonth": month, "lDay": day, "Animal": this.getAnimal(year), "IMonthCn": (isLeap ? "闰" : "") + this.toChinaMonth(month), "IDayCn": this.toChinaDay(day), "cYear": y, "cMonth": m, "cDay": d, "gzYear": gzY, "gzMonth": gzM, "gzDay": gzD, "isToday": isToday, "isLeap": isLeap, "nWeek": nWeek, "ncWeek": "星期" + cWeek, "isTerm": isTerm, "Term": Term, "astro": astro };
    },
    /**
        * 传入农历年月日以及传入的月份是否闰月获得详细的公历、农历object信息 <=>JSON
        * @param y  lunar year
        * @param m  lunar month
        * @param d  lunar day
        * @param isLeapMonth  lunar month is leap or not.[如果是农历闰月第四个参数赋值true即可]
        * @return JSON object
        * @eg:__f__('log','at uni_modules/uni-calendar/components/uni-calendar/calendar.js:498',calendar.lunar2solar(1987,9,10));
        */
    lunar2solar: function(y, m, d, isLeapMonth) {
      var isLeapMonth = !!isLeapMonth;
      var leapMonth = this.leapMonth(y);
      this.leapDays(y);
      if (isLeapMonth && leapMonth != m) {
        return -1;
      }
      if (y == 2100 && m == 12 && d > 1 || y == 1900 && m == 1 && d < 31) {
        return -1;
      }
      var day = this.monthDays(y, m);
      var _day = day;
      if (isLeapMonth) {
        _day = this.leapDays(y, m);
      }
      if (y < 1900 || y > 2100 || d > _day) {
        return -1;
      }
      var offset = 0;
      for (var i = 1900; i < y; i++) {
        offset += this.lYearDays(i);
      }
      var leap = 0;
      var isAdd = false;
      for (var i = 1; i < m; i++) {
        leap = this.leapMonth(y);
        if (!isAdd) {
          if (leap <= i && leap > 0) {
            offset += this.leapDays(y);
            isAdd = true;
          }
        }
        offset += this.monthDays(y, i);
      }
      if (isLeapMonth) {
        offset += day;
      }
      var stmap = Date.UTC(1900, 1, 30, 0, 0, 0);
      var calObj = new Date((offset + d - 31) * 864e5 + stmap);
      var cY = calObj.getUTCFullYear();
      var cM = calObj.getUTCMonth() + 1;
      var cD = calObj.getUTCDate();
      return this.solar2lunar(cY, cM, cD);
    }
  };
  class Calendar {
    constructor({
      date,
      selected,
      startDate,
      endDate,
      range
    } = {}) {
      this.date = this.getDate(/* @__PURE__ */ new Date());
      this.selected = selected || [];
      this.startDate = startDate;
      this.endDate = endDate;
      this.range = range;
      this.cleanMultipleStatus();
      this.weeks = {};
    }
    /**
     * 设置日期
     * @param {Object} date
     */
    setDate(date) {
      this.selectDate = this.getDate(date);
      this._getWeek(this.selectDate.fullDate);
    }
    /**
     * 清理多选状态
     */
    cleanMultipleStatus() {
      this.multipleStatus = {
        before: "",
        after: "",
        data: []
      };
    }
    /**
     * 重置开始日期
     */
    resetSatrtDate(startDate) {
      this.startDate = startDate;
    }
    /**
     * 重置结束日期
     */
    resetEndDate(endDate) {
      this.endDate = endDate;
    }
    /**
     * 获取任意时间
     */
    getDate(date, AddDayCount = 0, str = "day") {
      if (!date) {
        date = /* @__PURE__ */ new Date();
      }
      if (typeof date !== "object") {
        date = date.replace(/-/g, "/");
      }
      const dd = new Date(date);
      switch (str) {
        case "day":
          dd.setDate(dd.getDate() + AddDayCount);
          break;
        case "month":
          if (dd.getDate() === 31 && AddDayCount > 0) {
            dd.setDate(dd.getDate() + AddDayCount);
          } else {
            const preMonth = dd.getMonth();
            dd.setMonth(preMonth + AddDayCount);
            const nextMonth = dd.getMonth();
            if (AddDayCount < 0 && preMonth !== 0 && nextMonth - preMonth > AddDayCount) {
              dd.setMonth(nextMonth + (nextMonth - preMonth + AddDayCount));
            }
            if (AddDayCount > 0 && nextMonth - preMonth > AddDayCount) {
              dd.setMonth(nextMonth - (nextMonth - preMonth - AddDayCount));
            }
          }
          break;
        case "year":
          dd.setFullYear(dd.getFullYear() + AddDayCount);
          break;
      }
      const y = dd.getFullYear();
      const m = dd.getMonth() + 1 < 10 ? "0" + (dd.getMonth() + 1) : dd.getMonth() + 1;
      const d = dd.getDate() < 10 ? "0" + dd.getDate() : dd.getDate();
      return {
        fullDate: y + "-" + m + "-" + d,
        year: y,
        month: m,
        date: d,
        day: dd.getDay()
      };
    }
    /**
     * 获取上月剩余天数
     */
    _getLastMonthDays(firstDay, full) {
      let dateArr = [];
      for (let i = firstDay; i > 0; i--) {
        const beforeDate = new Date(full.year, full.month - 1, -i + 1).getDate();
        dateArr.push({
          date: beforeDate,
          month: full.month - 1,
          lunar: this.getlunar(full.year, full.month - 1, beforeDate),
          disable: true
        });
      }
      return dateArr;
    }
    /**
     * 获取本月天数
     */
    _currentMonthDys(dateData, full) {
      let dateArr = [];
      let fullDate = this.date.fullDate;
      for (let i = 1; i <= dateData; i++) {
        let nowDate = full.year + "-" + (full.month < 10 ? full.month : full.month) + "-" + (i < 10 ? "0" + i : i);
        let isDay = fullDate === nowDate;
        let info = this.selected && this.selected.find((item) => {
          if (this.dateEqual(nowDate, item.date)) {
            return item;
          }
        });
        let disableBefore = true;
        let disableAfter = true;
        if (this.startDate) {
          disableBefore = this.dateCompare(this.startDate, nowDate);
        }
        if (this.endDate) {
          disableAfter = this.dateCompare(nowDate, this.endDate);
        }
        let multiples = this.multipleStatus.data;
        let checked = false;
        let multiplesStatus = -1;
        if (this.range) {
          if (multiples) {
            multiplesStatus = multiples.findIndex((item) => {
              return this.dateEqual(item, nowDate);
            });
          }
          if (multiplesStatus !== -1) {
            checked = true;
          }
        }
        let data = {
          fullDate: nowDate,
          year: full.year,
          date: i,
          multiple: this.range ? checked : false,
          beforeMultiple: this.dateEqual(this.multipleStatus.before, nowDate),
          afterMultiple: this.dateEqual(this.multipleStatus.after, nowDate),
          month: full.month,
          lunar: this.getlunar(full.year, full.month, i),
          disable: !(disableBefore && disableAfter),
          isDay
        };
        if (info) {
          data.extraInfo = info;
        }
        dateArr.push(data);
      }
      return dateArr;
    }
    /**
     * 获取下月天数
     */
    _getNextMonthDays(surplus, full) {
      let dateArr = [];
      for (let i = 1; i < surplus + 1; i++) {
        dateArr.push({
          date: i,
          month: Number(full.month) + 1,
          lunar: this.getlunar(full.year, Number(full.month) + 1, i),
          disable: true
        });
      }
      return dateArr;
    }
    /**
     * 获取当前日期详情
     * @param {Object} date
     */
    getInfo(date) {
      if (!date) {
        date = /* @__PURE__ */ new Date();
      }
      const dateInfo = this.canlender.find((item) => item.fullDate === this.getDate(date).fullDate);
      return dateInfo;
    }
    /**
     * 比较时间大小
     */
    dateCompare(startDate, endDate) {
      startDate = new Date(startDate.replace("-", "/").replace("-", "/"));
      endDate = new Date(endDate.replace("-", "/").replace("-", "/"));
      if (startDate <= endDate) {
        return true;
      } else {
        return false;
      }
    }
    /**
     * 比较时间是否相等
     */
    dateEqual(before, after) {
      before = new Date(before.replace("-", "/").replace("-", "/"));
      after = new Date(after.replace("-", "/").replace("-", "/"));
      if (before.getTime() - after.getTime() === 0) {
        return true;
      } else {
        return false;
      }
    }
    /**
     * 获取日期范围内所有日期
     * @param {Object} begin
     * @param {Object} end
     */
    geDateAll(begin, end) {
      var arr = [];
      var ab = begin.split("-");
      var ae = end.split("-");
      var db = /* @__PURE__ */ new Date();
      db.setFullYear(ab[0], ab[1] - 1, ab[2]);
      var de = /* @__PURE__ */ new Date();
      de.setFullYear(ae[0], ae[1] - 1, ae[2]);
      var unixDb = db.getTime() - 24 * 60 * 60 * 1e3;
      var unixDe = de.getTime() - 24 * 60 * 60 * 1e3;
      for (var k = unixDb; k <= unixDe; ) {
        k = k + 24 * 60 * 60 * 1e3;
        arr.push(this.getDate(new Date(parseInt(k))).fullDate);
      }
      return arr;
    }
    /**
     * 计算阴历日期显示
     */
    getlunar(year, month, date) {
      return calendar.solar2lunar(year, month, date);
    }
    /**
     * 设置打点
     */
    setSelectInfo(data, value2) {
      this.selected = value2;
      this._getWeek(data);
    }
    /**
     *  获取多选状态
     */
    setMultiple(fullDate) {
      let {
        before,
        after
      } = this.multipleStatus;
      if (!this.range)
        return;
      if (before && after) {
        this.multipleStatus.before = fullDate;
        this.multipleStatus.after = "";
        this.multipleStatus.data = [];
      } else {
        if (!before) {
          this.multipleStatus.before = fullDate;
        } else {
          this.multipleStatus.after = fullDate;
          if (this.dateCompare(this.multipleStatus.before, this.multipleStatus.after)) {
            this.multipleStatus.data = this.geDateAll(this.multipleStatus.before, this.multipleStatus.after);
          } else {
            this.multipleStatus.data = this.geDateAll(this.multipleStatus.after, this.multipleStatus.before);
          }
        }
      }
      this._getWeek(fullDate);
    }
    /**
     * 获取每周数据
     * @param {Object} dateData
     */
    _getWeek(dateData) {
      const {
        year,
        month
      } = this.getDate(dateData);
      let firstDay = new Date(year, month - 1, 1).getDay();
      let currentDay = new Date(year, month, 0).getDate();
      let dates = {
        lastMonthDays: this._getLastMonthDays(firstDay, this.getDate(dateData)),
        // 上个月末尾几天
        currentMonthDys: this._currentMonthDys(currentDay, this.getDate(dateData)),
        // 本月天数
        nextMonthDays: [],
        // 下个月开始几天
        weeks: []
      };
      let canlender = [];
      const surplus = 42 - (dates.lastMonthDays.length + dates.currentMonthDys.length);
      dates.nextMonthDays = this._getNextMonthDays(surplus, this.getDate(dateData));
      canlender = canlender.concat(dates.lastMonthDays, dates.currentMonthDys, dates.nextMonthDays);
      let weeks = {};
      for (let i = 0; i < canlender.length; i++) {
        if (i % 7 === 0) {
          weeks[parseInt(i / 7)] = new Array(7);
        }
        weeks[parseInt(i / 7)][i % 7] = canlender[i];
      }
      this.canlender = canlender;
      this.weeks = weeks;
    }
    //静态方法
    // static init(date) {
    // 	if (!this.instance) {
    // 		this.instance = new Calendar(date);
    // 	}
    // 	return this.instance;
    // }
  }
  const isObject = (val) => val !== null && typeof val === "object";
  const defaultDelimiters = ["{", "}"];
  class BaseFormatter {
    constructor() {
      this._caches = /* @__PURE__ */ Object.create(null);
    }
    interpolate(message, values, delimiters = defaultDelimiters) {
      if (!values) {
        return [message];
      }
      let tokens = this._caches[message];
      if (!tokens) {
        tokens = parse(message, delimiters);
        this._caches[message] = tokens;
      }
      return compile(tokens, values);
    }
  }
  const RE_TOKEN_LIST_VALUE = /^(?:\d)+/;
  const RE_TOKEN_NAMED_VALUE = /^(?:\w)+/;
  function parse(format, [startDelimiter, endDelimiter]) {
    const tokens = [];
    let position = 0;
    let text = "";
    while (position < format.length) {
      let char = format[position++];
      if (char === startDelimiter) {
        if (text) {
          tokens.push({ type: "text", value: text });
        }
        text = "";
        let sub = "";
        char = format[position++];
        while (char !== void 0 && char !== endDelimiter) {
          sub += char;
          char = format[position++];
        }
        const isClosed = char === endDelimiter;
        const type = RE_TOKEN_LIST_VALUE.test(sub) ? "list" : isClosed && RE_TOKEN_NAMED_VALUE.test(sub) ? "named" : "unknown";
        tokens.push({ value: sub, type });
      } else {
        text += char;
      }
    }
    text && tokens.push({ type: "text", value: text });
    return tokens;
  }
  function compile(tokens, values) {
    const compiled = [];
    let index = 0;
    const mode = Array.isArray(values) ? "list" : isObject(values) ? "named" : "unknown";
    if (mode === "unknown") {
      return compiled;
    }
    while (index < tokens.length) {
      const token = tokens[index];
      switch (token.type) {
        case "text":
          compiled.push(token.value);
          break;
        case "list":
          compiled.push(values[parseInt(token.value, 10)]);
          break;
        case "named":
          if (mode === "named") {
            compiled.push(values[token.value]);
          } else {
            {
              console.warn(`Type of token '${token.type}' and format of value '${mode}' don't match!`);
            }
          }
          break;
        case "unknown":
          {
            console.warn(`Detect 'unknown' type of token!`);
          }
          break;
      }
      index++;
    }
    return compiled;
  }
  const LOCALE_ZH_HANS = "zh-Hans";
  const LOCALE_ZH_HANT = "zh-Hant";
  const LOCALE_EN = "en";
  const LOCALE_FR = "fr";
  const LOCALE_ES = "es";
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const defaultFormatter = new BaseFormatter();
  function include(str, parts2) {
    return !!parts2.find((part) => str.indexOf(part) !== -1);
  }
  function startsWith(str, parts2) {
    return parts2.find((part) => str.indexOf(part) === 0);
  }
  function normalizeLocale(locale, messages2) {
    if (!locale) {
      return;
    }
    locale = locale.trim().replace(/_/g, "-");
    if (messages2 && messages2[locale]) {
      return locale;
    }
    locale = locale.toLowerCase();
    if (locale === "chinese") {
      return LOCALE_ZH_HANS;
    }
    if (locale.indexOf("zh") === 0) {
      if (locale.indexOf("-hans") > -1) {
        return LOCALE_ZH_HANS;
      }
      if (locale.indexOf("-hant") > -1) {
        return LOCALE_ZH_HANT;
      }
      if (include(locale, ["-tw", "-hk", "-mo", "-cht"])) {
        return LOCALE_ZH_HANT;
      }
      return LOCALE_ZH_HANS;
    }
    let locales = [LOCALE_EN, LOCALE_FR, LOCALE_ES];
    if (messages2 && Object.keys(messages2).length > 0) {
      locales = Object.keys(messages2);
    }
    const lang = startsWith(locale, locales);
    if (lang) {
      return lang;
    }
  }
  class I18n {
    constructor({ locale, fallbackLocale, messages: messages2, watcher, formater: formater2 }) {
      this.locale = LOCALE_EN;
      this.fallbackLocale = LOCALE_EN;
      this.message = {};
      this.messages = {};
      this.watchers = [];
      if (fallbackLocale) {
        this.fallbackLocale = fallbackLocale;
      }
      this.formater = formater2 || defaultFormatter;
      this.messages = messages2 || {};
      this.setLocale(locale || LOCALE_EN);
      if (watcher) {
        this.watchLocale(watcher);
      }
    }
    setLocale(locale) {
      const oldLocale = this.locale;
      this.locale = normalizeLocale(locale, this.messages) || this.fallbackLocale;
      if (!this.messages[this.locale]) {
        this.messages[this.locale] = {};
      }
      this.message = this.messages[this.locale];
      if (oldLocale !== this.locale) {
        this.watchers.forEach((watcher) => {
          watcher(this.locale, oldLocale);
        });
      }
    }
    getLocale() {
      return this.locale;
    }
    watchLocale(fn) {
      const index = this.watchers.push(fn) - 1;
      return () => {
        this.watchers.splice(index, 1);
      };
    }
    add(locale, message, override = true) {
      const curMessages = this.messages[locale];
      if (curMessages) {
        if (override) {
          Object.assign(curMessages, message);
        } else {
          Object.keys(message).forEach((key) => {
            if (!hasOwn(curMessages, key)) {
              curMessages[key] = message[key];
            }
          });
        }
      } else {
        this.messages[locale] = message;
      }
    }
    f(message, values, delimiters) {
      return this.formater.interpolate(message, values, delimiters).join("");
    }
    t(key, locale, values) {
      let message = this.message;
      if (typeof locale === "string") {
        locale = normalizeLocale(locale, this.messages);
        locale && (message = this.messages[locale]);
      } else {
        values = locale;
      }
      if (!hasOwn(message, key)) {
        console.warn(`Cannot translate the value of keypath ${key}. Use the value of keypath as default.`);
        return key;
      }
      return this.formater.interpolate(message[key], values).join("");
    }
  }
  function watchAppLocale(appVm, i18n) {
    if (appVm.$watchLocale) {
      appVm.$watchLocale((newLocale) => {
        i18n.setLocale(newLocale);
      });
    } else {
      appVm.$watch(() => appVm.$locale, (newLocale) => {
        i18n.setLocale(newLocale);
      });
    }
  }
  function getDefaultLocale() {
    if (typeof uni !== "undefined" && uni.getLocale) {
      return uni.getLocale();
    }
    if (typeof global !== "undefined" && global.getLocale) {
      return global.getLocale();
    }
    return LOCALE_EN;
  }
  function initVueI18n(locale, messages2 = {}, fallbackLocale, watcher) {
    if (typeof locale !== "string") {
      const options = [
        messages2,
        locale
      ];
      locale = options[0];
      messages2 = options[1];
    }
    if (typeof locale !== "string") {
      locale = getDefaultLocale();
    }
    if (typeof fallbackLocale !== "string") {
      fallbackLocale = typeof __uniConfig !== "undefined" && __uniConfig.fallbackLocale || LOCALE_EN;
    }
    const i18n = new I18n({
      locale,
      fallbackLocale,
      messages: messages2,
      watcher
    });
    let t2 = (key, values) => {
      if (typeof getApp !== "function") {
        t2 = function(key2, values2) {
          return i18n.t(key2, values2);
        };
      } else {
        let isWatchedAppLocale = false;
        t2 = function(key2, values2) {
          const appVm = getApp().$vm;
          if (appVm) {
            appVm.$locale;
            if (!isWatchedAppLocale) {
              isWatchedAppLocale = true;
              watchAppLocale(appVm, i18n);
            }
          }
          return i18n.t(key2, values2);
        };
      }
      return t2(key, values);
    };
    return {
      i18n,
      f(message, values, delimiters) {
        return i18n.f(message, values, delimiters);
      },
      t(key, values) {
        return t2(key, values);
      },
      add(locale2, message, override = true) {
        return i18n.add(locale2, message, override);
      },
      watch(fn) {
        return i18n.watchLocale(fn);
      },
      getLocale() {
        return i18n.getLocale();
      },
      setLocale(newLocale) {
        return i18n.setLocale(newLocale);
      }
    };
  }
  const en$1 = {
    "uni-calender.ok": "ok",
    "uni-calender.cancel": "cancel",
    "uni-calender.today": "today",
    "uni-calender.MON": "MON",
    "uni-calender.TUE": "TUE",
    "uni-calender.WED": "WED",
    "uni-calender.THU": "THU",
    "uni-calender.FRI": "FRI",
    "uni-calender.SAT": "SAT",
    "uni-calender.SUN": "SUN"
  };
  const zhHans$1 = {
    "uni-calender.ok": "确定",
    "uni-calender.cancel": "取消",
    "uni-calender.today": "今日",
    "uni-calender.SUN": "日",
    "uni-calender.MON": "一",
    "uni-calender.TUE": "二",
    "uni-calender.WED": "三",
    "uni-calender.THU": "四",
    "uni-calender.FRI": "五",
    "uni-calender.SAT": "六"
  };
  const zhHant$1 = {
    "uni-calender.ok": "確定",
    "uni-calender.cancel": "取消",
    "uni-calender.today": "今日",
    "uni-calender.SUN": "日",
    "uni-calender.MON": "一",
    "uni-calender.TUE": "二",
    "uni-calender.WED": "三",
    "uni-calender.THU": "四",
    "uni-calender.FRI": "五",
    "uni-calender.SAT": "六"
  };
  const i18nMessages = {
    en: en$1,
    "zh-Hans": zhHans$1,
    "zh-Hant": zhHant$1
  };
  const { t: t$2 } = initVueI18n(i18nMessages);
  const _sfc_main$a = {
    emits: ["change"],
    props: {
      weeks: {
        type: Object,
        default() {
          return {};
        }
      },
      calendar: {
        type: Object,
        default: () => {
          return {};
        }
      },
      selected: {
        type: Array,
        default: () => {
          return [];
        }
      },
      lunar: {
        type: Boolean,
        default: false
      }
    },
    computed: {
      todayText() {
        return t$2("uni-calender.today");
      }
    },
    methods: {
      choiceDate(weeks) {
        this.$emit("change", weeks);
      }
    }
  };
  function _sfc_render$9(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "view",
      {
        class: vue.normalizeClass(["uni-calendar-item__weeks-box", {
          "uni-calendar-item--disable": $props.weeks.disable,
          "uni-calendar-item--isDay": $props.calendar.fullDate === $props.weeks.fullDate && $props.weeks.isDay,
          "uni-calendar-item--checked": $props.calendar.fullDate === $props.weeks.fullDate && !$props.weeks.isDay,
          "uni-calendar-item--before-checked": $props.weeks.beforeMultiple,
          "uni-calendar-item--multiple": $props.weeks.multiple,
          "uni-calendar-item--after-checked": $props.weeks.afterMultiple
        }]),
        onClick: _cache[0] || (_cache[0] = ($event) => $options.choiceDate($props.weeks))
      },
      [
        vue.createElementVNode("view", { class: "uni-calendar-item__weeks-box-item" }, [
          $props.selected && $props.weeks.extraInfo ? (vue.openBlock(), vue.createElementBlock("text", {
            key: 0,
            class: "uni-calendar-item__weeks-box-circle"
          })) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode(
            "text",
            {
              class: vue.normalizeClass(["uni-calendar-item__weeks-box-text", {
                "uni-calendar-item--isDay-text": $props.weeks.isDay,
                "uni-calendar-item--isDay": $props.calendar.fullDate === $props.weeks.fullDate && $props.weeks.isDay,
                "uni-calendar-item--checked": $props.calendar.fullDate === $props.weeks.fullDate && !$props.weeks.isDay,
                "uni-calendar-item--before-checked": $props.weeks.beforeMultiple,
                "uni-calendar-item--multiple": $props.weeks.multiple,
                "uni-calendar-item--after-checked": $props.weeks.afterMultiple,
                "uni-calendar-item--disable": $props.weeks.disable
              }])
            },
            vue.toDisplayString($props.weeks.date),
            3
            /* TEXT, CLASS */
          ),
          !$props.lunar && !$props.weeks.extraInfo && $props.weeks.isDay ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 1,
              class: vue.normalizeClass(["uni-calendar-item__weeks-lunar-text", {
                "uni-calendar-item--isDay-text": $props.weeks.isDay,
                "uni-calendar-item--isDay": $props.calendar.fullDate === $props.weeks.fullDate && $props.weeks.isDay,
                "uni-calendar-item--checked": $props.calendar.fullDate === $props.weeks.fullDate && !$props.weeks.isDay,
                "uni-calendar-item--before-checked": $props.weeks.beforeMultiple,
                "uni-calendar-item--multiple": $props.weeks.multiple,
                "uni-calendar-item--after-checked": $props.weeks.afterMultiple
              }])
            },
            vue.toDisplayString($options.todayText),
            3
            /* TEXT, CLASS */
          )) : vue.createCommentVNode("v-if", true),
          $props.lunar && !$props.weeks.extraInfo ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 2,
              class: vue.normalizeClass(["uni-calendar-item__weeks-lunar-text", {
                "uni-calendar-item--isDay-text": $props.weeks.isDay,
                "uni-calendar-item--isDay": $props.calendar.fullDate === $props.weeks.fullDate && $props.weeks.isDay,
                "uni-calendar-item--checked": $props.calendar.fullDate === $props.weeks.fullDate && !$props.weeks.isDay,
                "uni-calendar-item--before-checked": $props.weeks.beforeMultiple,
                "uni-calendar-item--multiple": $props.weeks.multiple,
                "uni-calendar-item--after-checked": $props.weeks.afterMultiple,
                "uni-calendar-item--disable": $props.weeks.disable
              }])
            },
            vue.toDisplayString($props.weeks.isDay ? $options.todayText : $props.weeks.lunar.IDayCn === "初一" ? $props.weeks.lunar.IMonthCn : $props.weeks.lunar.IDayCn),
            3
            /* TEXT, CLASS */
          )) : vue.createCommentVNode("v-if", true),
          $props.weeks.extraInfo && $props.weeks.extraInfo.info ? (vue.openBlock(), vue.createElementBlock(
            "text",
            {
              key: 3,
              class: vue.normalizeClass(["uni-calendar-item__weeks-lunar-text", {
                "uni-calendar-item--extra": $props.weeks.extraInfo.info,
                "uni-calendar-item--isDay-text": $props.weeks.isDay,
                "uni-calendar-item--isDay": $props.calendar.fullDate === $props.weeks.fullDate && $props.weeks.isDay,
                "uni-calendar-item--checked": $props.calendar.fullDate === $props.weeks.fullDate && !$props.weeks.isDay,
                "uni-calendar-item--before-checked": $props.weeks.beforeMultiple,
                "uni-calendar-item--multiple": $props.weeks.multiple,
                "uni-calendar-item--after-checked": $props.weeks.afterMultiple,
                "uni-calendar-item--disable": $props.weeks.disable
              }])
            },
            vue.toDisplayString($props.weeks.extraInfo.info),
            3
            /* TEXT, CLASS */
          )) : vue.createCommentVNode("v-if", true)
        ])
      ],
      2
      /* CLASS */
    );
  }
  const CalendarItem = /* @__PURE__ */ _export_sfc(_sfc_main$a, [["render", _sfc_render$9], ["__scopeId", "data-v-65626c58"], ["__file", "E:/Projects/SE/ride-sharing-se/uni_modules/uni-calendar/components/uni-calendar/uni-calendar-item.vue"]]);
  const { t: t$1 } = initVueI18n(i18nMessages);
  const _sfc_main$9 = {
    components: {
      CalendarItem
    },
    emits: ["close", "confirm", "change", "monthSwitch"],
    props: {
      date: {
        type: String,
        default: ""
      },
      selected: {
        type: Array,
        default() {
          return [];
        }
      },
      lunar: {
        type: Boolean,
        default: false
      },
      startDate: {
        type: String,
        default: ""
      },
      endDate: {
        type: String,
        default: ""
      },
      range: {
        type: Boolean,
        default: false
      },
      insert: {
        type: Boolean,
        default: true
      },
      showMonth: {
        type: Boolean,
        default: true
      },
      clearDate: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        show: false,
        weeks: [],
        calendar: {},
        nowDate: "",
        aniMaskShow: false
      };
    },
    computed: {
      /**
       * for i18n
       */
      okText() {
        return t$1("uni-calender.ok");
      },
      cancelText() {
        return t$1("uni-calender.cancel");
      },
      todayText() {
        return t$1("uni-calender.today");
      },
      monText() {
        return t$1("uni-calender.MON");
      },
      TUEText() {
        return t$1("uni-calender.TUE");
      },
      WEDText() {
        return t$1("uni-calender.WED");
      },
      THUText() {
        return t$1("uni-calender.THU");
      },
      FRIText() {
        return t$1("uni-calender.FRI");
      },
      SATText() {
        return t$1("uni-calender.SAT");
      },
      SUNText() {
        return t$1("uni-calender.SUN");
      }
    },
    watch: {
      date(newVal) {
        this.init(newVal);
      },
      startDate(val) {
        this.cale.resetSatrtDate(val);
        this.cale.setDate(this.nowDate.fullDate);
        this.weeks = this.cale.weeks;
      },
      endDate(val) {
        this.cale.resetEndDate(val);
        this.cale.setDate(this.nowDate.fullDate);
        this.weeks = this.cale.weeks;
      },
      selected(newVal) {
        this.cale.setSelectInfo(this.nowDate.fullDate, newVal);
        this.weeks = this.cale.weeks;
      }
    },
    created() {
      this.cale = new Calendar({
        selected: this.selected,
        startDate: this.startDate,
        endDate: this.endDate,
        range: this.range
      });
      this.init(this.date);
    },
    methods: {
      // 取消穿透
      clean() {
      },
      bindDateChange(e) {
        const value2 = e.detail.value + "-1";
        this.setDate(value2);
        const { year, month } = this.cale.getDate(value2);
        this.$emit("monthSwitch", {
          year,
          month
        });
      },
      /**
       * 初始化日期显示
       * @param {Object} date
       */
      init(date) {
        this.cale.setDate(date);
        this.weeks = this.cale.weeks;
        this.nowDate = this.calendar = this.cale.getInfo(date);
      },
      /**
       * 打开日历弹窗
       */
      open() {
        if (this.clearDate && !this.insert) {
          this.cale.cleanMultipleStatus();
          this.init(this.date);
        }
        this.show = true;
        this.$nextTick(() => {
          setTimeout(() => {
            this.aniMaskShow = true;
          }, 50);
        });
      },
      /**
       * 关闭日历弹窗
       */
      close() {
        this.aniMaskShow = false;
        this.$nextTick(() => {
          setTimeout(() => {
            this.show = false;
            this.$emit("close");
          }, 300);
        });
      },
      /**
       * 确认按钮
       */
      confirm() {
        this.setEmit("confirm");
        this.close();
      },
      /**
       * 变化触发
       */
      change() {
        if (!this.insert)
          return;
        this.setEmit("change");
      },
      /**
       * 选择月份触发
       */
      monthSwitch() {
        let {
          year,
          month
        } = this.nowDate;
        this.$emit("monthSwitch", {
          year,
          month: Number(month)
        });
      },
      /**
       * 派发事件
       * @param {Object} name
       */
      setEmit(name) {
        let {
          year,
          month,
          date,
          fullDate,
          lunar,
          extraInfo
        } = this.calendar;
        this.$emit(name, {
          range: this.cale.multipleStatus,
          year,
          month,
          date,
          fulldate: fullDate,
          lunar,
          extraInfo: extraInfo || {}
        });
      },
      /**
       * 选择天触发
       * @param {Object} weeks
       */
      choiceDate(weeks) {
        if (weeks.disable)
          return;
        this.calendar = weeks;
        this.cale.setMultiple(this.calendar.fullDate);
        this.weeks = this.cale.weeks;
        this.change();
      },
      /**
       * 回到今天
       */
      backToday() {
        const nowYearMonth = `${this.nowDate.year}-${this.nowDate.month}`;
        const date = this.cale.getDate(/* @__PURE__ */ new Date());
        const todayYearMonth = `${date.year}-${date.month}`;
        this.init(date.fullDate);
        if (nowYearMonth !== todayYearMonth) {
          this.monthSwitch();
        }
        this.change();
      },
      /**
       * 上个月
       */
      pre() {
        const preDate = this.cale.getDate(this.nowDate.fullDate, -1, "month").fullDate;
        this.setDate(preDate);
        this.monthSwitch();
      },
      /**
       * 下个月
       */
      next() {
        const nextDate = this.cale.getDate(this.nowDate.fullDate, 1, "month").fullDate;
        this.setDate(nextDate);
        this.monthSwitch();
      },
      /**
       * 设置日期
       * @param {Object} date
       */
      setDate(date) {
        this.cale.setDate(date);
        this.weeks = this.cale.weeks;
        this.nowDate = this.cale.getInfo(date);
      }
    }
  };
  function _sfc_render$8(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_calendar_item = vue.resolveComponent("calendar-item");
    return vue.openBlock(), vue.createElementBlock("view", { class: "uni-calendar" }, [
      !$props.insert && $data.show ? (vue.openBlock(), vue.createElementBlock(
        "view",
        {
          key: 0,
          class: vue.normalizeClass(["uni-calendar__mask", { "uni-calendar--mask-show": $data.aniMaskShow }]),
          onClick: _cache[0] || (_cache[0] = (...args) => $options.clean && $options.clean(...args))
        },
        null,
        2
        /* CLASS */
      )) : vue.createCommentVNode("v-if", true),
      $props.insert || $data.show ? (vue.openBlock(), vue.createElementBlock(
        "view",
        {
          key: 1,
          class: vue.normalizeClass(["uni-calendar__content", { "uni-calendar--fixed": !$props.insert, "uni-calendar--ani-show": $data.aniMaskShow }])
        },
        [
          !$props.insert ? (vue.openBlock(), vue.createElementBlock("view", {
            key: 0,
            class: "uni-calendar__header uni-calendar--fixed-top"
          }, [
            vue.createElementVNode("view", {
              class: "uni-calendar__header-btn-box",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.close && $options.close(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "uni-calendar__header-text uni-calendar--fixed-width" },
                vue.toDisplayString($options.cancelText),
                1
                /* TEXT */
              )
            ]),
            vue.createElementVNode("view", {
              class: "uni-calendar__header-btn-box",
              onClick: _cache[2] || (_cache[2] = (...args) => $options.confirm && $options.confirm(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "uni-calendar__header-text uni-calendar--fixed-width" },
                vue.toDisplayString($options.okText),
                1
                /* TEXT */
              )
            ])
          ])) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("view", { class: "uni-calendar__header" }, [
            vue.createElementVNode("view", {
              class: "uni-calendar__header-btn-box",
              onClick: _cache[3] || (_cache[3] = vue.withModifiers((...args) => $options.pre && $options.pre(...args), ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "uni-calendar__header-btn uni-calendar--left" })
            ]),
            vue.createElementVNode("picker", {
              mode: "date",
              value: $props.date,
              fields: "month",
              onChange: _cache[4] || (_cache[4] = (...args) => $options.bindDateChange && $options.bindDateChange(...args))
            }, [
              vue.createElementVNode(
                "text",
                { class: "uni-calendar__header-text" },
                vue.toDisplayString(($data.nowDate.year || "") + " / " + ($data.nowDate.month || "")),
                1
                /* TEXT */
              )
            ], 40, ["value"]),
            vue.createElementVNode("view", {
              class: "uni-calendar__header-btn-box",
              onClick: _cache[5] || (_cache[5] = vue.withModifiers((...args) => $options.next && $options.next(...args), ["stop"]))
            }, [
              vue.createElementVNode("view", { class: "uni-calendar__header-btn uni-calendar--right" })
            ]),
            vue.createElementVNode(
              "text",
              {
                class: "uni-calendar__backtoday",
                onClick: _cache[6] || (_cache[6] = (...args) => $options.backToday && $options.backToday(...args))
              },
              vue.toDisplayString($options.todayText),
              1
              /* TEXT */
            )
          ]),
          vue.createElementVNode("view", { class: "uni-calendar__box" }, [
            $props.showMonth ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "uni-calendar__box-bg"
            }, [
              vue.createElementVNode(
                "text",
                { class: "uni-calendar__box-bg-text" },
                vue.toDisplayString($data.nowDate.month),
                1
                /* TEXT */
              )
            ])) : vue.createCommentVNode("v-if", true),
            vue.createElementVNode("view", { class: "uni-calendar__weeks" }, [
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.SUNText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.monText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.TUEText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.WEDText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.THUText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.FRIText),
                  1
                  /* TEXT */
                )
              ]),
              vue.createElementVNode("view", { class: "uni-calendar__weeks-day" }, [
                vue.createElementVNode(
                  "text",
                  { class: "uni-calendar__weeks-day-text" },
                  vue.toDisplayString($options.SATText),
                  1
                  /* TEXT */
                )
              ])
            ]),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($data.weeks, (item, weekIndex) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "uni-calendar__weeks",
                  key: weekIndex
                }, [
                  (vue.openBlock(true), vue.createElementBlock(
                    vue.Fragment,
                    null,
                    vue.renderList(item, (weeks, weeksIndex) => {
                      return vue.openBlock(), vue.createElementBlock("view", {
                        class: "uni-calendar__weeks-item",
                        key: weeksIndex
                      }, [
                        vue.createVNode(_component_calendar_item, {
                          class: "uni-calendar-item--hook",
                          weeks,
                          calendar: $data.calendar,
                          selected: $props.selected,
                          lunar: $props.lunar,
                          onChange: $options.choiceDate
                        }, null, 8, ["weeks", "calendar", "selected", "lunar", "onChange"])
                      ]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ],
        2
        /* CLASS */
      )) : vue.createCommentVNode("v-if", true)
    ]);
  }
  const __easycom_0$2 = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["render", _sfc_render$8], ["__scopeId", "data-v-b6ab2cfb"], ["__file", "E:/Projects/SE/ride-sharing-se/uni_modules/uni-calendar/components/uni-calendar/uni-calendar.vue"]]);
  const _sfc_main$8 = {
    components: {
      NavigationBar
    },
    data() {
      return {
        selectedDate: this.getTodayDate(),
        trips: [],
        isLoading: false
      };
    },
    computed: {
      selectedTrips() {
        if (!this.selectedDate)
          return [];
        const selectedDateStr = this.selectedDate.split(" ")[0];
        return this.trips.filter((trip) => {
          const tripDate = new Date(trip.start_time);
          const tripDateStr = `${tripDate.getFullYear()}-${(tripDate.getMonth() + 1).toString().padStart(2, "0")}-${tripDate.getDate().toString().padStart(2, "0")}`;
          return tripDateStr === selectedDateStr;
        });
      }
    },
    methods: {
      async fetchTripsForMonth(year, month) {
        try {
          const cacheUserID = uni.getStorageSync("user_id");
          this.isLoading = true;
          this.trips = await fetchCalendarTrips(year, month, cacheUserID);
        } catch (error) {
          formatAppLog("error", "at pages/index/calendar.vue:99", "Error fetching trips:", error);
          uni.showToast({
            title: "获取行程失败",
            icon: "none"
          });
        } finally {
          this.isLoading = false;
        }
      },
      getTodayDate() {
        const today = /* @__PURE__ */ new Date();
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
      },
      onDateChange(e) {
        this.selectedDate = e.fulldate;
        const date = new Date(e.fulldate);
        this.fetchTripsForMonth(date.getFullYear(), date.getMonth() + 1);
      },
      formatDisplayDate(dateStr) {
        const date = new Date(dateStr);
        const options = { year: "numeric", month: "long", day: "numeric", weekday: "long" };
        return date.toLocaleDateString("zh-CN", options);
      },
      formatTime(dateString) {
        const date = new Date(dateString);
        return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
      },
      viewDetails(tripId) {
        uni.navigateTo({
          url: `/pages/index/trip_info?id=${tripId}`
        });
      }
    },
    mounted() {
      const today = /* @__PURE__ */ new Date();
      this.fetchTripsForMonth(today.getFullYear(), today.getMonth() + 1);
    }
  };
  function _sfc_render$7(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    const _component_uni_calendar = resolveEasycom(vue.resolveDynamicComponent("uni-calendar"), __easycom_0$2);
    return vue.openBlock(), vue.createElementBlock("view", { class: "carpool-calendar-container" }, [
      vue.createVNode(_component_NavigationBar),
      vue.createCommentVNode(" 日历区域 "),
      vue.createElementVNode("view", { class: "calendar-section" }, [
        vue.createVNode(_component_uni_calendar, {
          ref: "calendar",
          insert: true,
          date: $data.selectedDate,
          onChange: $options.onDateChange
        }, null, 8, ["date", "onChange"])
      ]),
      vue.createCommentVNode(" 拼车信息区域 "),
      vue.createElementVNode("view", { class: "trip-info-section" }, [
        vue.createElementVNode(
          "h2",
          { class: "selected-date" },
          vue.toDisplayString($data.selectedDate ? $options.formatDisplayDate($data.selectedDate) : "请选择日期查看拼车计划"),
          1
          /* TEXT */
        ),
        $options.selectedTrips.length > 0 ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "trip-info-card"
        }, [
          vue.createElementVNode("scroll-view", {
            class: "trip-scroll",
            "scroll-y": ""
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.selectedTrips, (trip) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "trip-card",
                  key: trip.id
                }, [
                  vue.createElementVNode("view", { class: "trip-header" }, [
                    vue.createElementVNode(
                      "text",
                      { class: "trip-time" },
                      vue.toDisplayString($options.formatTime(trip.date)),
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("button", {
                      class: "view-details-button",
                      onClick: ($event) => $options.viewDetails(trip.id)
                    }, "查看详情", 8, ["onClick"])
                  ]),
                  vue.createElementVNode("view", { class: "trip-details" }, [
                    vue.createElementVNode("view", { class: "start-point" }, [
                      vue.createElementVNode("image", {
                        src: _imports_1$2,
                        class: "trip-icon"
                      }),
                      vue.createElementVNode(
                        "text",
                        { class: "trip-text" },
                        vue.toDisplayString(trip.startPoint),
                        1
                        /* TEXT */
                      )
                    ]),
                    vue.createElementVNode("view", { class: "departure-point" }, [
                      vue.createElementVNode("image", {
                        src: _imports_2$2,
                        class: "trip-icon"
                      }),
                      vue.createElementVNode(
                        "text",
                        { class: "trip-text" },
                        vue.toDisplayString(trip.endPoint),
                        1
                        /* TEXT */
                      )
                    ])
                  ]),
                  vue.createElementVNode("view", { class: "separator" }),
                  vue.createElementVNode("view", { class: "trip-summary" }, [
                    vue.createElementVNode("view", { class: "summary-content" }, [
                      vue.createElementVNode("image", {
                        src: trip.userAvatar,
                        class: "user-avatar"
                      }, null, 8, ["src"]),
                      vue.createElementVNode("view", { class: "car-info" }, [
                        vue.createElementVNode("view", { class: "car-type-summary" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "car-type" },
                            vue.toDisplayString(trip.carType),
                            1
                            /* TEXT */
                          )
                        ]),
                        vue.createElementVNode("view", { class: "trip-count-summary" }, [
                          vue.createElementVNode(
                            "text",
                            { class: "trip-count" },
                            "接单" + vue.toDisplayString(trip.orderCount) + "次",
                            1
                            /* TEXT */
                          )
                        ])
                      ]),
                      vue.createElementVNode("view", { class: "price-info" }, [
                        vue.createElementVNode(
                          "text",
                          { class: "price-text" },
                          vue.toDisplayString(trip.price) + "元",
                          1
                          /* TEXT */
                        )
                      ])
                    ])
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])) : (vue.openBlock(), vue.createElementBlock("view", {
          key: 1,
          class: "no-trips-message"
        }, [
          $data.selectedDate ? (vue.openBlock(), vue.createElementBlock("text", { key: 0 }, "该日期暂无拼车计划")) : (vue.openBlock(), vue.createElementBlock("text", { key: 1 }, "请从日历中选择一个日期"))
        ]))
      ])
    ]);
  }
  const PagesIndexCalendar = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["render", _sfc_render$7], ["__scopeId", "data-v-da8fb852"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/calendar.vue"]]);
  const _sfc_main$7 = {
    components: {
      NavigationBar
    },
    data() {
      return {
        user: {
          avatar: "",
          // 头像
          username: "",
          // 用户名
          gender: "",
          // 新增性别字段
          contact: "",
          // 联系方式
          password: "",
          // 新增密码字段
          confirmPassword: ""
          // 新增确认密码字段
        },
        originalUser: {},
        // 保存原始数据用于比较
        defaultAvatar: "../../static/user.jpeg",
        // 直接使用路径
        avatarError: "",
        genderList: [
          // 性别选项
          { name: "男", value: "male" },
          { name: "女", value: "female" }
        ]
      };
    },
    created() {
      this.fetchUserModifiableData();
    },
    methods: {
      /**
        * 获取用户可修改数据（调用后端接口）
        * 接口调用点1：fetchUserModifiableData()
        * 接口调用点2：fetchUserAvatar()
        */
      async fetchUserModifiableData() {
        this.loading = true;
        try {
          const res2 = await fetchUserModifiableData();
          const avatar = await fetchUserAvatar();
          formatAppLog("log", "at pages/index/info_manage.vue:136", res2);
          const userData = {
            avatar: avatar || this.defaultAvatar,
            gender: res2.gender,
            contact: res2.telephone,
            username: res2.username
          };
          this.user = { ...userData };
          this.originalUser = { ...userData };
        } catch (error) {
          formatAppLog("error", "at pages/index/info_manage.vue:147", "获取用户数据失败:", error);
          uni.showToast({ title: "获取信息失败", icon: "none" });
        }
      },
      // 处理性别选择变化
      handleGenderChange(event) {
        const selectedGenderIndex = event.detail.value;
        this.user.gender = this.genderList[selectedGenderIndex].value;
      },
      // 触发头像上传
      // 处理头像变更
      async triggerAvatarUpload() {
        uni.chooseImage({
          count: 1,
          sizeType: ["compressed"],
          // 压缩图片
          sourceType: ["album", "camera"],
          success: async (res2) => {
            try {
              const filePath = res2.tempFilePaths[0];
              plus.io.resolveLocalFileSystemURL(filePath, (entry) => {
                entry.file((file) => {
                  const reader = new plus.io.FileReader();
                  reader.readAsDataURL(file);
                  reader.onloadend = (e) => {
                    const base64Data = e.target.result;
                    this.uploadAvatar(base64Data);
                  };
                  reader.onerror = (err) => {
                    formatAppLog("error", "at pages/index/info_manage.vue:181", "读取文件失败:", err);
                    uni.showToast({
                      title: "读取文件失败: " + err.message,
                      icon: "none"
                    });
                  };
                });
              }, (error) => {
                formatAppLog("error", "at pages/index/info_manage.vue:189", "解析文件路径失败:", error);
                uni.showToast({
                  title: "解析文件路径失败: " + error.message,
                  icon: "none"
                });
              });
            } catch (error) {
              formatAppLog("error", "at pages/index/info_manage.vue:196", "头像处理失败:", error);
              uni.showToast({
                title: "头像处理失败: " + error.message,
                icon: "none"
              });
            }
          }
        });
      },
      // 图片压缩方法(可选)
      compressImage(filePath) {
        return new Promise((resolve, reject) => {
          uni.compressImage({
            src: filePath,
            quality: 80,
            // 质量80%
            success: (res2) => resolve(res2.tempFilePath),
            fail: (err) => reject(err)
          });
        });
      },
      fileToBase64(filePath) {
        return new Promise((resolve, reject) => {
          const fs = uni.getFileSystemManager();
          fs.readFile({
            filePath,
            encoding: "base64",
            success: (res2) => {
              const fileType = this.getFileType(filePath);
              resolve(`data:image/${fileType};base64,${res2.data}`);
            },
            fail: (err) => {
              reject(err);
            }
          });
        });
      },
      // 获取文件类型
      getFileType(filePath) {
        const extension = filePath.split(".").pop().toLowerCase();
        return extension === "png" ? "png" : "jpeg";
      },
      async uploadAvatar(base64Data) {
        try {
          uni.showLoading({ title: "上传中..." });
          const cacheUserID = uni.getStorageSync("user_id");
          await uploadUserAvatar(cacheUserID, base64Data);
          const newAvatar = await fetchUserAvatar(cacheUserID);
          this.user.avatar = newAvatar;
          this.user.avatar = newAvatar;
          uni.showToast({
            title: "头像上传成功",
            icon: "success"
          });
        } catch (error) {
          formatAppLog("error", "at pages/index/info_manage.vue:260", "头像上传失败:", error);
          uni.showToast({
            title: error.message || "头像上传失败",
            icon: "none"
          });
        } finally {
          uni.hideLoading();
        }
      },
      handleImageError() {
        this.user.avatar = this.defaultAvatar;
      },
      async saveProfile() {
        if (!this.user.username.trim()) {
          uni.showToast({ title: "用户名不能为空", icon: "none" });
          return;
        }
        if (!this.user.gender) {
          uni.showToast({ title: "请选择性别", icon: "none" });
          return;
        }
        if (!/^1[3-9]\d{9}$/.test(this.user.contact)) {
          uni.showToast({ title: "请输入有效手机号", icon: "none" });
          return;
        }
        if (this.user.password && this.user.password !== this.user.confirmPassword) {
          uni.showToast({ title: "两次输入的密码不一致", icon: "none" });
          return;
        }
        try {
          uni.showLoading({ title: "保存中..." });
          const requestData = {
            username: this.user.username,
            gender: this.user.gender,
            telephone: this.user.contact
          };
          if (this.user.password) {
            requestData.password = this.user.password;
          }
          const response = await updateUserInfo(requestData);
          if (response.code === 200) {
            uni.showToast({ title: "保存成功", icon: "success" });
            this.originalUser = { ...this.user };
            this.user.password = "";
            this.user.confirmPassword = "";
            setTimeout(() => {
              uni.navigateTo({
                url: "/pages/index/person"
              });
            }, 2e3);
          } else {
            throw new Error(response.message || "保存失败");
          }
        } catch (error) {
          formatAppLog("error", "at pages/index/info_manage.vue:331", "保存失败:", error);
          uni.showToast({
            title: error.message || "保存失败，请重试",
            icon: "none"
          });
        } finally {
          uni.hideLoading();
        }
      }
    }
  };
  function _sfc_render$6(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock("div", { class: "user-profile-container" }, [
      vue.createCommentVNode(" 使用 NavigationBar 组件 "),
      vue.createVNode(_component_NavigationBar),
      vue.createElementVNode("div", { class: "profile-edit-card" }, [
        vue.createCommentVNode(" 头像上传区域 "),
        vue.createElementVNode("div", { class: "avatar-section" }, [
          vue.createElementVNode("image", {
            class: "avatar-image",
            src: $data.user.avatar,
            alt: "用户头像",
            onError: _cache[0] || (_cache[0] = (...args) => $options.handleImageError && $options.handleImageError(...args))
          }, null, 40, ["src"]),
          vue.createElementVNode(
            "button",
            {
              class: "upload-btn",
              onClick: _cache[1] || (_cache[1] = (...args) => $options.triggerAvatarUpload && $options.triggerAvatarUpload(...args))
            },
            vue.toDisplayString($data.user.avatar === $data.defaultAvatar ? "上传头像" : "更换头像"),
            1
            /* TEXT */
          ),
          $data.avatarError ? (vue.openBlock(), vue.createElementBlock(
            "p",
            {
              key: 0,
              class: "error-message"
            },
            vue.toDisplayString($data.avatarError),
            1
            /* TEXT */
          )) : vue.createCommentVNode("v-if", true)
        ]),
        vue.createCommentVNode(" 用户信息表单 "),
        vue.createElementVNode("div", { class: "form-section" }, [
          vue.createElementVNode("div", { class: "form-group" }, [
            vue.createElementVNode("label", { for: "username" }, "用户名"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                type: "text",
                id: "username",
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => $data.user.username = $event),
                placeholder: "请输入用户名",
                style: { "width": "80%" }
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.user.username]
            ])
          ]),
          vue.createCommentVNode(" 新增性别选择 "),
          vue.createElementVNode("div", { class: "form-group" }, [
            vue.createElementVNode("label", { for: "gender" }, "性别"),
            vue.createElementVNode("picker", {
              mode: "selector",
              range: $data.genderList,
              "range-key": "name",
              onChange: _cache[3] || (_cache[3] = (...args) => $options.handleGenderChange && $options.handleGenderChange(...args)),
              class: "info-picker"
            }, [
              vue.createElementVNode(
                "view",
                { class: "picker-text" },
                vue.toDisplayString($data.user.gender === "male" ? "男" : $data.user.gender === "female" ? "女" : "请选择性别"),
                1
                /* TEXT */
              )
            ], 40, ["range"])
          ]),
          vue.createElementVNode("div", { class: "form-group" }, [
            vue.createElementVNode("label", { for: "contact" }, "联系方式"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                type: "tel",
                id: "contact",
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => $data.user.contact = $event),
                placeholder: "请输入手机号",
                pattern: "[0-9]{11}",
                style: { "width": "80%" }
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.user.contact]
            ])
          ]),
          vue.createCommentVNode(" 新增密码修改 "),
          vue.createElementVNode("div", { class: "form-group" }, [
            vue.createElementVNode("label", { for: "password" }, "新密码"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                id: "password",
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => $data.user.password = $event),
                type: "password",
                class: "input",
                placeholder: "留空则不修改密码",
                style: { "width": "80%" }
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.user.password]
            ])
          ]),
          vue.createElementVNode("div", { class: "form-group" }, [
            vue.createElementVNode("label", { for: "confirmPassword" }, "确认新密码"),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                id: "confirmPassword",
                "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => $data.user.confirmPassword = $event),
                type: "password",
                class: "input",
                placeholder: "再次输入新密码",
                style: { "width": "80%" }
              },
              null,
              512
              /* NEED_PATCH */
            ), [
              [vue.vModelText, $data.user.confirmPassword]
            ])
          ]),
          vue.createElementVNode("button", {
            class: "save-btn",
            onClick: _cache[7] || (_cache[7] = (...args) => $options.saveProfile && $options.saveProfile(...args))
          }, "保存修改")
        ])
      ])
    ]);
  }
  const PagesIndexInfoManage = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["render", _sfc_render$6], ["__scopeId", "data-v-2cb089b3"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/info_manage.vue"]]);
  const popup = {
    data() {
      return {};
    },
    created() {
      this.popup = this.getParent();
    },
    methods: {
      /**
       * 获取父元素实例
       */
      getParent(name = "uniPopup") {
        let parent = this.$parent;
        let parentName = parent.$options.name;
        while (parentName !== name) {
          parent = parent.$parent;
          if (!parent)
            return false;
          parentName = parent.$options.name;
        }
        return parent;
      }
    }
  };
  const en = {
    "uni-popup.cancel": "cancel",
    "uni-popup.ok": "ok",
    "uni-popup.placeholder": "pleace enter",
    "uni-popup.title": "Hint",
    "uni-popup.shareTitle": "Share to"
  };
  const zhHans = {
    "uni-popup.cancel": "取消",
    "uni-popup.ok": "确定",
    "uni-popup.placeholder": "请输入",
    "uni-popup.title": "提示",
    "uni-popup.shareTitle": "分享到"
  };
  const zhHant = {
    "uni-popup.cancel": "取消",
    "uni-popup.ok": "確定",
    "uni-popup.placeholder": "請輸入",
    "uni-popup.title": "提示",
    "uni-popup.shareTitle": "分享到"
  };
  const messages = {
    en,
    "zh-Hans": zhHans,
    "zh-Hant": zhHant
  };
  const {
    t
  } = initVueI18n(messages);
  const _sfc_main$6 = {
    name: "uniPopupDialog",
    mixins: [popup],
    emits: ["confirm", "close", "update:modelValue", "input"],
    props: {
      inputType: {
        type: String,
        default: "text"
      },
      showClose: {
        type: Boolean,
        default: true
      },
      modelValue: {
        type: [Number, String],
        default: ""
      },
      placeholder: {
        type: [String, Number],
        default: ""
      },
      type: {
        type: String,
        default: "error"
      },
      mode: {
        type: String,
        default: "base"
      },
      title: {
        type: String,
        default: ""
      },
      content: {
        type: String,
        default: ""
      },
      beforeClose: {
        type: Boolean,
        default: false
      },
      cancelText: {
        type: String,
        default: ""
      },
      confirmText: {
        type: String,
        default: ""
      },
      maxlength: {
        type: Number,
        default: -1
      },
      focus: {
        type: Boolean,
        default: true
      }
    },
    data() {
      return {
        dialogType: "error",
        val: ""
      };
    },
    computed: {
      okText() {
        return this.confirmText || t("uni-popup.ok");
      },
      closeText() {
        return this.cancelText || t("uni-popup.cancel");
      },
      placeholderText() {
        return this.placeholder || t("uni-popup.placeholder");
      },
      titleText() {
        return this.title || t("uni-popup.title");
      }
    },
    watch: {
      type(val) {
        this.dialogType = val;
      },
      mode(val) {
        if (val === "input") {
          this.dialogType = "info";
        }
      },
      value(val) {
        if (this.maxlength != -1 && this.mode === "input") {
          this.val = val.slice(0, this.maxlength);
        } else {
          this.val = val;
        }
      },
      val(val) {
        this.$emit("update:modelValue", val);
      }
    },
    created() {
      this.popup.disableMask();
      if (this.mode === "input") {
        this.dialogType = "info";
        this.val = this.value;
        this.val = this.modelValue;
      } else {
        this.dialogType = this.type;
      }
    },
    methods: {
      /**
       * 点击确认按钮
       */
      onOk() {
        if (this.mode === "input") {
          this.$emit("confirm", this.val);
        } else {
          this.$emit("confirm");
        }
        if (this.beforeClose)
          return;
        this.popup.close();
      },
      /**
       * 点击取消按钮
       */
      closeDialog() {
        this.$emit("close");
        if (this.beforeClose)
          return;
        this.popup.close();
      },
      close() {
        this.popup.close();
      }
    }
  };
  function _sfc_render$5(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock("view", { class: "uni-popup-dialog" }, [
      vue.createElementVNode("view", { class: "uni-dialog-title" }, [
        vue.createElementVNode(
          "text",
          {
            class: vue.normalizeClass(["uni-dialog-title-text", ["uni-popup__" + $data.dialogType]])
          },
          vue.toDisplayString($options.titleText),
          3
          /* TEXT, CLASS */
        )
      ]),
      $props.mode === "base" ? (vue.openBlock(), vue.createElementBlock("view", {
        key: 0,
        class: "uni-dialog-content"
      }, [
        vue.renderSlot(_ctx.$slots, "default", {}, () => [
          vue.createElementVNode(
            "text",
            { class: "uni-dialog-content-text" },
            vue.toDisplayString($props.content),
            1
            /* TEXT */
          )
        ], true)
      ])) : (vue.openBlock(), vue.createElementBlock("view", {
        key: 1,
        class: "uni-dialog-content"
      }, [
        vue.renderSlot(_ctx.$slots, "default", {}, () => [
          vue.withDirectives(vue.createElementVNode("input", {
            class: "uni-dialog-input",
            maxlength: $props.maxlength,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => $data.val = $event),
            type: $props.inputType,
            placeholder: $options.placeholderText,
            focus: $props.focus
          }, null, 8, ["maxlength", "type", "placeholder", "focus"]), [
            [vue.vModelDynamic, $data.val]
          ])
        ], true)
      ])),
      vue.createElementVNode("view", { class: "uni-dialog-button-group" }, [
        $props.showClose ? (vue.openBlock(), vue.createElementBlock("view", {
          key: 0,
          class: "uni-dialog-button",
          onClick: _cache[1] || (_cache[1] = (...args) => $options.closeDialog && $options.closeDialog(...args))
        }, [
          vue.createElementVNode(
            "text",
            { class: "uni-dialog-button-text" },
            vue.toDisplayString($options.closeText),
            1
            /* TEXT */
          )
        ])) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode(
          "view",
          {
            class: vue.normalizeClass(["uni-dialog-button", $props.showClose ? "uni-border-left" : ""]),
            onClick: _cache[2] || (_cache[2] = (...args) => $options.onOk && $options.onOk(...args))
          },
          [
            vue.createElementVNode(
              "text",
              { class: "uni-dialog-button-text uni-button-color" },
              vue.toDisplayString($options.okText),
              1
              /* TEXT */
            )
          ],
          2
          /* CLASS */
        )
      ])
    ]);
  }
  const __easycom_0$1 = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["render", _sfc_render$5], ["__scopeId", "data-v-678a307f"], ["__file", "E:/Projects/SE/ride-sharing-se/node_modules/@dcloudio/uni-ui/lib/uni-popup-dialog/uni-popup-dialog.vue"]]);
  class MPAnimation {
    constructor(options, _this) {
      this.options = options;
      this.animation = uni.createAnimation({
        ...options
      });
      this.currentStepAnimates = {};
      this.next = 0;
      this.$ = _this;
    }
    _nvuePushAnimates(type, args) {
      let aniObj = this.currentStepAnimates[this.next];
      let styles = {};
      if (!aniObj) {
        styles = {
          styles: {},
          config: {}
        };
      } else {
        styles = aniObj;
      }
      if (animateTypes1.includes(type)) {
        if (!styles.styles.transform) {
          styles.styles.transform = "";
        }
        let unit = "";
        if (type === "rotate") {
          unit = "deg";
        }
        styles.styles.transform += `${type}(${args + unit}) `;
      } else {
        styles.styles[type] = `${args}`;
      }
      this.currentStepAnimates[this.next] = styles;
    }
    _animateRun(styles = {}, config2 = {}) {
      let ref = this.$.$refs["ani"].ref;
      if (!ref)
        return;
      return new Promise((resolve, reject) => {
        nvueAnimation.transition(ref, {
          styles,
          ...config2
        }, (res2) => {
          resolve();
        });
      });
    }
    _nvueNextAnimate(animates, step = 0, fn) {
      let obj = animates[step];
      if (obj) {
        let {
          styles,
          config: config2
        } = obj;
        this._animateRun(styles, config2).then(() => {
          step += 1;
          this._nvueNextAnimate(animates, step, fn);
        });
      } else {
        this.currentStepAnimates = {};
        typeof fn === "function" && fn();
        this.isEnd = true;
      }
    }
    step(config2 = {}) {
      this.animation.step(config2);
      return this;
    }
    run(fn) {
      this.$.animationData = this.animation.export();
      this.$.timer = setTimeout(() => {
        typeof fn === "function" && fn();
      }, this.$.durationTime);
    }
  }
  const animateTypes1 = [
    "matrix",
    "matrix3d",
    "rotate",
    "rotate3d",
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "scale3d",
    "scaleX",
    "scaleY",
    "scaleZ",
    "skew",
    "skewX",
    "skewY",
    "translate",
    "translate3d",
    "translateX",
    "translateY",
    "translateZ"
  ];
  const animateTypes2 = ["opacity", "backgroundColor"];
  const animateTypes3 = ["width", "height", "left", "right", "top", "bottom"];
  animateTypes1.concat(animateTypes2, animateTypes3).forEach((type) => {
    MPAnimation.prototype[type] = function(...args) {
      this.animation[type](...args);
      return this;
    };
  });
  function createAnimation(option, _this) {
    if (!_this)
      return;
    clearTimeout(_this.timer);
    return new MPAnimation(option, _this);
  }
  const _sfc_main$5 = {
    name: "uniTransition",
    emits: ["click", "change"],
    props: {
      show: {
        type: Boolean,
        default: false
      },
      modeClass: {
        type: [Array, String],
        default() {
          return "fade";
        }
      },
      duration: {
        type: Number,
        default: 300
      },
      styles: {
        type: Object,
        default() {
          return {};
        }
      },
      customClass: {
        type: String,
        default: ""
      },
      onceRender: {
        type: Boolean,
        default: false
      }
    },
    data() {
      return {
        isShow: false,
        transform: "",
        opacity: 1,
        animationData: {},
        durationTime: 300,
        config: {}
      };
    },
    watch: {
      show: {
        handler(newVal) {
          if (newVal) {
            this.open();
          } else {
            if (this.isShow) {
              this.close();
            }
          }
        },
        immediate: true
      }
    },
    computed: {
      // 生成样式数据
      stylesObject() {
        let styles = {
          ...this.styles,
          "transition-duration": this.duration / 1e3 + "s"
        };
        let transform = "";
        for (let i in styles) {
          let line = this.toLine(i);
          transform += line + ":" + styles[i] + ";";
        }
        return transform;
      },
      // 初始化动画条件
      transformStyles() {
        return "transform:" + this.transform + ";opacity:" + this.opacity + ";" + this.stylesObject;
      }
    },
    created() {
      this.config = {
        duration: this.duration,
        timingFunction: "ease",
        transformOrigin: "50% 50%",
        delay: 0
      };
      this.durationTime = this.duration;
    },
    methods: {
      /**
       *  ref 触发 初始化动画
       */
      init(obj = {}) {
        if (obj.duration) {
          this.durationTime = obj.duration;
        }
        this.animation = createAnimation(Object.assign(this.config, obj), this);
      },
      /**
       * 点击组件触发回调
       */
      onClick() {
        this.$emit("click", {
          detail: this.isShow
        });
      },
      /**
       * ref 触发 动画分组
       * @param {Object} obj
       */
      step(obj, config2 = {}) {
        if (!this.animation)
          return;
        for (let i in obj) {
          try {
            if (typeof obj[i] === "object") {
              this.animation[i](...obj[i]);
            } else {
              this.animation[i](obj[i]);
            }
          } catch (e) {
            formatAppLog("error", "at node_modules/@dcloudio/uni-ui/lib/uni-transition/uni-transition.vue:148", `方法 ${i} 不存在`);
          }
        }
        this.animation.step(config2);
        return this;
      },
      /**
       *  ref 触发 执行动画
       */
      run(fn) {
        if (!this.animation)
          return;
        this.animation.run(fn);
      },
      // 开始过度动画
      open() {
        clearTimeout(this.timer);
        this.transform = "";
        this.isShow = true;
        let { opacity, transform } = this.styleInit(false);
        if (typeof opacity !== "undefined") {
          this.opacity = opacity;
        }
        this.transform = transform;
        this.$nextTick(() => {
          this.timer = setTimeout(() => {
            this.animation = createAnimation(this.config, this);
            this.tranfromInit(false).step();
            this.animation.run();
            this.$emit("change", {
              detail: this.isShow
            });
          }, 20);
        });
      },
      // 关闭过度动画
      close(type) {
        if (!this.animation)
          return;
        this.tranfromInit(true).step().run(() => {
          this.isShow = false;
          this.animationData = null;
          this.animation = null;
          let { opacity, transform } = this.styleInit(false);
          this.opacity = opacity || 1;
          this.transform = transform;
          this.$emit("change", {
            detail: this.isShow
          });
        });
      },
      // 处理动画开始前的默认样式
      styleInit(type) {
        let styles = {
          transform: ""
        };
        let buildStyle = (type2, mode) => {
          if (mode === "fade") {
            styles.opacity = this.animationType(type2)[mode];
          } else {
            styles.transform += this.animationType(type2)[mode] + " ";
          }
        };
        if (typeof this.modeClass === "string") {
          buildStyle(type, this.modeClass);
        } else {
          this.modeClass.forEach((mode) => {
            buildStyle(type, mode);
          });
        }
        return styles;
      },
      // 处理内置组合动画
      tranfromInit(type) {
        let buildTranfrom = (type2, mode) => {
          let aniNum = null;
          if (mode === "fade") {
            aniNum = type2 ? 0 : 1;
          } else {
            aniNum = type2 ? "-100%" : "0";
            if (mode === "zoom-in") {
              aniNum = type2 ? 0.8 : 1;
            }
            if (mode === "zoom-out") {
              aniNum = type2 ? 1.2 : 1;
            }
            if (mode === "slide-right") {
              aniNum = type2 ? "100%" : "0";
            }
            if (mode === "slide-bottom") {
              aniNum = type2 ? "100%" : "0";
            }
          }
          this.animation[this.animationMode()[mode]](aniNum);
        };
        if (typeof this.modeClass === "string") {
          buildTranfrom(type, this.modeClass);
        } else {
          this.modeClass.forEach((mode) => {
            buildTranfrom(type, mode);
          });
        }
        return this.animation;
      },
      animationType(type) {
        return {
          fade: type ? 0 : 1,
          "slide-top": `translateY(${type ? "0" : "-100%"})`,
          "slide-right": `translateX(${type ? "0" : "100%"})`,
          "slide-bottom": `translateY(${type ? "0" : "100%"})`,
          "slide-left": `translateX(${type ? "0" : "-100%"})`,
          "zoom-in": `scaleX(${type ? 1 : 0.8}) scaleY(${type ? 1 : 0.8})`,
          "zoom-out": `scaleX(${type ? 1 : 1.2}) scaleY(${type ? 1 : 1.2})`
        };
      },
      // 内置动画类型与实际动画对应字典
      animationMode() {
        return {
          fade: "opacity",
          "slide-top": "translateY",
          "slide-right": "translateX",
          "slide-bottom": "translateY",
          "slide-left": "translateX",
          "zoom-in": "scale",
          "zoom-out": "scale"
        };
      },
      // 驼峰转中横线
      toLine(name) {
        return name.replace(/([A-Z])/g, "-$1").toLowerCase();
      }
    }
  };
  function _sfc_render$4(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.withDirectives((vue.openBlock(), vue.createElementBlock("view", {
      ref: "ani",
      animation: $data.animationData,
      class: vue.normalizeClass($props.customClass),
      style: vue.normalizeStyle($options.transformStyles),
      onClick: _cache[0] || (_cache[0] = (...args) => $options.onClick && $options.onClick(...args))
    }, [
      vue.renderSlot(_ctx.$slots, "default")
    ], 14, ["animation"])), [
      [vue.vShow, $data.isShow]
    ]);
  }
  const __easycom_0 = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["render", _sfc_render$4], ["__file", "E:/Projects/SE/ride-sharing-se/node_modules/@dcloudio/uni-ui/lib/uni-transition/uni-transition.vue"]]);
  const _sfc_main$4 = {
    name: "uniPopup",
    components: {},
    emits: ["change", "maskClick"],
    props: {
      // 开启动画
      animation: {
        type: Boolean,
        default: true
      },
      // 弹出层类型，可选值，top: 顶部弹出层；bottom：底部弹出层；center：全屏弹出层
      // message: 消息提示 ; dialog : 对话框
      type: {
        type: String,
        default: "center"
      },
      // maskClick
      isMaskClick: {
        type: Boolean,
        default: null
      },
      // TODO 2 个版本后废弃属性 ，使用 isMaskClick
      maskClick: {
        type: Boolean,
        default: null
      },
      backgroundColor: {
        type: String,
        default: "none"
      },
      safeArea: {
        type: Boolean,
        default: true
      },
      maskBackgroundColor: {
        type: String,
        default: "rgba(0, 0, 0, 0.4)"
      },
      borderRadius: {
        type: String
      }
    },
    watch: {
      /**
       * 监听type类型
       */
      type: {
        handler: function(type) {
          if (!this.config[type])
            return;
          this[this.config[type]](true);
        },
        immediate: true
      },
      isDesktop: {
        handler: function(newVal) {
          if (!this.config[newVal])
            return;
          this[this.config[this.type]](true);
        },
        immediate: true
      },
      /**
       * 监听遮罩是否可点击
       * @param {Object} val
       */
      maskClick: {
        handler: function(val) {
          this.mkclick = val;
        },
        immediate: true
      },
      isMaskClick: {
        handler: function(val) {
          this.mkclick = val;
        },
        immediate: true
      },
      // H5 下禁止底部滚动
      showPopup(show) {
      }
    },
    data() {
      return {
        duration: 300,
        ani: [],
        showPopup: false,
        showTrans: false,
        popupWidth: 0,
        popupHeight: 0,
        config: {
          top: "top",
          bottom: "bottom",
          center: "center",
          left: "left",
          right: "right",
          message: "top",
          dialog: "center",
          share: "bottom"
        },
        maskClass: {
          position: "fixed",
          bottom: 0,
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)"
        },
        transClass: {
          backgroundColor: "transparent",
          borderRadius: this.borderRadius || "0",
          position: "fixed",
          left: 0,
          right: 0
        },
        maskShow: true,
        mkclick: true,
        popupstyle: "top"
      };
    },
    computed: {
      getStyles() {
        let res2 = { backgroundColor: this.bg };
        if (this.borderRadius || "0") {
          res2 = Object.assign(res2, { borderRadius: this.borderRadius });
        }
        return res2;
      },
      isDesktop() {
        return this.popupWidth >= 500 && this.popupHeight >= 500;
      },
      bg() {
        if (this.backgroundColor === "" || this.backgroundColor === "none") {
          return "transparent";
        }
        return this.backgroundColor;
      }
    },
    mounted() {
      const fixSize = () => {
        const {
          windowWidth,
          windowHeight,
          windowTop,
          safeArea,
          screenHeight,
          safeAreaInsets
        } = uni.getSystemInfoSync();
        this.popupWidth = windowWidth;
        this.popupHeight = windowHeight + (windowTop || 0);
        if (safeArea && this.safeArea) {
          this.safeAreaInsets = safeAreaInsets.bottom;
        } else {
          this.safeAreaInsets = 0;
        }
      };
      fixSize();
    },
    // TODO vue3
    unmounted() {
      this.setH5Visible();
    },
    activated() {
      this.setH5Visible(!this.showPopup);
    },
    deactivated() {
      this.setH5Visible(true);
    },
    created() {
      if (this.isMaskClick === null && this.maskClick === null) {
        this.mkclick = true;
      } else {
        this.mkclick = this.isMaskClick !== null ? this.isMaskClick : this.maskClick;
      }
      if (this.animation) {
        this.duration = 300;
      } else {
        this.duration = 0;
      }
      this.messageChild = null;
      this.clearPropagation = false;
      this.maskClass.backgroundColor = this.maskBackgroundColor;
    },
    methods: {
      setH5Visible(visible = true) {
      },
      /**
       * 公用方法，不显示遮罩层
       */
      closeMask() {
        this.maskShow = false;
      },
      /**
       * 公用方法，遮罩层禁止点击
       */
      disableMask() {
        this.mkclick = false;
      },
      // TODO nvue 取消冒泡
      clear(e) {
        e.stopPropagation();
        this.clearPropagation = true;
      },
      open(direction) {
        if (this.showPopup) {
          return;
        }
        let innerType = ["top", "center", "bottom", "left", "right", "message", "dialog", "share"];
        if (!(direction && innerType.indexOf(direction) !== -1)) {
          direction = this.type;
        }
        if (!this.config[direction]) {
          formatAppLog("error", "at node_modules/@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue:310", "缺少类型：", direction);
          return;
        }
        this[this.config[direction]]();
        this.$emit("change", {
          show: true,
          type: direction
        });
      },
      close(type) {
        this.showTrans = false;
        this.$emit("change", {
          show: false,
          type: this.type
        });
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.showPopup = false;
        }, 300);
      },
      // TODO 处理冒泡事件，头条的冒泡事件有问题 ，先这样兼容
      touchstart() {
        this.clearPropagation = false;
      },
      onTap() {
        if (this.clearPropagation) {
          this.clearPropagation = false;
          return;
        }
        this.$emit("maskClick");
        if (!this.mkclick)
          return;
        this.close();
      },
      /**
       * 顶部弹出样式处理
       */
      top(type) {
        this.popupstyle = this.isDesktop ? "fixforpc-top" : "top";
        this.ani = ["slide-top"];
        this.transClass = {
          position: "fixed",
          left: 0,
          right: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPopup = true;
        this.showTrans = true;
        this.$nextTick(() => {
          this.showPoptrans();
          if (this.messageChild && this.type === "message") {
            this.messageChild.timerClose();
          }
        });
      },
      /**
       * 底部弹出样式处理
       */
      bottom(type) {
        this.popupstyle = "bottom";
        this.ani = ["slide-bottom"];
        this.transClass = {
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: this.safeAreaInsets + "px",
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPoptrans();
      },
      /**
       * 中间弹出样式处理
       */
      center(type) {
        this.popupstyle = "center";
        this.ani = ["zoom-out", "fade"];
        this.transClass = {
          position: "fixed",
          display: "flex",
          flexDirection: "column",
          bottom: 0,
          left: 0,
          right: 0,
          top: 0,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: this.borderRadius || "0"
        };
        if (type)
          return;
        this.showPoptrans();
      },
      left(type) {
        this.popupstyle = "left";
        this.ani = ["slide-left"];
        this.transClass = {
          position: "fixed",
          left: 0,
          bottom: 0,
          top: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0",
          display: "flex",
          flexDirection: "column"
        };
        if (type)
          return;
        this.showPoptrans();
      },
      right(type) {
        this.popupstyle = "right";
        this.ani = ["slide-right"];
        this.transClass = {
          position: "fixed",
          bottom: 0,
          right: 0,
          top: 0,
          backgroundColor: this.bg,
          borderRadius: this.borderRadius || "0",
          display: "flex",
          flexDirection: "column"
        };
        if (type)
          return;
        this.showPoptrans();
      },
      showPoptrans() {
        this.$nextTick(() => {
          this.showPopup = true;
          this.showTrans = true;
        });
      }
    }
  };
  function _sfc_render$3(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_uni_transition = resolveEasycom(vue.resolveDynamicComponent("uni-transition"), __easycom_0);
    return $data.showPopup ? (vue.openBlock(), vue.createElementBlock(
      "view",
      {
        key: 0,
        class: vue.normalizeClass(["uni-popup", [$data.popupstyle, $options.isDesktop ? "fixforpc-z-index" : ""]])
      },
      [
        vue.createElementVNode(
          "view",
          {
            onTouchstart: _cache[1] || (_cache[1] = (...args) => $options.touchstart && $options.touchstart(...args))
          },
          [
            $data.maskShow ? (vue.openBlock(), vue.createBlock(_component_uni_transition, {
              key: "1",
              name: "mask",
              "mode-class": "fade",
              styles: $data.maskClass,
              duration: $data.duration,
              show: $data.showTrans,
              onClick: $options.onTap
            }, null, 8, ["styles", "duration", "show", "onClick"])) : vue.createCommentVNode("v-if", true),
            vue.createVNode(_component_uni_transition, {
              key: "2",
              "mode-class": $data.ani,
              name: "content",
              styles: $data.transClass,
              duration: $data.duration,
              show: $data.showTrans,
              onClick: $options.onTap
            }, {
              default: vue.withCtx(() => [
                vue.createElementVNode(
                  "view",
                  {
                    class: vue.normalizeClass(["uni-popup__wrapper", [$data.popupstyle]]),
                    style: vue.normalizeStyle($options.getStyles),
                    onClick: _cache[0] || (_cache[0] = (...args) => $options.clear && $options.clear(...args))
                  },
                  [
                    vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
                  ],
                  6
                  /* CLASS, STYLE */
                )
              ]),
              _: 3
              /* FORWARDED */
            }, 8, ["mode-class", "styles", "duration", "show", "onClick"])
          ],
          32
          /* NEED_HYDRATION */
        )
      ],
      2
      /* CLASS */
    )) : vue.createCommentVNode("v-if", true);
  }
  const __easycom_1 = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["render", _sfc_render$3], ["__scopeId", "data-v-7db519c7"], ["__file", "E:/Projects/SE/ride-sharing-se/node_modules/@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue"]]);
  const fontData = [
    {
      "font_class": "arrow-down",
      "unicode": ""
    },
    {
      "font_class": "arrow-left",
      "unicode": ""
    },
    {
      "font_class": "arrow-right",
      "unicode": ""
    },
    {
      "font_class": "arrow-up",
      "unicode": ""
    },
    {
      "font_class": "auth",
      "unicode": ""
    },
    {
      "font_class": "auth-filled",
      "unicode": ""
    },
    {
      "font_class": "back",
      "unicode": ""
    },
    {
      "font_class": "bars",
      "unicode": ""
    },
    {
      "font_class": "calendar",
      "unicode": ""
    },
    {
      "font_class": "calendar-filled",
      "unicode": ""
    },
    {
      "font_class": "camera",
      "unicode": ""
    },
    {
      "font_class": "camera-filled",
      "unicode": ""
    },
    {
      "font_class": "cart",
      "unicode": ""
    },
    {
      "font_class": "cart-filled",
      "unicode": ""
    },
    {
      "font_class": "chat",
      "unicode": ""
    },
    {
      "font_class": "chat-filled",
      "unicode": ""
    },
    {
      "font_class": "chatboxes",
      "unicode": ""
    },
    {
      "font_class": "chatboxes-filled",
      "unicode": ""
    },
    {
      "font_class": "chatbubble",
      "unicode": ""
    },
    {
      "font_class": "chatbubble-filled",
      "unicode": ""
    },
    {
      "font_class": "checkbox",
      "unicode": ""
    },
    {
      "font_class": "checkbox-filled",
      "unicode": ""
    },
    {
      "font_class": "checkmarkempty",
      "unicode": ""
    },
    {
      "font_class": "circle",
      "unicode": ""
    },
    {
      "font_class": "circle-filled",
      "unicode": ""
    },
    {
      "font_class": "clear",
      "unicode": ""
    },
    {
      "font_class": "close",
      "unicode": ""
    },
    {
      "font_class": "closeempty",
      "unicode": ""
    },
    {
      "font_class": "cloud-download",
      "unicode": ""
    },
    {
      "font_class": "cloud-download-filled",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload",
      "unicode": ""
    },
    {
      "font_class": "cloud-upload-filled",
      "unicode": ""
    },
    {
      "font_class": "color",
      "unicode": ""
    },
    {
      "font_class": "color-filled",
      "unicode": ""
    },
    {
      "font_class": "compose",
      "unicode": ""
    },
    {
      "font_class": "contact",
      "unicode": ""
    },
    {
      "font_class": "contact-filled",
      "unicode": ""
    },
    {
      "font_class": "down",
      "unicode": ""
    },
    {
      "font_class": "bottom",
      "unicode": ""
    },
    {
      "font_class": "download",
      "unicode": ""
    },
    {
      "font_class": "download-filled",
      "unicode": ""
    },
    {
      "font_class": "email",
      "unicode": ""
    },
    {
      "font_class": "email-filled",
      "unicode": ""
    },
    {
      "font_class": "eye",
      "unicode": ""
    },
    {
      "font_class": "eye-filled",
      "unicode": ""
    },
    {
      "font_class": "eye-slash",
      "unicode": ""
    },
    {
      "font_class": "eye-slash-filled",
      "unicode": ""
    },
    {
      "font_class": "fire",
      "unicode": ""
    },
    {
      "font_class": "fire-filled",
      "unicode": ""
    },
    {
      "font_class": "flag",
      "unicode": ""
    },
    {
      "font_class": "flag-filled",
      "unicode": ""
    },
    {
      "font_class": "folder-add",
      "unicode": ""
    },
    {
      "font_class": "folder-add-filled",
      "unicode": ""
    },
    {
      "font_class": "font",
      "unicode": ""
    },
    {
      "font_class": "forward",
      "unicode": ""
    },
    {
      "font_class": "gear",
      "unicode": ""
    },
    {
      "font_class": "gear-filled",
      "unicode": ""
    },
    {
      "font_class": "gift",
      "unicode": ""
    },
    {
      "font_class": "gift-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-down",
      "unicode": ""
    },
    {
      "font_class": "hand-down-filled",
      "unicode": ""
    },
    {
      "font_class": "hand-up",
      "unicode": ""
    },
    {
      "font_class": "hand-up-filled",
      "unicode": ""
    },
    {
      "font_class": "headphones",
      "unicode": ""
    },
    {
      "font_class": "heart",
      "unicode": ""
    },
    {
      "font_class": "heart-filled",
      "unicode": ""
    },
    {
      "font_class": "help",
      "unicode": ""
    },
    {
      "font_class": "help-filled",
      "unicode": ""
    },
    {
      "font_class": "home",
      "unicode": ""
    },
    {
      "font_class": "home-filled",
      "unicode": ""
    },
    {
      "font_class": "image",
      "unicode": ""
    },
    {
      "font_class": "image-filled",
      "unicode": ""
    },
    {
      "font_class": "images",
      "unicode": ""
    },
    {
      "font_class": "images-filled",
      "unicode": ""
    },
    {
      "font_class": "info",
      "unicode": ""
    },
    {
      "font_class": "info-filled",
      "unicode": ""
    },
    {
      "font_class": "left",
      "unicode": ""
    },
    {
      "font_class": "link",
      "unicode": ""
    },
    {
      "font_class": "list",
      "unicode": ""
    },
    {
      "font_class": "location",
      "unicode": ""
    },
    {
      "font_class": "location-filled",
      "unicode": ""
    },
    {
      "font_class": "locked",
      "unicode": ""
    },
    {
      "font_class": "locked-filled",
      "unicode": ""
    },
    {
      "font_class": "loop",
      "unicode": ""
    },
    {
      "font_class": "mail-open",
      "unicode": ""
    },
    {
      "font_class": "mail-open-filled",
      "unicode": ""
    },
    {
      "font_class": "map",
      "unicode": ""
    },
    {
      "font_class": "map-filled",
      "unicode": ""
    },
    {
      "font_class": "map-pin",
      "unicode": ""
    },
    {
      "font_class": "map-pin-ellipse",
      "unicode": ""
    },
    {
      "font_class": "medal",
      "unicode": ""
    },
    {
      "font_class": "medal-filled",
      "unicode": ""
    },
    {
      "font_class": "mic",
      "unicode": ""
    },
    {
      "font_class": "mic-filled",
      "unicode": ""
    },
    {
      "font_class": "micoff",
      "unicode": ""
    },
    {
      "font_class": "micoff-filled",
      "unicode": ""
    },
    {
      "font_class": "minus",
      "unicode": ""
    },
    {
      "font_class": "minus-filled",
      "unicode": ""
    },
    {
      "font_class": "more",
      "unicode": ""
    },
    {
      "font_class": "more-filled",
      "unicode": ""
    },
    {
      "font_class": "navigate",
      "unicode": ""
    },
    {
      "font_class": "navigate-filled",
      "unicode": ""
    },
    {
      "font_class": "notification",
      "unicode": ""
    },
    {
      "font_class": "notification-filled",
      "unicode": ""
    },
    {
      "font_class": "paperclip",
      "unicode": ""
    },
    {
      "font_class": "paperplane",
      "unicode": ""
    },
    {
      "font_class": "paperplane-filled",
      "unicode": ""
    },
    {
      "font_class": "person",
      "unicode": ""
    },
    {
      "font_class": "person-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled",
      "unicode": ""
    },
    {
      "font_class": "personadd-filled-copy",
      "unicode": ""
    },
    {
      "font_class": "phone",
      "unicode": ""
    },
    {
      "font_class": "phone-filled",
      "unicode": ""
    },
    {
      "font_class": "plus",
      "unicode": ""
    },
    {
      "font_class": "plus-filled",
      "unicode": ""
    },
    {
      "font_class": "plusempty",
      "unicode": ""
    },
    {
      "font_class": "pulldown",
      "unicode": ""
    },
    {
      "font_class": "pyq",
      "unicode": ""
    },
    {
      "font_class": "qq",
      "unicode": ""
    },
    {
      "font_class": "redo",
      "unicode": ""
    },
    {
      "font_class": "redo-filled",
      "unicode": ""
    },
    {
      "font_class": "refresh",
      "unicode": ""
    },
    {
      "font_class": "refresh-filled",
      "unicode": ""
    },
    {
      "font_class": "refreshempty",
      "unicode": ""
    },
    {
      "font_class": "reload",
      "unicode": ""
    },
    {
      "font_class": "right",
      "unicode": ""
    },
    {
      "font_class": "scan",
      "unicode": ""
    },
    {
      "font_class": "search",
      "unicode": ""
    },
    {
      "font_class": "settings",
      "unicode": ""
    },
    {
      "font_class": "settings-filled",
      "unicode": ""
    },
    {
      "font_class": "shop",
      "unicode": ""
    },
    {
      "font_class": "shop-filled",
      "unicode": ""
    },
    {
      "font_class": "smallcircle",
      "unicode": ""
    },
    {
      "font_class": "smallcircle-filled",
      "unicode": ""
    },
    {
      "font_class": "sound",
      "unicode": ""
    },
    {
      "font_class": "sound-filled",
      "unicode": ""
    },
    {
      "font_class": "spinner-cycle",
      "unicode": ""
    },
    {
      "font_class": "staff",
      "unicode": ""
    },
    {
      "font_class": "staff-filled",
      "unicode": ""
    },
    {
      "font_class": "star",
      "unicode": ""
    },
    {
      "font_class": "star-filled",
      "unicode": ""
    },
    {
      "font_class": "starhalf",
      "unicode": ""
    },
    {
      "font_class": "trash",
      "unicode": ""
    },
    {
      "font_class": "trash-filled",
      "unicode": ""
    },
    {
      "font_class": "tune",
      "unicode": ""
    },
    {
      "font_class": "tune-filled",
      "unicode": ""
    },
    {
      "font_class": "undo",
      "unicode": ""
    },
    {
      "font_class": "undo-filled",
      "unicode": ""
    },
    {
      "font_class": "up",
      "unicode": ""
    },
    {
      "font_class": "top",
      "unicode": ""
    },
    {
      "font_class": "upload",
      "unicode": ""
    },
    {
      "font_class": "upload-filled",
      "unicode": ""
    },
    {
      "font_class": "videocam",
      "unicode": ""
    },
    {
      "font_class": "videocam-filled",
      "unicode": ""
    },
    {
      "font_class": "vip",
      "unicode": ""
    },
    {
      "font_class": "vip-filled",
      "unicode": ""
    },
    {
      "font_class": "wallet",
      "unicode": ""
    },
    {
      "font_class": "wallet-filled",
      "unicode": ""
    },
    {
      "font_class": "weibo",
      "unicode": ""
    },
    {
      "font_class": "weixin",
      "unicode": ""
    }
  ];
  const getVal = (val) => {
    const reg = /^[0-9]*$/g;
    return typeof val === "number" || reg.test(val) ? val + "px" : val;
  };
  const _sfc_main$3 = {
    name: "UniIcons",
    emits: ["click"],
    props: {
      type: {
        type: String,
        default: ""
      },
      color: {
        type: String,
        default: "#333333"
      },
      size: {
        type: [Number, String],
        default: 16
      },
      customPrefix: {
        type: String,
        default: ""
      },
      fontFamily: {
        type: String,
        default: ""
      }
    },
    data() {
      return {
        icons: fontData
      };
    },
    computed: {
      unicode() {
        let code = this.icons.find((v) => v.font_class === this.type);
        if (code) {
          return code.unicode;
        }
        return "";
      },
      iconSize() {
        return getVal(this.size);
      },
      styleObj() {
        if (this.fontFamily !== "") {
          return `color: ${this.color}; font-size: ${this.iconSize}; font-family: ${this.fontFamily};`;
        }
        return `color: ${this.color}; font-size: ${this.iconSize};`;
      }
    },
    methods: {
      _onClick() {
        this.$emit("click");
      }
    }
  };
  function _sfc_render$2(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      "text",
      {
        style: vue.normalizeStyle($options.styleObj),
        class: vue.normalizeClass(["uni-icons", ["uniui-" + $props.type, $props.customPrefix, $props.customPrefix ? $props.type : ""]]),
        onClick: _cache[0] || (_cache[0] = (...args) => $options._onClick && $options._onClick(...args))
      },
      [
        vue.renderSlot(_ctx.$slots, "default", {}, void 0, true)
      ],
      6
      /* CLASS, STYLE */
    );
  }
  const __easycom_2 = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["render", _sfc_render$2], ["__scopeId", "data-v-946bce22"], ["__file", "E:/Projects/SE/ride-sharing-se/node_modules/@dcloudio/uni-ui/lib/uni-icons/uni-icons.vue"]]);
  const _imports_0 = "/static/atm-fill.png";
  const _sfc_main$2 = {
    components: {
      NavigationBar,
      uniPopup: __easycom_1,
      uniPopupDialog: __easycom_0$1
    },
    data() {
      return {
        // 经纬度
        latitude: 0,
        longitude: 0,
        isPassenger: true,
        // 订单显示状态(人找车/车找人)
        searchKeyword: "",
        // 搜索关键字
        orders: [],
        // 订单列表
        isLoading: false,
        // 加载标志位
        currentOrderId: null,
        // 当前操作的订单ID
        popupTitle: "申请加入",
        popupContent: "确定要申请加入此行程吗？",
        currentAction: "",
        // 'accept' | 'apply'
        isCarpool: false,
        // 是否为拼车 
        // 用于司机接单的数据
        vehicles: [],
        // 司机拥有的车辆列表
        selectedVehicleId: null
        // 选中的车辆ID
      };
    },
    computed: {
      filteredOrders() {
        return this.orders.filter((order) => order.infoType === (this.isPassenger ? "人找车" : "车找人"));
      },
      filteredAndSearchedOrders() {
        if (!this.searchKeyword) {
          return this.filteredOrders;
        }
        const keyword = this.searchKeyword.toLowerCase();
        return this.filteredOrders.filter(
          (order) => order.startPoint.toLowerCase().includes(keyword) || order.endPoint.toLowerCase().includes(keyword) || order.username && order.username.toLowerCase().includes(keyword) || order.carType && order.carType.toLowerCase().includes(keyword) || order.date.includes(keyword)
        );
      }
    },
    onLoad() {
      this.initMap();
      this.initData();
    },
    methods: {
      initMap() {
        this.getLocation();
      },
      initData() {
        this.fetchOrders(true);
      },
      getLocation() {
        if (typeof wx !== "undefined" && wx.getLocation) {
          wx.getLocation({
            type: "wgs84",
            success: (res2) => {
              this.latitude = res2.latitude;
              this.longitude = res2.longitude;
            },
            fail: (error) => {
              formatAppLog("error", "at pages/index/home.vue:247", "获取位置失败:", error);
            }
          });
        } else {
          formatAppLog("error", "at pages/index/home.vue:251", "当前环境不支持微信小程序的定位功能");
        }
      },
      onMapTap(e) {
        formatAppLog("log", "at pages/index/home.vue:255", "地图被点击了", e);
      },
      onMarkerTap(e) {
        formatAppLog("log", "at pages/index/home.vue:258", "标记被点击了", e);
      },
      onRegionChange(e) {
        formatAppLog("log", "at pages/index/home.vue:261", "地图区域改变", e);
      },
      toggleIdentity(identity) {
        this.isPassenger = identity === "passenger";
      },
      async fetchOrders(refresh = false) {
        if (this.isLoading && !refresh)
          return;
        try {
          this.isLoading = true;
          formatAppLog("log", "at pages/index/home.vue:274", "获取首页订单数据");
          const res2 = await fetchOrderList();
          formatAppLog("log", "at pages/index/home.vue:276", res2.data);
          if (refresh) {
            this.orders = res2.data || [];
            formatAppLog("log", "at pages/index/home.vue:279", this.orders);
          } else {
            this.orders = [...this.orders, ...res2.data || []];
          }
        } catch (error) {
          uni.showToast({
            title: `加载失败: ${error.message}`,
            icon: "none",
            duration: 2e3
          });
          formatAppLog("error", "at pages/index/home.vue:290", "获取订单失败:", error);
        } finally {
          this.isLoading = false;
          uni.stopPullDownRefresh();
        }
      },
      // 司机接单按钮点击事件
      async handleDriverAction(order) {
        formatAppLog("log", "at pages/index/home.vue:298", "司机接单按钮点击事件");
        try {
          const res2 = await fetchCars();
          formatAppLog("log", "at pages/index/home.vue:302", "fetch car res", res2);
          if (res2.data.count !== 0) {
            this.vehicles = res2.data.vehicles;
            this.currentOrderId = order.id;
            this.$refs.vehiclePopup.open();
          } else {
            throw new Error("您还没有可用的车辆");
          }
        } catch (error) {
          uni.showToast({ title: error.message, duration: 2e3, icon: "none" });
        }
      },
      // 车辆选择确认
      async confirmVehicleSelection() {
        if (!this.selectedVehicleId) {
          uni.showToast({ title: "请选择车辆", icon: "none" });
          return;
        }
        this.$refs.vehiclePopup.close();
        this.currentAction = "accept";
        this.popupTitle = "确认接单";
        this.popupContent = `确定使用选中的车辆接单吗？`;
        this.$refs.actionPopup.open();
      },
      // 乘客申请按钮点击事件
      handlePassengerAction(order) {
        formatAppLog("log", "at pages/index/home.vue:330", "乘客申请按钮点击事件");
        this.currentOrderId = order.id;
        this.currentAction = "apply";
        this.isCarpool = order.infoType === "人找车";
        this.popupType = "info";
        this.popupTitle = this.isCarpool ? "申请拼车" : "申请搭车";
        this.popupContent = `确定要${this.isCarpool ? "拼车" : "搭车"}吗？`;
        this.$refs.actionPopup.open();
        this.currentOrderId = order.id;
      },
      // 弹窗确认操作
      async handleConfirm() {
        try {
          formatAppLog("log", "at pages/index/home.vue:343", "弹窗确认操作");
          uni.showLoading({ title: "处理中...", mask: true });
          if (this.currentAction === "accept") {
            await this.acceptOrder();
          } else {
            await this.applyOrder();
          }
          ;
          uni.showToast({
            title: this.getSuccessMessage(),
            icon: "none"
          });
        } catch (error) {
          this.popupType = "error";
          this.popupContent = error.message;
          this.$refs.actionPopup.open();
        } finally {
          uni.hideLoading();
        }
        this.$emit("refresh");
      },
      // 获取成功提示消息
      getSuccessMessage() {
        if (this.currentAction === "accept")
          return "接单成功";
        return this.isCarpool ? "拼车申请已提交" : "搭车申请已提交";
      },
      // 接单API
      async acceptOrder() {
        formatAppLog("log", "at pages/index/home.vue:372", "调用接单API");
        try {
          const res2 = await acceptOrder({
            orderId: this.currentOrderId,
            vehicleId: this.selectedVehicleId
          });
          this.fetchOrders(true);
        } catch (error) {
          uni.showToast({
            title: res.message || "接单失败",
            icon: "none"
          });
        }
      },
      // 申请API
      async applyOrder() {
        formatAppLog("log", "at pages/index/home.vue:390", "调用申请API");
        try {
          const res2 = await applyOrder({
            orderId: this.currentOrderId
          });
          formatAppLog("log", "at pages/index/home.vue:395", res2);
          this.fetchOrders(true);
        } catch (error) {
          uni.showToast({
            title: res.message || "申请失败",
            icon: "none"
          });
        }
      },
      // 关闭弹窗
      closePopup() {
        this.currentOrderId = null;
        this.currentAction = "";
      },
      handleSearch() {
      }
    },
    components: {
      // 注册 NavigationBar 组件
      NavigationBar
    }
  };
  function _sfc_render$1(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    const _component_uni_popup_dialog = resolveEasycom(vue.resolveDynamicComponent("uni-popup-dialog"), __easycom_0$1);
    const _component_uni_popup = resolveEasycom(vue.resolveDynamicComponent("uni-popup"), __easycom_1);
    const _component_uni_icons = resolveEasycom(vue.resolveDynamicComponent("uni-icons"), __easycom_2);
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createElementVNode("div", null, [
          vue.createCommentVNode(" 使用 NavigationBar 组件 "),
          vue.createVNode(_component_NavigationBar),
          vue.createCommentVNode(" 其他内容 ")
        ]),
        vue.createElementVNode("view", { class: "container" }, [
          vue.createCommentVNode(" 地图部分 "),
          vue.createElementVNode("map", {
            id: "baiduMap",
            class: "map-container",
            latitude: $data.latitude,
            longitude: $data.longitude,
            scale: "16",
            "show-compass": "",
            "show-traffic": "",
            "show-scale": "",
            style: { "width": "100%", "height": "150px" },
            onTap: _cache[0] || (_cache[0] = (...args) => $options.onMapTap && $options.onMapTap(...args)),
            onMarkertap: _cache[1] || (_cache[1] = (...args) => $options.onMarkerTap && $options.onMarkerTap(...args)),
            onRegionchange: _cache[2] || (_cache[2] = (...args) => $options.onRegionChange && $options.onRegionChange(...args))
          }, null, 40, ["latitude", "longitude"]),
          vue.createCommentVNode(" 搜索和身份切换栏 "),
          vue.createElementVNode("view", { class: "bar" }, [
            vue.createElementVNode("image", {
              src: _imports_0,
              class: "icon"
            }),
            vue.withDirectives(vue.createElementVNode(
              "input",
              {
                class: "search-input",
                placeholder: "输入地点或路线搜索",
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => $data.searchKeyword = $event),
                onInput: _cache[4] || (_cache[4] = (...args) => $options.handleSearch && $options.handleSearch(...args))
              },
              null,
              544
              /* NEED_HYDRATION, NEED_PATCH */
            ), [
              [vue.vModelText, $data.searchKeyword]
            ]),
            vue.createElementVNode("view", {
              class: "switch",
              style: { "width": "260rpx" }
            }, [
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass({ "active": $data.isPassenger }),
                  onClick: _cache[5] || (_cache[5] = ($event) => $options.toggleIdentity("passenger"))
                },
                "人找车",
                2
                /* CLASS */
              ),
              vue.createElementVNode(
                "text",
                {
                  class: vue.normalizeClass({ "active": !$data.isPassenger }),
                  onClick: _cache[6] || (_cache[6] = ($event) => $options.toggleIdentity("driver"))
                },
                "车找人",
                2
                /* CLASS */
              )
            ])
          ]),
          vue.createCommentVNode(" 订单列表 "),
          vue.createElementVNode("scroll-view", {
            class: "order-scroll",
            "scroll-y": "true",
            style: { "height": "calc(100vh - 200px)" }
          }, [
            vue.createCommentVNode(" 空状态提示 "),
            $options.filteredAndSearchedOrders.length === 0 ? (vue.openBlock(), vue.createElementBlock("view", {
              key: 0,
              class: "empty-tip"
            }, [
              vue.createElementVNode("image", {
                src: _imports_1$4,
                class: "empty-icon",
                mode: "widthFix"
              }),
              vue.createElementVNode("text", {
                class: "empty-text",
                style: { "display": "block", "margin-top": "20rpx" }
              }, "暂无匹配的行程")
            ])) : vue.createCommentVNode("v-if", true),
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.filteredAndSearchedOrders, (order) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "order-info",
                  key: order.id
                }, [
                  vue.createElementVNode("view", { class: "order-card" }, [
                    vue.createCommentVNode(" 订单头部内容 "),
                    vue.createElementVNode("view", { class: "order-header" }, [
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString(order.date),
                        1
                        /* TEXT */
                      ),
                      vue.createCommentVNode(" 按钮 "),
                      vue.createElementVNode("view", { class: "button-group" }, [
                        vue.createCommentVNode(" 司机可操作按钮 "),
                        order.infoType === "人找车" ? (vue.openBlock(), vue.createElementBlock("button", {
                          key: 0,
                          class: "accept-button",
                          onClick: ($event) => $options.handleDriverAction(order)
                        }, " 接单 ", 8, ["onClick"])) : vue.createCommentVNode("v-if", true),
                        vue.createCommentVNode(" 乘客可操作按钮 "),
                        vue.createElementVNode("button", {
                          class: "join-button",
                          onClick: ($event) => $options.handlePassengerAction(order)
                        }, vue.toDisplayString(order.infoType === "人找车" ? "申请拼车" : "申请搭车"), 9, ["onClick"])
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "order-details" }, [
                      vue.createElementVNode("view", { class: "start-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_1$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.startPoint),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "departure-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_2$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.endPoint),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "separator" }),
                    vue.createElementVNode("view", { class: "order-summary" }, [
                      vue.createElementVNode("view", { class: "summary-content" }, [
                        vue.createElementVNode("image", {
                          src: order.userAvatar,
                          class: "user-avatar"
                        }, null, 8, ["src"]),
                        vue.createElementVNode("view", { class: "user-info" }, [
                          vue.createCommentVNode(" 根据身份显示不同信息 "),
                          order.infoType === "人找车" ? (vue.openBlock(), vue.createElementBlock("view", {
                            key: 0,
                            class: "passenger-info"
                          }, [
                            vue.createElementVNode(
                              "text",
                              { class: "username" },
                              vue.toDisplayString(order.username),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "passenger-count" },
                              "同乘" + vue.toDisplayString(order.passengerCount) + "人",
                              1
                              /* TEXT */
                            )
                          ])) : (vue.openBlock(), vue.createElementBlock("view", {
                            key: 1,
                            class: "driver-info"
                          }, [
                            vue.createElementVNode(
                              "text",
                              { class: "car-type" },
                              vue.toDisplayString(order.carType),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "max-seats" },
                              "可载" + vue.toDisplayString(order.maxSeats) + "人",
                              1
                              /* TEXT */
                            ),
                            vue.createCommentVNode(" 只有车主才显示接单次数 "),
                            vue.createElementVNode("view", { class: "order-count-summary" }, [
                              vue.createElementVNode(
                                "text",
                                { class: "order-count" },
                                "接单" + vue.toDisplayString(order.orderCount) + "次",
                                1
                                /* TEXT */
                              )
                            ])
                          ]))
                        ]),
                        vue.createElementVNode("view", { class: "price-info" }, [
                          vue.createElementVNode(
                            "text",
                            {
                              class: "price-text",
                              style: { "color": "#003366", "font-weight": "bold" }
                            },
                            "预估" + vue.toDisplayString(order.price) + "元",
                            1
                            /* TEXT */
                          )
                        ])
                      ])
                    ])
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ]),
          vue.createCommentVNode(" 申请加入的弹窗 "),
          vue.createVNode(
            _component_uni_popup,
            {
              ref: "actionPopup",
              type: "dialog"
            },
            {
              default: vue.withCtx(() => [
                vue.createVNode(_component_uni_popup_dialog, {
                  mode: "base",
                  title: $data.popupTitle,
                  content: $data.popupContent,
                  duration: 2e3,
                  onConfirm: $options.handleConfirm,
                  onClose: $options.closePopup
                }, null, 8, ["title", "content", "onConfirm", "onClose"])
              ]),
              _: 1
              /* STABLE */
            },
            512
            /* NEED_PATCH */
          ),
          vue.createCommentVNode(" 车辆选择弹窗 "),
          vue.createVNode(
            _component_uni_popup,
            {
              ref: "vehiclePopup",
              type: "bottom"
            },
            {
              default: vue.withCtx(() => [
                vue.createElementVNode("view", { class: "vehicle-picker" }, [
                  vue.createElementVNode("view", { class: "picker-header" }, [
                    vue.createElementVNode("text", { class: "title" }, "选择接单车辆"),
                    vue.createVNode(_component_uni_icons, {
                      type: "close",
                      size: "24",
                      onClick: _cache[7] || (_cache[7] = ($event) => {
                        this.$refs.vehiclePopup.close();
                      })
                    })
                  ]),
                  vue.createElementVNode("scroll-view", {
                    "scroll-y": "",
                    class: "vehicle-list"
                  }, [
                    (vue.openBlock(true), vue.createElementBlock(
                      vue.Fragment,
                      null,
                      vue.renderList($data.vehicles, (vehicle) => {
                        return vue.openBlock(), vue.createElementBlock("view", {
                          key: vehicle.car_id,
                          class: vue.normalizeClass(["vehicle-item", { active: $data.selectedVehicleId === vehicle.car_id }]),
                          onClick: ($event) => $data.selectedVehicleId = vehicle.car_id
                        }, [
                          vue.createElementVNode("view", { class: "vehicle-info" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "model" },
                              vue.toDisplayString(vehicle.brand_model),
                              1
                              /* TEXT */
                            ),
                            vue.createElementVNode(
                              "text",
                              { class: "plate" },
                              vue.toDisplayString(vehicle.plate_number),
                              1
                              /* TEXT */
                            )
                          ]),
                          $data.selectedVehicleId === vehicle.car_id ? (vue.openBlock(), vue.createBlock(_component_uni_icons, {
                            key: 0,
                            type: "checkmark-filled",
                            color: "#007AFF",
                            size: "20"
                          })) : vue.createCommentVNode("v-if", true)
                        ], 10, ["onClick"]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ]),
                  vue.createElementVNode("button", {
                    class: "confirm-btn",
                    onClick: _cache[8] || (_cache[8] = (...args) => $options.confirmVehicleSelection && $options.confirmVehicleSelection(...args)),
                    disabled: !$data.selectedVehicleId
                  }, " 确认选择 ", 8, ["disabled"])
                ])
              ]),
              _: 1
              /* STABLE */
            },
            512
            /* NEED_PATCH */
          )
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexHome = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["render", _sfc_render$1], ["__scopeId", "data-v-760d994e"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/home.vue"]]);
  const _sfc_main$1 = {
    data() {
      return {
        latitude: 0,
        longitude: 0,
        orderTypes: [
          { name: "所有", value: "all" },
          { name: "乘客", value: "passenger" },
          { name: "车主", value: "driver" }
        ],
        orderTypeIndex: 0,
        // 新增订单状态选项
        statusOptions: [
          { name: "全部", value: "all" },
          { name: "待审核", value: "pending" },
          { name: "被拒绝", value: "rejected" },
          { name: "待支付", value: "to-pay" },
          { name: "已完成", value: "completed" },
          { name: "待评价", value: "to-review" },
          { name: "未开始", value: "not-started" },
          { name: "进行中", value: "in-progress" }
        ],
        statusIndex: 0,
        years: ["", "2023", "2024", "2025"],
        // 第一个元素为空表示不筛选
        yearIndex: 0,
        months: ["", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        monthIndex: 0,
        days: ["", ...Array.from({ length: 31 }, (_, i) => (i + 1).toString())],
        dayIndex: 0,
        sortOptions: [
          { name: "时间升序", value: "time-asc" },
          { name: "时间降序", value: "time-desc" },
          { name: "价格升序", value: "price-asc" },
          { name: "价格降序", value: "price-desc" }
        ],
        sortIndex: 0,
        orders: [
          {
            id: 1,
            infoType: "乘客",
            date: "2023年3月7日14:30",
            // 修改日期格式便于筛选
            startPoint: "创新港(2号)停车场",
            endPoint: "上海市·台铃电动车(文汇路店)",
            price: 41,
            carType: "奔驰 奔驰EQC",
            orderCount: 15,
            userAvatar: "../../static/user.jpeg",
            status: "to-pay"
            // 新增状态字段
          },
          {
            id: 2,
            infoType: "乘客",
            date: "2025年3月8日08:35",
            startPoint: "纪丰路327号3号楼",
            endPoint: "苏州市·苏州大学附属理想眼科医院",
            price: 62,
            carType: "宝马 宝马3系",
            orderCount: 8,
            userAvatar: "../../static/user.jpeg",
            status: "completed"
          },
          {
            id: 3,
            infoType: "车主",
            date: "2024年3月7日17:05",
            startPoint: "汉庭酒店(上海安亭汽车城)",
            endPoint: "南通市·丝绸路与通源路交叉口",
            price: 87,
            carType: "宝马 宝马5系",
            orderCount: 12,
            userAvatar: "../../static/user.jpeg",
            status: "not-started"
          },
          {
            id: 4,
            infoType: "车主",
            date: "2024年3月10日09:15",
            startPoint: "上海市中心",
            endPoint: "浦东国际机场",
            price: 120,
            carType: "特斯拉 Model",
            orderCount: 20,
            userAvatar: "../../static/user.jpeg",
            status: "in-progress"
          },
          {
            id: 5,
            infoType: "乘客",
            date: "2024年3月12日18:30",
            startPoint: "虹桥火车站",
            endPoint: "静安寺",
            price: 35,
            carType: "奥迪 A4L",
            orderCount: 5,
            userAvatar: "../../static/user.jpeg",
            status: "to-review"
          },
          {
            id: 6,
            infoType: "乘客",
            date: "2024年3月15日10:00",
            startPoint: "北京西站",
            endPoint: "首都国际机场",
            price: 80,
            carType: "奥迪 A6L",
            orderCount: 3,
            userAvatar: "../../static/user.jpeg",
            status: "rejected",
            rejectReason: "出发时间不符合要求"
            // 新增拒绝原因
          }
        ]
      };
    },
    computed: {
      filteredOrders() {
        let filtered = this.orders;
        const selectedType = this.orderTypes[this.orderTypeIndex].value;
        const selectedStatus = this.statusOptions[this.statusIndex].value;
        if (selectedType !== "all") {
          filtered = filtered.filter(
            (order) => order.infoType === (selectedType === "passenger" ? "乘客" : "车主")
          );
        }
        if (selectedStatus !== "all") {
          filtered = filtered.filter((order) => order.status === selectedStatus);
        }
        const selectedYear = this.years[this.yearIndex];
        const selectedMonth = this.months[this.monthIndex];
        const selectedDay = this.days[this.dayIndex];
        if (selectedYear) {
          filtered = filtered.filter((order) => order.date.includes(`${selectedYear}年`));
        }
        if (selectedMonth) {
          filtered = filtered.filter((order) => order.date.includes(`${selectedYear || ""}年${selectedMonth}月`));
        }
        if (selectedDay) {
          filtered = filtered.filter((order) => order.date.includes(`${selectedYear || ""}年${selectedMonth || ""}月${selectedDay}日`));
        }
        const sortOption = this.sortOptions[this.sortIndex].value;
        if (sortOption === "time-asc" || sortOption === "time-desc") {
          const parseChineseDate = (dateStr) => {
            const match = dateStr.match(/(\d+)年(\d+)月(\d+)日(\d+):(\d+)/);
            if (!match)
              return 0;
            const [, year, month, day, hour, minute] = match.map(Number);
            return year * 1e6 + month * 1e4 + day * 100 + hour * 1 + minute * 0.01;
          };
          filtered.sort((a, b) => {
            const timeA = parseChineseDate(a.date);
            const timeB = parseChineseDate(b.date);
            return sortOption === "time-asc" ? timeA - timeB : timeB - timeA;
          });
        } else if (sortOption === "price-asc") {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortOption === "price-desc") {
          filtered.sort((a, b) => b.price - a.price);
        }
        return filtered;
      }
    },
    methods: {
      onOrderTypeChange(e) {
        this.orderTypeIndex = e.detail.value;
      },
      // 新增状态筛选方法
      onStatusChange(e) {
        this.statusIndex = e.detail.value;
      },
      onYearChange(e) {
        this.yearIndex = e.detail.value;
        this.monthIndex = 0;
        this.dayIndex = 0;
      },
      onMonthChange(e) {
        this.monthIndex = e.detail.value;
        this.dayIndex = 0;
      },
      onDayChange(e) {
        this.dayIndex = e.detail.value;
      },
      onSortChange(e) {
        this.sortIndex = e.detail.value;
      },
      applyToJoin(orderId) {
      },
      // 新增方法：获取状态对应的文本
      getStatusText(status) {
        const map = {
          "pending": "待审核",
          "completed": "已完成",
          "to-review": "待评价",
          "not-started": "未开始",
          "in-progress": "进行中",
          "to-pay": "待支付",
          "rejected": "被拒绝"
        };
        return map[status] || "未知状态";
      },
      // 新增方法：处理状态标签点击
      handleStatusClick(order) {
        if (order.status === "not-started") {
          uni.showModal({
            title: "确认删除",
            content: "确定要删除此订单吗？",
            success: (res2) => {
              if (res2.confirm) {
                this.deleteOrder(order.id);
              }
            }
          });
        }
      },
      // 新增方法：删除订单
      deleteOrder(orderId) {
        this.orders = this.orders.filter((order) => order.id !== orderId);
        uni.showToast({
          title: "订单已删除",
          icon: "success"
        });
      }
    },
    components: {
      // 注册 NavigationBar 组件
      NavigationBar
    }
  };
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_NavigationBar = vue.resolveComponent("NavigationBar");
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createElementVNode("div", null, [
          vue.createCommentVNode(" 使用 NavigationBar 组件 "),
          vue.createVNode(_component_NavigationBar),
          vue.createCommentVNode(" 其他内容 ")
        ]),
        vue.createElementVNode("view", { class: "container" }, [
          vue.createElementVNode("view", { class: "filter-bar" }, [
            vue.createElementVNode("view", { class: "dual-filter-row" }, [
              vue.createElementVNode("view", { class: "filter-group" }, [
                vue.createElementVNode("picker", {
                  onChange: _cache[0] || (_cache[0] = (...args) => $options.onOrderTypeChange && $options.onOrderTypeChange(...args)),
                  value: $data.orderTypeIndex,
                  range: $data.orderTypes,
                  "range-key": "name"
                }, [
                  vue.createElementVNode("view", { class: "picker" }, [
                    vue.createTextVNode(
                      " 订单类型: " + vue.toDisplayString($data.orderTypes[$data.orderTypeIndex].name) + " ",
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("image", {
                      src: _imports_0$2,
                      class: "arrow-icon"
                    })
                  ])
                ], 40, ["value", "range"])
              ]),
              vue.createCommentVNode(" 订单状态筛选 "),
              vue.createElementVNode("view", { class: "filter-group" }, [
                vue.createElementVNode("picker", {
                  onChange: _cache[1] || (_cache[1] = (...args) => $options.onStatusChange && $options.onStatusChange(...args)),
                  value: $data.statusIndex,
                  range: $data.statusOptions,
                  "range-key": "name"
                }, [
                  vue.createElementVNode("view", { class: "picker" }, [
                    vue.createTextVNode(
                      " 订单状态: " + vue.toDisplayString($data.statusOptions[$data.statusIndex].name) + " ",
                      1
                      /* TEXT */
                    ),
                    vue.createElementVNode("image", {
                      src: _imports_0$2,
                      class: "arrow-icon"
                    })
                  ])
                ], 40, ["value", "range"])
              ])
            ]),
            vue.createElementVNode("view", { class: "time-filters" }, [
              vue.createElementVNode("picker", {
                onChange: _cache[2] || (_cache[2] = (...args) => $options.onYearChange && $options.onYearChange(...args)),
                value: $data.yearIndex,
                range: $data.years,
                class: "time-picker"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    vue.toDisplayString($data.years[$data.yearIndex] || "--") + "年 ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"]),
              vue.createElementVNode("picker", {
                onChange: _cache[3] || (_cache[3] = (...args) => $options.onMonthChange && $options.onMonthChange(...args)),
                value: $data.monthIndex,
                range: $data.months,
                class: "time-picker"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    vue.toDisplayString($data.months[$data.monthIndex] || "--") + "月 ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"]),
              vue.createElementVNode("picker", {
                onChange: _cache[4] || (_cache[4] = (...args) => $options.onDayChange && $options.onDayChange(...args)),
                value: $data.dayIndex,
                range: $data.days,
                class: "time-picker"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    vue.toDisplayString($data.days[$data.dayIndex] || "--") + "日 ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"])
            ]),
            vue.createElementVNode("view", { class: "filter-group" }, [
              vue.createElementVNode("picker", {
                onChange: _cache[5] || (_cache[5] = (...args) => $options.onSortChange && $options.onSortChange(...args)),
                value: $data.sortIndex,
                range: $data.sortOptions,
                "range-key": "name"
              }, [
                vue.createElementVNode("view", { class: "picker" }, [
                  vue.createTextVNode(
                    " 排序: " + vue.toDisplayString($data.sortOptions[$data.sortIndex].name) + " ",
                    1
                    /* TEXT */
                  ),
                  vue.createElementVNode("image", {
                    src: _imports_0$2,
                    class: "arrow-icon"
                  })
                ])
              ], 40, ["value", "range"])
            ])
          ]),
          vue.createElementVNode("scroll-view", {
            class: "order-scroll",
            "scroll-y": "true",
            style: { "height": "calc(100vh - 200px)" }
          }, [
            (vue.openBlock(true), vue.createElementBlock(
              vue.Fragment,
              null,
              vue.renderList($options.filteredOrders, (order) => {
                return vue.openBlock(), vue.createElementBlock("view", {
                  class: "order-info",
                  key: order.id
                }, [
                  vue.createElementVNode("view", { class: "order-card" }, [
                    vue.createElementVNode("view", { class: "order-header" }, [
                      vue.createElementVNode(
                        "text",
                        null,
                        vue.toDisplayString(order.date),
                        1
                        /* TEXT */
                      ),
                      vue.createElementVNode("button", {
                        class: "detail-button",
                        onClick: ($event) => $options.applyToJoin(order.id)
                      }, "查看详情", 8, ["onClick"])
                    ]),
                    vue.createElementVNode("view", { class: "order-details" }, [
                      vue.createElementVNode("view", { class: "start-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_1$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.startPoint),
                          1
                          /* TEXT */
                        )
                      ]),
                      vue.createElementVNode("view", { class: "departure-point" }, [
                        vue.createElementVNode("image", {
                          src: _imports_2$2,
                          class: "icon",
                          style: { "height": "20px", "width": "20px" }
                        }),
                        vue.createElementVNode(
                          "text",
                          { class: "order-text" },
                          vue.toDisplayString(order.endPoint),
                          1
                          /* TEXT */
                        )
                      ])
                    ]),
                    vue.createElementVNode("view", { class: "separator" }),
                    vue.createElementVNode("view", { class: "order-summary" }, [
                      vue.createElementVNode("view", { class: "summary-content" }, [
                        vue.createElementVNode("image", {
                          src: order.userAvatar,
                          class: "user-avatar"
                        }, null, 8, ["src"]),
                        vue.createElementVNode("view", { class: "car-info" }, [
                          vue.createElementVNode("view", { class: "car-type-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "car-type" },
                              vue.toDisplayString(order.carType),
                              1
                              /* TEXT */
                            )
                          ]),
                          vue.createElementVNode("view", { class: "order-count-summary" }, [
                            vue.createElementVNode(
                              "text",
                              { class: "order-count" },
                              "接单" + vue.toDisplayString(order.orderCount) + "次",
                              1
                              /* TEXT */
                            )
                          ])
                        ]),
                        vue.createElementVNode("view", { class: "price-info" }, [
                          vue.createCommentVNode(" 新增订单状态标签 "),
                          vue.createElementVNode("view", { class: "status-container" }, [
                            vue.createElementVNode("view", {
                              class: vue.normalizeClass(["status-tag", "status-" + order.status]),
                              onClick: ($event) => $options.handleStatusClick(order)
                            }, vue.toDisplayString($options.getStatusText(order.status)), 11, ["onClick"])
                          ]),
                          vue.createElementVNode(
                            "text",
                            {
                              class: "price-text",
                              style: { "color": "#003366", "font-weight": "bold" }
                            },
                            "预估" + vue.toDisplayString(order.price) + "元",
                            1
                            /* TEXT */
                          )
                        ])
                      ])
                    ]),
                    vue.createCommentVNode(" 新增：拒绝原因显示 "),
                    order.status === "rejected" && order.rejectReason ? (vue.openBlock(), vue.createElementBlock("view", {
                      key: 0,
                      class: "audit-reason"
                    }, [
                      vue.createElementVNode(
                        "text",
                        null,
                        "拒绝原因: " + vue.toDisplayString(order.rejectReason),
                        1
                        /* TEXT */
                      )
                    ])) : vue.createCommentVNode("v-if", true)
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ])
        ])
      ],
      64
      /* STABLE_FRAGMENT */
    );
  }
  const PagesIndexRecord = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["render", _sfc_render], ["__scopeId", "data-v-01d8b9db"], ["__file", "E:/Projects/SE/ride-sharing-se/pages/index/record.vue"]]);
  __definePage("pages/index/login", PagesIndexLogin);
  __definePage("pages/index/chatlist", PagesIndexChatlist);
  __definePage("pages/index/chat", PagesIndexChat);
  __definePage("pages/index/trip_info", PagesIndexTripInfo);
  __definePage("pages/index/register", PagesIndexRegister);
  __definePage("pages/index/car_manage", PagesIndexCarManage);
  __definePage("pages/index/manage", PagesIndexManage);
  __definePage("pages/index/order_launch", PagesIndexOrderLaunch);
  __definePage("pages/index/person", PagesIndexPerson);
  __definePage("pages/index/calendar", PagesIndexCalendar);
  __definePage("pages/index/info_manage", PagesIndexInfoManage);
  __definePage("pages/index/home", PagesIndexHome);
  __definePage("pages/index/record", PagesIndexRecord);
  const _sfc_main = {
    onLaunch: function() {
      formatAppLog("log", "at App.vue:4", "App Launch");
    },
    onShow: function() {
      formatAppLog("log", "at App.vue:7", "App Show");
    },
    onHide: function() {
      formatAppLog("log", "at App.vue:10", "App Hide");
    }
  };
  const App = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "E:/Projects/SE/ride-sharing-se/App.vue"]]);
  function createApp() {
    const app = vue.createVueApp(App);
    return {
      app
    };
  }
  const { app: __app__, Vuex: __Vuex__, Pinia: __Pinia__ } = createApp();
  uni.Vuex = __Vuex__;
  uni.Pinia = __Pinia__;
  __app__.provide("__globalStyles", __uniConfig.styles);
  __app__._component.mpType = "app";
  __app__._component.render = () => {
  };
  __app__.mount("#app");
})(Vue);
