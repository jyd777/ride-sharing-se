<template>
  <view class="carpool-calendar-container">
    <NavigationBar />
    
    <!-- 日历区域 -->
    <view class="calendar-section">
      <uni-calendar 
        ref="calendar"
        :insert="true"
        :date="selectedDate"
        @change="onDateChange"
      />
    </view>
    
    <!-- 拼车信息区域 -->
    <view class="trip-info-section">
      <h2 class="selected-date">{{ selectedDate ? formatDisplayDate(selectedDate) : '请选择日期查看拼车计划' }}</h2>
      
      <view class="trip-info-card" v-if="selectedTrips.length > 0">
        <scroll-view class="trip-scroll" scroll-y>
          <view class="trip-card" v-for="trip in selectedTrips" :key="trip.id">
            <view class="trip-header">
              <text class='trip-time'>{{ formatTime(trip.date) }}</text>
              <button class="view-details-button" @click="viewDetails(trip.id)">查看详情</button>
            </view>
            <view class="trip-details">
              <view class="start-point">
                <image src="../../static/start.png" class="trip-icon" />
                <text class="trip-text">{{ trip.startPoint }}</text>
              </view>
              <view class="departure-point">
                <image src="../../static/dest.png" class="trip-icon" />
                <text class="trip-text">{{ trip.endPoint }}</text>
              </view>
            </view>
            <view class="separator" />
            <view class="trip-summary">
              <view class="summary-content">
                <image :src="trip.userAvatar" class="user-avatar" />
                <view class="car-info">
                  <view class="car-type-summary">
                    <text class="car-type">{{ trip.carType }}</text>
                  </view>
                  <view class="trip-count-summary">
                    <text class="trip-count">接单{{ trip.orderCount }}次</text>
                  </view>
                </view>
                <view class="price-info">
                  <text class="price-text">{{ trip.price }}元</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
      
      <view v-else class="no-trips-message">
        <text v-if="selectedDate">该日期暂无拼车计划</text>
        <text v-else>请从日历中选择一个日期</text>
      </view>
    </view>
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
      selectedDate: this.getTodayDate(),
      trips: [
        {
          id: 1,
          date: '2025-04-01T14:30:00',
          startPoint: '创新港(2号)停车场',
          endPoint: '上海市·台铃电动车(文汇路店)',
          price: 41,
          carType: '奔驰 奔驰EQC',
          orderCount: 15,
          userAvatar: '/static/user.jpeg'
        },
        {
          id: 2,
          date: '2025-04-08T08:35:00',
          startPoint: '纪丰路327号3号楼',
          endPoint: '苏州市·苏州大学附属理想眼科医院',
          price: 62,
          carType: '宝马 宝马3系',
          orderCount: 8,
          userAvatar: '/static/user.jpeg'
        },
        {
          id: 3,
          date: '2025-04-08T17:05:00',
          startPoint: '汉庭酒店(上海安亭汽车城)',
          endPoint: '南通市·丝绸路与通源路交叉口',
          price: 87,
          carType: '宝马 宝马5系',
          orderCount: 12,
          userAvatar: '/static/user.jpeg'
        },
        {
          id: 4,
          date: '2025-04-15T10:00:00',
          startPoint: '张江高科技园区',
          endPoint: '上海市·浦东新区世纪大道',
          price: 55,
          carType: '特斯拉 Model 3',
          orderCount: 10,
          userAvatar: '/static/user.jpeg'
        }
      ]
    };
  },
  computed: {
    selectedTrips() {
      if (!this.selectedDate) return [];
      
      const selectedDateStr = this.selectedDate.split(' ')[0]; // 获取 YYYY-MM-DD 部分
      return this.trips.filter(trip => {
        const tripDateStr = new Date(trip.date).toISOString().split('T')[0];
        return tripDateStr === selectedDateStr;
      });
    }
  },
  methods: {
    getTodayDate() {
      const today = new Date();
      return `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    },
    
    onDateChange(e) {
      this.selectedDate = e.fulldate;
    },
    
    formatDisplayDate(dateStr) {
      const date = new Date(dateStr);
      const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
      return date.toLocaleDateString('zh-CN', options);
    },
    
    formatTime(dateString) {
      const date = new Date(dateString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    },
    
    viewDetails(tripId) {
      uni.navigateTo({
        url: `/pages/index/trip_info?id=${tripId}` // 修改为正确的路径
      });
    }
  }
};
</script>

<style scoped>
.carpool-calendar-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0px;
}

.calendar-section {
 
  margin-top:20px;
  margin-bottom: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 0px;
  margin-left:10px;
  margin-right:10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.trip-info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items:center;
}

.selected-date {
  color: #003366;
  margin-bottom: 15px;
  text-align: center;
  font-size: 18px;
}

/* 行程卡片区域样式 */
.trip-info-card {
  background-color: #fffff9;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 15px;
  margin-bottom: 20px;
  width: 85%;
  height: 300px;
  border: 2px solid #007aff;
  margin-bottom:80px;
}

.trip-scroll {
  height: 100%;
}

.trip-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-bottom: 10px;
}

.trip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.trip-details {
  display: flex;
  flex-direction: column;
  margin-top: 5px;
}

.start-point, .departure-point {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.trip-time {
  font-size: 14px;
  font-weight: bold;
  color: #003269;
}

.trip-text {
  font-size: 14px;
  margin-left: 5px;
}

.price-text {
  font-size: 16px;
  color: #003366;
  font-weight: bold;
}

.separator {
  height: 1px;
  background-color: #ccc;
  margin: 10px 0;
}

.trip-summary {
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #007aff;
  margin-right: 10px;
}

.car-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.car-type {
  font-weight: bold;
  font-size: 14px;
}

.trip-count {
  font-size: 12px;
  color: #999;
}

.view-details-button {
  padding: 3px 10px;
  font-weight: bold;
  font-size: 12px;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 5px;
  margin-right:0px;
}

.no-trips-message {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 16px;
}

.trip-icon {
  width: 16px;
  height: 16px;
  margin-right: 5px;
}
</style>