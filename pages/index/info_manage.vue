<template>
  <div class="user-profile-container">
    <!-- 使用 NavigationBar 组件 -->
    <NavigationBar />
    <div class="profile-edit-card">
      <!-- 头像上传区域 -->
      <div class="avatar-section">
        <image class="avatar-image" :src="user.avatar" alt="用户头像"  @error="handleImageError"/>
        <button class="upload-btn" @click="triggerAvatarUpload">
          {{ user.avatar === defaultAvatar ? '上传头像' : '更换头像' }}
        </button>
        <p v-if="avatarError" class="error-message">{{ avatarError }}</p>
      </div>

      <!-- 用户信息表单 -->
      <div class="form-section">
        <div class="form-group">
          <label for="username">用户名</label>
          <input 
            type="text" 
            id="username" 
            v-model="user.username" 
            placeholder="请输入用户名"
            style ="width:80%"
          >
        </div>

        <div class="form-group">
          <label for="contact">联系方式</label>
          <input 
            type="tel" 
            id="contact" 
            v-model="user.contact" 
            placeholder="请输入手机号"
            pattern="[0-9]{11}"
            style ="width:80%"
          >
        </div>

        <button class="save-btn" @click="saveProfile">保存修改</button>
      </div>
    </div>
  </div>
</template>

<script>
import NavigationBar from '../../components/NavigationBar.vue';
import { fetchUserBaseInfo, fetchUserProfile, fetchUserModifiableData, updateUserInfo, uploadUserAvatar } from '@/api/user.js';
import { saveFileToLocal } from '@/utils/fileUtils'; // 假设这里有一个保存文件到本地的工具函数

export default {
  components: {
    NavigationBar
  },
  data() {
    return {
      user: {
        user_id: null,
        avatar: '',        // 头像
        username: '',       // 用户名
        contact: ''        // 联系方式（对应 API 的 telephone）
      },
      originalUser: {},     // 保存原始数据用于比较
      defaultAvatar: '../../static/user.jpeg', // 直接使用路径
      avatarError: ''
    };
  },
  created() {
    this.fetchUserModifiableData();
  },
  methods: {
    async fetchUserModifiableData() {
      this.loading = true;

      try {
        const cacheUserID = uni.getStorageSync('user_id');
		console.log(cacheUserID);
        const res = await fetchUserModifiableData(cacheUserID);
        console.log(res);

        // 映射 API 数据到本地字段
        const userData = {
          user_id: cacheUserID,
          avatar: res.avatar || this.defaultAvatar, // 默认头像兜底
          username: res.username,
          contact: res.telephone || ''             // API 返回的 telephone 映射为 contact
        };

        // 更新数据和原始副本
        this.user = { ...userData };
        this.originalUser = { ...userData };

        // 存储到本地缓存
        uni.setStorageSync('user_info', userData);

      } catch (error) {
        console.error('获取用户数据失败:', error);
        uni.showToast({ title: '获取信息失败', icon: 'none' });
      }
    },

    // 触发头像上传
    async triggerAvatarUpload() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: async (res) => {
          try {
            const localFilePath = await saveFileToLocal(res.tempFilePaths[0]);
            this.uploadAvatar(localFilePath);
          } catch (error) {
            console.error('保存图片到本地失败:', error);
            uni.showToast({ title: '保存图片失败', icon: 'none' });
          }
        }
      });
    },

    // 处理头像变更
    handleAvatarChange(filePath) {
      if (!filePath) return;

      // 使用uni.getImageInfo代替Image对象
      uni.getImageInfo({
        src: filePath,
        success: (res) => {
          // 更新用户头像
          this.user.avatar = filePath;
          this.avatarError = '';
        },
        fail: () => {
          this.avatarError = '图片加载失败';
        }
      });
    },

    async uploadAvatar(filePath) {
      try {
        uni.showLoading({ title: '上传中...' });
        const cacheUserID = uni.getStorageSync('user_id'); 
        // 调用上传API
        const response = await uploadUserAvatar(cacheUserID, filePath);
        console.log(response); // 打印上传结果
        const res = JSON.parse(response.data);

        if (res.code === 200) {
          this.user.avatar = res.data.avatar_url;
          uni.showToast({
            title: '头像上传成功',
            icon: 'success'
          });
        } else {
          throw new Error(res.message || '头像上传失败');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        uni.showToast({
          title: error.message || '头像上传失败',
          icon: 'none'
        });
      } finally {
        uni.hideLoading();
      }
    },

    handleImageError() {
      this.user.avatar = this.defaultAvatar;
    },

    async saveProfile() {
      // 验证用户名
      if (!this.user.username.trim()) {
        uni.showToast({ title: '用户名不能为空', icon: 'none' });
        return;
      }

      // 验证手机号
      if (!/^1[3-9]\d{9}$/.test(this.user.contact)) {
        uni.showToast({ title: '请输入有效手机号', icon: 'none' });
        return;
      }

      try {
        uni.showLoading({ title: '保存中...' });
        const cacheUserID = uni.getStorageSync('user_id');

        // 准备请求数据
        const requestData = {
          username: this.user.username,
          telephone: this.user.contact
        };

        // 确保数据格式正确
        const response = await updateUserInfo(cacheUserID, requestData);
        // 检查响应是否成功
        if (response.code === 200) {
          uni.showToast({ title: '保存成功', icon: 'success' });
          // 更新原始数据副本
          this.originalUser = { ...this.user };
        } else {
          throw new Error(response.message || '保存失败');
        }
      } catch (error) {
        console.error('保存失败:', error);
        uni.showToast({ 
          title: error.message || '保存失败，请重试', 
          icon: 'none' 
        });
      } finally {
        uni.hideLoading();
      }
    }
  }
};
</script>

<style scoped>
.user-profile-container {
  height: 100vh; /* 高度占据整个视口 */
  margin: 0 auto;
  padding: 20px;
  background-image: url('../../static/bg.jpg');
  background-size: cover; /* 确保背景图片覆盖整个容器 */
  background-position: center; /* 背景图片居中 */
}

.profile-edit-card {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-top: 0px;
}

.profile-edit-card h2 {
  text-align: center;
  margin-bottom: 10px;
  font-size:20px;
  color: #333;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30px;
}


.avatar-image {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid #084fa1;
  margin-bottom: 15px;
}

.upload-btn {
  background-color: #f0f0f0;
  color: #666;
  border: 2px solid #999;
  padding: 2px 10px;
  margin-top:-5px;
  margin-bottom:-10px;
  border-radius: 15px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: all 0.3s;
}

.upload-btn:hover {
  background-color: #e0e0e0;
}

.form-section {
  max-width: 500px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #555;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.gender-select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 1em;
}

.save-btn {
  width: 100%;
  padding: 2px;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 15px;
  font-size: 16px;
  font-weight:bold;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 20px;
}

.error-message {
  color: #ff4d4f;
  margin-top: 8px;
  font-size: 14px;
}
</style>