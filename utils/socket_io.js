/**
 * @file 基于 socket.io-client 的 Socket 管理工具
 * @description 支持自动重连、事件管理、心跳机制、Promise 发送等功能
 */

import io from 'socket.io-client'
import config from "../config";

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
			path: '',
			autoConnect: true,
			reconnection: true,
			reconnectionAttempts: Infinity,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			randomizationFactor: 0.5,
			timeout: 20000,
			transports: ['websocket'],
			pingTimeout: 20000,
			pingInterval: 25000,
			...options
	    };
		
		this.socket = null;
		this.eventListeners = new Map();
		this.connected = false;
		this.reconnectTimer = null;
		this.pingCheckTimer = null;
		this._log('初始化配置:', this.defaultOptions);
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
		  this._log('已连接，跳过重复连接');
	      return resolve();
	    }
		
		// 标准化auth参数
		const normalizedAuth = this.normalizeAuth(auth);
		const token = normalizedAuth.token;
		
	    // 动态更新认证信息
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
		this._log('正在建立连接，完整参数:', finalOptions);
		
	    // 创建连接
	    this.socket = io(finalOptions.url, finalOptions);
		
	    // 连接成功
	    this.socket.on('connect', () => {
	      this.connected = true;
		  this._log(`✅ 连接成功 (ID: ${this.socket.id})`);
	      this._startPingCheck();
	      resolve();
	      this._emitEvent('connect');
		  this.emit('test_event', { content: '测试连接' });
	    });
		
	    // 连接错误
	    this.socket.on('connect_error', (error) => {
	      this._log(`❌ 连接失败: ${error.message}`, error);
	      this._emitEvent('connect_error', error);
	      reject(error);
	    });
		
	    // 断开连接
	    this.socket.on('disconnect', (reason) => {
	      this.connected = false;
		  this._log(`⚠️ 连接断开: ${reason}`);
	      this._stopPingCheck();
	      this._emitEvent('disconnect', reason);
	    });
		
	    // 自动重连
	    this.socket.on('reconnect_attempt', (attempt) => {
	      console.log(`[SocketIO] 第 ${attempt} 次重连尝试`);
	      this._emitEvent('reconnecting', attempt);
	    });
		
	    // 自定义事件转发
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
		this.connected=false;
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
	      reject(new Error('Socket is not connected'));
	      return;
	    }

	    const timeout = options.timeout || 30000;
	    const timeoutId = setTimeout(() => {
	      reject(new Error(`Request timeout after ${timeout}ms`));
	    }, timeout);

	    this.socket.emit(event, data, (response) => {
	      clearTimeout(timeoutId);
	      
	      if (response?.error) {
	        const err = new Error(response.message || 'Server error');
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
	  console.log('register', event)
	  if (!this.eventListeners.has(event)) {
	    this.eventListeners.set(event, new Set());
	  }
	  this.eventListeners.get(event).add(callback);

	  // 如果已连接，立即注册原生监听
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
	  if (!this.eventListeners.has(event)) return;

	  if (callback) {
	    this.eventListeners.get(event).delete(callback);
	    if (this.socket) {
	      this.socket.off(event, callback);
	    }
	  } else {
	    this.eventListeners.get(event).forEach(cb => {
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
	    this.eventListeners.get(event).forEach(cb => {
	      try {
			console.log("调用事件监听函数")
	        cb(...args);
	      } catch (err) {
	        console.error(`[SocketIO] 事件处理错误 (${event}):`, err);
	      }
	    });
	  }
	}

	_startPingCheck() {
	  this._stopPingCheck();
	  this.pingCheckTimer = setInterval(() => {
	    if (!this.connected) return;
	    
	    const now = Date.now();
	    const lastPing = this.socket?.io?.lastPing || now;
	    
	    if (now - lastPing > this.defaultOptions.pingTimeout) {
	      console.warn('[SocketIO] 心跳检测失败，主动断开连接');
	      this.socket?.disconnect();
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
	  console.log(`[SocketIO][${new Date().toISOString()}] ${message}`, ...args);
	}
	
	/**
	 * 标准化认证信息
	 * @param {string|Object} auth 
	 * @returns {Object} 标准化的auth对象
	 */
	normalizeAuth(auth) {
	  if (!auth) return { token: '' };
	  
	  if (typeof auth === 'string') {
	    return { token: auth };
	  }
	  
	  if (typeof auth === 'object' && auth.token) {
	    return auth;
	  }
	  
	  console.warn('无效的auth参数，使用默认空token');
	  return { token: '' };
	}
	
	
}

// 单例模式导出
export const SocketService = new SocketIOService({
  url: `${config.SOCKET_URL}`,
  auth: { 
    token: uni.getStorageSync('token') 
  },
});

