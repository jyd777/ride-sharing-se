import { get, post } from '@/utils/request.js'

/**
 * 获取当前用户基本信息
 * @returns {Promise<UserInfo>}
 */
export const fetchUserBaseInfo = (userId) => {
  return get(`/user/basic/${userId}`).then(res => {
	// 统一处理数据格式
	return {
	  ...res.data,
	  age: typeof res.data.age === 'number' ? res.data.age : null,
	  avatar: res.data.avatar || getDefaultAvatar() 
	};
  });
};

/**
 * 更新用户信息
 * @param {Partial<UserInfo>} data - 需要更新的字段
 * @returns {Promise<UserInfo>}
 */
export const updateUserInfo = (data) => {
  return post('/api/user/update', data); // 使用封装的post方法
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
 */
export const getUserDefaultAvatar = () => {
	return '../../static/user.jpeg';
}


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