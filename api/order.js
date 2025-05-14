import { get, post } from '@/utils/request.js';

// 发布订单
export const publishOrder = (orderData) => {
  return post('/orders', orderData);
};

// 获取订单列表
export const fetchOrderList = () => {
  return get('orders/list');
};

// 获取可以用于发送邀请信息的订单
export const fetchActiveOrderList = () => {
	return get('orders/active');
};

// 支付订单
export const payOrder = (orderId) => {
  return post(`/orders/${orderId}/paid`);
};

// 获取行程详情
export const fetchTripDetail = (orderId) => {
  return get(`/orders/${orderId}`);
};

// 提交评价
export const submitTripRating = (orderId, payload) => {
  return post(`/orders/${orderId}/rate`, payload);
};

// 获取日历行程
export const fetchCalendarTrips = (year, month, userId) => {
  return get(`/orders/calendar/${userId}`, { 
    params: { year, month }
  }).then(response => {
    return response.data.map(trip => ({
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
      carType: trip.car_type || '未接单',
      status: trip.status,
      userAvatar: trip.initiator.avatar || '../../static/user.jpeg',
      orderCount: trip.participants_count || 0,
      initiator: trip.initiator
    }));
  });
};

// 获取用户的行程 -- 限制3条
export function fetchUserTrips() {
  return get( `/orders/user/trips`);
}

// 获取用户的行程列表
export function fetchUserTripList() {
  return get( `/orders/user/trips/list`);
}

// 获取管理后台订单列表
export const fetchManagedOrders = (params) => {
	console.log(params.status||'all');
  return get('/orders/manage/list', { 
    params: {
      status: params.status || 'all',
      type: params.type || 'all',
      year: params.year || '',
      month: params.month || ''
    }
  }).then(response => {
	  console.log(response.data);
    return response.data.map(order => ({
      id: order.id,
      date: order.date,
      startPoint: order.startPoint,
      endPoint: order.endPoint,
      price: order.price,
      carType: order.carType || '未接单',
      status: order.status,
      publisher: order.publisher,
      userAvatar: order.userAvatar || '../../static/user.jpeg',
      rejectReason: order.rejectReason
    }));
  });
};

// 审核通过订单
export const approveOrder = (orderId) => {
  return post(`/orders/manage/${orderId}/approve`);
};

// 拒绝订单
export const rejectOrder = (orderId, reason) => {
  return post(`/orders/manage/${orderId}/reject`, { reason });
};

/**
 * 司机申请接单
 * @param {Object} data - { orderId: number, vehicleId: number }
 * @returns {Promise}
 */
export const driverApplyOrder = (data) => {
  return post('/orders/driver/apply', data);
};

/**
 * 同意司机接单申请
 * @param {Object} data - { orderId: number, vehicleId: number }
 * @returns {Promise}
 */
export const acceptDriverOrder = (data) => {
  return post('/orders/driver/accept', data);
};

/**
 * 拒绝司机接单申请
 * @param {Object} data - { orderId: number, vehicleId: number }
 * @returns {Promise}
 */
export const rejectDriverOrder = (data) => {
  return post('/orders/driver/reject', data);
};

/**
 * 乘客申请拼车/搭车
 * @param {Object} data - { orderId: number }
 * @returns {Promise}
 */
export const passengerApplyOrder = (data) => {
  return post('/orders/passenger/apply', data);
};

/**
 * 同意乘客拼车/搭车申请
 * @param {Object} data - { orderId: number, userId: number, messageId: number }
 * @returns {Promise}
 */
export const acceptPassengerApplication = (data) => {
  return post('/orders/apply/accept', data);
};

/**
 * 拒绝乘客拼车/搭车申请
 * @param {Object} data - { orderId: number, userId: number, messageId: number }
 * @returns {Promise}
 */
export const rejectPassengerApplication = (data) => {
  return post('/orders/apply/reject', data);
};

/**
 * 接受拼车邀请
 * @param {Object} data - { orderId: number, userId: number, messageId: number }
 * @returns {Promise}
 */
export const acceptInvitation = (data) => {
  return post('/orders/invitation/accept', data);
};

/**
 * 拒绝拼车邀请
 * @param {Object} data - { orderId: number, userId: number, messageId: number }
 * @returns {Promise}
 */
export const rejectInvitation = (data) => {
  return post('/orders/invitation/reject', data);
};