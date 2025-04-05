<template>
  <view class="container">
    <view class="card">
      <view class="card-title text-h5">用户注册</view>
      <view class="card-body">
        <form ref="form">
          <div class="input-group">
            <label for="username">用户名</label>
            <input
              id="username"
              v-model="user.username"
              type="text"
              class="input"
              required
            />
          </div>
          <div class="input-group">
            <label for="true_username">真实姓名</label>
            <input
              id="true_username"
              v-model="user.true_username"
              type="text"
              class="input"
              required
            />
          </div>
          <div class="input-group">
            <label for="identity_num">身份证号</label>
            <input
              id="identity_num"
              v-model="user.identity_num"
              type="text"
              class="input"
              required
            />
          </div>
		<div class="input-group">
		  <label for="gender">性别</label>
		  <select
			id="gender"
			v-model="user.gender"
			class="input"
			required
			style="width: 280px; padding: 8px; font-size: 14px; border: 1px solid #e0e0e0; border-radius: 4px; appearance: none; background-color: white; cursor: pointer;"
			@click="setDropdownWidth"
		  >
			<option value="男" style="font-size: 14px;">男</option>
			<option value="女" style="font-size: 14px;">女</option>
		  </select>
		</div>
          <div class="input-group">
            <label for="telephone">电话号码</label>
            <input
              id="telephone"
              v-model="user.telephone"
              type="text"
              class="input"
              required
            />
          </div>
          <div class="input-group">
            <label for="password">密码</label>
            <input
              id="password"
              v-model="user.password"
              type="password"
              class="input"
              required
            />
          </div>
          <div class="input-group">
            <label for="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              v-model="user.confirmPassword"
              type="password"
              class="input"
              required
            />
          </div>
          <div class="button-group">
            <button
              class="primary-button"
              @click.prevent="register"
            >
              注册
            </button>
          </div>
        </form>
      </view>
      <view class="register-link">
        <button class="default-button" @click="goToLogin">
          已有账号？去登录
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      valid: false,
      user: {
        username: '',
        true_username: '',
        identity_num: '',
        gender: '',
        telephone: '',
        password: '',
        confirmPassword: ''
      }
    };
  },
  methods: {
    register() {
      if (
        this.user.username &&
        this.user.true_username &&
        this.user.identity_num &&
        this.user.gender &&
        this.user.telephone &&
        this.user.password &&
        this.user.password === this.user.confirmPassword
      ) {
        console.log('注册用户:', this.user);
        uni.navigateTo({
          url: '/pages/index/login' // 注册成功后跳转到登录页面
        });
      } else {
        uni.showToast({
          title: '请填写所有必填项，并确保两次密码一致！',
          icon: 'none'
        });
      }
    },
    goToLogin() {
      uni.navigateTo({
        url: '/pages/index/login' // 跳转到登录页面
      });
    }
  },
    setDropdownWidth() {
      const selectElement = document.getElementById('gender');
      selectElement.style.width = '280px'; // 设置下拉框宽度
    }
};
</script>

<style scoped>
.container {
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-image: url('../../static/bg.jpg');
  background-size: cover;
  background-position: center;
}

.card {
  width: 80%;
  margin-top:-30px;
  max-width: 400px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 20px;
}

.card-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto; /* 超出部分显示滚动条 */
  max-height: 400px; /* 设置最大高度 */
}

.input-group {
  margin-bottom: 20px;
  width: 88%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.input-group label {
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: bold;
}

.input {
  width: 262px;
  padding: 8px; /* 缩短高度 */
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px; /* 缩小字体 */
}

.button-group {
  margin-bottom: 10px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.primary-button {
  width: 262px;
  height: 36px; /* 缩短按钮高度 */
  padding: 8px; /* 缩短按钮内边距 */
  background-color: #007aff;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 14px; /* 缩小字体 */
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.primary-button:hover {
  background-color: #005bb5;
}

.default-button {
  width: 262px;
  height: 36px; /* 缩短按钮高度 */
  padding: 8px; /* 缩短按钮内边距 */
  background-color: #f5f5f5;
  color: #333333;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px; /* 缩小字体 */
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-button:hover {
  background-color: #e0e0e0;
}

.register-link {
  text-align: center;
}

</style>