import {TYPES, CONTENT_TYPES, type ChatMessageLike} from './chat-message';
import {chatsStore} from '~/app/entries/vars/chatsStore';
import {membersStore} from '~/app/entries/vars/membersStore';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';

const {queryMessagesFromDatabase} = ChatMessagesStoreModule;

/**
 * 创建搜索条件规则对象
 * @param key 搜索关键字
 * @param ignoreCase 是否忽略大小写
 * @returns 异步返回搜索条件规则对象
 */
async function createMessageSearchCondition(key: string, ignoreCase = true) {
    if (key[0] === '@') {
        let member = membersStore.guessMemberInCache(key);
        if (member) {
            return (message: ChatMessageLike) => (message.user === member.id);
        }
        if (/^@\d+$/.test(key)) {
            return (message: ChatMessageLike) => (message.user === +key.substring(1));
        }
        member = await membersStore.asyncGetMember(+key.substring(1));
        if (member) {
            return (message: ChatMessageLike) => (message.user === member.id);
        }
    }
    if (key[0] === '[' && key[key.length - 1] === ']') {
        const keyType = key.slice(1, -1);
        if (keyType in TYPES) {
            return (message: ChatMessageLike) => (message.type === keyType);
        }
        if (keyType in CONTENT_TYPES) {
            if (keyType === 'text') {
                return (message: ChatMessageLike) => (message.contentType === 'text' || message.contentType === 'plain');
            }
            return (message: ChatMessageLike) => (message.contentType === keyType);
        }
    } else if (key[0] === '#') {
        if (key.length === 37) { // 例如 '767419af-1d8d-40b2-972d-bd07afe807a5'
            return (message: ChatMessageLike) => (message.gid === key.substring(1));
        }
        if (/^#\d+$/.test(key)) {
            return (message: ChatMessageLike) => (message.id === +key.substring(1));
        }
    }

    return (message: ChatMessageLike) => {
        if (message.contentType === 'object') {
            if (typeof message.content === 'string') {
                try {
                    let content = message.content[0] === '{'
                        ? JSON.parse(message.content).title
                        : message.content;

                    if (ignoreCase) {
                        content = content.toLowerCase();
                    }

                    if (content.includes(key)) {
                        return true;
                    }
                } catch(error) {
                    return false;
                }
            }

            return false;
        }

        if (message.contentType === CONTENT_TYPES.text || message.contentType === CONTENT_TYPES.plain) {
            if (typeof message.content !== 'string') {
                return false;
            }
            const content = ignoreCase ? message.content.toLowerCase() : message.content;
            return content?.includes(key);
        }

        if (typeof message.keys !== 'string') {
            return false;
        }

        const keys = ignoreCase ? message.keys.toLowerCase() : message.keys;
        return Boolean(keys.length) && keys.includes(key);
    };
}

/**
 * 消息搜索条件类
 */
export class MessageSearchConditions {
    /**
     * 消息搜索关键字列表
     */
    private keys: string[];

    /**
     * 是否忽略大小写
     */
    private ignoreCase: boolean;

    private conditions: Array<(message: ChatMessageLike) => boolean>;

    /**
     * 构造消息搜索条件对象
     * @param keys 搜索关键字
     * @param ignoreCase 是否忽略大小写
     */
    constructor(keys: string|string[], ignoreCase = true) {
        this.keys = (Array.isArray(keys) ? keys : keys.split(' ')).filter(x => x.length > 0);
        this.ignoreCase = ignoreCase;
    }

    /**
     * 构建搜索条件列表
     * @returns 搜索条件列表
     */
    async buildConditions() {
        if (this.conditions) {
            return this.conditions;
        }

        const conditions: Array<(message: ChatMessageLike) => boolean> = [];
        for (const key of this.keys) {
            const condition = await createMessageSearchCondition(this.ignoreCase ? key.toLowerCase() : key, this.ignoreCase);
            conditions.push(condition);
        }

        this.conditions = conditions;
        return conditions;
    }

    /**
     * 检查给定的消息对象是否满足搜索条件
     * @param message 消息对象
     * @returns 如果返回 `true` 则为满足条件，否则为不满足条件
     */
    match(message: ChatMessageLike) {
        return Boolean(this.conditions.length) && this.conditions.every((condition) => condition(message));
    }
}

/**
 * 搜索指定会话消息记录
 * @param cgid 要搜索的会话实例
 * @param conditions 搜索关键词，多个关键字使用空格分隔
 * @param options 其他选项
 * @param options.minDate 最小日期时间戳，只搜索此日期之后的会话记录
 * @param options.returnType 是否返回原始数据、ChatMessage或仅仅返回数目
 * @param options 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @returns 使用 Promise 异步返回处理结果
 */
async function searchChatMessagesInDatabase(
    cgid: string,
    conditions: MessageSearchConditions,
    options: Partial<{
        minDate: number;
        limit: number;
    }> = {}
) {
    const {minDate, limit = 0} = options;

    // 预处理搜索关键字，以使搜索时更快
    await conditions.buildConditions();

    const messageFilter = (message: ChatMessageLike) => {
        // 排除被删除或超出给定日期范围的消息
        if (!message.id || message.deleted || (minDate && message.date < minDate)) {
            return false;
        }

        return conditions.match(message);
    };

    const searchOptions = {cgid, condition: messageFilter, limit, offset: 0, reverse: true};
    return queryMessagesFromDatabase(searchOptions);
}

const getChatGids = (chats: string|string[]) => {
    let cgids: string[] = [];
    if (!chats) {
        const allChats = chatsStore.getAllChats(false);
        cgids = allChats.map(x => x.gid);
    } else if (chats === 'contacts') {
        const privateChats = chatsStore.getPrivateChats({sortRules: false, excludeLocal: true});
        cgids = privateChats.map(x => x.gid);
    } else if (chats === 'groups') {
        const groupsChats = chatsStore.getGroupsChats('default', false, true);
        cgids = groupsChats.map(x => x.gid);
    } else if (typeof chats === 'string') {
        cgids = [chats];
    } else if (Array.isArray(chats)) {
        cgids = [...chats];
    }
    if (!cgids.length) {
        return [];
    }
    return cgids;
};

/**
 * 在多个会话中搜索消息记录，搜索关键字使用如下规则：
 * - "@user" 搜索指定 ID 或用户名的用户发送的消息，例如 "@32"、"@admin"
 * - "[type]" 搜索指定类型的消息，例如 "[notify]" 搜索通知类消息
 * - "[contentType]" 搜索指定内容类型的消息，例如 "[image]" 搜索图片
 * - "#id" 搜索指定 ID 的消息，例如 "#12" 搜索消息 id 为 12 的消息
 * - "#gid" 搜索指定 gid 的消息，例如 "#767419af-1d8d-40b2-972d-bd07afe807a5" 搜索消息 gid 为 767419af-1d8d-40b2-972d-bd07afe807a5 的消息
 * - 多个搜索关键字可以使用空格连接，需要消息同时满足所有关键字，例如 "@admin [image] 截图" 搜索用户名为 admin 的用户发送的图片类消息且 keys 等字段包含 “截图”
 * - 使用 "|" 字符来连接多个关键字，匹配消息时只需要满足任意关键字即可，例如 “[image]|[text]” 搜索图片或文本
 * - 默认会排除类型为 broadcast 的消息，即不在结果中包含系统广播类消息，除非搜索关键字中明确包含 "[broadcast]"
 * - 以上规则可以组合使用，例如 “[image]|[text]|[plain] [notify] 值日” 搜索类型为图片或文本的通知类消息，且消息内容包含 “值日”
 * @param keys 搜索关键词，多个关键字使用空格分隔
 * @param chats 会话类型或 GID 列表
 * @param options 其他选项
 * @param options.minDate 日最小日期时间戳，只搜索此日期之后的会话记录
 * @param options.beforeSearch 当开始搜索会话时的回调函数
 * @param options.beforeSearchChat 当开始搜索会话时的回调函数
 * @param options.afterSearchChat 当开始搜索会话时的回调函数
 * @param options.abortHandler 取消操作管理器
 * @param options.limit 最多返回结果数目，如果为 0 则返回所有符合条件的结果
 * @returns 异步返回数目或者搜索到的消息列表
 */
export async function searchChatsMessagesInDatabase(
    keys: string,
    chats: string,
    options: Partial<{
        minDate: number;
        limit: number;
        beforeSearch: (cgids: string[], conditions: MessageSearchConditions) => void;
        beforeSearchChat: (cgid: string, index: number, cgids: string[]) => void;
        afterSearchChat: (
            cgid: string,
            result: {cgid: string; count: number; list?: ChatMessage[]},
            index: number,
            cgids: string[]
        ) => void;
        abortHandler: AbortHandler;
    }> = {}
) {
    const cgids = getChatGids(chats);
    const {minDate, beforeSearch, beforeSearchChat, afterSearchChat, abortHandler, limit} = options;

    const conditions = new MessageSearchConditions(keys);
    await conditions.buildConditions();

    if (abortHandler?.isAborted) {
        return [];
    }

    beforeSearch?.(cgids, conditions);

    const results = await Promise.all(cgids.map(async (cgid, index) => {
        if (abortHandler?.isAborted) {
            return;
        }

        beforeSearchChat?.(cgid, index, cgids);
        const list = await searchChatMessagesInDatabase(cgid, conditions, {minDate, limit});
        const result = {cgid, count: list.length, list};
        afterSearchChat?.(cgid, result, index, cgids);
        return result;
    }));

    if (abortHandler?.isAborted) {
        return [];
    }

    return results.filter(x => !!x);
}

