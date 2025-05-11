import { get, post } from '@/utils/request.js'

export const fetchConversationList = (userId) => {
  return get(`/conversations/list`, { user_id: userId })
    .then(res => {
      const list = res.data || []
      return list.map(conv => {
        const isGroup = conv.conversation_type === 'group'
		console.log(conv.other_user);
		console.log(conv);
        return {
          id: conv.conversation_id,
          isGroup,
          avatar: conv.conversation_avater,
          username: isGroup ? conv.conversation_name : conv.username,
          lastMessage: conv.last_message?.lastMessage || '',
          time: conv.time_display,
          unreadCount: conv.unread_count || 0,
          members: isGroup ? [] : undefined // 群聊成员列表，后续再补充调用
        }
      })
    })
    .catch(error => {
      console.error('Error fetching conversation list:', error)
      throw error
    })
};