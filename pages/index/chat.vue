<template>
  <view class="flex-col page">
    <view class="flex-row align-items-center section" style="position: relative;height:30px">
      <image class="back" src="../../static/back.png" @click="goBack" />
      <text class="font text ml-39-5" style="color:white;font-size:20px;">{{ other_username }}</text>
      <image
        class="otherAvatar"
        :src="otherAvatar"
        style="position: absolute; right: 70rpx;"
      />
    </view>
	
    <scroll-view 
		class="flex-col group message-container"
		scroll-y 
		:scroll-into-view="lastMsgId"
		:scroll-with-animation="true"
		style="margin-bottom: 100rpx;">
      <view
        v-for="(message, index) in messages"
		:id="'msg-' + message.id"
        :key="index"
        :class="['flex-row', message.sender === 'user' ? 'justify-end' : 'justify-start']"
        style="display: flex; width: 100%; align-items: center;"
      >
        <!-- 对方消息：头像在左，气泡在右 -->
        <template v-if="message.sender === 'other'">
          <view class="avatar-container">
            <image class="otherAvatar" :src="otherAvatar" />
          </view>
          <view class="message-bubble message-bubble-other">
            <text class="font text">{{ message.content }}</text>
            <image
              v-if="message.image"
              :src="message.image"
              style="width: 200rpx; height: 200rpx; margin-top: 10rpx;"
              mode="aspectFill"
              @click="previewImage(message.image)"
            ></image>
          </view>
        </template>

        <!-- 用户消息：气泡在左，头像在右 -->
        <template v-else>
          <view class="message-bubble message-bubble-user">
            <text class="font text">{{ message.content }}</text>
            <image
              v-if="message.image"
              :src="message.image"
              style="width: 200rpx; height: 200rpx; margin-top: 10rpx;"
              mode="aspectFill"
              @click="previewImage(message.image)"
            ></image>
          </view>
          <view class="avatar-container">
            <image class="userAvatar" :src="userAvatar" />
          </view>
        </template>
      </view>
      
      <!-- 拼车邀请消息 -->
      <view v-for="(invite, index) in invites" :key="'invite-'+index" class="flex-row justify-end" style="display: flex; width: 100%; align-items: center;">
        <view class="message-bubble message-bubble-user" @click="showInvitePopup(invite)">
          <text class="font text">拼车邀请</text>
          <view style="margin-top: 10rpx; padding: 10rpx; background-color: #f0f8ff; border-radius: 10rpx;">
            <text style="font-size: 12px; color:black">{{ invite.start_loc }} → {{ invite.dest_loc }}</text><br>
            <text style="font-size: 12px;color:black">时间: {{ invite.time }}</text>
            <text style="font-size: 12px;color:#666;display:block;margin-top:5rpx;">
              {{ invite.role === 'driver' ? '我发起的司机订单' : '对方发起的乘客订单' }}
            </text>
          </view>
        </view>
        <view class="avatar-container">
          <image class="userAvatar" :src="userAvatar" />
        </view>
      </view>
    </scroll-view>
    
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
            :class="{active: orderType === 'driver'}"
            @click="switchOrderType('driver')"
          >
            我的订单(司机)
          </view>
          <view 
            class="order-type-tab" 
            :class="{active: orderType === 'passenger'}"
            @click="switchOrderType('passenger')"
          >
            对方订单(乘客)
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
            <text class="order-text">{{ order.start_loc }} → {{ order.dest_loc }}</text>
            <text class="order-time">发车时间: {{ order.time }}</text>
            <text class="order-status">状态: {{ order.status }}</text>
            <text class="order-role">{{ order.role === 'driver' ? '(我的司机订单)' : '(对方乘客订单)' }}</text>
          </view>
          
          <view v-if="filteredOrders.length === 0" class="empty-tip">
            <text>暂无可用订单</text>
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
      v-if="showInvite"
      :isVisible="showInvite"
      :username="currentInvite.role === 'driver' ? username : other_username"
      :time="currentInvite.time"
      :start_loc="currentInvite.start_loc"
      :dest_loc="currentInvite.dest_loc"
      :username_2="currentInvite.role === 'driver' ? other_username : username"
      :avatar_url="currentInvite.role === 'driver' ? userAvatar : otherAvatar"
      @close="closeInvitePopup"
    />
    
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
    
    <!-- 全屏显示图片 -->
    <view v-if="isPreviewing" class="preview-container" @click="closePreview">
      <image
        class="preview-image"
        :src="previewImageSrc"
        mode="widthFix"
      />
    </view>
  </view>
</template>

<script>
import OrderInvite from '../../components/OrderInvite.vue';
import { fetchConversationMessages, sendMessage } from '../../api/chat';
import { SocketService } from '../../utils/socket_io';

export default {
  components: {
    OrderInvite
  },
  data() {
    return {
	  conversationId: null, // 会话ID
      userAvatar: '../../static/user_2.jpg',
      otherAvatar: '../../static/user.jpeg',
      username: '测试者',          // 当前用户
      other_username: 'JYD777',    // 对方用户
      inputMessage: '',
      messages: [
        { sender: 'user', content: '你好，JYD777！' },
        { sender: 'other', content: '你好！' },
        { sender: 'user', content: '你想拼车吗？' },
        { sender: 'other', content: '当然！' }
      ],
      driverOrders: [],
      passengerOrders: [],
      invites: [],
      showInvite: false,
      currentInvite: {},
      selectedOrderId: null,
      orderType: 'driver',
      showOrderPopupFlag: false,
      isPreviewing: false,
      previewImageSrc: ''
    };
  },
  computed: {
    filteredOrders() {
      return this.orderType === 'driver' ? this.driverOrders : this.passengerOrders;
    }
  },
  onLoad(options) {
	console.log('接收到的参数:', options);
	this.conversationId = options.conversationId;
	this.initChatPage();
	
	// 先移除可能存在的旧监听器
	SocketService.off('new_message', this.handleNewMessage);
	SocketService.off('message_error');
	
	// 加入Socket房间
	SocketService.emit('join_conversation', {
	  conversationId: this.conversationId
	});
	// 消息监听
	SocketService.on('new_message', this.handleNewMessage);
	SocketService.on('message_error', (error) => {
	  uni.showToast({ title: error.error, icon: 'none' });
	});
  },
  onUnload() {
  	// 取消监听
  	SocketService.off('new_message');
  	SocketService.off('message_error');
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
	
	async initChatPage() {
		console.log("初始化聊天界面");
		try {
			await this.fetchMessages();
		} catch (err) {
			console.error("初始化失败", err);
		}
	},
	
	async fetchMessages() {
		// 获取会话消息
		try {
			const currentUserId = uni.getStorageSync('user_info').userId;
			const currentUsername = uni.getStorageSync('user_info').username;
			
			const res = await fetchConversationMessages(this.conversationId);
			
			// 转换消息格式
			this.messages = res.data.map(msg => {
				// 判断消息发送者是否是当前用户
				const isCurrentUser = msg.sender.user_id === currentUserId;
				
				return {
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
				}
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
	  // 检查是否已经处理过该消息
	  if (this.messages.some(m => m.id === msg.id)) {
	    return;
	  }
	  
	  // 回调函数：处理新消息
	  console.log("接受到new_message信号");
	  if (msg.conversationId === this.conversationId) {
	    const isCurrentUser = msg.sender.userId === uni.getStorageSync('user_info').user_id;
	    
	    this.messages.push({
	      id: msg.id,
	      sender: isCurrentUser ? 'user' : 'other',
	      content: msg.content,
	      createdAt: new Date(msg.createdAt),
	      senderInfo: msg.sender
	    });
	  }
	},
	
    getRandomReply() {
      const replies = [
        '收到你的消息了',
        '好的，我知道了',
        '这个问题我需要想想',
        '谢谢你的分享',
        '我们稍后再聊这个话题'
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    },
    
    scrollToBottom() {
		// TODO:没用
		console.log("滚动到底部")
		if (this.messages.length > 0) {
		  this.lastMsgId = 'msg-' + this.messages[this.messages.length - 1].id;
		}
    },
    
    // 订单相关方法
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
    
    previewImage(src) {
      this.previewImageSrc = src;
      this.isPreviewing = true;
    },
    
    closePreview() {
      this.isPreviewing = false;
    },
    
    getAvailableOrders() {
      // 模拟获取作为司机的订单（当前用户发布的）
      this.driverOrders = [
        {
          id: 1,
          start_loc: '同济大学（嘉定校区）',
          dest_loc: '同济大学（四平校区）',
          time: '今天 14:30',
          status: '待出发',
          role: 'driver',
          username: this.username
        },
        {
          id: 2,
          start_loc: '嘉定新城地铁站',
          dest_loc: '虹桥机场',
          time: '明天 08:00',
          status: '待出发',
          role: 'driver',
          username: this.username
        }
      ];
      
      // 模拟获取对方作为乘客的订单（对方发布的）
      this.passengerOrders = [
        {
          id: 101,
          start_loc: '人民广场',
          dest_loc: '浦东机场',
          time: '后天 10:00',
          status: '寻找司机',
          role: 'passenger',
          username: this.other_username  // 使用对方用户名
        },
        {
          id: 102,
          start_loc: '静安寺',
          dest_loc: '虹桥火车站',
          time: '大后天 15:30',
          status: '寻找司机',
          role: 'passenger',
          username: this.other_username  // 使用对方用户名
        }
      ];
    },
    
    selectOrder(order) {
      this.selectedOrderId = order.id;
    },
    
    sendInvite() {
      if (!this.selectedOrderId) return;
      
      const allOrders = [...this.driverOrders, ...this.passengerOrders];
      const order = allOrders.find(o => o.id === this.selectedOrderId);
      
      if (order) {
        this.invites.push({
          ...order,
          type: 'invite',
          // 添加发起者信息
          inviter: order.role === 'driver' ? this.username : this.other_username,
          inviter_avatar: order.role === 'driver' ? this.userAvatar : this.otherAvatar
        });
        
        this.closeOrderPopup();
        this.scrollToBottom();
        
        uni.showToast({
          title: '邀请已发送',
          icon: 'success'
        });
      }
    },
    
    showInvitePopup(invite) {
      this.currentInvite = {
        ...invite,
        // 确保用户名正确
        username: invite.role === 'driver' ? this.username : this.other_username
      };
      this.showInvite = true;
    },
    
    closeInvitePopup() {
      this.showInvite = false;
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
    
    focusInput() {
      // 输入框获取焦点时的处理
      setTimeout(() => {
        this.scrollToBottom();
      }, 300);
    },
    
    blurInput() {
      // 输入框失去焦点时的处理
    }
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
</style>