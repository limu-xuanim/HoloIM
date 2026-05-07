import marked from '~/app/utils/markdown';
import {strip, linkify, escapeHTML} from '~/app/utils/html-helper';
import {escapeRegExp, limitStringLength, REGEXP_AT_USER} from '~/app/utils/string-helper';
import {emojiToImage} from '~/app/components/emoji';
import ChatMessage, {OBJECT_TYPES} from './chat-message';
import {ProfileModule} from '~/app/entries/vars/ProfileModule';
import {Lang} from '~/app/entries/vars/Lang';
import {membersStore} from '~/app/entries/vars/membersStore';

const {getCurrentUser} = ProfileModule;

export const linkMarkdownLinks = (text: string): string => {
    return text.replace(/\[([^\[\]]+)\]\(([^()]+)\)/g, (_match, linkText, linkUrl) => {
        return `<a href="${linkUrl}" style="color: #5878FF">${linkText}</a>`;
    });
};

/**
 * 转换消息内容回调函数
 */
let onRenderChatMessageContentListener: ((content: string) => string) | null = null;

/**
 * 绑定转换消息内容事件
 * @param listener 事件回调函数
 */
export const onRenderChatMessageContent = (listener: (content: string) => string) => {
    onRenderChatMessageContentListener = listener;
};

/**
 * 将文本中的 `[@李娟](@#5)` 转换为 HTML 链接
 * @param text 文本内容
 * @param reverse 如果为 true，则将 markdown 格式去掉，转换为纯文本
 * @returns 转换后的文本
 * @todo 现在本地已经没有所有用户信息了，需要重构此处逻辑
 */
export const linkMentionsInText = (text: string, reverse = false): string => {
    if (text?.includes('@')) {
        const langAtAll = Lang.string('chat.message.atAll');
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return text;
        }

        const {displayName, account, id} = currentUser;

        text = text.replace(new RegExp(`@all|@${langAtAll}`, 'gi'), `<span class="at-all">@${langAtAll}</span>`);
        text = text.replace(/\[@(#?[^\s[\]@]{1,20})]\(@(#\d+)\)/gi, (_match, name, mention) => {
            const isMe = mention === `#${id}` || mention === account || mention === displayName;
            return reverse ? `@${name}` : `<a${isMe ? ' class="at-me"' : ''} href="@${mention}">@${name}</a>`;
        });
    }
    return text;
};

/**
 * 在发送消息之前将用户发送的消息文本中的 `@user` 信息，转换为 markdown 链接形式
 * @param message 消息文本
 * @returns 格式化后的文本
 */
export function normalizeMentionsInMessage(message: string): string {
    return message.replace(new RegExp(`(\\[|\\()?${REGEXP_AT_USER}(\\)|\\])?`, 'g'), (_match, prefix, mention, suffix) => {
        if ((prefix === '(' && suffix === ')') || (prefix === '[' && suffix === ']')) {
            return _match;
        }
        const member = membersStore.guessMemberInCache(mention);
        if (member) {
            return `${prefix ?? ''}[@${member.displayName}](@#${member.id})${suffix ?? ''}`;
        }
        return _match;
    });
}

/**
 * 将聊天消息内容转换为最终显示的 HTML 文本
 * @param chatMessage 聊天消息对象
 * @param extraConverters 额外的转换函数
 * @returns 转换后的聊天消息内容文本
 */
export const renderChatMessageContent = (chatMessage: ChatMessage, ...extraConverters: Array<((content: string, msg: ChatMessage) => string) | undefined>): string => {
    if (chatMessage._renderedTextContent === undefined) {
        const {content: originContent} = chatMessage;
        let content = originContent;
        if (typeof content === 'string' && content.length) {
            if (chatMessage.isBroadcast) {
                content = marked.parse(content) as string;
                content = linkMentionsInText(content, false);
            } else {
                content = linkify(escapeHTML(content).replace(/<br>/g, '\n'));
                content = linkMarkdownLinks(content);
                content = linkMentionsInText(content, false);
            }

            content = emojiToImage(content);

            if (onRenderChatMessageContentListener) {
                content = onRenderChatMessageContentListener(content);
            }

            chatMessage._renderedTextContent = content;
            chatMessage._isBlockContent = content && (content.includes('<h1>') || content.includes('<h2>') || content.includes('<h3>') || originContent.split('\n').length > 20);
        } else {
            chatMessage._renderedTextContent = '';
            chatMessage._isBlockContent = false;
        }
    }
    if (extraConverters?.length) {
        let content = chatMessage._renderedTextContent;
        for (const converter of extraConverters) {
            if (converter) {
                content = converter(content, chatMessage);
            }
        }
        return content;
    }
    return chatMessage._renderedTextContent;
};

/**
 * 从系统获取消息发送成员对象
 * @param chatMessage 聊天消息对象
 * @returns 消息发送成员
 */
export const getChatMessageSender = (chatMessage: ChatMessage): Member => membersStore.getMemberOrTemp(chatMessage.senderId);

/**
 * 获取消息的描述文本
 * @param chatMessage 聊天消息对象
 * @param limitLength 最长文本数目
 * @param formatCallback 格式化回调函数
 * @returns 消息的描述文本
 */
export const getChatMessageSummaryText = (chatMessage: ChatMessage, limitLength = 200, formatCallback: ((summary: string, msg: ChatMessage) => string) | null = null): string => {
    if (chatMessage.deleted) {
        return `[${Lang.string('chat.message.deleted')}]`;
    }
    let {summary: summaryText} = chatMessage;
    if (summaryText === undefined) {
        if (chatMessage.isNotification) {
            summaryText = `${chatMessage.senderName}: ${chatMessage.notification.title ? chatMessage.notification.title : chatMessage.notification.content}`;
        } else if (chatMessage.isEmotionContent) {
            summaryText = `[${Lang.string('chat.message.type.emoji')}]`;
        } else if (chatMessage.isImageContent) {
            summaryText = `[${Lang.string('chat.message.type.image')}]`;
        } else if (chatMessage.isTextContent) {
            summaryText = renderChatMessageContent(chatMessage);
            // Preserve emojis.
            summaryText = solidifyEmoji(summaryText);
            // Remove breaks and extra spaces
            summaryText = summaryText.trim().replace(/[\r\n]/g, ' ').replace(/\n[\s| | ]*\r/g, '\n');
            summaryText = strip(summaryText);
            summaryText = unescapeEntities(summaryText);
        } else if (chatMessage.isObjectContent) {
            if (chatMessage.objectContentType === OBJECT_TYPES.url) {
                const {objectContent} = chatMessage;
                summaryText = `[${Lang.string('chat.message.type.url')}] ${objectContent.url}`;
            } else {
                summaryText = `[${Lang.string('chat.message.type.object')}]`;
            }
        } else if (String(chatMessage.$get('contentType')) === 'code') {
            try {
                const data = typeof chatMessage.content === 'string' ? JSON.parse(chatMessage.content) : chatMessage.content;
                summaryText = (data && data.name) || chatMessage.content;
            } catch {
                summaryText = chatMessage.content;
            }
        } else {
            summaryText = chatMessage.content;
        }

        chatMessage.summary = summaryText;
    }
    if (formatCallback) {
        summaryText = formatCallback(summaryText, chatMessage);
    }
    if (summaryText.length > limitLength) {
        return limitStringLength(summaryText, limitLength);
    }
    return summaryText;
};

/**
 * 获取当前消息 at 用户类型
 * @param message 消息或消息内容
 * @returns 类型
 */
export function getChatMessageMentionType(message: ChatMessage|string): 'me'|'all'|false {
    const isChatMessage = message instanceof ChatMessage;
    const currentUser = getCurrentUser();
    if (isChatMessage) {
        if (message._mentionType !== undefined) {
            return message._mentionType;
        }
        if (!message.isTextContent || currentUser.id !== message.senderId) {
            message._mentionType = false;
            return false;
        }
    }
    const messageContent = isChatMessage ? message.content : message;
    try {
        if (RegExp(`(@${escapeRegExp(currentUser.account)}\\b|@${escapeRegExp(currentUser.realname)}\\b|@#${currentUser.id}\\b)`, 'mgui').test(messageContent)) {
            return 'me';
        }
        if (RegExp(`(@all|@${Lang.string('chat.message.atAll')})`, 'mgui').test(messageContent)) {
            return 'all';
        }
    } catch {}
    return false;
}

/**
 * 替换渲染后的消息中的 emoji img 标签为 emoji 本身
 * @param renderedText 渲染后的消息
 * @returns emoji html 被替换为 emoji 的消息
 */
const solidifyEmoji = (renderedText: string) => renderedText.replace(/<img class="joypixels".*?.png"\/> ?/gm, match => /alt="(.*?)"/.exec(match)[1]);

/**
 * 替换渲染后的消息中的 HTML 实体
 * @param renderedText 渲染后的消息
 * @returns 替换 HTML 实体的消息
 */
const unescapeEntities = (renderedText: string) => {
    const unescaped = new DOMParser().parseFromString(renderedText, 'text/html');
    return unescaped.documentElement.textContent;
};

