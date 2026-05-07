import to from 'await-to-js';
import React from 'react';
import PKG from '~/app/package.json';
import {fileToBase64} from '~/app/utils/file-helper';
import ChatShareMessager from '~/app/views/chats/chat-share-messager';
import Messager from '../../components/messager';
import {getSpecialVersionName} from '../../config';
import platform from '../../platform';
import {formatDate} from '../../utils/date-helper';
import {isWebUrl} from '../../utils/html-helper';
import {getImageSize} from '../../utils/image';
import {formatBytes} from '../../utils/string-helper';
import events from '../events';
import FileData from '../files/file-data';
import {checkUploadFileSize, uploadFile} from '../files/files-network';
import Lang from '../lang';
import {getCurrentUser, getCurrentUserAccount, getCurrentUserID, isUserOnline} from '../profile';
import socket from '../server/socket';
import Chat, {type ChatLike} from './chat';
import ChatMessage, {
    CONTENT_TYPES,
    createChatMessage,
    OBJECT_TYPES,
    TYPES,
} from './chat-message';
import {normalizeMentionsInMessage} from './chat-message-helper';
import chatMessagesStore from './chat-messages-store';
import chatsStore from './chats-store';
import {imServerHandlers} from './im-server-handlers';

/**
 * 适合使用 Base64 格式发送图片的最大文件大小
 */
const MAX_BASE64_IMAGE_SIZE = 1024 * 10;

/**
 * 事件名称表
 */
const EVENT = {
    message_send: 'im.server.message.send',
    message_receive: 'im.server.message.receive',
    chat_action_changed: 'im.server.chat.action',
} as const;

/**
 * 请求服务器创建一个新的聊天
 * @param chat 要创建的聊天对象
 * @returns 使用 Promise 异步返回处理结果
 * @deprecated 使用 app/core/im/chats-server-api.js
 */
export const createChat = (chat: Chat | ChatLike) =>
    socket.sendAndListen({
        method: 'chatCreate',
        params: [chat.gid, chat.name || '', chat.type, Array.from(chat.members), 0, chat.public ? chat.public : false],
    });

/**
 * 在本地创建一个聊天实例
 * @param chatMembers 聊天成员
 * @param chatSetting 聊天属性对象
 * @returns 新创建的聊天实例
 */
const createLocalChatWithMembers = (chatMembers: number | number[], chatSetting: ChatLike) => {
    if (!Array.isArray(chatMembers)) {
        chatMembers = [chatMembers];
    }
    const userMeId = getCurrentUserID();
    chatMembers = chatMembers.map((member) => {
        if (typeof member === 'object' && member) {
            return member.id;
        }
        return member;
    });
    if (!chatMembers.find((memberId) => memberId === userMeId)) {
        chatMembers.push(userMeId);
    }

    const isOne2OneChat = chatMembers.length === 2;
    if (isOne2OneChat) {
        const gid = chatMembers.sort().join('&');
        const chat = chatsStore.getChat(gid);
        if (chat) {
            return chat;
        }
    }

    return new Chat({
        members: chatMembers,
        createdBy: getCurrentUserAccount(),
        type: isOne2OneChat ? Chat.TYPES.one2one : Chat.TYPES.group,
        ...chatSetting,
    });
};

/**
 * 根据给定的成员清单创建一个聊天实例，如果成员清单中只有自己和另一个人则创建一个一对一聊天，否则创建一个讨论组；
 * 如果一对一聊天已经存在则直接返回之前的聊天实例，而不是请求服务器创建一个新的。
 * @param {Set<number>|number[]} chatMembers 聊天成员
 * @param {Object} chatSettings 聊天属性对象
 * @returns {Promise<Chat>} 通过 Promise 异步返回新创建的聊天实例
 */
export const createChatWithMembers = (chatMembers, chatSettings) => {
    const chat = createLocalChatWithMembers(chatMembers, chatSettings);
    if (chat.id) {
        return Promise.resolve(chat);
    }
    return createChat(chat);
};

/**
 * 设置聊天的白名单信息
 * @param {Chat} chat 聊天实例
 * @param {Set<string>|string[]|string} committers 白名单信息
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const setChatCommitters = (chat, committers) =>
    socket.send({
        method: 'chatSetCommitters',
        params: [chat.gid, committers],
    });

/**
 * 切换聊天是否设置为公开
 * @param {Chat} chat 聊天实例
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const toggleChatPublic = (chat) =>
    socket.send({
        method: 'chatSetVisibility',
        params: [chat.gid, !chat.public],
    });

/**
 * 切换群设置聊天是否设置为公开
 * @param {Chat} chat 聊天实例
 * @param {boolean} isPublic 是否公开
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const toggleChatGroupPublic = (chat, isPublic) =>
    socket.send({
        method: 'chatSetVisibility',
        params: [chat.gid, isPublic],
    });

/**

 * 切换聊天是否设置为已收藏
 * @param {Chat} chat 聊天实例
 * @param {boolean} [toggle] 是否标记为收藏，如果省略则自动设置
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const toggleChatStar = (chat, toggle) => {
    const sendRequest = () =>
        socket.send({
            method: 'chatStar',
            params: [toggle === undefined ? !chat.star : !!toggle, chat.gid],
        });
    if (!chat.id) {
        return createChat(chat).then(sendRequest);
    }
    return sendRequest();
};

/**
 * 切换聊天是否设置为免打扰
 * @param {Chat} chat 聊天实例
 * @param {boolean} [toggle] 是否标记为免打扰，如果省略则自动设置
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const toggleMuteChat = (chat, toggle) => {
    const sendRequest = () =>
        socket.send({
            method: 'chatMute',
            params: [toggle === undefined ? !chat.mute : !!toggle, chat.gid],
        });
    if (!chat.id) {
        return createChat(chat).then(sendRequest);
    }
    return sendRequest();
};

/**
 * 切换聊天是否设置为已隐藏（存档）
 * @param {Chat} chat 聊天实例
 * @param {boolean=} hide 是否隐藏
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const toggleHideChat = (chat, hide) => {
    const sendRequest = () =>
        socket
            .sendAndListen({
                method: 'chatHide',
                params: [hide ?? !chat.hide, chat.gid],
            })
            .then((theChat) => {
                if (theChat) {
                    events.emit(EVENT.chat_action_changed, theChat, 'hide', theChat.hide);
                }
            });
    if (!chat.id) {
        return createChat(chat).then(() => sendRequest());
    }
    return sendRequest();
};

/**
 * 将会话从最近聊天列表移除（freeze）
 * @param {Chat} chat 聊天实例
 * @param {boolean} [frozen] 是否移除，如果省略此参数则切换之前的状态
 * @returns {Promise} 使用 Promise 异步返回处理结果
 * @deprecated app/core/im/chats-server-api.js
 */
export const toggleFreezeChat = (chat, frozen) => {
    const sendRequest = () =>
        socket
            .sendAndListen({
                method: 'chatFreeze',
                params: [typeof frozen === 'boolean' ? frozen : !chat.frozen, chat.gid],
            })
            .then((theChat) => {
                if (theChat) {
                    events.emit(EVENT.chat_action_changed, theChat, 'freeze', chat.frozen);
                }
            });
    if (!chat.id) {
        return createChat(chat).then(sendRequest);
    }
    return sendRequest();
};

/**
 * 创建一个文本聊天消息
 * @param {string} message 消息内容
 * @param {Chat|{gid:string}} chat 聊天对象
 * @param {boolean} [_isMarkdown=null] 已废弃参数，保留仅用于兼容旧调用
 * @returns {ChatMessage} 聊天消息实例
 */
export const createTextChatMessage = (message, chat, _isMarkdown = null) => {
    const content = normalizeMentionsInMessage(message);
    return createChatMessage({
        content,
        user: getCurrentUserID(),
        cgid: chat.gid,
        contentType: CONTENT_TYPES.plain,
    });
};

/**
 * 创建一个网址卡片消息
 * @param {string} url 网址
 * @param {Chat|{gid:string}} chat 聊天对象
 * @returns {ChatMessage} 聊天消息实例
 * @private
 */
const createUrlObjectMessage = (url, chat) =>
    createChatMessage({
        content: JSON.stringify({type: OBJECT_TYPES.url, url}),
        user: getCurrentUserID(),
        cgid: chat.gid,
        contentType: CONTENT_TYPES.object,
    });

/**
 * 发送一个文本类聊天消息
 * @param {string} message 文本消息内容
 * @param {Chat|{gid:string}} chat 聊天对象
 * @param {boolean} [_isMarkdown=null] 已废弃参数，保留仅用于兼容旧调用
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const sendTextMessage = (message, chat, _isMarkdown = null) =>
    sendChatMessage(
        message && isWebUrl(message.trim())
            ? createUrlObjectMessage(message.trim(), chat)
            : createTextChatMessage(message, chat, _isMarkdown),
        chat,
    );

/**
 * 分享内容或转发消息到其他聊天
 * @param {ChatMessage[]|string[]} sharedContents 要分享的内容或转发的消息
 * @param {Chat|Array<Chat>} chats 要转发到哪些聊天
 * @param {string} shareLangString 分享提示的语言项字符串
 * @returns {Promise<(string | ChatMessage)[]>} 使用 Promise 异步返回处理结果
 */
export const shareContentToChats = async (sharedContents, chats, shareLangString) => {
    if (!Array.isArray(chats)) {
        chats = [chats];
    }
    if (!Array.isArray(sharedContents)) {
        sharedContents = [sharedContents];
    }

    const contentsLen = sharedContents.length;
    const chatsLen = chats.length;
    let current = 0;
    const total = contentsLen * chatsLen;
    const sentContents = [];

    const chatShareMessagerRef = React.createRef();
    // TODO: Messager.show 抽成一个单独的函数
    Messager.show(<ChatShareMessager langString={shareLangString} total={total} ref={chatShareMessagerRef} />, {
        id: 'messager-chat-share-message',
        autoHide: false,
        closeButton: false,
        modal: true,
        backdrop: false,
    });

    for (let sharedContent of sharedContents) {
        if (!sharedContent || sharedContent === '') {
            continue;
        }

        let shareSuccess = false;
        if (typeof sharedContent === 'string') {
            for (let chat of chats) {
                if (typeof chat === 'string') {
                    chat = chatsStore.getChat(chat);
                }
                sharedContent = createTextChatMessage(sharedContent, chat, false);
                const result = await sendChatMessage(sharedContent, chat);
                shareSuccess = result.isSuccess;
                if (chatShareMessagerRef.current.setCurrent) {
                    chatShareMessagerRef.current.setCurrent(current++);
                }
            }
        } else if (sharedContent instanceof ChatMessage) {
            const forwardedMessages = await forwardMessage(sharedContent, chats, () => {
                if (chatShareMessagerRef.current.setCurrent) {
                    chatShareMessagerRef.current.setCurrent(current++);
                }
            });
            shareSuccess = !!forwardedMessages.length;
        }

        if (shareSuccess) {
            sentContents.push(sharedContent);
        }
    }

    if (chatShareMessagerRef.current.setCurrent) {
        chatShareMessagerRef.current.setCurrent(current++);
    }
    return sentContents;
};

/**
 * 聊天中转发已有的消息到其他聊天
 * @param originMessages 要转发的原始消息
 * @param chats 要转发到那些聊天
 * @param onProgress 发送进度变更回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const forwardMessage = async (
    originMessages: ChatMessage | ChatMessage[],
    chats: Chat[],
    onProgress: () => void,
) => {
    if (!Array.isArray(originMessages)) {
        originMessages = [originMessages];
    }
    for (const chat of chats) {
        const messages = originMessages.map((m) =>
            createChatMessage({
                user: getCurrentUserID(),
                cgid: chat.gid,
                type: TYPES.normal,
                content: m.content,
                contentType: m.contentType,
                data: {
                    forwardFrom: {
                        gid: m.gid,
                        user: m.senderId,
                        date: m.date,
                    },
                    ...m.data,
                },
            }),
        );
        await sendChatMessage(messages, chat);
        onProgress?.();
    }
    return originMessages;
};

/**
 * 创建一个 Emoji 聊天消息
 * @param {string} emojiIcon emojiIcon 表情名称
 * @param {Chat|{gid:string}} chat 聊天对象
 * @returns {ChatMessage} 聊天消息实例
 */
export const createEmojiChatMessage = (emojiIcon, chat) =>
    createChatMessage({
        contentType: CONTENT_TYPES.emotion,
        content: JSON.stringify({type: 'emoji', content: emojiIcon}),
        user: getCurrentUserID(),
        cgid: chat.gid,
    });

/**
 * 发送 Emoji 聊天消息
 * @param {string} emojiIcon emojiIcon 表情名称
 * @param {Chat|{gid:string}} chat 聊天对象
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const sendEmojiMessage = (emojiIcon, chat) =>
    sendChatMessage(createEmojiChatMessage(emojiIcon, chat), chat, true);

/**
 * 重命名聊天
 * @param {Chat} chat 聊天实例
 * @param {string} newName 新的聊天名称
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const renameChat = (chat, newName) => {
    if (chat && (chat.canRename(getCurrentUser()) || getCurrentUser().admin === 'super')) {
        if (chat.id) {
            return socket.send({
                method: 'chatRename',
                params: [chat.gid, newName],
            });
        }
        return Promise.reject(new Error('Cannot rename a local chat.'));
    }
    return Promise.reject(new Error('You have no permission to rename the chat.'));
};

/**
 * 向服务器发送聊天消息
 * @param messages 要发送聊天消息列表
 * @param chat 聊天实例
 * @param isSystemMessage 是否是系统消息
 * @returns 使用 Promise 异步返回处理结果
 */
export const sendChatMessage = async (
    messages: ChatMessage | ChatMessage[],
    chat?: Chat | null,
    isSystemMessage = false,
) => {
    if (!Array.isArray(messages)) {
        messages = [messages];
    }

    if (!chat) {
        chat = chatsStore.getChat(messages[0].cgid);
        if (!chat) {
            return Promise.reject(new Error('Chat is not set before send messages.'));
        }
    } else if (!(chat instanceof Chat)) {
        chat = chatsStore.getChat(chat.gid);
    }

    if (!isSystemMessage && chat.isReadonly(getCurrentUser())) {
        return Promise.reject(Lang.string('chat.blockedCommitterTip'));
    }

    const isOnline = isUserOnline();

    for (const message of messages) {
        message.date = Date.now();
        if (!isOnline) {
            message.markSendFailed();
            continue;
        }

        const command = message.getCommand();
        if (command) {
            if (command.action === 'version') {
                const specialVersionName = getSpecialVersionName();
                const specialVersion = specialVersionName ? ` for ${specialVersionName}` : '';
                const hotText = process.env.HOT ? '(HOT)' : '';
                const contentLines = [];
                contentLines.push(
                    `version       = '${PKG.name} ${PKG.version}${PKG.buildVersion ? `.${PKG.buildVersion}` : ''}${specialVersion}${hotText}';`,
                    `serverVersion = '${getCurrentUser().serverVersion}';`,
                    `buildTime     = '${PKG.buildTime ? formatDate(PKG.buildTime) : ''}';`,
                    `commit        = '${PKG.commit}';${PKG.hooksInfo ? `\nhooks         = '${PKG.hooksInfo}';` : ''}`,
                    `lang          = '${Lang.name}';`,
                    `platform      = '${platform.displayName}';`,
                    `os            = '${platform.access('env.os')}';`,
                );
                if (platform.has('env.arch')) {
                    contentLines.push(`arch          = '${platform.access('env.arch')}';`);
                }
                message.content = contentLines.join('\n');
            } else if (command.action === 'dataPath' && platform.has('os.createUserDataPath')) {
                message.content = [
                    `$$dataPath = '${platform.call('os.createUserDataPath', getCurrentUser().identify, '', '')}';`,
                ].join('\n');
            }
        }
    }

    chatMessagesStore.store(messages, {putToDatabase: false, unread: false});

    if (!isSystemMessage) {
        events.emit(EVENT.message_send, messages, chat);
    }

    if (!isOnline) {
        return Promise.resolve();
    }

    return socket
        .sendAndListen(
            {
                method: 'messagesend',
                params: [messages.map((m) => m.plainServer())],
            },
            chat,
        )
        .catch(() => {
            for (const message of messages) {
                message.markSendFailed();
            }
            chatMessagesStore.store(messages);
        });
};

/**
 * 将图片文件通过 Base64 编码发送
 * @param imageFile 图片文件
 * @param chat 聊天实例
 * @returns 使用 Promise 异步返回处理结果
 */
const sendImageAsBase64 = async (imageFile: FileData, chat: Chat) => {
    try {
        const {base64} = await fileToBase64(imageFile.originFile as File);
        const message = createChatMessage({
            user: getCurrentUserID(),
            cgid: chat.gid,
            contentType: CONTENT_TYPES.image,
        });
        const info = await getImageSize(base64);
        message.imageContent = {
            content: base64,
            time: Date.now(),
            name: imageFile.name,
            size: imageFile.size,
            send: true,
            type: 'base64',
            width: info.width,
            height: info.height,
        };
        await sendChatMessage(message, chat);
    } catch (error) {
        Messager.show(Lang.error('CANNOT_HANDLE_IMAGE'), {type: 'danger'});
        if (DEBUG) {
            console.warn('Cannot get image information', imageFile);
        }
    }
};

/**
 * 发送图片消息并上传图片到服务器
 * @param imageFile 图片文件
 * @param chat 聊天实例
 * @param onProgress 图片发送进度变更回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export const sendImageMessage = async (
    file: File | FileData,
    chat: Chat,
    onProgress?: (progress: number, file: FileData, loaded: number) => void,
) => {
    const imageFile = FileData.create(file);
    const {size} = imageFile;
    if (size === 0) {
        Messager.show(Lang.error('UPLOAD_FILE_IS_ZERO_SIZE'), {type: 'warning'});
        return;
    }
    if (size < MAX_BASE64_IMAGE_SIZE) {
        return sendImageAsBase64(imageFile, chat);
    }
    if (!checkUploadFileSize(size)) {
        Messager.show(Lang.format('error.UPLOAD_FILE_IS_TOO_LARGE', formatBytes(getCurrentUser().uploadFileSize)), {
            type: 'warning',
            autoHide: true,
        });
        return;
    }

    const message = createChatMessage({
        user: getCurrentUserID(),
        cgid: chat.gid,
        contentType: CONTENT_TYPES.image,
    });

    const imgeData = {
        gid: message.gid,
        cgid: message.cgid,
        senderId: message.senderId,
        width: 0,
        height: 0,
    };
    // 获取图片宽度和高度信息
    try {
        const size = await getImageSize(imageFile.viewUrl);
        imgeData.width = size.width;
        imgeData.height = size.height;
    } catch (error) {
        Messager.show(Lang.error('CANNOT_HANDLE_IMAGE'), {type: 'danger'});
        return;
    }
    imageFile.change(imgeData);

    message.imageContent = imageFile;

    imageFile.sendMethod = 'sendImageMessage';

    const [error] = await to(uploadFile(imageFile, {onProgress, copyCache: true}));
    if (error) {
        Messager.show(`${Lang.string('file.uploadFailed')}(${Lang.error(error)})`, {type: 'danger'});
        if (DEBUG) {
            console.error('Upload image file error', {error, imageFile});
        }
        return;
    }

    message.updateImageContent(imageFile.plain());
    message.cacheFilePath = imageFile.cachePath;
    return sendChatMessage(message, chat);
};

/**
 * 创建一个广播聊天消息实例
 * @param {string} message 广播消息内容
 * @param {Chat|{gid: string}} chat 聊天实例对象
 * @returns {ChatMessage} 广播聊天消息实例
 */
export const createBroadcastChatMessage = (message, chat) =>
    new ChatMessage({
        content: message,
        user: getCurrentUserID(),
        cgid: chat.gid,
        type: ChatMessage.TYPES.broadcast,
    });

/**
 * 发送广播消息
 * @param {string} message 广播消息内容
 * @param {Chat|{gid: string}} chat 聊天实例对象
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const sendBroadcastChatMessage = (message, chat) =>
    sendChatMessage(createBroadcastChatMessage(message, chat), chat, true);

/**
 * 邀请其他成员到给定的聊天中
 * @param {Chat} chat 聊天实例
 * @param {number[]} newMembers 要邀请的成员列表
 * @param {Object} newChatSetting 当需要创建新的聊天实例时的属性对象
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const inviteMembersToChat = (chat, newMembers, newChatSetting) => {
    if (getCurrentUser().admin === 'super' || chat.canInvite(getCurrentUser())) {
        if (!chat.isOne2One) {
            return socket.sendAndListen({
                method: 'chatInvite',
                params: [chat.gid, newMembers],
            });
        }
        newMembers.push(...chat.members);
        return createChatWithMembers(newMembers, newChatSetting);
    }
};

/**
 * 将给定的成员从聊天中剔除
 * @param {Chat} chat 聊天实例
 * @param {Pick<Member, 'id'>} kickOfWho 要踢出的成员实例
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const kickOfMemberFromChat = (chat, kickOfWho) => {
    if (chat.canKickOff(getCurrentUser(), kickOfWho) || getCurrentUser().admin === 'super') {
        return socket.sendAndListen({
            method: 'chatKick',
            params: [chat.gid, [kickOfWho.id]],
        });
    }
};

/**
 * 批量将成员从聊天中剔除
 * @param {Chat} chat 聊天实例
 * @param {Member} kickList 要踢出的成员 ID 数组
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const batchKickMemberFromChat = (chat, kickList) => {
    let ableToKick = true;
    kickList.forEach((memberId) => {
        if (!chat.canKickOff(getCurrentUser(), {id: memberId})) {
            ableToKick = false;
        }
    });
    if (ableToKick) {
        return socket.sendAndListen({
            method: 'chatKick',
            params: [chat.gid, kickList],
        });
    }
};

/**
 * 加入或退出聊天
 * @param {Chat} chat 聊天实例
 * @param {boolean} [join=true] 如果为 `true`，则为加入聊天，否则为退出聊天
 * @returns {Promise<Chat>} 使用 Promise 异步返回处理结果
 */
export const joinOrExitChat = (chat, join = true) =>
    socket
        .sendAndListen({
            method: join ? 'chatJoin' : 'chatLeave',
            params: [chat.gid],
        })
        .then((theChat) => {
            if (theChat) {
                events.emit(EVENT.chat_action_changed, chat, 'join', join);
            }
        });

/**
 * 退出指定的聊天
 * @param {Chat} chat 聊天实例
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const exitChat = (chat) => {
    if (chat.canExit()) {
        return joinOrExitChat(chat, false);
    }
    return Promise.reject();
};

/**
 * 解散聊天
 * @param {Chat} chat 聊天实例
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const dismissChat = (chat) => {
    if (chat.canDismiss(getCurrentUser())) {
        return socket
            .sendAndListen({
                method: 'chatDismiss',
                params: [chat.gid],
            })
            .then((theChat) => {
                if (theChat) {
                    events.emit(EVENT.chat_action_changed, chat, 'dismiss');
                }
            });
    }
    return Promise.reject();
};

/**
 * 群组聊天置顶消息
 * @param chat 聊天实例
 * @param messageIds 消息id
 * @returns 使用 Promise 异步返回处理结果
 */
export const pinMessage = (chat: Chat, messageIds: number | number[]) => {
    if (!chat.isOne2One && !chat.isOwner(getCurrentUser())) {
        return;
    }

    if (typeof messageIds === 'number') {
        messageIds = [messageIds];
    }
    // 聊天记录窗口中调用该方法时聚焦窗口
    return socket.sendAndListen({
        method: 'chatPinMessages',
        params: [chat.gid, messageIds, getCurrentUser().id],
    });
};

/**
 * 群组聊天取消置顶消息
 * @param chat 聊天实例
 * @param messageIds 消息id
 * @returns  使用 Promise 异步返回处理结果
 */
export const unpinMessage = (chat: Chat, messageIds: number | number[]) => {
    if (!chat.isOne2One && !chat.isOwner(getCurrentUser())) {
        return;
    }

    if (typeof messageIds === 'number') {
        messageIds = [messageIds];
    }
    // 聊天记录窗口中调用该方法时聚焦窗口
    return socket.sendAndListen({
        method: 'chatUnpinMessages',
        params: [chat.gid, messageIds, getCurrentUserID()],
    });
};

/**
 * 绑定发送聊天消息事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onSendChatMessages = (listener: (messages: ChatMessage[], chat: Chat) => void) =>
    events.on(EVENT.message_send, listener);

/**
 * 监听用户成功加入会话事件
 * @param {Function} listener 事件回调函数
 * @returns {symbol} 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onChatActionChanged = (listener) => events.on(EVENT.chat_action_changed, listener);

/**
 * 向服务器主动请求获取用户聊天列表
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const fetchChatList = () =>
    socket.sendAndListen({
        method: 'chatGetList',
    });

/**
 * 从服务器获取指定的聊天信息
 * @param {string} cgid 聊天 gid
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const fetchChat = (cgid) =>
    socket.sendAndListen({
        method: 'chatCreate',
        params: [cgid, '', '', '', 0, false],
    });

/**
 * 请求删除消息（撤销消息）
 * @param {ChatMessage} message 要删除的消息对象
 * @param {Chat} chat 消息所在的会话
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const deleteChatMessage = (message, chat) => {
    if (!message.canDelete(getCurrentUser()) && !chat.isOwner(getCurrentUser())) {
        return Promise.reject(new Error("Current use can't delete the message."));
    }
    const messageData = message.plainServer();
    messageData.deleted = true;
    // 聊天记录窗口中调用该方法时聚焦窗口
    return socket.sendAndListen({
        method: 'messageretract',
        params: [[messageData]],
    });
};

// 设置 Socket 接收消息处理函数
socket.setHandlers(imServerHandlers);

export default {
    fetchChatList,
    fetchChat,
    createChat,
    createChatWithMembers,
    setCommitters: setChatCommitters,
    toggleChatPublic,
    toggleChatGroupPublic,
    toggleChatStar,
    toggleFreezeChat,
    toggleHideChat,
    toggleMuteChat,
    renameChat,
    sendChatMessage,
    joinOrExitChat,
    exitChat,
    dismissChat,
    inviteMembersToChat,
    shareContentToChats,
    sendImageMessage,
    createTextChatMessage,
    createEmojiChatMessage,
    sendTextMessage,
    sendEmojiMessage,
    onSendChatMessages,
    kickOfMemberFromChat,
};
