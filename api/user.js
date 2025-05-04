import { get, post } from '@/utils/request.js'

/**
 * 获取当前用户基本信息
 * @returns {Promise<UserInfo>}
 */
export const fetchUserBaseInfo = () => {
  return get(`/user/basic`).then(res => {
	// 统一处理数据格式
	return {
	  ...res.data,
	  age: typeof res.data.age === 'number' ? res.data.age : null,
	  avatar: res.data.avatar || getDefaultAvatar() 
	};
  });
};

/**
 * 获取用户完整档案
 * @param {number} userId - 用户ID
 * @returns {Promise<UserProfile>}
 */
export const fetchUserProfile = () => {
  return get(`/user/profile`).then(res => {
    return {
      ...res.data.user_info,
      telephone: res.data.user_info.telephone
    };
  });
};

/**
 * 获取用户可修改的信息
 * @param {number} userId - 用户ID
 * @returns {Promise}
 */
export const fetchUserModifiableData = () => {
  return get(`/user/modifiable_data`).then(res => {4
  console.log(res.data);
    return {
      ...res.data,
	  avatar: res.data.avatar || getDefaultAvatar() 
    };
	
  });
};

/**
 * 获取用户的车牌信息
 * @param {number} userId - 用户ID
 * @returns {Promise}
 */
export const fetchCars = (userId) => {
  return get(`/user/cars/${userId}`).then(res => {
	console.log(res.data);
    return {
      ...res.data
    };
	
  });
};

/**
 * 更新用户信息
 * @param {Object} data - 需要更新的字段
 * @returns Promise
 */
export const updateUserInfo = (data) => {
  return post(`/user/update`, data, {
    showLoading: true,
    loadingText: "正在更新用户信息..."
  }).then(res => {
    if (res.code !== 200) {
      throw new Error(res.message || '更新失败');
    }
    return res;
  });
};

/**
 * 上传用户头像 (Base64版本)
 * @param {number} userId - 用户ID
 * @param {string} base64Data - Base64编码的图片数据
 * @returns {Promise}
 */
export const uploadUserAvatar = (userId, base64Data) => {
  return post(`/user/upload_avatar/${userId}`, {
    base64_data: base64Data
  }, {
    showLoading: true,
    loadingText: "正在上传头像..."
  });
};

/**
 * 获取用户头像 (Base64版本)
 * @param {number} userId - 用户ID
 * @returns {Promise<string>} Base64编码的头像URL
 */
export const fetchUserAvatar = () => {
	console.log("获取头像")
  return get(`/user/avatar`).then(res => {
    if (!res || !res.data) {
        console.error('Invalid data received for user avatar:', res);
        return getUserDefaultAvatar(); // Return default on error/invalid data
    }
    return res.data.avatar_url || getUserDefaultAvatar();
  }).catch(error => {
      console.error('Error fetching user avatar:', error);
      return getUserDefaultAvatar(); // Return default on fetch error
  });
};

/**
 * 获取用户简要信息（用于性能敏感场景）
 * @returns {Promise<BasicUserInfo>}
 */
export const fetchBasicUserInfo = () => {
  return get('/user/basic');
};

/**
 * 获取用户默认头像
 * @returns {string}
 */
export const getUserDefaultAvatar = () => {
  return '../../static/user.jpeg';
}

/**
 * 获取用户订单记录
 * @param {Object} params - 查询参数
 * @param {'driver'|'passenger'|'all'} [params.type] - 订单类型
 * @param {'pending'|'completed'|'to-review'|'not-started'|'in-progress'|'all'} [params.status] - 订单状态
 * @param {number} [params.year] - 筛选年份
 * @param {number} [params.month] - 筛选月份(1-12)
 * @param {number} [params.day] - 筛选日期(1-31)
 * @param {'time-asc'|'time-desc'|'price-asc'|'price-desc'} [params.sort] - 排序方式
 * @param {number} [params.page=1] - 页码
 * @param {number} [params.page_size=10] - 每页数量
 * @returns {Promise<OrderList>}
 */
export const fetchOrders = (userId, params = {}) => {
  // 处理默认参数
  const query = {
    type: 'all',
    status: 'all',
    page: 1,
    page_size: 10,
    ...params
  }

  // 转换时间参数为数字
  if (query.year) query.year = Number(query.year)
  if (query.month) query.month = Number(query.month)
  if (query.day) query.day = Number(query.day)

  return get(`/user/${userId}/orders/`, query)
    .then(res => {
      if (res.code === 200) {
        return {
          total: res.data.total,
          orders: res.data.orders.map(order => ({
            order_id: order.order_id,
            type: order.type,
            status: order.status,
            start_time: order.start_time,
            start_loc: order.start_loc,
            dest_loc: order.dest_loc,
            price: Number(order.price),
            car_type: order.car_type,
            order_count: Number(order.order_count),
            user_avatar: order.user_avatar || getDefaultAvatar(),
            reject_reason: order.reject_reason || ''
          }))
        }
      }
      return Promise.reject(new Error(res.message || '获取订单失败'))
    })
    .catch(error => {
      console.error('[API] 获取订单失败:', error)
      throw error
    })
}

// 在类型定义后添加 ↓↓↓
/**
 * @typedef {Object} OrderList
 * @property {number} total - 总订单数
 * @property {OrderItem[]} orders - 订单列表
 * 
 * @typedef {Object} OrderItem
 * @property {number} order_id - 订单ID
 * @property {'driver'|'passenger'} type - 订单类型
 * @property {string} status - 订单状态
 * @property {string} start_time - 开始时间
 * @property {string} start_loc - 起始地点
 * @property {string} dest_loc - 目的地
 * @property {number} price - 订单金额
 * @property {string} car_type - 车辆类型
 * @property {number} order_count - 接单次数
 * @property {string} user_avatar - 用户头像
 * @property {string} [reject_reason] - 拒绝原因
 */


// 类型定义
/**
 * @typedef {Object} UserInfo
 * @property {string} userId
 * @property {string} username
 * @property {string} [avatar]
 * @property {number} [age]
 * @property {'male'|'female'} [gender]
 */

/**
 * @typedef {Object} BasicUserInfo
 * @property {string} userId
 * @property {string} username
 * @property {string} [avatar]
 */