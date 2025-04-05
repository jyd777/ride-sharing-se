<template>
  <div class="user-profile-container">
    <!-- 使用 NavigationBar 组件 -->
    <NavigationBar />
    
    <div class="profile-edit-card">
      
      <!-- 头像上传区域 -->
      <div class="avatar-section">
        <div class="avatar-preview">
          <img :src="user.avatar" alt="用户头像" class="avatar-image">
        </div>
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
          <label for="gender">性别</label>
          <select id="gender" v-model="user.gender" class="gender-select"style ="width:70%">
            <option value="male">男</option>
            <option value="female">女</option>
          </select>
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

export default {
  components: {
    NavigationBar
  },
  data() {
    return {
      user: {
        avatar: '', // 初始为空，从后端获取
        username: '',
        gender: 'male',
        contact: ''
      },
      avatarError: '',
      originalUser: {},
	  defaultAvatar: '../../static/user_2.jpg' 
    };
  },
  created() {
    this.fetchUserData();
  },
  methods: {
    // 模拟从后端获取用户数据
    fetchUserData() {
      // 这里应该是API调用，我们使用setTimeout模拟异步请求
      setTimeout(() => {
        const mockData = {
          avatar: '../../static/user_2.jpg',
          username: '测试者',
          gender: 'female',
          contact: '15800993469'
        };
        this.user = {...mockData};
        this.originalUser = {...mockData}; // 保存原始数据
      }, 500);
    },
    
    // 触发头像上传
    triggerAvatarUpload() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          this.handleAvatarChange(res.tempFilePaths[0]);
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
    
    handleImageError() {
      this.user.avatar = this.defaultAvatar;
    },
    
    // 保存用户信息
    async saveProfile() {
      // 验证用户名
      if (!this.user.username.trim()) {
        uni.showToast({
          title: '请输入用户名',
          icon: 'none'
        });
        return;
      }
      
      // 验证手机号
      if (!/^1[3-9]\d{9}$/.test(this.user.contact)) {
        uni.showToast({
          title: '请输入有效的手机号',
          icon: 'none'
        });
        return;
      }
      
      // 检查是否有修改
      const hasChanges = Object.keys(this.user).some(
        key => JSON.stringify(this.user[key]) !== JSON.stringify(this.originalUser[key])
      );
      
      if (!hasChanges) {
        uni.showToast({
          title: '没有检测到任何修改',
          icon: 'none'
        });
        return;
      }
      
      try {
        // 这里应该是实际的API调用
        console.log('保存用户信息:', this.user);
        
        // 模拟API请求延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        uni.showToast({
          title: '个人信息已保存',
          icon: 'success'
        });
        this.originalUser = {...this.user};
        
      } catch (error) {
        console.error('保存失败:', error);
        uni.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
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

.avatar-preview {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #084fa1;
  margin-bottom: 15px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
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