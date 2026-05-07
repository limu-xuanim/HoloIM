import chatsStore from './chats-store';

/**
 * 获取讨论组聊天
 * @param {SortChatsOrder} [sortList='recentFirst'] 是否排序或者指定排序规则
 * @param {boolean} [createdByMe=false] 是否由我创建
 * @param {boolean} [includeReadonly=true] 是否包含只读的聊天
 * @returns {Array<Chat>} 讨论组对象列表
 */
export const getGroupsChats = (sortList = 'recentFirst', createdByMe = false, includeReadonly = true) => chatsStore.getGroupsChats(sortList, createdByMe, includeReadonly);
