<template>
  <view class="flex-col page">
    <!-- 聊天顶部 -->
    <view class="flex-row align-items-center section" style="position: relative; min-height: 60rpx; padding: 10rpx 0;">
      <image class="back" src="../../static/back.png" @click="goBack" style="width: 40rpx; height: 40rpx; margin-right: 20rpx;"/>
      <!-- 显示聊天的Title -->
      <text class="font text" style="color: white; font-size: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 65vw; line-height: 1.4;">
        {{ conversation_title }}
      </text>
      <!-- 显示聊天的头像 -->
      <image
        class="otherAvatar"
        :src="conversation_avatar"
        style="position: absolute; right: 20rpx; width: 50rpx; height: 50rpx; border-radius: 50%;"
      />
    </view>
    
    <!-- 滚动视图 -->
    <scroll-view 
	  	class="message-container"
	  	scroll-y 
	  	:scroll-into-view="lastMsgId"
	  	:scroll-with-animation="true"
	  >
      <!-- 显示消息 -->
      <view
        v-for="(message, index) in messages"
		:id="'msg-' + message.id"
        :key="index"
        :class="['flex-row', message.sender === 'user' ? 'justify-end' : 'justify-start']"
        style="display: flex; width: 100%; align-items: center;"
      >
        <!-- 对方消息：头像在左，气泡在右 -->
        <template v-if="message.sender === 'other'">
		  <!-- 头像 -->
          <view class="avatar-container">
            <image class="otherAvatar" :src="otherAvatar" />
          </view>
          <view class="message-bubble message-bubble-other">
			<!-- 文本消息 -->
			<text v-if="message.type === 'text'" class="font text">{{ message.content }}</text>
			
			<!-- 图片消息 -->
            <image
              v-else-if="message.type === 'image'"
              :src="message.content"
              style="width: 200rpx; height: 200rpx; margin-top: 10rpx;"
              mode="aspectFill"
              @click="previewImage(message.image)"
            ></image>
			
			<!-- 文件消息 -->
			<view v-else-if="message.type === 'file'" class="file-message">
			  <text class="font text">文件: {{ message.fileName }}</text>
			  <button @click="downloadFile(message)">下载文件</button>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出接受邀请弹窗 -->
			<view v-else-if="message.type === 'invitation'" @click="showOrderMessagePopup(message)">
				<text class="font text">拼车邀请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				  <text style="font-size: 12px;color:#666;display:block;margin-top:5rpx;">
				    {{ message.role === 'driver' ? '对方发起的司机订单' : '对方发起的乘客订单' }}
				  </text>
				</view>
			</view>
			
			<!-- 拼车申请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type === 'apply_join'" @click="showOrderMessagePopup(message)">
				<text class="font text">拼车申请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type === 'apply_order'" @click="showOrderMessagePopup(message)">
				<text class="font text">接单申请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type.endsWith('_accept') || message.type.endsWith('_reject')">
				<text v-if="message.type === 'apply_join_accept'" class="font text">乘客加入申请已同意</text>
				<text v-else-if="message.type === 'apply_join_reject'" class="font text">乘客加入申请已拒绝</text>
				<text v-else-if="message.type === 'apply_order_accept'" class="font text">司机接单申请已同意</text>
				<text v-else-if="message.type === 'apply_order_reject'" class="font text">司机接单申请已拒绝</text>
				<text v-else-if="message.type === 'invitation_accept'" class="font text">拼单邀请已同意</text>
				<text v-else-if="message.type === 'invitation_reject'" class="font text">拼单邀请已拒绝</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
          </view>
        </template>

        <!-- 用户消息：气泡在左，头像在右 -->
        <template v-else>
          <view class="message-bubble message-bubble-user">
            <!-- 文本消息 -->
            <text v-if="message.type === 'text'" class="font text">{{ message.content }}</text>
			
			<!-- 图片消息 -->
			<image
			  v-else-if="message.type === 'image'"
			  :src="message.content"
			  style="width: 200rpx; height: 200rpx; margin-top: 10rpx;"
			  mode="aspectFill"
			  @click="previewImage(message.content)"
			></image>
			
			<!-- 文件消息 -->
			<view v-else-if="message.type === 'file'" class="file-message">
			  <text class="font text">文件: {{ message.fileName }}</text>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出接受邀请弹窗 -->
			<view v-else-if="message.type === 'invitation'" @click="showOrderMessagePopup(message)">
				<text class="font text">拼车邀请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				  <text style="font-size: 12px;color:#666;display:block;margin-top:5rpx;">
				    {{ message.role === 'driver' ? '对方发起的司机订单' : '对方发起的乘客订单' }}
				  </text>
				</view>
			</view>
			
			<!-- 拼车申请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type === 'apply_join'" @click="showOrderMessagePopup(message)">
				<text class="font text">拼车申请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type === 'apply_order'" @click="showOrderMessagePopup(message)">
				<text class="font text">接单申请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
			<!-- 拼车邀请 -->
			<!-- 点击弹出申请同意弹窗 -->
			<view v-else-if="message.type.endsWith('_accept') || message.type.endsWith('_reject')">
				<text v-if="message.type === 'apply_join_accept'" class="font text">对方已同意乘客加入申请</text>
				<text v-else-if="message.type === 'apply_join_reject'" class="font text">对方已拒绝乘客加入申请</text>
				<text v-else-if="message.type === 'apply_order_accept'" class="font text">对方已同意司机接单申请</text>
				<text v-else-if="message.type === 'apply_order_reject'" class="font text">对方已拒绝司机接单申请</text>
				<text v-else-if="message.type === 'invitation_accept'" class="font text">对方已同意拼单邀请</text>
				<text v-else-if="message.type === 'invitation_reject'" class="font text">对方已拒绝拼单邀请</text>
				<view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
				  <text style="font-size: 12px; color:black">{{ message.orderInfo.startLoc }} → {{ message.orderInfo.destLoc }}</text><br>
				  <text style="font-size: 12px;color:black">时间: {{ message.orderInfo.time }}</text>
				</view>
			</view>
			
          </view>
          <view class="avatar-container">
            <image class="userAvatar" :src="userAvatar" />
          </view>
        </template>
      </view>

    </scroll-view>
	
	<!-- 底部输入框（固定位置） -->
	<view class="flex-row items-center section_4">
	  <image
	    class="photo"
	    src="../../static/photo.png"
	    @click="chooseImage"
	  />
	  <input
	    class="ml-20 flex-1 input_mes"
	    v-model="inputMessage"
	    placeholder="输入消息..."
	    focus
	    @focus="focusInput"
	    @blur="blurInput"
	  />
	  <image
	    class="send"
	    src="../../static/send.png"
	    @click="sendMessage"
	  />
	  <image
	    class="order"
	    src="../../static/icon-order.png"
	    @click="showOrderPopup"
	  />
	</view>
    
    <!-- 订单选择弹窗 -->
    <view v-if="showOrderPopupFlag" class="custom-popup-mask" @click="closeOrderPopup">
      <view class="custom-popup-content" @click.stop>
        <view class="popup-header">
          <text style="font-size: 16px; font-weight: bold;">选择拼车订单</text>
          <image 
            src="../../static/close.png" 
            @click="closeOrderPopup" 
            style="width: 40rpx; height: 40rpx;"
          />
        </view>
        
        <!-- 订单类型切换 -->
        <view class="order-type-tabs">
          <view 
            class="order-type-tab" 
            :class="{active: orderType === '车找人'}"
            @click="switchOrderType('车找人')"
          >
            我发起的车找人订单
          </view>
          <view 
            class="order-type-tab" 
            :class="{active: orderType === '人找车'}"
            @click="switchOrderType('人找车')"
          >
            我发起的人找车订单
          </view>
        </view>
        
        <scroll-view scroll-y="true" style="height: 60vh; margin-top: 20rpx;">
          <view 
            v-for="(order, index) in filteredOrders" 
            :key="index" 
            class="order-item" 
            :class="{'selected-order': selectedOrderId === order.id}"
            @click="selectOrder(order)"
          >
            <text class="order-text">{{ order.startLoc }} → {{ order.destLoc }}</text>
			<text class="order-time">发车时间: {{ order.time }}</text>
			<text class="order-status">状态: {{ order.status }}</text>
			<!-- <text class="order-role">{{ order.role === '车找人' ? '(我的司机订单)' : '(对方乘客订单)' }}</text>           -->
          </view>
          
          <view v-if="filteredOrders.length === 0" class="empty-tip">
            <text>{{ orderType === '车找人' ? '您没有发起的车找人订单' : '您没有发起的人找车订单' }}</text>
          </view>
        </scroll-view>
        
        <button 
          v-if="selectedOrderId" 
          class="send-btn"
          @click="sendInvite"
        >
          发送邀请
        </button>
      </view>
    </view>
    
    <!-- 拼车邀请详情弹窗 -->
    <OrderInvite 
      v-if="showOrder"
	  :userId="currentOrderMessage.senderInfo.userId"
	  :conversationId="this.conversationId"
	  :orderId="currentOrderMessage.orderInfo.orderId"
	  :messageId="currentOrderMessage.id"
	  :isUserInOrder="currentOrderMessage.sender"
      :isVisible="showOrder"
	  :messageType="currentOrderMessage.type"
      :username="currentOrderMessage.senderInfo.username"
      :time="currentOrderMessage.orderInfo.time"
      :start_loc="currentOrderMessage.orderInfo.startLoc"
      :dest_loc="currentOrderMessage.orderInfo.destLoc"
      :avatar_url="currentOrderMessage.sender.avatar"
      @close="closeOrderMessagePopup"
    />
    
    <!-- 全屏显示图片 -->
    <view v-if="isPreviewing" class="preview-container" @click="closePreview">
      <image
        class="preview-image"
        :src="previewImageSrc"
        mode="widthFix"
      />
    </view>
	
	<!-- 展示车辆列表的弹窗 -->
    <view v-if="showVehiclePopup" class="custom-popup-mask" @click="showVehiclePopup = false">
      <view class="custom-popup-content" @click.stop>
        <view class="popup-header">
          <text style="font-size: 16px; font-weight: bold;">选择车辆</text>
          <image 
            src="../../static/close.png" 
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
import OrderInvite from '../../components/OrderInvite.vue';
import { SocketService } from '../../utils/socket_io';
import { fetchConversationMessages, sendMessage, sendInvitation } from '../../api/chat';
import { 
	acceptDriverOrder,
	rejectDriverOrder,
	acceptPassengerApplication,
	rejectPassengerApplication,
	fetchActiveOrderList
} from '../../api/order';

export default {
  components: {
    OrderInvite
  },
  data() {
    return {
	  conversationId: null,  // 会话ID
      userAvatar: '../../static/user_2.jpg',
      otherAvatar: '../../static/user.jpeg',
      username: '测试者',         // 当前用户
	  conversation_title: '',    // 会话标题
	  conversation_avatar: '',   // 会话头像
      inputMessage: '',    // 消息输入框信息
      messages: [],        // 消息列表
      driverOrders: [],    // 车找人的订单
      passengerOrders: [], // 人找车的订单
      invites: [],         // 拼车邀请信息
      showOrder: false,
      currentOrderMessage: {}, // 当前的订单消息
      selectedOrderId: null,
      orderType: '车找人',
      showOrderPopupFlag: false,
      isPreviewing: false,
      previewImageSrc: '',
      showVehiclePopup: false, // 控制车辆选择弹窗的显示
      selectedVehicle: null,   // 用户选择的车辆
      vehicles: [],            // 用户的车辆列表
	  hasJoined: false,
    };
  },
  computed: {
    filteredOrders() {
      return this.orderType === '车找人' ? this.driverOrders : this.passengerOrders;
    }
  },
  onLoad() {
	const conversation = uni.getStorageSync('tempChatData');
	uni.removeStorageSync('tempChatData'); // 使用后清除
	this.conversationId = conversation.id;
	this.conversation_title = conversation.username;
	this.conversation_avatar = conversation.avatar;
	this.init();
	
	// 先移除可能存在的旧监听器
	SocketService.off('new_message', this.handleNewMessage);
	SocketService.off('message_error');
	// 消息监听
	SocketService.on('new_message', this.handleNewMessage);
	SocketService.on('message_error', (error) => {
	  uni.showToast({ title: error.error, icon: 'none' });
	});
	
	// 加入Socket房间
	if (!this.hasJoined) {
	  SocketService.emit('join_conversation', { conversationId: this.conversationId });
	  this.hasJoined = true;
	}
	
	this.username = uni.getStorageSync('user_info').username;
  },
  onUnload() {
	// 离开房间并移除监听器
	SocketService.emit('leave_conversation', { conversationId: this.conversationId });
  	// 取消监听
  	SocketService.off('new_message');
  	SocketService.off('message_error');
	this.hasJoined = false;
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
	
	async init() {
		await this.fetchMessages();
		await this.fetchActiveOrders();
	},
		
	// 消息相关函数
	async fetchMessages() {
		try {
			const currentUserId = uni.getStorageSync('user_info').userId;
			const currentUsername = uni.getStorageSync('user_info').username;
			
			const res = await fetchConversationMessages(this.conversationId);
			
			// 转换消息格式
			this.messages = res.data.map(msg => {
			    const isCurrentUser = msg.sender.user_id === currentUserId;
			    
			    // 基础消息结构
			    const message = {
			        id: msg.message_id,
			        sender: isCurrentUser ? 'user' : 'other',
			        content: msg.content,
			        type: msg.type,
			        createdAt: new Date(msg.created_at),
			        senderInfo: {
			            username: isCurrentUser ? currentUsername : msg.sender.username,
			            avatar: msg.sender.avatar,
			            realname: msg.sender.realname,
			            userId: msg.sender.user_id
			        }
			    };
			    
			    // 如果是拼车相关消息，添加订单信息
			    if (msg.type === 'invitation' || msg.type === 'apply_join' || msg.type === 'apply_order' || 
					msg.type === 'apply_join_accept' || msg.type === 'apply_join_reject' || 
					msg.type === 'apply_order_accept' || msg.type === 'apply_order_reject' ||
					msg.type === 'invitation_accept' || msg.type === 'invitation_reject'
				) {
			        message.orderInfo = {
			            orderId: msg.order_info?.order_id,
			            startLoc: msg.order_info?.start_loc || msg.start_loc,
			            destLoc: msg.order_info?.dest_loc || msg.dest_loc,
			            time: msg.order_info?.start_time || msg.time,
			            price: msg.order_info?.price,
			            status: msg.order_info?.status,
			            orderType: msg.order_info?.order_type,
			            carType: msg.order_info?.car_type,
			            spareSeatNum: msg.order_info?.spare_seat_num,
			            travelPartnerNum: msg.order_info?.travel_partner_num
			        };
			        
			        // 兼容旧字段（逐步迁移时可以保留）
			        if (!message.orderInfo.startLoc) message.orderInfo.startLoc = msg.start_loc;
			        if (!message.orderInfo.destLoc) message.orderInfo.destLoc = msg.dest_loc;
			        if (!message.orderInfo.time) message.orderInfo.time = msg.time;
			    }
			    
			    return message;
			});	
			
		} catch (err) {
			uni.showToast({
			  title: '加载消息失败',
			  icon: 'none'
			});
		}
	},
    sendMessage() {
		const msg = this.inputMessage.trim();
		if (!msg) return;
		
		this.inputMessage = '';
		console.log("发送消息")
		this.scrollToBottom();
		
		sendMessage(this.conversationId, msg);
    },
	handleNewMessage(msg) {
		// 如果消息已存在则直接返回
		if (this.messages.some(m => m.id === msg.id)) {
			return;
		}
			
		console.log("新消息", msg);
		const currentUserId = uni.getStorageSync('user_info').userId;
		const currentUsername = uni.getStorageSync('user_info').username;
		
		if (!msg.sender?.id || !currentUserId) {
			return;
		}
	  
		const isCurrentUser = String(msg.sender.id) === String(currentUserId);
	  
		const newMsg = {
			id: msg.id,
			sender: isCurrentUser ? 'user' : 'other',
			content: msg.content,
			type: msg.type || 'text', // 默认文本类型
			createdAt: new Date(msg.createdAt),
			senderInfo: {
				username: isCurrentUser ? currentUsername : msg.sender.username,
				avatar: msg.sender.avatar,
				realname: msg.sender.realname,
				userId: msg.sender.id || msg.sender.user_id
			}
		};
	  
		// 处理拼车相关消息（与fetchMessages保持相同逻辑）
		if (msg.type === 'invitation' || msg.type === 'apply_join' || msg.type === 'apply_order' || 
			msg.type === 'apply_join_accept' || msg.type === 'apply_join_reject' || 
			msg.type === 'apply_order_accept' || msg.type === 'apply_order_reject') {
			
			newMsg.orderInfo = {
				orderId: msg.orderInfo?.order_id || msg.orderId,
				startLoc: msg.orderInfo?.start_loc || msg.start_loc || msg.orderInfo?.startLoc,
				destLoc: msg.orderInfo?.dest_loc || msg.dest_loc || msg.orderInfo?.destLoc,
				time: msg.orderInfo?.start_time || msg.time || msg.orderInfo?.time,
				price: msg.orderInfo?.price || msg.orderInfo?.price,
				status: msg.orderInfo?.status || msg.orderInfo?.status,
				orderType: msg.orderInfo?.order_type || msg.orderInfo?.orderType,
				carType: msg.orderInfo?.car_type || msg.orderInfo?.carType,
				spareSeatNum: msg.orderInfo?.spare_seat_num || msg.orderInfo?.spareSeatNum,
				travelPartnerNum: msg.orderInfo?.travel_partner_num || msg.orderInfo?.travelPartnerNum
			};
		}
		console.log(msg.conversationId, this.conversationId)
		if (msg.conversationId === this.conversationId) {
			console.log("添加新消息成功", newMsg)
			this.messages = [...this.messages, newMsg];
		};
	  
	  // 下一个tick滚动到底部
	  this.$nextTick(() => {
	    this.scrollToBottom();
	  });
	},
	
    // 订单相关方法
	async fetchActiveOrders(){
		const res = await fetchActiveOrderList();
		this.driverOrders = res.data.driver_orders;
		this.passengerOrders = res.data.passenger_orders;
		console.log("获取活跃订单")
		console.log(this.driverOrders);
		console.log(this.passengerOrders);
	},
    showOrderPopup() {
      this.selectedOrderId = null;
      this.showOrderPopupFlag = true;
    },
    closeOrderPopup() {
      this.showOrderPopupFlag = false;
    },
    switchOrderType(type) {
      this.orderType = type;
      this.selectedOrderId = null;
    },
    selectOrder(order) {
      this.selectedOrderId = order.id;
    },
	sendInvite() {
	  if (!this.selectedOrderId) return;
	
	  const allOrders = [...this.driverOrders, ...this.passengerOrders];
	  const order = allOrders.find(o => o.id === this.selectedOrderId);
	
	  if (order) {
		sendInvitation(this.conversationId, order.id);
	    
	    this.closeOrderPopup();
	    this.scrollToBottom();
	
	    uni.showToast({
	      title: '邀请已发送',
	      icon: 'success'
	    });
	  }
	},
	
	// 预览图片
	previewImage(src) {
      this.previewImageSrc = src;
      this.isPreviewing = true;
    },
    closePreview() {
      this.isPreviewing = false;
    },  
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          this.messages.push({
            sender: 'user',
            image: res.tempFilePaths[0]
          });
          this.scrollToBottom();
        }
      });
    },
    
	confirmVehicleSelection() {
      if (!this.selectedVehicle) {
        uni.showToast({ title: '请选择车辆', icon: 'none' });
        return;
      }
    
      const allOrders = [...this.driverOrders, ...this.passengerOrders];
      const order = allOrders.find(o => o.id === this.selectedOrderId);
    
      if (order) {
        this.invites.push({
          ...order,
          type: 'invite',
          vehicle: this.selectedVehicle.plate_number, // 添加车辆信息
          inviter: this.username,
          inviter_avatar: this.userAvatar
        });
    
        this.showVehiclePopup = false; // 关闭车辆选择弹窗
        this.closeOrderPopup();
        this.scrollToBottom();
    
        uni.showToast({
          title: '邀请已发送',
          icon: 'success'
        });
      }
    },
	
	// 展示订单申请已经订单邀请弹窗
    showOrderMessagePopup(orderMessage) {
      this.currentOrderMessage = {
        ...orderMessage,
      };
      this.showOrder = true;
    },
    closeOrderMessagePopup() {
      this.showOrder = false;
    },
    
    focusInput() {
      // 输入框获取焦点时的处理
      setTimeout(() => {
        this.scrollToBottom();
      }, 300);
    },
    blurInput() {
      // 输入框失去焦点时的处理
    },
	
	// TODO: 现在只是输出调试信息
	scrollToBottom() {
		console.log("滚动到底部")
	},
  }
};
</script>

<style scoped lang="css">
.flex-row {
  display: flex;
  align-items: center;
  width: 100%;
}
.back {
  width: 31.25rpx;
  height: 42.71rpx;
}
.userAvatar {
  margin-left: 0;
  border-radius: 201.49rpx;
  width: 30px;
  height: 30px;
  border: 3px solid #084fa1;
}
.otherAvatar {
  margin-left: 0;
  border-radius: 201.49rpx;
  width: 30px;
  height: 30px;
  border: 3px solid #084fa1;
}
.ml-39-5 {
  margin-left: 41.15rpx;
}
.page {
  background-color: #edf5f7;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  position: fixed;
  padding-bottom: 80rpx;
}
.section {
  padding: 18.75rpx 25.52rpx;
  background-color: #2a82e4;
}
.font {
  font-size: 31.25rpx;
  font-family: SourceHanSansCN;
  font-weight: 700;
}
.text {
  line-height: 23.59rpx;
}
.group {
  margin-top: 79.17rpx;
  padding: 0 22.92rpx;
}
.flex-row.justify-end {
  justify-content: flex-end;
}
.flex-row.justify-start {
  justify-content: flex-start;
}
.message-bubble {
  max-width: 70%;
  padding: 15rpx;
  border-radius: 17.19rpx;
  margin-top: 7px;
  margin-bottom: 7px;
  box-shadow: 0rpx 2.08rpx 6.25rpx #00000008;
  word-wrap: break-word;
  white-space: normal;
}
.message-bubble-user {
  background-color: #2a82e4;
  color: #ffffff;
  margin-right: 10px;
}
.message-bubble-other {
  background-color: #ffffff;
  color: #000000;
  border: solid 1rpx #a6a6a6;
  margin-left: 10px;
}
.avatar-container {
  display: flex;
  align-items: center;
  width: 36px;
}
.section_4 {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10rpx;
  background-color: #ffffff;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
}
.photo {
  border-radius: 375rpx;
  width: 70.83rpx;
  height: 72.92rpx;
  margin-right: 5px;
  margin-left:5px;
}
.input_mes {
  background-color: #ffffff;
  border-radius: 46.88rpx;
  height: 73.44rpx;
  width: 225px;
  border: solid 1rpx #bfbfbf;
  padding: 0 20rpx;
  font-size: 14px;
}
.send {
  width: 54.17rpx;
  height: 51.04rpx;
  margin-left: 5px;
}
.order {
  width: 54.17rpx;
  height: 51.04rpx;
  margin-left: 5px;
}

/* 订单选择弹窗样式 */
.custom-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 999;
}

.custom-popup-content {
  background-color: white;
  width: 100%;
  border-radius: 20rpx 20rpx 0 0;
  padding: 30rpx;
  box-sizing: border-box;
  max-height: 80vh;
  animation: popup-show 0.3s ease;
}

@keyframes popup-show {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
}

.order-item {
  padding: 25rpx;
  border-bottom: 1rpx solid #f0f0f0;
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

.order-time, .order-status, .order-role {
  font-size: 12px;
  color: #666;
  margin-top: 5px;
  display: block;
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
  font-weight:bold;
  box-shadow: 0 2px 5px rgba(42,130,228,0.3);
  z-index:99;
}

/* 订单类型标签样式 */
.order-type-tabs {
  display: flex;
  margin: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.order-type-tab {
  flex: 1;
  text-align: center;
  padding: 15rpx;
  font-size: 14px;
  color: #666;
}

.order-type-tab.active {
  color: #2a82e4;
  border-bottom: 3rpx solid #2a82e4;
  font-weight: bold;
}

/* 图片预览样式 */
.preview-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.preview-image {
  max-width: 100%;
  max-height: 100%;
}

.group {
  margin-top: 79.17rpx;
  padding: 0 22.92rpx;
  /* 新增以下样式 */
  height: calc(100vh - 180rpx);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.message-container {
  height: calc(100vh - 200rpx - env(safe-area-inset-bottom));
  padding-bottom: 120rpx;
  overflow-anchor: none; /* 防止iOS跳动 */
  -webkit-overflow-scrolling: touch;
}

/* 订单 */
.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.order-type-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 12px;
}

.order-type-tag.car_find_person {
  background-color: #e6f7ff;
  color: #1890ff;
}

.order-type-tag.person_find_car {
  background-color: #f6ffed;
  color: #52c41a;
}

.order-route {
  font-size: 16px;
  font-weight: 500;
  display: block;
  margin: 8rpx 0;
}

.order-details {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 12px;
}
</style>