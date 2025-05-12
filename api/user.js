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
export const fetchCars = () => {
  return get("/user/cars")
};

/**
 * 更新用户信息
 * @param {Object} data - 需要更新的字段
 * @returns Promise
 */
export const updateUserInfo = (data) => {
  return post("/user/update", data, {
    showLoading: true,
    loadingText: "正在更新用户信息..."
  })
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