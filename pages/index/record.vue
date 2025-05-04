<template>
  <div>
    <!-- 使用 NavigationBar 组件 -->
    <NavigationBar />
    <!-- 其他内容 -->
  </div>
  <view class="container">
    <view class="filter-bar">
      <view class="dual-filter-row">
        <view class="filter-group">
          <picker @change="onOrderTypeChange" :value="orderTypeIndex" :range="orderTypes" range-key="name">
            <view class="picker">
              订单类型: {{orderTypes[orderTypeIndex].name}}
              <image src="../../static/arrow-down.png" class="arrow-icon" />
            </view>
          </picker>
        </view>
        
        <!-- 订单状态筛选 -->
        <view class="filter-group">
          <picker @change="onStatusChange" :value="statusIndex" :range="statusOptions" range-key="name">
            <view class="picker">
              订单状态: {{statusOptions[statusIndex].name}}
              <image src="../../static/arrow-down.png" class="arrow-icon" />
            </view>
          </picker>
        </view>
      </view>
      
      <view class="time-filters">
        <picker @change="onYearChange" :value="yearIndex" :range="years" class="time-picker">
          <view class="picker">
            {{years[yearIndex] || '--'}}年
            <image src="../../static/arrow-down.png" class="arrow-icon" />
          </view>
        </picker>
        <picker @change="onMonthChange" :value="monthIndex" :range="months" class="time-picker">
          <view class="picker">
            {{months[monthIndex] || '--'}}月
            <image src="../../static/arrow-down.png" class="arrow-icon" />
          </view>
        </picker>
        <picker @change="onDayChange" :value="dayIndex" :range="days" class="time-picker">
          <view class="picker">
            {{days[dayIndex] || '--'}}日
            <image src="../../static/arrow-down.png" class="arrow-icon" />
          </view>
        </picker>
      </view>
      
      <view class="filter-group">
        <picker @change="onSortChange" :value="sortIndex" :range="sortOptions" range-key="name">
          <view class="picker">
            排序: {{sortOptions[sortIndex].name}}
            <image src="../../static/arrow-down.png" class="arrow-icon" />
          </view>
        </picker>
      </view>
    </view>
    
    <scroll-view class="order-scroll" scroll-y="true" style="height:calc(100vh - 200px);">
      <view class="order-info" v-for="order in orders" :key="order.id">
        <view class="order-card">
          <view class="order-header">
            <text>{{ order.date }}</text>
			<view class="header-buttons">
			    <button 
			      v-if="order.status === 'not-started'"
			      class="delete-button" 
			      @click="confirmDelete(order)"
			    >删除订单</button>
            <button class="detail-button" @click="applyToJoin(order.id)">查看详情</button>
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
              <view class="car-info">
                <view class="car-type-summary">
                  <text class="car-type">{{ order.carType }}</text>
                </view>
                <view class="order-count-summary">
                  <text class="order-count">接单{{ order.orderCount }}次</text>
                </view>
              </view>
              <view class="price-info">
				<!-- 新增订单状态标签 -->
				<view class="status-container">
				  <view 
				    class="status-tag" 
				    :class="'status-' + order.status"
				    @click="handleStatusClick(order)"
				  >
				    {{ getStatusText(order.status) }}
				  </view>
				</view>
                <text class="price-text" style="color:#003366;font-weight:bold;">预估{{ order.price }}元</text>
              </view>
            </view>
          </view>
          <!-- 新增：拒绝原因显示 -->
          <view class="audit-reason" v-if="order.status === 'rejected' && order.rejectReason">
            <text>拒绝原因: {{ order.rejectReason }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
// 引入 NavigationBar 组件
import { get,del } from '@/utils/request.js'
import NavigationBar from '../../components/NavigationBar.vue';
export default {
  data() {
    return {
     latitude: 0,
     longitude: 0,
     orderTypes: [
       { name: '所有', value: 'all' },
       { name: '乘客', value: 'passenger' },
       { name: '车主', value: 'driver' }
     ],
     orderTypeIndex: 0,
     // 新增订单状态选项
     statusOptions: [
       { name: '全部', value: 'all' },
	   { name: '待审核', value: 'pending' },
	   { name: '被拒绝', value: 'rejected' },
       { name: '待支付', value: 'to-pay' },
       { name: '已完成', value: 'completed' },
       { name: '待评价', value: 'to-review' },
       { name: '未开始', value: 'not-started' },
       { name: '进行中', value: 'in-progress' }
     ],
     statusIndex: 0,
     years: ['', '2023', '2024', '2025'],  // 第一个元素为空表示不筛选
     yearIndex: 0,
     months: ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
     monthIndex: 0,
     days: ['', ...Array.from({length: 31}, (_, i) => (i + 1).toString())],
     dayIndex: 0,
     sortOptions: [
       { name: '时间升序', value: 'time-asc' },
       { name: '时间降序', value: 'time-desc' },
       { name: '价格升序', value: 'price-asc' },
       { name: '价格降序', value: 'price-desc' }
     ],
     sortIndex: 0,
     orders: [
   //     {
   //      id: 1,
   //      infoType: '乘客',
   //      date: '2023年3月7日14:30',  // 修改日期格式便于筛选
   //      startPoint: '创新港(2号)停车场',
   //      endPoint: '上海市·台铃电动车(文汇路店)',
   //      price: 41,
   //      carType: '奔驰 奔驰EQC',
   //      orderCount: 15,
   //      userAvatar: '../../static/user.jpeg',
   //      status: 'to-pay' // 新增状态字段
   //    },
   //    {
   //      id: 2,
   //      infoType: '乘客',
   //      date: '2025年3月8日08:35',
   //      startPoint: '纪丰路327号3号楼',
   //      endPoint: '苏州市·苏州大学附属理想眼科医院',
   //      price: 62,
   //      carType: '宝马 宝马3系',
   //      orderCount: 8,
   //      userAvatar: '../../static/user.jpeg',
   //      status: 'completed'
   //    },
   //    {
   //      id: 3,
   //      infoType: '车主',
   //      date: '2024年3月7日17:05',
   //      startPoint: '汉庭酒店(上海安亭汽车城)',
   //      endPoint: '南通市·丝绸路与通源路交叉口',
   //      price: 87,
   //      carType: '宝马 宝马5系',
   //      orderCount: 12,
   //      userAvatar: '../../static/user.jpeg',
   //      status: 'not-started'
   //    },
   //    {
   //      id: 4,
   //      infoType: '车主',
   //      date: '2024年3月10日09:15',
   //      startPoint: '上海市中心',
   //      endPoint: '浦东国际机场',
   //      price: 120,
   //      carType: '特斯拉 Model',
   //      orderCount: 20,
   //      userAvatar: '../../static/user.jpeg',
   //      status: 'in-progress'
   //    },
   //    {
   //      id: 5,
   //      infoType: '乘客',
   //      date: '2024年3月12日18:30',
   //      startPoint: '虹桥火车站',
   //      endPoint: '静安寺',
   //      price: 35,
   //      carType: '奥迪 A4L',
   //      orderCount: 5,
   //      userAvatar: '../../static/user.jpeg',
   //      status: 'to-review'
   //    },
	  // {
	  //   id: 6,
	  //   infoType: '乘客',
	  //   date: '2024年3月15日10:00',
	  //   startPoint: '北京西站',
	  //   endPoint: '首都国际机场',
	  //   price: 80,
	  //   carType: '奥迪 A6L',
	  //   orderCount: 3,
	  //   userAvatar: '../../static/user.jpeg',
	  //   status: 'rejected',
	  //   rejectReason: '出发时间不符合要求' // 新增拒绝原因
	  // }
    ],
	userId: null,
   };
  },
   mounted() {
       this.initializeUser();
     },
     methods: {
		 // 确认删除弹窗
		   confirmDelete(order) {
		     uni.showModal({
		       title: '确认删除',
		       content: `确定要删除【${order.startPoint}→${order.endPoint}】的订单吗？`,
		       success: (res) => {
		         if (res.confirm) {
		           this.deleteOrder(order.id)
		         }
		       }
		     })
		   },
		 
		   // 调用删除接口
		   async deleteOrder(orderId) {
		     try {
		        const res = await del(`/orders/${orderId}`)
		       if (res.code === 200) {
		         uni.showToast({ title: '删除成功', icon: 'success' })
		         // 刷新订单列表
		         this.fetchOrders()
		       }
		     } catch (error) {
		       console.error('删除失败:', error)
		       uni.showToast({ 
		         title: error.response?.data?.message || '删除失败',
		         icon: 'none'
		       })
		     }
		   }, 


       async initializeUser() {
         try {
           // 直接从本地存储获取用户ID
           const cacheUserID = uni.getStorageSync('user_id');
		   console.log(cacheUserID);
           
           if (cacheUserID) {
             this.userId = cacheUserID;
             this.fetchOrders();
           } else {
             uni.showToast({ title: '请先登录', icon: 'none' });
             setTimeout(() => {
               uni.navigateTo({ url: '/pages/login/login' });
             }, 1500);
           }
         } catch (error) {
           console.error('获取用户信息失败:', error);
           uni.showToast({ title: '获取用户信息失败', icon: 'none' });
         }
       },
   
       async fetchOrders() {
         if (!this.userId) return;
         
         try {
           const params = {
             type: this.orderTypes[this.orderTypeIndex].value,
             status: this.statusOptions[this.statusIndex].value,
             year: this.years[this.yearIndex],
             month: this.months[this.monthIndex],
             day: this.days[this.dayIndex],
             sort: this.sortOptions[this.sortIndex].value,
             page: 1,
             page_size: 100,
           };
   
           // 直接调用接口
           const res = await get(`/user/${this.userId}/orders`, params);
           
           if (res.code === 200) {
             this.orders = res.data.orders.map(order => ({
               id: order.order_id,
               infoType: order.type === 'passenger' ? '乘客' : '车主',
               date: this.formatDate(order.start_time),
               startPoint: order.start_loc,
               endPoint: order.dest_loc,
               price: Number(order.price).toFixed(2),
               carType: order.car_type || '未指定车型',
               orderCount: order.participants?.length || 0,
               userAvatar: order.participants?.[0]?.user_avatar || '../../static/user.jpeg',
               status: order.status,
               rejectReason: order.reject_reason || ''
             }));
           }
         } catch (error) {
           uni.showToast({ title: '获取订单失败', icon: 'none' });
           console.error('获取订单失败:', error);
         }
       },
	    formatDate(dateStr) {
	      const date = new Date(dateStr);
	      const year = date.getFullYear();
	      const month = date.getMonth() + 1;
	      const day = date.getDate();
	      const hours = date.getHours().toString().padStart(2, '0');
	      const minutes = date.getMinutes().toString().padStart(2, '0');
	      return `${year}年${month}月${day}日${hours}:${minutes}`;
	    },
	    // 筛选条件变化时重新获取数据
	    onOrderTypeChange(e) {
	      this.orderTypeIndex = e.detail.value;
	      this.fetchOrders();
	    },
	    onStatusChange(e) {
	      this.statusIndex = e.detail.value;
	      this.fetchOrders();
	    },
	    onYearChange(e) {
	      this.yearIndex = e.detail.value;
	      this.monthIndex = 0;
	      this.dayIndex = 0;
	      this.fetchOrders();
	    },
	    onMonthChange(e) {
	      this.monthIndex = e.detail.value;
	      this.dayIndex = 0;
	      this.fetchOrders();
	    },
	    onDayChange(e) {
	      this.dayIndex = e.detail.value;
	      this.fetchOrders();
	    },
	    onSortChange(e) {
	      this.sortIndex = e.detail.value;
	      this.fetchOrders();
	    },
		applyToJoin(orderId) {
		  // 发送加入请求
		  uni.navigateTo({
		    url: `/pages/index/trip_info?id=${orderId}`
		  });
		},
		// 新增方法：获取状态对应的文本
		getStatusText(status) {
		  const map = {
		    'pending': '待审核',
		    'completed': '已完成',
		    'to-review': '待评价',
		    'not-started': '未开始',
		    'in-progress': '进行中',
			'to-pay': '待支付',
			'rejected': '被拒绝'
		  };
		  return map[status] || '未知状态';
		},
	},
  components: {
    // 注册 NavigationBar 组件
    NavigationBar
  }
};
</script>

<style scoped>
.header-buttons {
  display: flex;
  gap: 8px;
}

.delete-button {
  padding: 3px 10px;
  font-size: 10px;
  background-color: #ff3b30;
  color: white;
  border: none;
  border-radius: 5px;
}

	
.dual-filter-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 10px;
}

.dual-filter-row .filter-group {
  flex: 1;
  margin: 0 5px;
}
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0px;
  overflow: hidden;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  padding: 10px;
  margin-top:10px;
  border-radius:10px;
  background-color: #aecbff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 9999;
}

.filter-group {
  margin-bottom: 10px;
}

.time-filters {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.time-picker {
  flex: 1;
  margin: 0 5px;
}

.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: white;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 14px;
  color: #003366;
}

.arrow-icon {
  width: 12px;
  height: 12px;
  margin-left: 5px;
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
  position: relative;
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

.car-info {
  display: flex;
  flex-direction: column;
  margin-left: -125px;
}

.car-type {
  font-weight: bold;
  font-size: 12px;
}
.order-count {
  font-size: 10px;
  color: #999;
}

.price-info {
  align-self: flex-end;
}

.detail-button {
  padding: 3px 10px;
  font-weight: bold;
  font-size: 10px;
  margin-right: 5px;
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 5px;
}

/* 新增状态标签样式 */
.status-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 5px;
}

.status-tag {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: white;
  cursor: pointer;
}

.status-pending {
  background-color: #FF9500; /* 橙色 - 待审核 */
}

.status-to-pay {
  background-color: #FFCC00; /* 亮黄色 - 待支付 */
}

.status-completed {
  background-color: #4CD964; /* 绿色 - 已完成 */
}

.status-to-review {
  background-color: #5AC8FA; /* 蓝色 - 待评价 */
}

.status-not-started {
  background-color: #8E8E93; /* 灰色 - 未开始 */
}

.status-in-progress {
  background-color: #5856D6; /* 紫色 - 进行中 */
}

.status-rejected {
  background-color: #FF3B30; /* 红色 - 已拒绝 */
}
/* 新增拒绝原因样式 (与manage.vue一致) */
.audit-reason {
  margin-top: 8px;
  padding: 5px;
  background-color: #FFF2F0;
  border-radius: 4px;
  font-size: 12px;
  color: #FF3B30;
}



</style>