<!-- OrderInvitePopup.vue -->
<template>
<view v-if="isVisible" class="flex-col justify-center items-center page-overlay">
  <view class="flex-col section">
    <image class="self-start image_2" src="../static/close.png" @click="closePopup"/>
    <view class="flex-col group">
      <view class="flex-col justify-between self-stretch">
        <image class="avatar" :src="avatar_url"/>
      </view>
      <text class="self-start text mt-28-5">{{ popupTitle }}</text>
    </view>
    <view class="flex-col mt-37-5">
      <view class="flex-col self-stretch relative section_2">
        <view class="flex-row justify-center items-center self-start relative group_2" style="width:270px;margin-left:0px">
          <image class="image_3" src="../static/clock.png"/>
          <text class="font text_2" style="margin-left:10px">{{ time }}</text>
        </view>
        <view class="flex-row items-center self-stretch group_3">
          <image class="image_4" src="../static/start.png"/>
          <text class="font_2 ml-35-5">{{ start_loc }}</text>
        </view>
        <view class="flex-row items-center self-stretch group_4">
          <image class="image_4" src="../static/dest.png"/>
          <text class="font_2 ml-35-5">{{ dest_loc }}</text>
        </view>
      </view>
      <!-- 接受邀约按钮 -->
      <button 
        v-if="isUserInOrder === 'other'" 
        class="flex-col justify-center items-center self-stretch button mt-43"
        @click="handleAccept"
      >
        <text class="font text_6">{{ buttonText }}</text>
      </button>
	  <!-- 拒绝按钮 -->
	  <button
	    v-if="isUserInOrder === 'other'" 
	    class="flex-col justify-center items-center self-stretch button mt-43"
	    @click="handleReject"
	  >
	    <text class="font text_6">拒      绝</text>
	  </button>
    </view>
  </view>

  <!-- 车辆选择弹窗 -->
  <view v-if="showVehiclePopup" class="custom-popup-mask" @click="showVehiclePopup = false">
    <view class="custom-popup-content" @click.stop>
      <view class="popup-header">
        <text style="font-size: 16px; font-weight: bold;">选择车辆</text>
        <image 
          src="../static/close.png" 
          @click="showVehiclePopup = false" 
          style="width: 40rpx; height: 40rpx;"
        />
      </view>

      <scroll-view scroll-y="true" style="height: 60vh; margin-top: 20rpx;">
        <view 
          v-for="(vehicle, index) in vehicles" 
          :key="vehicle.id" 
          class="order-item" 
          :class="{'selected-order': selectedVehicle && selectedVehicle.id === vehicle.id}"
          @click="selectedVehicle = vehicle"
        >
          <text class="order-text">{{ vehicle.plate_number }}</text>
        </view>

        <view v-if="vehicles.length === 0" class="empty-tip">
          <text>暂无可用车辆</text>
        </view>
      </scroll-view>

      <button 
        v-if="selectedVehicle" 
        class="send-btn"
        @click="confirmVehicleSelection"
      >
        确认选择
      </button>
    </view>
  </view>
</view>
</template>

<script>
import {
	acceptDriverOrder,
	rejectDriverOrder,
	acceptPassengerApplication,
	rejectPassengerApplication,
} from '@/api/order.js'

export default {
  props: {
	userId: {
		type: Number,
	},
	orderId: {
		type: Number,
	},
	messageId: {
		type: Number,
	},
	sender: {
		type: String
	},
    isVisible: {
      type: Boolean,
      default: true
    },
	// 有关订单消息的类型
	messageType: {
	  type: String,
	  default: 'invitation' // invitation | apply_join | apply_order
	},
    username: {
      type: String,
      default: '测试者'
    },
    time: {
      type: String,
      default: '2025年3月24日13:49'
    },
    start_loc: {
      type: String,
      default: '同济大学（嘉定校区）'
    },
    dest_loc: {
      type: String,
      default: '同济大学（四平校区）'
    },
    avatar_url: {
      type: String,
      default: '../static/user_2.jpg'
    },
    isUserInOrder: {
      type: Boolean,
      default: false // 判断用户是否已经在订单中
    }
  },
  data() {
    return {
      showVehiclePopup: false, // 控制车辆选择弹窗的显示
      selectedVehicle: null, // 用户选择的车辆
      vehicles: [] // 用户的车辆列表
    };
  },
  computed: {
    popupTitle() {
      switch (this.messageType) {
        case 'apply_join':
          return `${this.username}申请加入拼车`;
        case 'apply_order':
          return `${this.username}申请接单`;
        case 'invitation':
        default:
          return `${this.username}发起的拼车邀约`;
      }
    },
    buttonText() {
      switch (this.messageType) {
        case 'apply_join':
          return '同 意 申 请';
        case 'apply_order':
          return '同 意 接 单';
        case 'invitation':
        default:
          return '接 受 邀 约';
      }
    }
  },
  methods: {
    closePopup() {
      this.$emit('close');
    },
    handleAccept() {
		const needsVehicle = this.messageType === 'invitation';
		if (needsVehicle) {
			this.fetchUserVehicles();
			this.showVehiclePopup = true;
		} else {
			this.acceptInvite();
			
		}
    },
	handleReject() {
		let rejectPromise;
		const requestdata = {
			userId: this.userId,
			orderId: this.orderId,
			messageId: this.messageId
		}
		switch(this.messageType) {
			case 'apply_join':
			  rejectPromise = rejectPassengerApplication(requestdata); // 拒绝乘客加入
			  break;
			case 'apply_order':
			  rejectPromise = rejectDriverOrder(requestdata); // 拒绝司机接单
			  break;
			case 'invitation':
			default:
			  uni.showToast({ title: '不接受邀约', icon: 'none' });
			  this.closePopup();
			  return;
		}
	},
    fetchUserVehicles() {
      // 模拟从后端获取车辆列表
      this.vehicles = [
        { id: 1, plate_number: '沪A12345' },
        { id: 2, plate_number: '沪B67890' }
      ];
    },
    confirmVehicleSelection() {
      if (!this.selectedVehicle) {
        uni.showToast({ title: '请选择车辆', icon: 'none' });
        return;
      }

      // 选择车辆后接受邀约
      this.acceptInvite();
      this.showVehiclePopup = false; // 关闭车辆选择弹窗
    },
    acceptInvite() {
      let acceptPromise;
	  const requestdata = {
	  	userId: this.userId,
	  	orderId: this.orderId,
	  	messageId: this.messageId
	  }
      switch (this.messageType) {
        case 'apply_join':
          acceptPromise = acceptPassengerApplication(requestdata); // 同意乘客加入
          break;
        case 'apply_order':
          acceptPromise = acceptDriverOrder(requestdata); // 同意司机接单
          break;
        case 'invitation':
        default:
          // 带上选中的车辆信息（示例）
          if (!this.selectedVehicle) {
            uni.showToast({ title: '请选择车辆', icon: 'none' });
            return;
          }
          acceptPromise = acceptDriverOrder({ vehicleId: this.selectedVehicle.id });
          break;
      }
    }
  }
};
</script>

<style scoped lang="css">
.mt-28-5 {
  margin-top: 31.9rpx;
}
.mt-37-5 {
  margin-top: 41.98rpx;
}
.ml-35-5 {
  margin-left: 39.74rpx;
}
.mt-43 {
  margin-top: 48.13rpx;
}

.custom-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.custom-popup-content {
  width: 90%;
  max-height: 80vh;
  padding: 30rpx;
  box-sizing: border-box;
  background-color: white;
  border-radius: 10rpx;
  overflow-y: auto;
}

.order-item.selected-order {
  background-color: #f0f8ff;
  border-left: 6rpx solid #2a82e4;
}

.order-text {
  font-size: 15px;
  font-weight: 500;
  color: #333;
}

.empty-tip {
  text-align: center;
  padding: 50rpx;
  color: #999;
}

.send-btn {
  position: fixed;
  bottom: 60px;
  right: 30rpx;
  background-color: #2a82e4;
  color: white;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 15px;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(42, 130, 228, 0.3);
  z-index: 99;
}

.page-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  justify-content: center;
  align-items: center;
}
.section {
  padding: 13.43rpx;
  background-color: #ffffff;
  border-radius: 50rpx;
  border-left: solid 5.6rpx #084fa1;
  border-right: solid 5.6rpx #084fa1;
  border-top: solid 5.6rpx #084fa1;
  border-bottom: solid 5.6rpx #084fa1;
  width: 80%;
  margin-left: 8%;
  margin-top: 100px;
}
.group {
  padding-left: 0px;
  padding-right: 11.19rpx;
  display: flex; /* 添加 Flexbox 布局 */
  flex-direction: column; /* 设置为上下排列 */
  justify-content: center; /* 垂直居中 */
  align-items: center; /* 水平居中 */
  height: 100%; /* 确保有足够的高度来居中 */
}
.avatar {
  margin-left: 0; /* 移除左边距 */
  border-radius: 201.49rpx;
  width: 100.19rpx;
  height: 98.51rpx;
  border: 3px solid #084fa1;
}
.image_2 {
  margin-top: 6.16rpx;
  width: 55.97rpx;
  height: 55.97rpx;
  right:-265px;
}
.text {
  color: #084fa1;
  font-size: 41.98rpx;
  font-family: SourceHanSansCN;
  font-weight: 700;
  line-height: 40.39rpx;
  margin-top: 10px; /* 添加顶部间距 */
}
.section_2 {
  width: 265px;
  padding: 21.27rpx;
  background-color: #edf5f7;
  border-radius: 18.47rpx;
  border-left: solid 2.8rpx #084fa1;
  border-right: solid 2.8rpx #084fa1;
  border-top: solid 2.8rpx #084fa1;
  border-bottom: solid 2.8rpx #084fa1;
}
.group_2 {
  margin-left: 85.07rpx;
  padding-bottom: 6.72rpx;
  width: 210rpx;
  display: flex; /* 添加 Flexbox 布局 */
  align-items: center; /* 垂直居中 */
}
.font {
  font-size: 39.18rpx;
  font-family: SourceHanSansCN;
  line-height: 47.01rpx;
  font-weight: 700;
}
.text_2 {
  color: #084fa1;
  font-size: 40rpx;
}
.text_3 {
  color: #084fa1;
  font-size: 44.78rpx;
  font-family: SourceHanSansCN;
  font-weight: 700;
  line-height: 53.73rpx;
  word-break: break-all;
  width: 0.28rpx;
}
.pos_2 {
  position: absolute;
  right: 271.9rpx;
  top: 50%;
  transform: translateY(-50%);
}
.group_3 {
  margin-top: 22.39rpx;
  display: flex; /* 添加 Flexbox 布局 */
  align-items: center; /* 垂直居中 */
}
.image_4 {
  width: 44.78rpx;
  height: 45.9rpx;
}
.font_2 {
  font-size: 33.58rpx;
  font-family: SourceHanSansCN;
  line-height: 31.97rpx;
  color: #000000;
}
.group_4 {
  margin-top: 21.27rpx;
  display: flex; /* 添加 Flexbox 布局 */
  align-items: center; /* 垂直居中 */
}
.image_3 {
  width: 25px;
  height: 25px;
}
.pos {
  position: absolute;
  left: -9.31rpx;
  top: 4.12rpx;
}
.group_5 {
  margin-left: 26.87rpx;
  line-height: 37.38rpx;
}
.text_4 {
  color: #808080;
  line-height: 37.38rpx;
}
.text_5 {
  color: #000000;
  font-size: 39.18rpx;
  font-family: SourceHanSansCN;
  line-height: 29.23rpx;
}
.text-wrapper {
  margin-left: 7.84rpx;
  margin-right: 21.27rpx;
  padding: 18.47rpx 0 21.27rpx;
  background-color: #2a82e4;
  border-radius: 18.47rpx;
}
.text_6 {
  color: #ffffff;
  width: 294px;
}
.button {
  margin-left: 7.84rpx;
  margin-right: 21.27rpx;
  padding: 18.47rpx 0 21.27rpx;
  background-color: #2a82e4;
  border-radius: 18.47rpx;
  border: none; /* 移除默认边框 */
  display: flex; /* 添加 Flexbox 布局 */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  width: 285px; /* 设置宽度 */
  color: #ffffff; /* 设置文本颜色 */
  font-size: 39.18rpx; /* 设置字体大小 */
  font-family: SourceHanSansCN; /* 设置字体 */
  font-weight: 700; /* 设置字体粗细 */
  line-height: 29.23rpx; /* 设置行高 */
  margin-bottom: 10px;
  
}
</style>