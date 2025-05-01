import { SocketService } from "../utils/socket_io";
import { get } from "../utils/request";
import { getUserDefaultAvatar } from "./user";

/**
 * 获取当前用户的会话列表（包含最后一条消息和未读计数）
 * @returns {Promise<Array<Conversation>>}
 */
export const fetchUserConversations = () => {
	return get('chat/conversations').then(res => {
		// 统一处理数据格式
		return res.data.map(conversation => ({
			id: conversation.id,
			type: conversation.type || 'private',
			title: conversation.title || '',
			tripId: conversation.trip_id || null,
			lastMessage: conversation.last_message || null,
			lastMessageTime: conversation.last_message_time ? new Date(conversation.last_message_time) : null,
			unreadCount: conversation.unreadCount || 0,
			participants: conversation.participants?.map(p => ({
				userId: p.user_id,
				username: p.username || '',
				avatar: p.avatar || getUserDefaultAvatar()
			})) || []
		}));
	});
}

export function sendMessage(toUserId, content, type = 'text') {
	// 触发发送私聊信息事件
	SocketService.emit('private_message', {
		to: toUserId,
		content: content,
		timestamp: new Date().toISOString()
	});
}

SocketService.on('private_message', (data) => {
	console.log(`收到来自${data.from}的消息：${data.content}`);
	
})


