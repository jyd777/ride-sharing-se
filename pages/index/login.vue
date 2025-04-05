<template>
  <div>
    <!-- 欢迎界面 -->
    <div v-if="showWelcome" class="welcome-screen">

    </div>


    <!-- 登录界面 -->
    <view v-if="!showWelcome" class="container">
      <view class="card">
        <view class="card-title">用户登录</view>
        <view class="card-body">
          <view class="input-group">
            <input
              v-model="credentials.username"
              placeholder="请输入用户名"
              type="text"
              class="input"
            />
          </view>
          <view class="input-group">
            <input
              v-model="credentials.password"
              placeholder="请输入密码"
              type="password"
              class="input"
            />
          </view>
          <view class="button-group">
            <button class="primary-button" @click="login">登录</button>
          </view>
          <view class="register-link">
            <button class="default-button" @click="goToRegister">没有账号？去注册</button>
          </view>
        </view>
      </view>
    </view>
  </div>
</template>

<script>
export default {
  data() {
    return {
      credentials: {
        username: '',
        password: ''
      },
      showWelcome: true // 控制显示欢迎界面
    };
  },
  mounted() {
    setTimeout(() => {
      this.showWelcome = false; // 5秒后隐藏欢迎界面
    }, 5000);
  },
  methods: {
    login() {
      // 登录逻辑，例如 API 请求
      //console.log('登录用户:', this.credentials);
      uni.navigateTo({
        url: '/pages/index/home' // 登录成功后的跳转
      });
    },
    goToRegister() {
      uni.navigateTo({
        url: '/pages/index/register' // 跳转到注册页面
      });
    }
  }
};
</script>
<style scoped>
.welcome-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  transition: opacity 2s ease; /* 添加过渡效果 */
  opacity: 1;
  z-index: 1000; /* 确保欢迎界面在最上层 */
  background-image: url('../../static/welcome.png');
  background-size: cover;
  background-position: center;
  transform: scale(0.8); /* 缩小到 50% 的大小 */
  transform-origin: center; /* 缩放的中心点 */
}

.welcome-image {
  max-width: 80%;
  height: auto;
}

/* 登录界面样式 */
.container {
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-image: url('../../static/bg.jpg'); /* 修改后的路径 */
  background-size: cover;
  background-position: center;
}

.card {
  width: 80%;
  max-width: 400px;
  background-color: rgba(255, 255, 255, 0.9); /* 半透明背景 */
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9); /* 增加阴影效果 */
  display: flex;
  flex-direction: column;
  align-items: center; /* 使内容居中 */
}

.card-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
}

.card-body {
  width: 100%; /* 使输入框和按钮宽度一致 */
  display: flex;
  flex-direction: column;
  align-items: center; /* 使输入框和按钮水平居中 */
}

.input-group {
  margin-bottom: 20px;
  width: 88%; /* 父容器宽度 */
  display: flex;
  justify-content: center; /* 水平居中 */
}

.input {
  width: 262px; /* 输入框固定宽度 */
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 16px;
}

.button-group {
  margin-bottom: 10px;
  width: 100%; /* 父容器宽度 */
  display: flex;
  justify-content: center; /* 水平居中 */
}

.primary-button {
  width: 262px; /* 按钮固定宽度 */
  height: 45px;
  padding: 10px;
  background-color: #007aff;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex; /* 启用 flex 布局 */
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
}

.primary-button:hover {
  background-color: #005bb5; /* 悬停时背景颜色变亮 */
}

.default-button {
  width: 262px; /* 按钮固定宽度 */
  height: 45px;
  padding: 10px;
  background-color: #f5f5f5;
  color: #333333;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex; /* 启用 flex 布局 */
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
}

.default-button:hover {
  background-color: #e0e0e0; /* 悬停时背景颜色变亮 */
}

.register-link {
  text-align: center;
}
</style>