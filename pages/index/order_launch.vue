<template>
<NavigationBar />
  <view class="container">
    <!-- 身份选择 -->
    <view class="identity-selector">
      <view 
        class="identity-option" 
        :class="{ 'selected': identity === 'driver' }"
        @click="identity = 'driver'"
      >
        车主
      </view>
      <view 
        class="identity-option" 
        :class="{ 'selected': identity === 'passenger' }"
        @click="identity = 'passenger'"
      >
        乘客
      </view>
    </view>

    <!-- 地图容器 -->
    <view class="map-container">
      <map 
        id="uni-map" 
        class="map" 
        :latitude="centerLat" 
        :longitude="centerLng" 
        :markers="markers"
        :polyline="polyline"
        show-location
      ></map>
    </view>

    <!-- 地址输入 -->
    <view class="address-container">
      <view class="address-input">
        <view class="input-group">
          <view class="label-container">
            <image src="../../static/start.png" class="input-icon"></image>
            <text class="input-label">起点</text>
          </view>
          <input 
            v-model="startAddress" 
            @input="handleStartInput" 
            placeholder="请输入起点"
            class="address-input-field"
          />
          <view v-if="startSuggestions.length > 0" class="suggestions">
            <view 
              v-for="(item, index) in startSuggestions" 
              :key="index" 
              @click="selectStartAddress(item)"
              class="suggestion-item"
            >
              {{ item.name }}
            </view>
          </view>
        </view>

        <view class="input-group">
          <view class="label-container">
            <image src="../../static/dest.png" class="input-icon"></image>
            <text class="input-label">终点</text>
          </view>
          <input 
            v-model="endAddress" 
            @input="handleEndInput" 
            placeholder="请输入终点"
            class="address-input-field"
          />
          <view v-if="endSuggestions.length > 0" class="suggestions">
            <view 
              v-for="(item, index) in endSuggestions" 
              :key="index" 
              @click="selectEndAddress(item)"
              class="suggestion-item"
            >
              {{ item.name }}
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 订单信息 -->
    <view class="order-info">
      <view class="info-item">
        <text class="info-label">出发时间</text>
        <picker 
          mode="date" 
          :value="departureDate" 
          :start="currentDate" 
          @change="handleDateChange"
          class="info-picker"
        >
          <view class="picker-text">{{ departureDate }}</view>
        </picker>
        <picker 
          mode="time" 
          :value="departureTime" 
          @change="handleTimeChange"
          class="info-picker"
        >
          <view class="picker-text">{{ departureTime }}</view>
        </picker>
      </view>

      <view v-if="identity === 'driver'" class="info-item">
        <text class="info-label">车辆选择</text>
        <picker 
          mode="selector" 
          :range="vehicleList" 
          range-key="plateNumber"
          @change="handleVehicleChange"
          class="info-picker"
        >
          <view class="picker-text">
            {{ selectedVehicle ? selectedVehicle.plateNumber : '请选择车辆' }}
          </view>
        </picker>
      </view>

      <view v-if="identity === 'driver'" class="info-item">
        <text class="info-label">余座</text>
        <picker 
          mode="selector" 
          :range="availableSeats" 
          @change="handleSeatChange"
          class="info-picker"
        >
          <view class="picker-text">
            {{ selectedSeats ? selectedSeats : '请选择余座' }}
          </view>
        </picker>
      </view>

      <!-- 新增：乘客同乘人数输入 -->
      <view v-if="identity === 'passenger'" class="info-item">
        <text class="info-label">同乘人数</text>
        <input 
          v-model="passengerCount" 
          type="number" 
          placeholder="请输入同乘人数"
          class="info-picker"
          @input="validatePassengerCount"
        />
      </view>

      <view class="info-item">
        <text class="info-label">价格预期</text>
        <view class="price-input-container">
          <input 
            v-model="price" 
            type="number" 
            placeholder="请输入价格"
            class="price-input"
          />
          <text class="price-unit">元</text>
        </view>
      </view>
    </view>

    <!-- 发布按钮 -->
    <button class="publish-button" @click="handlePublish">发布</button>
  </view>
</template>

<script>
import NavigationBar from '../../components/NavigationBar.vue';

export default {
  components: {
    NavigationBar
  },
  data() {
    return {
      identity: 'driver', // 'driver' 或 'passenger'
      startAddress: '',
      endAddress: '',
      startSuggestions: [],
      endSuggestions: [],
      startPos: null,
      endPos: null,
      centerLat: 31.238,
      centerLng: 121.49491,
      zoom:14,
      zooms:[3,20],
      markers: [],
      polyline: [],
      departureDate: '',
      departureTime: '',
      vehicleList: [],
      selectedVehicle: null,
      availableSeats: [],
      selectedSeats: null,
      price: '',
      currentDate: '',
      mapContext: null,
      passengerCount: 1 // 新增：同乘人数，默认为1
    };
  },
  mounted() {
    this.initCurrentDate();
    this.initMap();
    this.fetchVehicleList();
  },
  methods: {
    // ... 其他现有方法保持不变 ...
    
    // 新增：验证同乘人数输入
    validatePassengerCount() {
      // 确保输入的是正整数
      if (this.passengerCount < 1) {
        this.passengerCount = 1;
      } else if (this.passengerCount > 10) { // 假设最大同乘人数为10
        this.passengerCount = 10;
      }
      this.passengerCount = Math.floor(this.passengerCount); // 取整
    },
    
    async handlePublish() {
      if (!this.startAddress || !this.endAddress) {
        uni.showToast({
          title: '请填写起点和终点',
          icon: 'none'
        });
        return;
      }
      
      if (!this.departureDate || !this.departureTime) {
        uni.showToast({
          title: '请选择出发时间',
          icon: 'none'
        });
        return;
      }
      
      if (this.identity === 'driver' && !this.selectedVehicle) {
        uni.showToast({
          title: '请选择车辆',
          icon: 'none'
        });
        return;
      }
      
      if (this.identity === 'driver' && !this.selectedSeats) {
        uni.showToast({
          title: '请选择余座',
          icon: 'none'
        });
        return;
      }
      
      // 新增：验证乘客同乘人数
      if (this.identity === 'passenger' && (!this.passengerCount || this.passengerCount < 1)) {
        uni.showToast({
          title: '请输入有效的同乘人数',
          icon: 'none'
        });
        return;
      }
      
      if (!this.price) {
        uni.showToast({
          title: '请填写价格预期',
          icon: 'none'
        });
        return;
      }
      
      const orderData = {
        identity: this.identity,
        startAddress: this.startAddress,
        endAddress: this.endAddress,
        startPos: this.startPos,
        endPos: this.endPos,
        departureTime: `${this.departureDate} ${this.departureTime}`,
        price: parseFloat(this.price),
        vehicleId: this.identity === 'driver' ? this.selectedVehicle.id : null,
        availableSeats: this.identity === 'driver' ? this.selectedSeats : null,
        passengerCount: this.identity === 'passenger' ? parseInt(this.passengerCount) : null // 新增同乘人数
      };
      
      try {
        // 这里应该是实际的API调用
        // const res = await uni.request({
        //   url: 'your-order-api-endpoint',
        //   method: 'POST',
        //   data: orderData
        // });
        
        // 模拟成功响应
        uni.showToast({
          title: '订单发布成功',
          icon: 'success'
        });
        
        // 重置表单
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        console.error('订单发布失败:', error);
        uni.showToast({
          title: '订单发布失败',
          icon: 'none'
        });
      }
    }
  }
};
</script>

<style>
.container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  margin-bottom:90px;
}

.identity-selector {
  display: flex;
  margin-bottom: 20rpx;
  border-radius: 10rpx;
  overflow: hidden;
  border: 1rpx solid #1890FF;
}

.identity-option {
  flex: 1;
  padding: 10rpx;
  text-align: center;
  font-weight: bold;
  color: #333;
}

.identity-option.selected {
  background-color: #1890FF;
  color: white;
}

.map-container {
  height: 300rpx; /* 减小高度 */
  width: 100%; /* 宽度自动填充父容器 */
  border-radius: 10rpx;
  overflow: hidden;
}

.map {
  width: 100%; /* 确保地图填满容器宽度 */
  height: 100%; /* 确保地图填满容器高度 */
}

.address-container {
  margin-top:15px;
  border: 3px solid #007AFF; /* Blue border */
  border-radius: 15px; /* Rounded corners */
  background-color: white; /* White fill */
  padding: 8px;
  margin-bottom: 20rpx;
}

.address-input {
  margin-bottom: 0;
}

.input-group {
  margin-bottom: 20rpx;
  position: relative;
}

.label-container {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.input-icon {
  width: 30rpx;
  height: 30rpx;
  margin-right: 10rpx;
}

.input-label {
  display: inline-block; /* 修改为inline-block以与图标同行 */
  font-size: 28rpx;
  color: #333;
}

.address-input-field {
  border: 1rpx solid #ddd;
  padding: 0px 20rpx; /* Increased vertical padding */
  border-radius: 10rpx;
  width: 100%;
  box-sizing: border-box;
  font-size: 14px; /* Larger font size */
  min-height: 25px; /* Taller input field */
}

.suggestions {
  position: absolute;
  top: 100rpx;
  left: 0;
  right: 0;
  background: white;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  z-index: 100;
  max-height: 300rpx;
  overflow-y: auto;
}

.suggestion-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

.order-info {
  background-color: #f9f9f9;
  padding: 20rpx;
  border-radius: 10rpx;
  margin-bottom: 20rpx;
}

.info-item {
  margin-bottom: 20rpx;
  display: flex;
  align-items: center; /* 垂直居中 */
  flex-wrap: wrap; /* 允许换行 */
}

.info-label {
  width: 100%; /* 标签占满一行 */
  margin-bottom: 10rpx;
  font-size: 28rpx;
  color: #333;
}

.info-picker {
  border: 1rpx solid #ddd;
  padding: 20rpx 10rpx; /* 增加垂直内边距 */
  border-radius: 10rpx;
  background-color: white;
  width: 100%; /* 选择框宽度填满 */
  margin-bottom: 10rpx; /* 选择框之间的间距 */
  box-sizing: border-box; /* 包含内边距和边框 */
}

.picker-text {
  color: #333;
  line-height: 1.5; /* 设置行高 */
}

/* 价格输入区域样式 */
.price-input-container {
  display: flex;
  align-items: center; /* 垂直居中 */
  width: 100%; /* 宽度填满 */
}

.price-input {
  border: 1rpx solid #ddd;
  padding: 20rpx 10rpx; /* 与选择框相同的垂直内边距 */
  border-radius: 10rpx;
  flex: 1; /* 占据剩余空间 */
  margin-right: 10rpx;
  box-sizing: border-box;
  height: 72rpx; /* 设置固定高度与选择框一致 */
}

.price-unit {
  font-size: 28rpx;
  color: #333;
  height: 72rpx; /* 与输入框相同高度 */
  line-height: 72rpx; /* 垂直居中 */
}

.publish-button {
  background-color: #1890FF;
  color: white;
  border-radius: 10rpx;
  padding: 0px;
  font-size: 16px;
  font-weight:bold;
  width:100%;
  margin-bottom:30px;
}
.info-picker {
  border: 1rpx solid #ddd;
  padding: 20rpx 10rpx;
  border-radius: 10rpx;
  background-color: white;
  width: 100%;
  margin-bottom: 10rpx;
  box-sizing: border-box;
  height: 72rpx;
  line-height: 72rpx;
}
/* 新增地址建议样式 */
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8rpx;
  z-index: 100;
  max-height: 300rpx;
  overflow-y: auto;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.suggestion-item {
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
  font-size: 14px;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background-color: #f5f5f5;
}

/* 调整表单输入框样式 */
.form-input {
  border: 1px solid #ddd;
  border-radius: 8rpx;
  padding: 15rpx;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 0;
}

.form-item {
  position: relative;
  margin-bottom: 40rpx;
}

/* 调整弹窗内容样式 */
.custom-popup-content {
  width: 90%;
  max-height: 80vh;
  padding: 30rpx;
  box-sizing: border-box;
  overflow-y: auto;
}
</style>