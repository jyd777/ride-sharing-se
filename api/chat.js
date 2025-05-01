import { SocketService } from "../utils/socket_io";
import { get } from "../utils/request";
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


