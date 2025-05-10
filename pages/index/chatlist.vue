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
                <text class="message">{{ chat.lastMessage }}</text>
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
import { fetchConversationList } from '@/api/conversation';
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
      chatList: [],
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
    await this.fetchCurrentUser();
    await this.processChatList();
  },
  methods: {
    async fetchCurrentUser() {
        try {
          // 读取缓存用户信息（如有）
          const cacheUser = uni.getStorageSync('user_info');
          if (cacheUser) {
            this.currentUser = {
              username: cacheUser.username,
              avatar: cacheUser.avatar
            };
          }
    
          const userId = uni.getStorageSync('user_id');
          if (!userId) {
            console.warn('用户ID未找到，请确保已登录');
            return;
          }
        } catch (error) {
          console.error('获取当前用户信息失败:', error);
        }
      },
      
	async processChatList() {
	  try {
		const userId = uni.getStorageSync('user_id');
		if (!userId) {
		  console.warn('用户ID未找到，请确保已登录');
		  return;
		}

		const conversations = await fetchConversationList(userId);
		const processed = [];
		for (const chat of conversations) {
			console.log(chat);
		  if (chat.isGroup) {
			// 处理群聊头像
			const groupAvatar = await this.generateGroupAvatar(chat.id, chat.avatar || []);
			processed.push({ ...chat, avatar: groupAvatar });
		  } else {
			// 处理私聊头像 - 确保有默认头像
			const avatar = chat.avatar || '../../static/default_avatar.png';
			processed.push({ ...chat, avatar });
		  }
		}

		this.chatList = conversations;
		this.processedListWithAvatars = processed;

	  } catch (error) {
		console.error('加载聊天列表失败:', error);
		uni.showToast({ title: '加载失败', icon: 'none' });
	  }
	},

	async generateGroupAvatar(groupId, members) {
	  // 如果有缓存，直接返回
	  if (this.groupAvatarCache[groupId]) {
		return this.groupAvatarCache[groupId];
	  }
	  
	  // 获取前4个成员的头像，如果没有则使用默认头像
	  const avatars = members.slice(0, 4);
	  console.log(members);

	  if (avatars.length === 1) {
		this.groupAvatarCache[groupId] = avatars[0];
		return avatars[0];
	  }
	  
	  try {
		// 使用Canvas生成拼接头像
		const tempFilePath = await this.drawGroupAvatar(avatars);
		this.groupAvatarCache[groupId] = tempFilePath;
		return tempFilePath;
	  } catch (error) {
		console.error('生成群聊头像失败:', error);
		return '../../static/default_group_avatar.png';
	  }
	},

	drawGroupAvatar(avatarUrls) {
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
		
		// 处理每个头像的绘制
		avatarUrls.forEach((url, index) => {
		  let x, y, width, height;
		  
		  if (avatarCount === 2) {
			width = canvasWidth / 2;
			height = canvasHeight;
			x = index === 0 ? 0 : width;
			y = 0;
		  } else if (avatarCount === 3) {
			if (index === 0) {
			  x = 0;
			  y = 0;
			  width = canvasWidth;
			  height = canvasHeight / 2;
			} else {
			  width = canvasWidth / 2;
			  height = canvasHeight / 2;
			  x = (index - 1) * width;
			  y = canvasHeight / 2;
			}
		  } else if (avatarCount >= 4) {
			width = canvasWidth / 2;
			height = canvasHeight / 2;
			x = index % 2 === 0 ? 0 : width;
			y = index < 2 ? 0 : height;
		  }
		  
		  drawPromises.push(this.drawAvatar(ctx, url, x, y, width, height));
		});
		
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
		}).catch(err => {
		  console.error('绘制头像失败:', err);
		  reject(err);
		});
	  });
	},

	drawAvatar(ctx, avatarUrl, x, y, width, height) {
	  return new Promise((resolve, reject) => {
		// 检查是否是base64编码的图片
		if (avatarUrl.startsWith('data:image')) {
		  // 直接绘制base64图片
		  ctx.drawImage(avatarUrl, x, y, width, height);
		  resolve();
		} else {
		  // 处理普通URL或本地路径
		  uni.getImageInfo({
			src: avatarUrl,
			success: (res) => {
			  ctx.drawImage(res.path, x, y, width, height);
			  resolve();
			},
			fail: (err) => {
			  console.error('加载头像失败:', err);
			  // 绘制默认头像
			  ctx.drawImage('../../static/default_avatar.png', x, y, width, height);
			  resolve();
			}
		  });
		}
	  });
	},

    
    goToChat(chat) {
      uni.navigateTo({
        url: `/pages/chat/chat?username=${chat.username}&avatar=${chat.avatar}`
      });
    }
  }
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
</style>