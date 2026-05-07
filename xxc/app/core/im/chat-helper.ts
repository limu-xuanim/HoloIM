import Chat, {createOne2OneChatGid} from './chat';
import {getCurrentUser, getCurrentUserID} from '../profile';
import {isNotEmptyString} from '../../utils/check-empty';
import Pinyin from '../../utils/pinyin';
import membersStore from '../members/members-store';
import deptsStore from '../members/depts-store';

/**
 * 获取一对一聊天 Gid
 * @param member1ID 第一个用户 ID
 * @param member2ID 第二个用户 ID
 * @returns 一对一聊天 Gid
 */
export const getOne2OneChatGid = (member1ID: number, member2ID: number = getCurrentUserID()): string => createOne2OneChatGid(member1ID, member2ID);

/**
 * 获取一对一聊天中的对方成员
 * @param chat 要操作的聊天对象
 * @returns 一对一聊天中的对方成员
 */
export const getOtherMemberInOne2OneChat = (chat: Chat) => {
    const {theOtherMemberID} = chat;
    return theOtherMemberID ? membersStore.getMemberOrTemp(theOtherMemberID) : null;
};

/**
 * 获取聊天对象所有成员
 * @param chat 聊天对象
 * @returns 聊天成员列表
 */
export const getChatMembers = (chat: Chat) => {
    if (!chat) {
        return [];
    }
    if (chat.type === Chat.TYPES.system) {
        if (DEBUG) {
            console.warn('Avoid getting the list of system session members after 4.0.');
        }
        return membersStore.filter(x => !x.isDeleted);
    }
    const {members} = chat;
    if (!members.size) {
        return [];
    }
    return Array.from(members).map(membersStore.getMemberOrTemp).filter(m => !m.isDeleted);
};

/**
 * 判断给定的一对一聊天对方是否在线
 * @param chat 要操作的聊天对象
 * @returns 如果为 `true`，则给定的聊天是一对一聊天，并且对方在线
 */
export const isOne2OneChatOnline = (chat: Chat): boolean => {
    const otherOne = getOtherMemberInOne2OneChat(chat);
    return !!(otherOne?.isOnline);
};

/**
 * 获取聊天中的名称汉语拼音
 * @param chat 要操作的聊天对象
 * @returns 汉语拼音
 */
export const getChatPinYinName = (chat: Chat): string => {
    if (!chat.pinyin) {
        const {name} = chat;
        chat.pinyin = isNotEmptyString(name) ? Pinyin(name) : '';
    }
    return chat.pinyin;
};

/**
 * 对聊天列表进行排序，排序规则 `orders` 可以为以下值：
 * - `function(c1: Member, c2: Member):number`，自定义排序函数；
 * - 一个用逗号分隔的根据属性排序的属性名称表；
 * - 根据属性排序的属性名称表数组。
 * 默认的排序规则为：`['deleted', 'systemFirst', 'star', 'notice', 'hide', 'lastMessageId', 'mute', 'online', 'createDate', 'name', 'id']`。
 * @param chats 要排序的聊天列表
 * @param order 排序规则
 * @returns 排序后的聊天列表
 */
export const sortChats = (chats: Chat[], order: SortChatsOrder = 'default'): Chat[] => {
    if (chats.length < 2) {
        return chats;
    }
    if (typeof order === 'function') {
        return chats.sort(order);
    }
    let orders: string[];
    if (order === 'default') {
        orders = ['deleted', 'systemFirst', 'star', 'notice', 'hide', 'lastMessageId', 'mute', 'online', 'createDate', 'name', 'id'];
    } else if (order === 'onlineFirst') {
        orders = ['deleted', 'star', 'notice', 'hide', 'online', 'lastMessageId', 'mute', 'createDate', 'name', 'id'];
    } else if (order === 'recentFirst') {
        orders = ['deleted', 'systemFirst', 'star', 'draft', 'lastMessageId', 'notice', 'hide', 'online', 'mute', 'createDate', 'name', 'id'];
    } else if (typeof order === 'string') {
        orders = [order];
    }

    return chats.sort((y, x) => {
        // return > 0, y 在 x 后。 return < 0, y 在 x 前。
        let result = 0;

        for (const order of orders) {
            if (result !== 0) break;
            let xValue;
            let yValue;
            switch (order) {
                case 'systemFirst':
                    result = (x.isSystem ? 1 : 0) - (y.isSystem ? 1 : 0);
                    break;
                case 'deleted':
                    result = (x.isDeleted ? 0 : 1) - (y.isDeleted ? 0 : 1);
                    break;
                case 'notice':
                    result = (x.unreadMessagesCount ? 1 : 0) - (y.unreadMessagesCount ? 1 : 0);
                    break;
                case 'hide':
                case 'mute':
                    result = (x[order] ? 0 : 1) - (y[order] ? 0 : 1);
                    break;
                case 'isSystem':
                case 'star':
                    result = (x[order] ? 1 : 0) - (y[order] ? 1 : 0);
                    break;
                case 'online':
                    result = (isOne2OneChatOnline(x) ? 1 : 0) - (isOne2OneChatOnline(y) ? 1 : 0);
                    break;
                case 'name':
                    result = (x.name || '').localeCompare(y.name || '');
                    break;
                case 'lastMessageId':
                    result = (x.lastMessageInfo?.id ?? 0) - (y.lastMessageInfo?.id ?? 0);
                    break;
                case 'draft':
                    if (x.draft && y.draft) {
                        result = x.lastAccessTime > y.lastAccessTime ? 1 : -1;
                    } else if (x.draft || y.draft) {
                        result = (x.draft ? 1 : 0) - (y.draft ? 1 : 0);
                    } else {
                        result = 0;
                    }
                    break;
                default:
                    if (order === 'namePinyin') {
                        xValue = getChatPinYinName(x);
                        yValue = getChatPinYinName(y);
                    } else {
                        xValue = x[order as keyof Chat];
                        yValue = y[order as keyof Chat];
                    }
                    if (xValue === undefined || xValue === null) xValue = 0;
                    if (yValue === undefined || yValue === null) yValue = 0;

                    if (xValue === yValue) {
                        result = 0;
                    } else {
                        result = xValue > yValue ? 1 : -1;
                    }
            }
        }
        return result;
    });
};

/**
 * 是否是一对一聊天
 * @param cgid 聊天 Gid
 * @returns 如果为 `true`，则是一对一聊天
 */
export const isOne2OneChat = (cgid: string): boolean => /^\d+&\d+$/.test(cgid);

/**
 * 是否是私聊
 * @param cgid 聊天 Gid
 * @returns 如果为 `true`，则是私聊
 */
export const isPrivateChat = (cgid: string): boolean => /^(\d+)&\1$/.test(cgid);
