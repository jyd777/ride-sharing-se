<template>
  <!-- 添加一个外层容器专门用于背景色 -->
  <view class="page-container">
    <view class="flex-col page">
      <NavigationBar />
      <view class="flex-row align-items-center section" style="position: relative;height:40px">
        <text class="font text ml-39-5" style="color:white;font-size:20px;margin-left:10px;">{{ username }}</text>
        <image
          class="avatar"
          :src="avatar"
          style="position: absolute; right: 20rpx;height:40px;width:40px"
        />
      </view>
      
      <!-- 聊天列表 -->
      <scroll-view class="chat-list" scroll-y="true">
        <view class="chat-list-content">
          <!-- 空状态提示 -->
          <view class="empty-chat-tip" v-if="processedListWithAvatars.length === 0">
            <image class="empty-chat-icon" src="../../static/empty.png" />
            <text class="empty-chat-text">暂无聊天记录</text>
            <text class="empty-chat-hint">快去和司机/乘客聊聊吧</text>
          </view>
          
          <!-- 聊天列表 -->
          <view 
            v-for="(chat, index) in processedListWithAvatars" 
            :key="index" 
            class="chat-item" 
            @click="goToChat(chat)"
          >
            <image class="avatar" :src="chat.avatar || '../../static/user.jpeg'" />
            <view class="chat-content">
              <view class="chat-header">
                <text class="username">{{ chat.username }}</text>
                <text class="time">{{ chat.time }}</text>
              </view>
              <view class="message-preview">
                <text class="message">{{ truncateMessage(chat.lastMessage, 75) }}</text>
                <text v-if="chat.unreadCount > 0" class="unread-count">{{ chat.unreadCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
      
      <!-- 隐藏的Canvas用于生成群聊头像 -->
      <canvas 
        canvas-id="groupAvatarCanvas" 
        style="position: absolute; left: -9999px; width: 100px; height: 100px;"
      ></canvas>
    </view>
  </view>
</template>

<script>
import NavigationBar from '../../components/NavigationBar.vue';
import { fetchUserConversations } from '../../api/chat';
import { fetchBasicUserInfo } from '../../api/user';

export default {
  components: {
    NavigationBar
  },
  data() {
    return {
      currentUser: {
        username: '测试者',
        avatar: '../../static/user_2.jpg'
      },
      ConversationList: [], // 会话列表 -- 从后端获取
      groupAvatarCache: {}, // 缓存已生成的群聊头像
      processedListWithAvatars: [] // 新增：存储已处理好的聊天列表
    };
  },
  computed: {
    username() {
      return this.currentUser.username;
    },
    avatar() {
      return this.currentUser.avatar;
    }
  },
  async created() {
    await this.fetchCurrentUser();            // 获取用户信息
	await this.fetchConversationListData();   // 获取会话列表
	await this.processConversationList();     // 处理会话列表数据
  },
  methods: {
	// 获取当前用户基本信息
    async fetchCurrentUser() {
		fetchBasicUserInfo().then(res => {
			this.currentUser.username = res.data.username;
			this.currentUser.avatar = res.data.avatar;
		}).catch(err => {
			console.log('获取用户基本信息失败：', err);
		});
    },
	// 获取会话列表数据
	async fetchConversationListData() {
		try {
			const res = await fetchUserConversations();
			console.log("会话列表数据:", res);
			this.ConversationList = res;
		} catch (err) {
			console.log('获取用户会话列表失败：', err);
		}
	},
	// 处理获取到的会话列表数据
	async processConversationList() {
		try {
			const processed = [];
			const currentUserId = uni.getStorageSync('user_info').user_id;
			for (const conversation of this.ConversationList) {
				const processedConversation = {
					id: conversation.id || undefined,
					isGroup: conversation.type === 'group',
					lastMessage: conversation.lastMessage?.content || '',
					time: this.formatTime(conversation.lastMessage?.created_at),
					unreadCount: conversation.unreadCount || 0,
					tripId: conversation.tripId || null
				};
				
				// 处理私聊会话
				if (!processedConversation.isGroup) {
					// 找到私聊的另一方参与者
					const isValidParticipant = (p) => p?.userId && p.userId !== currentUserId;
					const otherParticipant = conversation.participants?.find(isValidParticipant) || null;
					
					// 设置默认值				
					processedConversation.username = otherParticipant?.realname || otherParticipant?.username || '未知用户';
					processedConversation.avatar = otherParticipant?.avatar ? 'data:image/jpeg;base64,' + otherParticipant.avatar : '../../static/user.jpeg';
				}
				// 处理群聊会话
				else {
					processedConversation.username = conversation.title || '群聊';
					
					const participants = Array.isArray(conversation.participants) ? conversation.participants : [];
					
					// 获取群成员头像列表
					const memberAvatars = participants
					    .filter(p => p)
					    .map(p => ({
					      avatar: p.avatar ? `data:image/jpeg;base64,${p.avatar}` : '../../static/user.jpeg',
					    }));
					
					processedConversation.members = memberAvatars;
					
					// 生成群头像
					try {
						processedConversation.avatar = memberAvatars.length > 0 ?
							await this.generateGroupAvatar(conversation.id, memberAvatars) :
							'../../static/default_group_avatar.png';
						console.log(processedConversation.avatar);
					} catch (e) {
						console.error('生成群头像失败:', e);
						processedConversation.avatar = '../../static/default_group_avatar.png';
					}
				}
				
				processed.push(processedConversation);
			};
			
			// 按最后消息时间降序排序
			processed.sort((a, b) => {
			  const timeA = new Date(a.lastMessage?.created_at || 0).getTime();
			  const timeB = new Date(b.lastMessage?.created_at || 0).getTime();
			  return timeB - timeA;
			});
			
			this.processedListWithAvatars = processed;
			console.log("处理后的会话列表:", processed);
		} catch (err) {
			console.error('处理会话列表失败:', err);
		}
	},
	// 生成群聊头像
    async generateGroupAvatar(groupId, members) {
      // 如果有缓存，直接返回
      if (this.groupAvatarCache[groupId]) {
        return this.groupAvatarCache[groupId];
      }
      
      // 获取前4个成员的头像
      const validAvatars = members
		.slice(0, 4)
		.filter(member => member?.avatar)
		.map(m => m.avatar);
		
	// 3. 处理特殊情况
	  if (validAvatars.length === 0) {
	    const defaultAvatar = '../../static/default_group_avatar.png';
	    this.groupAvatarCache[groupId] = defaultAvatar;
	    return defaultAvatar;
	  }
      
      if (validAvatars.length === 1) {
        this.groupAvatarCache[groupId] = avatars[0];
        return avatars[0];
      }
      
      try {
        // 使用Canvas生成拼接头像
        const tempFilePath = await this.drawGroupAvatar(validAvatars);
        this.groupAvatarCache[groupId] = tempFilePath;
        return tempFilePath;
      } catch (error) {
        console.error('生成群聊头像失败:', error);
        return '../../static/default_group_avatar.png';
      }
    },
    
    async drawGroupAvatar(avatarUrls) {
      return new Promise((resolve, reject) => {
        const ctx = uni.createCanvasContext('groupAvatarCanvas');
        const canvasWidth = 100;
        const canvasHeight = 100;
        const avatarCount = avatarUrls.length;
        
        // 清除画布
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // 绘制背景（白色）
        ctx.setFillStyle('#ffffff');
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // 根据头像数量确定布局
        const drawPromises = [];
        
        if (avatarCount === 2) {
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth/2, canvasHeight));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], canvasWidth/2, 0, canvasWidth/2, canvasHeight));
        } else if (avatarCount === 3) {
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth, canvasHeight/2));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], 0, canvasHeight/2, canvasWidth/2, canvasHeight/2));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[2], canvasWidth/2, canvasHeight/2, canvasWidth/2, canvasHeight/2));
        } else if (avatarCount >= 4) {
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[0], 0, 0, canvasWidth/2, canvasHeight/2));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[1], canvasWidth/2, 0, canvasWidth/2, canvasHeight/2));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[2], 0, canvasHeight/2, canvasWidth/2, canvasHeight/2));
          drawPromises.push(this.drawAvatar(ctx, avatarUrls[3], canvasWidth/2, canvasHeight/2, canvasWidth/2, canvasHeight/2));
        }
        
        Promise.all(drawPromises).then(() => {
          ctx.draw(false, () => {
            uni.canvasToTempFilePath({
              canvasId: 'groupAvatarCanvas',
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: (err) => {
                console.error('Canvas导出失败:', err);
                reject(err);
              }
            });
          });
        });
      });
    },
    
    drawAvatar(ctx, avatarUrl, x, y, width, height) {
      return new Promise((resolve) => {
        // 先确保图片加载完成
        uni.getImageInfo({
          src: avatarUrl,
          success: (res) => {
            ctx.save();
            // 创建圆形裁剪区域
            ctx.beginPath();
            const radius = Math.min(width, height) / 2;
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // 绘制头像图片
            ctx.drawImage(res.path, x, y, width, height);
            ctx.restore();
            resolve();
          },
          fail: () => {
            // 如果图片加载失败，绘制一个默认头像
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + width/2, y + height/2, Math.min(width, height)/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.setFillStyle('#cccccc');
            ctx.fillRect(x, y, width, height);
            ctx.restore();
            resolve();
          }
        });
      });
    },
    
    goToChat(conversation) {
	  // 跳转到聊天界面
	  uni.setStorageSync('tempChatData', conversation);
      uni.navigateTo({url: `/pages/index/chat`});
    },
	
	// 辅助函数：截断消息显示长度
	truncateMessage(text, maxLength = 15) {
	  if (!text) return '';
	  return text.length > maxLength 
	    ? text.substring(0, maxLength) + '...' 
	    : text;
	},
	
	// 辅助函数：格式化时间显示
	formatTime(timestamp) {
	  if (!timestamp) return '';
	  
	  const now = new Date();
	  const date = new Date(timestamp);
	  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
	  
	  if (diffDays === 0) {
	    // 今天显示时间
	    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
	  } else if (diffDays === 1) {
	    return '昨天';
	  } else if (diffDays < 7) {
	    // 一周内显示星期几
	    return ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getDay()];
	  } else {
	    // 更早的显示日期
	    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
	  }
	},
  },
};
</script>

<style scoped>

.page-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #f5f5f5;
}

.page {
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f5f5f5;
}
.section {
  padding: 18.75rpx 25.52rpx;
  background-color: #2a82e4;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: flex-start; /* 水平靠左 */
}
.font {
  font-size: 31.25rpx;
  font-family: SourceHanSansCN;
  font-weight: 700;
}

.chat-list {
  height: calc(100vh - 100px);
}

.chat-item {
  display: flex;
  padding: 12px 15px;
  background-color: white;
  border-bottom: 1px solid #f0f0f0;
}

.avatar {
  width: 45px;
  height: 45px;
  border-radius: 90px;
  margin-right: 12px;
  border: 3px solid #084fa1;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.username {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.time {
  font-size: 12px;
  color: #999;
}

.message-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
}

.message {
  font-size: 14px;
  color: #999;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-count {
  background-color: #f44336;
  color: white;
  font-size: 12px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  border-radius: 9px;
  padding: 0 5px;
}

.message {
  display: inline-block;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-chat-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.empty-chat-icon {
  width: 120px;
  height: 120px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-chat-text {
  font-size: 18px;
  color: #666;
  margin-bottom: 8px;
}

.empty-chat-hint {
  font-size: 14px;
  color: #999;
}
</style>