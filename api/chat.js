import { SocketService } from "../utils/socket_io";
import { get, post } from "../utils/request";
import { getUserDefaultAvatar } from "./user";

/**
 * 获取当前用户的会话列表（包含最后一条消息和未读计数）
 * @returns {Promise<Array<Conversation>>}
 */
export const fetchUserConversations = () => {
	return get('/chat/conversations').then(res => {
		// 统一处理数据格式
		console.log("后端原始数据", res);
		return res.data.map(conversation => ({
			id: conversation.conversation_id,
			type: conversation.type || 'private',
			title: conversation.title || '',
			tripId: conversation.trip_id || null,
			lastMessage: conversation.last_message || null,
			lastMessageTime: conversation.last_message_time ? new Date(conversation.last_message_time) : null,
			unreadCount: conversation.unread_count || 0,
			participants: conversation.participants?.map(p => ({
				userId: p.user_id,
				username: p.username || '',
				avatar: p.avatar || getUserDefaultAvatar()
			})) || []
		}));
	});
}

/**
 * 获取指定会话的消息列表
 * @param {string} conversationId 会话ID
 * @param {Object} [params] 查询参数
 * @param {number} [params.limit] 限制返回的消息数量
 * @param {string} [params.before] 获取某条消息之前的历史记录
 * @returns {Promise<Object>} 返回消息列表响应
 */
export const fetchConversationMessages = async (conversationId, params = {}) => {
	return get(`/chat/conversations/${conversationId}/messages`).then(res => {
		// 统一处理数据格式
		console.log("后端原始数据", res);
		return res;
	});
}

// chat.js 新增函数
/**
 * 创建私聊会话
 * @param {number} currentUserId - 当前用户ID
 * @param {number} targetUserId - 目标用户ID
 * @param {number} orderId - 关联订单ID
 * @returns {Promise<Object>}
 */
export const createPrivateConversation = (currentUserId, targetUserId, orderId) => {
  return post('/chat/conversations/private', {
    current_user_id: currentUserId,
    target_user_id: targetUserId,
    order_id: orderId
  }).then(res => ({
    id: res.data.conversation_id,
    type: res.data.conversation_type,
    avatar: res.data.conversation_avater,
    title: res.data.title,
    createdAt: new Date(res.data.created_at)
  }));
};

/**
 * 发送初始消息
 * @param {number} conversationId - 会话ID
 * @param {number} senderId - 发送者ID
 * @param {number} orderId - 订单ID
 * @param {string} [content] - 消息内容
 * @returns {Promise<Object>}
 */
export const sendInitialMessage = (conversationId, senderId, orderId, content = "你好，我想加入你的拼车订单") => {
  return post('/chat/messages', {
    conversation_id: conversationId,
    sender_id: senderId,
    content_type: 'invitation',
    order_id: orderId,
    content: content
  }).then(res => ({
    id: res.data.mess_id,
    content: res.data.content,
    createdAt: new Date(res.data.created_at)
  }));
};

export function sendMessage(conversationId, content, type = 'text') {
	SocketService.emit('send_message', {
		conversationId: conversationId,
		content: content,
		timestamp: new Date().toISOString()
	});
}

SocketService.on('private_message', (data) => {
	console.log(`收到来自${data.from}的消息：${data.content}`);
	
})

SocketService.on('conversation_created', (data) => {
  console.log('新会话创建:', data);
  store.dispatch('chat/addConversation', {
    id: data.conversation_id,
    type: 'private',
    title: data.title,
    participants: [
      {
        userId: data.target_user_id,
        username: data.target_username,
        avatar: data.target_avatar
      }
    ],
    lastMessage: {
      content: '新会话已建立',
      created_at: new Date()
    },
    unreadCount: 1
  });
});

SocketService.on('message_sent', (message) => {
  store.dispatch('chat/addMessage', {
    conversationId: message.conversation_id,
    message: {
      id: message.mess_id,
      sender: message.sender_id === currentUser.user_id ? 'user' : 'other',
      content: message.content,
      createdAt: new Date(message.created_at)
    }
  });
});


