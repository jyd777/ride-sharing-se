/**
 * @file 基于 uni.connectSocket 的 Socket 管理工具
 * @description 支持自动重连、事件管理、心跳机制、Promise 发送等功能
 */

import { resolve } from "dns";
import config from "../config";

function buildQuery(params) {
  return Object.entries(params)
    .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
    .join('&');
}

class SocketIOClient {
	constructor(options = {}) {
		// 默认配置
		this.defaultConfig = {
			url: '',
			path: '/socket.io',
			reconnection: true,
			reconnectionAttempts: 5,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			autoConnect: true,
			transports: ['websocket'],
			query: {},
			heartbeat: {
				interval: 25000,
				timeout: 10000
			}
		};
		
		// 合并配置
		this.config = { ...this.defaultConfig, ...options };
		
		// 内部状态
		this.socket = null;
		this.eventHandlers = new Map();
		this.heartbeatTimer = null;
		this.reconnectAttempts = 0;
		this.connecting = false;
		this.isConnected = false;
		this.messageQueue = [];
		this.ackCallbacks = new Map();
		this.ackId = 0;
	}
	
	/*
	 * 初始化Socket连接
	 * @param {string} token 认证token
	 */
	init(token = '') {
		if(this.socket) {
			console.debug('[SocketIO] 检测到已有连接，先断开旧连接');
			this.disconnect();
		}
		
		console.log('🔗 服务端URL:', this.config.url);
		console.log('🔑 认证Token:', token ? `${token.substring(0, 5)}...${token.slice(-5)}` : '未提供');
	    console.log('⚙️ 传输协议:', this.config.transports);
		
		// 构建连接URL
		const queryParams = {
		    ...this.config.query,
		    token,
		    EIO: 4,
		    transports: 'websocket'
		};
		const query = buildQuery(queryParams);
		const url = `${this.config.url}?${query}`;
		
		console.info('[SocketIO] 完整连接URL:', url.replace(token, '<TOKEN>')); // 安全日志
		
		// 记录连接开始时间
		const connectStartTime = Date.now();
		console.log(`[SocketIO] ⌛ 开始建立连接 (${new Date().toLocaleTimeString()})`);
		
		// 创建uni-app WebSocket连接
		this.socket = uni.connectSocket({
			url,
			success: () => {
				const latency = Date.now() - connectStartTime;
				console.log(`[SocketIO] ✅ WebSocket握手成功 (耗时 ${latency}ms)`);
				console.debug('[SocketIO] 正在设置事件监听器...');
				this._setupEventListeners(); // 设置事件监听器
			},
			fail: (err) => {
				console.error('[SocketIO] ❌ 连接失败:', {
				    error: err,
				    duration: `${Date.now() - connectStartTime}ms`,
				    retryCount: this.reconnectAttempts + 1
				});
				
				this._handleReconnect(); // 尝试重连
			}
		});
	}
	
	/**
	 * 设置事件监听 
     */
	_setupEventListeners() {
		// Socket打开事件
		uni.onSocketOpen(() => {
			console.log('[SocketIO] webSocker connected');
			this._handleConnect();
		});
		
		// Socket错误事件
		uni.onSocketError((error) => {
			console.error('[SocketIO] WebSocket error:', error);
			this._handleDisconnect();
		});
		
		// 接收消息事件
		uni.onSocketMessage((res) => {
			this._handleSocketMessage(res.data);
		});
		
		// Socket关闭事件
		uni.onSocketClose(() => {
			console.log('[SocketIO] WebSocket closed');
			this._handleDisconnect();
		});
	}
	
	/**
	 * 处理Socket.IO协议消息
	 * @param {string} message
	 */
	_handleSocketMessage(message) {
		try {
			// Socket.IO协议解析
			const packetType = message.charAt(0);
			
			switch (packetType) {
				case '0': // Open packet
					this._handleOpenPacket(message);
					break;
				case '2': // Ping packet
					this._handlePingPacket();
					break;
				case '3': // Pong packet
					this._handlePongPacket();
					break;
				case '4': // Message packet
					this._handleMessagePacket(message);
					break;
				case '6': // Noop packet(reconnection)
					break;
				default:
					console.warn('[SocketIO] Unknown packet type:', packetType);
			}
		} catch (error) {
			console.error('[SocketIO] Message handling error:', error);
		}
	}
	
	/**
	 * 处理Open包
	 * @param {string} packet
	 */
	_handleOpenPacket(packet) {
		try {
			const payload = JSON.parse(packet.substring(1));
			console.log('[SocketIO] Socket.IO connected', payload);
			this.isConnected = true;
			this.reconnectAttempts = 0;
			this._startHeartbeat();
			this._processQueue();
		} catch (error) {
			console.error('[SocketIO] Open packet parse error:', error);
		}
	}
	
	/**
	 * 处理ping包
	 */
	_handlePingPacket() {
		this._sendPacket('3'); // Pong packet
	}
	
	/**
	 * 处理pong包
	 */
	_handlePongPacket() {
		// 心跳正常，可以添加额外处理
	}
	
	/**
	 * 处理消息包
	 * @param {string} packet
	 */
	_handleMessagePacket(packet) {
		const messageType = packet.charAt(1);
		
		if (messageType === '0') {
			// 普通事件消息
			const payload = this._parseEventPayload(packet.substring(2));
			if (payload) {
				this._dispatchEvent(payload.event, payload.data);
			}
		} else if (messageType === '1') {
			// ACK消息
			const ackId = parseInt(packet.substring(2).split('[')[0]);
			const callback = this.ackCallbacks.get(ackId);
			if (callback) {
				const data = this._parsePayload(packet.substring(2 + ackId.toString().length));
				callback(data);
				this.ackCallbacks.delete(ackId);
			}
		}
	}
	
	/**
	  * 解析事件负载
	  * @param {string} payload 
	  * @returns {object|null}
	  */
	_parseEventPayload(payload) {
		try {
			const parsed = JSON.parse(payload);
			if (Array.isArray(parsed)) {
				return {
					event: parsed[0],
					data: parsed[1]
				};
			}
			return null;
		} catch (error) {
			console.error('[SocketIO] Payload parse error:', error);
			return null;
		}
	}
	
	/**
	  * 解析通用负载
	  * @param {string} payload 
	  * @returns {object|null}
	  */
	_parsePayload(payload) {
		try {
			return JSON.parse(payload);
		} catch (error) {
			console.error('[SocketIO] Payload parse error:', error);
			return payload;
		}
	}
	 
	
	/**
	 * 处理连接成功
	 */
	_handleConnect() {
		this.isConnected = true;
		this.connecting = false;
		this.reconnectAttempts = 0;
		this._startHeartbeat();
		this._processQueue();
		this._dispatchEvent('connect');
	}
	
	/**
	 * 处理断开连接 
	 */
	_handleDisconnect() {
		this.isConnected = false;
		this.connecting = false;
		this._stopHeartbeat();
		this._dispatchEvent('disconnect');
		
		if (this.config.reconnection && this.reconnectAttempts < this.config.reconnectionAttemps) {
			this._handleReconnect();
		}
	}
	
	/**
	 * 处理重连逻辑 
     */
	_handleReconnect() {
		if (this.reconnectAttempts >= this.config.reconnectionAttemps) {
			console.log('[SocketIO] Max reconnection attempts reached');
			this._dispatchEvent('reconnect_failed');
			return;
		}
		
		this.reconnectAttempts++;
		const delay = Math.min(
			this.config.reconnectionDelay * Math.pow(2, this.reconnectAttempts - 1),
			this.config.reconnectionDelayMax
		);
		
		console.log(`[SocketIO] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
		this._dispatchEvent('reconnecting', this.reconnectAttempts);
		
		// 事件
		setTimeout(() => {
			if (!this.isConnected && !this.connecting) {
				this.connect();
			}
		}, delay);
	}
	
	/**
	 * 开始心跳检测 
     */
	_startHeartbeat() {
		this._stopHeartbeat();
		
		this.heartbeatTimer = setInterval(() => {
			if (this.isConnected) {
				this._sendPacket('2'); // Ping packet
			}
		}, this.config.heartbeat.interval);
	}
	
	/**
	 * 停止心跳检测 
	 */
	_stopHeartbeat() {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}
	
	/**
	 * 发送Socket.IO协议包
	 * @param {string} packet
	 */
	_sendPacket(packet) {
		if (this.isConnected && this.socket) {
			uni.sendSocketMessage({
				data: packet,
				success: () => {},
				fail: (err) => {
					console.error('[SocketIO] Send packet error:', err);
				}
			});
		}
	}
	
	/**
	 * 处理消息队列
	 */
	_processQueue() {
		while (this.messageQueue.length > 0 && this.isConnected) {
			const { event, data, resolve, reject } = this.messageQueue.shift();
			
			// 发送事件
			this.emit(event, data)
				.then(resolve)
				.catch(reject)
		}
	}
	
	/**
	 * 触发事件
	 * @param {string} event
	 * @param {...any} args
	 */
	_dispatchEvent(event, ...args) {
		if (this.eventHandlers.has(event)) {
			const handlers = this.eventHandlers.get(event);
			for (const handler of handlers) {
				try {
					handler(...args);
				} catch (error) {
					console.error(`[SocketIO] Event handler error for "${event}":`, error);
				}
			}
		}
	}
	
	/*
	 * 连接Socket
	 * @return {Promise}
	 */
	connect() {
		return new Promise((resolve, reject) => {
			if(this.isConnected) {
				resolve();
				return;
			}
			
			if(this.connecting) {
				reject(new Error('Connection is progress'));
				return;
			}
			
			this.connecting = true;
			
			const token = uni.getStorageSync('access_token');
			this.init(token);
			
			// 设置一次性连接监听
			const onConnect = () => {
				// 完成连接时 取消对连接失败事件的监听
				this.off('connect_error', onError);
				resolve();
			}
			
			const onError = (error) => {
				// 连接失败时 取消对请求连接事件的监听
				this.off('connect', onConnect);
				reject(error);
			}
			
			this.once('connect', onConnect);     // 监听连接事件
			this.once('connect_error', onError); // 监听连接失败事件
		})
	}
	
	/**
	 * 断开连接
	 */
	disconnect() {
		if (this.socket) {
			this._stopHeartbeat();
			uni.closeSocket();
			this.socket = null;
			this.isConnected = false;
			this.connecting = false;
			this.eventHandlers.clear();
			this.ackCallbacks.clear();
			this.messageQueue = [];
		}
	}
	
	/**
	 * 发送消息
	 * @param {string} event 事件名称
	 * @param {any} data 发送数据
	 * @returns {Promise}
	 */
	emit(event, data) {
		return new Promise((resolve, reject) => {
			if (!this.isConnected) {
				// 如果此时还没有连接成功 则将该事件加入队列等待
				this.messageQueue.push({ event, data, resolve, reject });
				if (!this.connecting) {
					this.connect().catch(reject);
				}
				return;
			}
			
			// 生成ACK ID
			const ackId = ++this.ackId;
			const packet = `42${ackId}["${event}",${JSON.stringify(data)}]`;
			// const packet = `42["${event}",${JSON.stringify(data)}]`;
			
			// 设置ACK回调
			this.ackCallbacks.set(ackId, (response) => {
				if (response?.error) {
					const error = new Error(response.message || 'Socket request failed');
					error.coda = response.code;
					reject(error);
				} else {
					resolve(response);
				}
			});
			
			// 发送消息
			uni.sendSocketMessage({
				data: packet,
				success: () => {},
				fail: (err) => {
					this.ackCallbacks.delete(ackId);
					reject(err);
				}
			});
		});
	}
	
	/**
	 * 监听事件
	 * @param {string} event 事件名称
	 * @param {function} handler 处理函数
 	 */
	on(event, handler) {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event).push(handler);
	}
	
	/**
	 * 取消监听事件
	 * @param {string} event 事件名称
	 * @param {function} [handler] 可选的处理函数
	 */
	off(event, handler) {
		if (!this.eventHandlers.has(event)) return;
		
		if(!handler) {
			this.eventHandlers.delete(event);
		} else {
			const handlers = this.eventHandlers.get(event).filter(h => h !== handler);
			if (handlers.length == 0) {
				this.eventHandlers.delete(event);
			} else {
				this.eventHandlers.set(event, handlers);
			}
		}
	}
	
	/**
	 * 一次性监听事件
	 * @param {string} event 事件名称
	 * @returns {Promise} 
     */
	once(event) {
		return new Promise((resolve) => {
			const tempHandler = (data) => {
				// 获取到数据之后就取消监听事件
				this.off(event, tempHandler);
				resolve(data);
			}
			// 开始监听事件
			this.on(event, tempHandler);
		});
	} 
}

class WebSocketService {
	constructor() {
		this.socket = new SocketIOClient({
			url: `${config.SOCKET_URL}`,
			path: '/socket.io',
		});
		this.messageQueue = []
	}
	
	/**
	 * 初始化Socket连接
	 * @param {string} token 认证token
	 */
	init(token) {
		this.socket.init(token);
	}
	
	/**
	 * 发送消息（带自动错误处理）
	 * @param {string} event 事件名
	 * @param {object} data 发送数据
	 * @param {object} options 配置项
	 * @returns {Promise}
	 */
	send(event, data = {}, options = {}) {
	  return this.socket.emit(event, data)
	    .then(response => this._handleResponse(response))
	    .catch(error => {
	      this._handleError(error, options)
	      return Promise.reject(error)
	    })
	}
	
	/**
	 * 监听事件
	 * @param {string} event 事件名
	 * @param {function} handler 处理函数
	 */
	on(event, handler) {
	  this.socket.on(event, handler)
	}
	
	/**
	 * 取消监听
	 * @param {string} event 事件名
	 * @param {function} [handler] 可选的处理函数
	 */
	off(event, handler) {
	  this.socket.off(event, handler)
	}
	
	/**
	 * 一次性监听
	 * @param {string} event 事件名
	 * @returns {Promise}
	 */
	once(event) {
	  return this.socket.once(event)
	}
	
	
	/**
	 * 连接Socket
	 * @returns {Promise}
	 */
	connect() {
	  return this.socket.connect()
	}
	
	/**
	 * 断开连接
	 */
	disconnect() {
	  this.socket.disconnect()
	}
	
	/**
	 * 处理响应数据
	 * @private
	 */
	_handleResponse(response) {
	  if (response?.code === 200) {
	    return response.data
	  } else {
	    const error = new Error(response?.message || '请求失败')
	    error.code = response?.code
	    throw error
	  }
	}
	
	/**
	 * 处理错误
	 * @private
	 */
	_handleError(error, options = {}) {
	  if (options.silent !== true) {
	    uni.showToast({
	      title: error.message || '网络错误',
	      icon: 'none'
	    })
	  }
	  
	  // 自动重连逻辑
	  if (error.code === 'ECONNCLOSED' && this.socket.config.reconnection) {
	    this.socket.connect()
	  }
	}
}

// 创建单例
export const socketService = new SocketService()