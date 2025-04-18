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
	  gender: res.data.gender === '男' ? 'male' : 'female',
	  avatar: res.data.avatar || getDefaultAvatar() 
	};
  });
};

/**
 * 获取用户完整档案
 * @param {number} userId - 用户ID
 * @returns {Promise<UserProfile>}
 */
export const fetchUserProfile = (userId) => {
  return get(`/user/${userId}/profile`).then(res => {
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
export const fetchUserModifiableData = (userId) => {
  return get(`/user/${userId}/modifiable_data`).then(res => {4
  console.log(res.data);
    return {
      ...res.data,
	  gender: res.data.gender === '男' ? 'male' : 'female',
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
 * @param {number} userId - 用户ID
 * @param {Object} data - 需要更新的字段
 * @returns Promise
 */
export const updateUserInfo = (userId, data) => {
	console.log(data);
  return post(`/user/update/${userId}`, data, {
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
 * 上传用户头像
 * @param {number} userId - 用户ID
 * @param {string} filePath - 文件路径
 * @returns {Promise}
 */
export const uploadUserAvatar = (userId, filePath) => {
	console.log(userId);
	console.log(filePath);
  return uni.uploadFile({
    url: `/user/upload_avatar/${userId}`,
    filePath: filePath,
    name: 'file',
    formData: {
      'user_id': userId
    }
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