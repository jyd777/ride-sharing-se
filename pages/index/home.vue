<template>
  <div>
    <!-- 使用 NavigationBar 组件 -->
    <NavigationBar />
    <!-- 其他内容 -->
  </div>
  <view class="container">
	  <!-- 地图部分 -->
    <map
      id="baiduMap"
      class="map-container"
      :latitude="latitude"
      :longitude="longitude"
      scale="16"
      show-compass
      show-traffic
      show-scale
      style="width: 100%; height:150px;"
      @tap="onMapTap"
      @markertap="onMarkerTap"
      @regionchange="onRegionChange"
    ></map>
	
	  <!-- 搜索和身份切换栏 -->
    <view class="bar">
      <image src="../../static/atm-fill.png" class="icon" />
      <input 
        class="search-input"
        placeholder="输入地点或路线搜索"
        v-model="searchKeyword"
        @input="handleSearch"
      />
      <view class="switch" style="width: 260rpx;">
        <text 
          :class="{'active': isPassenger}" 
          @click="toggleIdentity('passenger')"
        >人找车</text>
        <text 
          :class="{'active': !isPassenger}" 
          @click="toggleIdentity('driver')"
        >车找人</text>
      </view>
    </view>
	
	  <!-- 订单列表 -->
    <scroll-view class="order-scroll" scroll-y="true" style="height:calc(100vh - 200px);">
	    <!-- 空状态提示 -->
	    <view class="empty-tip" v-if="filteredAndSearchedOrders.length === 0">
        <image src="../../static/empty.png" class="empty-icon" mode="widthFix" />
        <text class="empty-text" style="display: block; margin-top: 20rpx;">暂无匹配的行程</text>
      </view>
	  
      <view class="order-info" v-for="order in filteredAndSearchedOrders" :key="order.id">
        <view class="order-card">
		  <!-- 订单头部内容 -->
          <view class="order-header">
            <text>{{ order.date }}</text>
			<!-- 按钮 -->
			<view class="button-group">
				<!-- 司机可操作按钮 -->
				<button 
				  class="accept-button" 
				  @click="handleDriverAction(order)"
				  v-if="order.infoType === '人找车'"
				>
				  接单
				</button>
				
				<!-- 乘客可操作按钮 -->
				<button 
				  class="join-button" 
				  @click="handlePassengerAction(order)"
				>
				  {{ order.infoType === '人找车' ? '申请拼车' : '申请搭车' }}
				</button>
			</view>
          </view>
          <view class="order-details">
            <view class="start-point">
              <image src="../../static/start.png" class="icon" style="height:20px;width:20px"/>
              <text class="order-text">{{ order.startPoint }}</text>
            </view>
            <view class="departure-point">
              <image src="../../static/dest.png" class="icon" style="height:20px;width:20px"/>
              <text class="order-text">{{ order.endPoint }}</text>
            </view>
          </view>
          <view class="separator" />
			<view class="order-summary">
			  <view class="summary-content">
				<image :src="order.userAvatar" class="user-avatar" />
				<view class="user-info">
				  <!-- 根据身份显示不同信息 -->
				  <view v-if="order.infoType === '人找车'" class="passenger-info">
					<text class="username">{{ order.username }}</text>
					<text class="passenger-count">同乘{{ order.passengerCount }}人</text>
				  </view>
				  <view v-else class="driver-info">
					<text class="car-type">{{ order.carType }}</text>
					<text class="max-seats">可载{{ order.maxSeats }}人</text>
					<!-- 只有车主才显示接单次数 -->
					<view class="order-count-summary">
					  <text class="order-count">接单{{ order.orderCount }}次</text>
					</view>
				  </view>
				</view>
				<view class="price-info">
				  <text class="price-text" style="color:#003366;font-weight:bold;">预估{{ order.price }}元</text>
				</view>
			</view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 申请加入的弹窗 -->
    <uni-popup ref="actionPopup" type="dialog">
      <uni-popup-dialog 
        mode="base"
        :title="popupTitle"
        :content="popupContent"
        :duration="2000"
        @confirm="handleConfirm"
        @close="closePopup"
      ></uni-popup-dialog>
    </uni-popup>
	
	<!-- 车辆选择弹窗 -->
	<uni-popup ref="vehiclePopup" type="bottom">
	  <view class="vehicle-picker">
	    <view class="picker-header">
	      <text class="title">选择接单车辆</text>
	      <uni-icons 
	        type="close" 
	        size="24" 
	        @click="this.$refs.vehiclePopup.close();"
	      ></uni-icons>
	    </view>
	    
	    <scroll-view scroll-y class="vehicle-list">
	      <view 
	        v-for="vehicle in vehicles" 
	        :key="vehicle.car_id"
	        class="vehicle-item"
	        :class="{active: selectedVehicleId === vehicle.car_id}"
	        @click="selectedVehicleId = vehicle.car_id"
	      >
	        <view class="vehicle-info">
	          <text class="model">{{ vehicle.brand_model }}</text>
	          <text class="plate">{{ vehicle.plate_number }}</text>
	        </view>
	        <uni-icons 
	          v-if="selectedVehicleId === vehicle.car_id"
	          type="checkmark-filled" 
	          color="#007AFF"
	          size="20"
	        ></uni-icons>
	      </view>
	    </scroll-view>
	    
	    <button 
	      class="confirm-btn" 
	      @click="confirmVehicleSelection"
	      :disabled="!selectedVehicleId"
	    >
	      确认选择
	    </button>
	  </view>
	</uni-popup>
  </view>
</template>

<script>
// 引入 NavigationBar 组件
import NavigationBar from '../../components/NavigationBar.vue';
import uniPopup from '@dcloudio/uni-ui/lib/uni-popup/uni-popup.vue'
import uniPopupDialog from '@dcloudio/uni-ui/lib/uni-popup-dialog/uni-popup-dialog.vue'
import { fetchOrderList, acceptOrder, applyOrder } from '@/api/order.js';
import { fetchCars } from '../../api/user';

export default {
  components: {
    NavigationBar,
    uniPopup,
    uniPopupDialog
  },
  data() {
    return {
		// 经纬度
		latitude: 0, longitude: 0, 
		isPassenger: true,    // 订单显示状态(人找车/车找人)
		searchKeyword: '',    // 搜索关键字
		orders: [],           // 订单列表
		isLoading: false,     // 加载标志位
		currentOrderId: null, // 当前操作的订单ID
		popupTitle: '申请加入',
		popupContent: '确定要申请加入此行程吗？',
		currentAction: '',   // 'accept' | 'apply'
		isCarpool: false,    // 是否为拼车 
		// 用于司机接单的数据
		vehicles: [], // 司机拥有的车辆列表
		selectedVehicleId: null, // 选中的车辆ID
   };
  },
  computed: {
    filteredOrders() {
      // 根据当前按钮的选项筛选订单
      return this.orders.filter(order => order.infoType === (this.isPassenger ? '人找车' : '车找人'));
    },
    filteredAndSearchedOrders() {
      // 根据搜索关键词进一步筛选订单
      // 只要订单的任意一项包含关键词即可
      if (!this.searchKeyword) {
        return this.filteredOrders;
      }
      const keyword = this.searchKeyword.toLowerCase(); // 关键词
		  return this.filteredOrders.filter(order => 
		    order.startPoint.toLowerCase().includes(keyword) ||
		    order.endPoint.toLowerCase().includes(keyword) ||
		    (order.username && order.username.toLowerCase().includes(keyword)) ||
		    (order.carType && order.carType.toLowerCase().includes(keyword)) ||
		    order.date.includes(keyword)
		  );
    }
  },
  onLoad() {
    this.initMap();
    this.initData();
  },
  methods: {
    initMap() {
      // 初始化地图
      this.getLocation();
    },
    initData() {
      this.fetchOrders(true);
    },
    getLocation() {
      if (typeof wx !== "undefined" && wx.getLocation) {
        wx.getLocation({
          type: "wgs84",
          success: (res) => {
            this.latitude = res.latitude;
            this.longitude = res.longitude;
          },
          fail: (error) => {
            console.error("获取位置失败:", error);
          }
        });
      } else {
        console.error("当前环境不支持微信小程序的定位功能");
      }
    },
    onMapTap(e) {
      console.log("地图被点击了", e);
    },
    onMarkerTap(e) {
      console.log("标记被点击了", e);
    },
    onRegionChange(e) {
      console.log("地图区域改变", e);
    },
    toggleIdentity(identity) {
      // 更换按钮
      this.isPassenger = identity === "passenger";
    },
    async fetchOrders(refresh = false) {
      // 获取订单数据
      if (this.isLoading && !refresh) return;

      try {
        this.isLoading = true;
		
		console.log("获取首页订单数据")
        const res = await fetchOrderList();
		console.log(res.data)
        if (refresh) {
          this.orders = res.data || [];
		  console.log(this.orders)
        } else {
          this.orders = [...this.orders, ...(res.data || [])];
        }

      } catch (error) {
        uni.showToast({
          title: `加载失败: ${error.message}`,
          icon: 'none',
          duration: 2000
        });
        console.error('获取订单失败:', error);
      } finally {
        this.isLoading = false;
        uni.stopPullDownRefresh();
      }
    },
    // 司机接单按钮点击事件
	async handleDriverAction(order) {
		console.log("司机接单按钮点击事件")
		try {
			// 先获取司机车辆列表
			const res = await fetchCars();
			console.log("fetch car res", res);
			
			if (res.data.count !== 0) {
				this.vehicles = res.data.vehicles;
				this.currentOrderId = order.id;
				this.$refs.vehiclePopup.open();
			} else {
				throw new Error('您还没有可用的车辆');
			}
		} catch (error) {
			uni.showToast({ title: error.message, duration:2000, icon: 'none' });
		}
	},
	// 车辆选择确认
	async confirmVehicleSelection() {
		if (!this.selectedVehicleId) {
			uni.showToast({ title: '请选择车辆', icon: 'none' });
			return;
		}
		this.$refs.vehiclePopup.close();
		// 显示确认弹窗
		this.currentAction = 'accept';
		this.popupTitle = '确认接单';
		this.popupContent = `确定使用选中的车辆接单吗？`;
		this.$refs.actionPopup.open();
	},
	// 乘客申请按钮点击事件
	handlePassengerAction(order) {
		console.log("乘客申请按钮点击事件")
		this.currentOrderId = order.id;
		this.currentAction = 'apply';
		this.isCarpool = order.infoType === "人找车"; // 是否为拼车
		this.popupType = 'info';
		this.popupTitle = this.isCarpool ? '申请拼车' : '申请搭车';
		this.popupContent = `确定要${this.isCarpool ? '拼车' : '搭车'}吗？`;
		this.$refs.actionPopup.open();
		this.currentOrderId = order.id;	
	},
	// 弹窗确认操作
	async handleConfirm() {
		try {
			console.log("弹窗确认操作")
			uni.showLoading({ title: '处理中...', mask: true });
			if (this.currentAction === 'accept') {
				await this.acceptOrder();
			} else {
				await this.applyOrder();
			};
			
			uni.showToast({ 
			  title: this.getSuccessMessage(), 
			  icon: 'none'
			});
		} catch (error) {
			this.popupType = 'error';
			this.popupContent = error.message;
			this.$refs.actionPopup.open(); // 重新打开弹窗显示错误
		} finally {
			uni.hideLoading();
		}
			
		this.$emit('refresh'); // 通知父组件刷新数据
	},
	// 获取成功提示消息
	getSuccessMessage() {
		if (this.currentAction === 'accept') return '接单成功';
		return this.isCarpool ? '拼车申请已提交' : '搭车申请已提交';
	},
	// 接单API
	async acceptOrder() {
		console.log("调用接单API")
		try {
			const res = await acceptOrder({
				orderId: this.currentOrderId,
				vehicleId: this.selectedVehicleId,
			});
			
			// 接单成功后刷新列表
			this.fetchOrders(true);
		} catch (error) {
			uni.showToast({
			  title: res.message || "接单失败", 
			  icon: 'none'
			});
		}
	},
	// 申请API
	async applyOrder() {
		console.log("调用申请API")
		try {
			const res = await applyOrder({
				orderId: this.currentOrderId
			});
			console.log(res);
			
			// 申请成功后刷新列表
			this.fetchOrders(true);
		} catch (error) {
			uni.showToast({
			  title: res.message || "申请失败", 
			  icon: 'none'
			});
		}
	}, 
	// 关闭弹窗
	closePopup() {
		this.currentOrderId = null;
		this.currentAction = '';
	},
    handleSearch() {
      // 搜索逻辑已经在计算属性中处理
    }
  },
  components: {
    // 注册 NavigationBar 组件
    NavigationBar
  }
};
</script>

<style scoped>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
}

.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  background-color: #f8f8f8;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 9999; /* 确保导航栏在最上层 */
}

.icon {
  width: 30px;
  height: 30px;
}

.search-input {
  flex-grow: 1;
  margin-left: 10px;
  padding: 0px 10px;
  border: 1px solid #ddd;
  border-radius: 15px;
  width:100px;
  font-size: 14px;
  height: 30px;
  background-color: white;
}

.switch {
  display: flex;
  justify-content: space-between; /* 这将会把按钮之间的间隔平均分布 */
  width: 96px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #ccc; /* 假设有边框，根据需要调整 */
  margin-left: 10px;
}

.switch text {
  margin: 0; /* 确保没有外边距 */
  cursor: pointer;
  font-size:14px;
  font-weight: bold;
  color: #003366;
  background-color: #ffffff;
  padding: 5px 10px; /* 内边距 */
  transition: background-color 0.3s, color 0.3s;
}

.switch .active {
  background-color: #4a90e2;
  color: #ffffff;
}

.order-info {
  display: flex;
  flex-direction: column;
  margin: 10px;
}

.order-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-bottom: 10px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-details {
  display: flex;
  flex-direction: column;
  margin-top: 5px;
}

.start-point, .departure-point {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.order-text {
  font-size: 12px;
  margin-left: 5px;
}

.price-text {
  font-size: 16px;
  margin-left: 20px;
  color: #003366;
  font-weight: bold;
  align-self: flex-end;
}

.separator {
  height: 1px;
  background-color: #ccc;
  margin: 5px 10px;
}

.order-summary {
  display: flex;
  align-items: center;
  margin-top: 5px;
}

.summary-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2px solid #007aff;
  margin-right: 10px;
}

.user-info {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.passenger-info, .driver-info {
  display: flex;
  flex-direction: column;
}

.username, .car-type {
  font-weight: bold;
  font-size: 12px;
}

.passenger-count, .max-seats {
  font-size: 10px;
  color: #666;
}

.order-count {
  font-size: 10px;
  color: #999;
}

.price-info {
  align-self: flex-end;
}

/* 按钮容器 */
.button-group {
  display: flex;
  gap: 10px; /* 按钮间距 */
  margin-top: 10px;
}

.button-group button {
  min-width: 70px; /* 设置最小宽度 */
  white-space: nowrap; /* 防止文字换行 */
  padding: 0 10px; /* 增加内边距 */
}

/* 通用按钮样式 */
.join-button, .accept-button {
  flex: 1; /* 等分宽度 */
  height: 36px;
  line-height: 36px;
  font-size: 14px;
  border-radius: 4px;
}

/* 申请按钮样式 */
.join-button {
  background-color: #1989fa;
  color: white;
}

/* 接单按钮样式 */
.accept-button {
  background-color: #07c160;
  color: white;
}

.empty-tip {
  display: flex;
  flex-direction: column;  /* 关键：确保垂直排列 */
  align-items: center;
  justify-content: center;
  height: 60vh;
  padding: 40rpx;
  text-align: center;
}

.empty-icon {
  width: 200rpx !important;  /* 使用!important确保生效 */
  height: auto;
  margin-bottom: 20rpx;
}

/* 车辆选择弹窗样式 */
.vehicle-picker {
  background: #fff;
  border-radius: 16rpx 16rpx 0 0;
  padding: 20rpx;
  max-height: 70vh;
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
}

.vehicle-list {
  max-height: 50vh;
  padding: 20rpx 0;
}

.vehicle-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid #eee;
  border-radius: 12rpx;
  position: relative;
}

.vehicle-item.active {
  border-color: #007AFF;
}

.vehicle-image {
  width: 120rpx;
  height: 80rpx;
  margin-right: 20rpx;
  border-radius: 8rpx;
}

.vehicle-info {
  flex: 1;
}

.model {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
}

.plate {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.confirm-btn {
  margin-top: 20rpx;
  background: #007AFF;
  color: white;
  border-radius: 8rpx;
}

.confirm-btn[disabled] {
  background: #ccc;
}
</style>