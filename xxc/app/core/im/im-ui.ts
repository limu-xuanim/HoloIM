import {showMessager} from '~/app/components/messager';
import Modal from '~/app/components/modal';
import Config from '~/app/config';
import platform from '~/app/platform';
import {isEmptyString} from '~/app/utils/check-empty';
import {getTimeBeforeDesc} from '~/app/utils/date-helper';
import delay from '~/app/utils/delay';
import {scrollIntoView, strip} from '~/app/utils/html-helper';
import {setPerfCommandHandlers} from '~/app/utils/perf';
import {formatKeyDecoration} from '~/app/utils/shortcut';
import {convertTimes, formatBytes, restoreMessageContainAt} from '~/app/utils/string-helper';
import {showCreateChatDialog} from '~/app/views/chats/chat-create-dialog';
import {executeCommand, executeCommandLine, registerCommand} from '../commander';
import {addContextMenuCreator, getMenuItemsForContext, tryAddDividerItem, tryRemoveLastDivider} from '../context-menu';
import events from '../events';
import FileData from '../files/file-data';
import {checkUploadFileSize} from '../files/files-network';
import filesStore from '../files/files-store';
import Lang from '../lang';
import membersStore from '../members/members-store';
import {getAllUserConfig, getCurrentUser, onSwapUser} from '../profile';
import {isRoutePathMatch, setRoutePath} from '../ui/router';
import {
    activeNextChatOnMenu,
    getActiveChatGid,
    isActiveChat,
    onActiveChat,
    setActiveChat,
} from './chat-active-state';
import ChatCacheInfo from './chat-cache-info';
import ChatMessage from './chat-message';
import {renderChatMessageContent} from './chat-message-helper';
import {fetchHistory} from './chat-messages-history';
import chatMessagesListStore from './chat-messages-list-store';
import chatMessagesStore from './chat-messages-store';
import chatsStore from './chats-store';
import {
    createChatWithMembers,
    deleteChatMessage,
    dismissChat,
    exitChat,
    joinOrExitChat,
    kickOfMemberFromChat,
    onChatActionChanged,
    pinMessage,
    renameChat,
    toggleChatStar,
    toggleFreezeChat,
    toggleHideChat,
    toggleMuteChat,
    unpinMessage,
} from './im-server';

/**
 * 当前激活过的聊天缓存
 */
const activeCaches = new Map<string, ChatCacheInfo>();

const SEND_CONTENT_TO_CHAT = 'im.chats.sendContentToChat';
const SUGGEST_SEND_IMAGE = 'im.chats.suggestSendImage';
const SENDBOX_FOCUS = 'im.chat.sendbox.focus';
const DISSMISSED_CHAT = 'im.chats.dismissedChat';

/**
 * 检查聊天缓存是否变更
 * @returns 如果返回 `true` 则为有聊天缓存变更，否则为没有聊天缓存变更
 */
export const isChatsCacheChanged = () => {
    const now = Date.now();
    for (const [cgid, cacheInfo] of activeCaches) {
        if (isActiveChat(cgid)) {
            continue;
        }
        // console.log('isChatsCacheChanged', cgid, cacheInfo.isExpired(now, Config.ui['chat.cacheLife']), cacheInfo);
        if (cacheInfo.isExpired(now, convertTimes(Config.ui['chat.cacheLife']))) {
            return true;
        }
    }
    return false;
};

/**
 * 保存聊天缓存在界面上的状态，以便于恢复界面
 * @param {string} cgid 聊天 gid
 * @param {{draft: any, scrollPos: number}} newState 新的状态
 * @returns {void}
 */
export const setChatCacheState = (cgid, newState) => {
    const cacheInfo = activeCaches.get(cgid);
    if (cacheInfo) {
        cacheInfo.keepState(newState);
    }
};

/**
 * 取出聊天缓存在界面上保存的状态
 * @param {string} cgid 聊天 gid
 * @param {string} stateName 状态名称，可以为 `'draft'` 或 `'scrollPos'`
 * @returns {any} 返回状态值
 */
export const takeOutChatCacheState = (cgid, stateName) => {
    const cacheInfo = activeCaches.get(cgid);
    if (cacheInfo) {
        return cacheInfo.takeOutState(stateName);
    }
};

/**
 * 尝试激活聊天并获取缓存中的聊天消息 GID 列表
 * @param activeChatId 要激活的聊天 ID
 * @returns 聊天消息 GID 列表
 */
export const getActivatedCacheChatsGID = (activeChatId?: string) => {
    if (activeChatId && chatsStore.getChat(activeChatId)) {
        const cacheInfo = activeCaches.get(activeChatId);
        if (!cacheInfo) {
            activeCaches.set(activeChatId, new ChatCacheInfo(activeChatId));
        } else {
            cacheInfo.active();
        }
    }
    const now = Date.now();
    return Array.from(activeCaches.keys()).filter((cgid) => {
        if (isActiveChat(cgid)) {
            return true;
        }
        const cacheInfo = activeCaches.get(cgid);
        if (cacheInfo.isCleaned) {
            return false;
        }
        if (cacheInfo.isExpired(now, convertTimes(Config.ui['chat.cacheLife']))) {
            cacheInfo.clean();
            chatsStore.getChat(cgid)?.shrinkMessageIndexList(20); // 清理缓存时尝试缩小会话消息范围到 20
            if (DEBUG) {
                const chat = chatsStore.getChat(cacheInfo.cgid);
                console.collapse('Chat cache cleaned', 'tealBg', chat ? chat.name : null, 'tealPale');
                console.log('cache', cacheInfo);
                console.groupEnd();
            }
            return false;
        }
        return true;
    });
};

type SendContentToChatOptions = Partial<{
    type: 'text' | 'mention' | 'image' | 'emoji';
    cgid: string;
    clear: boolean;
    send: boolean;
    skipDuplicateText: boolean;
    appendSpaceBefore: boolean;
}>;

/**
 * 向聊天发送框添加内容
 * @param content 文本、图片文件内容或要提及的用户列表
 * @param options 选项
 * @param options.type 内容类型，可以为 `'text'`、`'mention'`、`'emoji'` 或 `'image'`
 * @param options.cgid 聊天 GID
 * @param options.clear 是否清空输入框之前的内容
 * @param options.skipDuplicateText 是否忽略重复的内容
 * @param options.appendSpaceBefore 是否尝试在原始文本和新增加的文本之间添加空格
 */
export const sendContentToChat = (content: File | string, options: SendContentToChatOptions = {}) => {
    const {type = 'text', cgid = getActiveChatGid()} = options;

    if (type === 'text' && typeof content === 'string') {
        content = restoreMessageContainAt(content);
    }
    return events.emit(`${SEND_CONTENT_TO_CHAT}.${cgid}`, {
        content,
        ...options,
    });
};

/**
 * 在聊天发送框中 @ 用户
 * @param members 要 @ 的成员 ID 或成员对象列表
 * @param options 选项
 * @param options.cgid 聊天 GID
 * @param options.clear 是否清空输入框之前的内容
 * @param options.insertTrailingSpace 是否在提及末尾添加空格
 */
export const mentionMemberInSendbox = (
    members: number | number[],
    options: Omit<SendContentToChatOptions, 'type'> = {},
) => {
    if (!members) {
        return;
    }

    if (!Array.isArray(members)) {
        members = [members];
    }

    const membersStr = membersStore
        .getMembers(members.map((m) => +m))
        .map((m) => m.displayName)
        .join(',');

    sendContentToChat(membersStr, {
        type: 'mention',
        ...options,
    });
};

/**
 * 将多个文件进行分类
 * @param fileList 文件列表
 * @returns 分类结果
 */
const categorizeFiles = (fileList: FileList | File[]) => {
    let hasEmptyFile = false;
    let fileTypeError = false;
    let isAllImageFiles = true;
    const normalFiles: File[] = [];
    const largeFiles: File[] = [];

    for (const file of fileList) {
        if (!file) {
            continue;
        }

        if (isAllImageFiles && !file.type.startsWith('image/')) {
            isAllImageFiles = false;
        }
        if (checkUploadFileSize(file.size)) {
            normalFiles.push(file);
            continue;
        }

        if (file.size <= 0) {
            if (file.type === '') {
                fileTypeError = true;
            } else {
                hasEmptyFile = true;
            }
            continue;
        }

        largeFiles.push(file);
    }

    return {
        hasEmptyFile,
        fileTypeError,
        isAllImageFiles,
        normalFiles,
        largeFiles,
    };
};

/**
 * 将列表中的图片文件插入当前会话发送流程（非图片项会被忽略）
 * @param fileList 本地文件列表
 * @param cgid 聊天 gid
 */
export const sendImageFilesToChat = async (fileList: FileList | File[], cgid = getActiveChatGid()) => {
    if (!fileList || !fileList.length) {
        return;
    }

    const {hasEmptyFile, fileTypeError, normalFiles, largeFiles} = categorizeFiles(fileList);
    if (normalFiles.length || largeFiles.length) {
        for (const file of normalFiles) {
            if (file.type.startsWith('image/')) {
                sendContentToChat(file, {type: 'image', cgid});
            }
        }
        showErrorMessager(fileTypeError, hasEmptyFile, !!largeFiles.length);
    }
};

/**
 * 展示错误消息
 * @param fileTypeError 类型错误
 * @param hasEmptyFile 空文件错误
 * @param tooLarge 文件太大错误
 */
const showErrorMessager = (fileTypeError = false, hasEmptyFile = false, tooLarge = false) => {
    if (fileTypeError) {
        showMessager(Lang.error('UPLOAD_FILE_IS_TYPE_ERROR'), {type: 'warning'});
    }
    if (hasEmptyFile) {
        showMessager(Lang.error('UPLOAD_FILE_IS_ZERO_SIZE'), {type: 'warning'});
    }
    if (tooLarge) {
        showMessager(
            Lang.error({code: 'UPLOAD_FILE_IS_TOO_LARGE', formats: formatBytes(getCurrentUser().uploadFileSize)}),
            {type: 'warning'},
        );
    }
};

/**
 * 绑定聊天发送框接收到新内容事件
 * @param cgid 聊天 GID
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onSendContentToChat = (
    cgid: string,
    listener: (
        options: SendContentToChatOptions & {
            content: File | FileData | string | Partial<{shortname: string; uc_full: string; unicode: string}>;
        },
    ) => void,
) => events.on(`${SEND_CONTENT_TO_CHAT}.${cgid}`, listener);

/**
 * 显示重命名聊天对话框
 * @param {Chat} chat 要重命名的聊天
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const chatRenamePrompt = (chat) => {
    const formerChatName = chat.name;
    return Modal.prompt(Lang.string('chat.rename.title'), chat.name, {
        inputProps: {inputProps: {maxLength: 16}, placeholder: Lang.string('chat.rename.newTitle')},
    }).then((newName) => {
        if (
            chat.name !== newName &&
            newName !== formerChatName &&
            newName.trim() !== formerChatName &&
            String(newName).trim() !== ''
        ) {
            renameChat(chat, String(newName).trim());
        }
    });
};

/**
 * 显示确认退出聊天对话框
 * @param {Chat} chat 要退出的聊天
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const chatExitConfirm = (chat) =>
    Modal.confirm(Lang.format('chat.group.exitConfirm', chat.name)).then((result) => {
        if (result) {
            exitChat(chat);
        }
    });

/**
 * 显示确认解散聊天对话框
 * @param {Chat} chat 要解散的聊天
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const chatDismissConfirm = (chat) =>
    Modal.confirm(Lang.format('chat.group.dismissConfirm', chat.name)).then((result) => {
        if (result) {
            return dismissChat(chat).then(() => Promise.resolve());
        }
        return result;
    });

/**
 * 根据成员清单创建讨论组
 * @param {Set<number>|number[]} groupMembers 聊天成员
 * @returns {Promise} 使用 Promise 异步返回处理结果
 */
export const createGroupChat = (groupMembers) =>
    Modal.prompt(Lang.string('chat.create.newChatNameTip'), '', {
        inputProps: {placeholder: Lang.string('chat.rename.newTitle')},
        onSubmit: (newName) => {
            if (!newName) {
                Modal.alert(Lang.string('chat.rename.newTitleRequired'));
                return false;
            }
        },
    }).then((newName) => {
        if (newName) {
            return createChatWithMembers(groupMembers, {name: newName});
        }
    });

/**
 * 绑定推荐发送剪切板图片事件
 * @param {Function} listener 事件回调函数
 * @returns {symbol} 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onSuggestSendImage = (listener) => events.on(SUGGEST_SEND_IMAGE, listener);

/**
 * 激活聊天发送框并可以选择性的发送文本内容到聊天发送框
 * @param chat 聊天实例
 * @param sendboxContent 要发送到聊天框的内容
 */
export const emitChatSendboxFocus = (chat: Chat, sendboxContent: string | null = null) => {
    events.emit(SENDBOX_FOCUS, chat, sendboxContent);
    if (getAllUserConfig()?.listenClipboardImage && isEmptyString(sendboxContent)) {
        executeCommandLine('suggestClipboardImage');
    }
};

/**
 * 绑定聊天发送框激活事件
 * @param {Function} listener 事件回调函数
 * @returns {symbol} 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onChatSendboxFocus = (listener) => events.on(SENDBOX_FOCUS, listener);

/**
 * 获取会话最近相关的成员列表
 * @param {string} cgid 会话 GID
 * @param {Object} options 选项
 * @param {number} [options.fillRest=true] 当最近数目少于 limit 时，使用其他成员进行填充
 * @param {number} [options.limit=5] 最多返回数目
 * @returns {number[]} 成员 ID 列表
 */
export function getRecentMembersOfGroupChat(cgid, options) {
    if (typeof options === 'number') {
        options = {limit: options};
    }
    const {limit = 5, fillRest = true} = options || {};
    const chat = chatsStore.getChat(cgid);
    if (!chat) {
        return [];
    }

    const membersList = [];
    const membersSet = new Set();
    const {latestMessageIndexes, members} = chat;

    for (let i = latestMessageIndexes.length - 1; i >= 0; --i) {
        const message = chatMessagesStore.getMessage(latestMessageIndexes[i], cgid, 'index');
        if (!message || message.isNotification) {
            continue;
        }
        const {senderId} = message;
        if (membersSet.has(senderId) || (members.size > 0 && !members.has(senderId))) {
            continue;
        }
        membersSet.add(senderId);
        membersList.push(senderId);
        if (membersList.length >= limit) {
            break;
        }
    }

    if (membersList.length < limit && fillRest) {
        for (const memberID of members) {
            if (membersSet.has(memberID)) {
                continue;
            }
            membersSet.add(memberID);
            membersList.push(memberID);
            if (membersList.length >= limit) {
                break;
            }
        }
    }

    return membersList;
}

/**
 * 获取会话最近相关的成员列表
 * @param {string} cgid 会话 GID
 * @param {string} searchKeys 搜索关键字
 * @param {number} [limit=20] 最多返回数目
 * @returns {number[]} 成员 ID 列表
 */
export function searchMembersOfGroupChat(cgid, searchKeys, limit = 5) {
    const chat = chatsStore.getChat(cgid);
    if (!chat) {
        return [];
    }
    let {members} = chat;
    if (!members.size) {
        members = new Set(getRecentMembersOfGroupChat(cgid, 100));
    }
    if (!members.size) {
        return [];
    }

    let membersList = [];
    members.forEach((memberID) => {
        const member = membersStore.getItemFromCache(memberID);
        if (!member) {
            return;
        }
        const score = member.getMatchScore(searchKeys);
        if (score) {
            membersList.push({score, member: memberID});
        }
    });
    if (membersList.length) {
        membersList.sort((x, y) => y.score - x.score);
        membersList = membersList.map((x) => x.member);
        if (limit && membersList.length > limit) {
            return membersList.slice(0, limit);
        }
    }
    return membersList;
}

/**
 * 在会话消息列表界面上显示会话消息
 * @param {string} cgid 会话消息所属会话 GID
 * @param {number} messageID 消息 ID
 * @param {number} [maxScrollUpTimes=5] 最多向上滚动查找次数，如果设置为 0，则不滚动查找直接在对话框中显示
 * @returns {Promise<boolean>} 使用 Promise 异步返回处理结果
 */
export async function showMessageInList(cgid, messageID, maxScrollUpTimes = 5) {
    // 尝试打开会话界面
    if (!isRoutePathMatch('chats', '*', cgid)) {
        setRoutePath('chats', 'recents', cgid);
        await delay(1000);
    }

    // 直接滚动到指定消息所在位置
    const scrollToMessage = () => {
        // 检查界面上是否有消息元素
        const element = document.getElementById(`message-${messageID}`);

        if (!element) {
            return false;
        }

        // 移除列表上已经存在的高亮效果
        element
            .closest('.app-message-list')
            .querySelectorAll('.highlight-focus')
            .forEach((ele) => ele.classList.remove('highlight-focus'));
        if (scrollIntoView(element, {behavior: 'smooth', block: 'center'})) {
            setTimeout(() => {
                element.classList.add('highlight-focus');
                setTimeout(() => {
                    element.classList.remove('highlight-focus');
                }, 5000);
            }, 500);
            return true;
        }
        return false;
    };

    // 尝试直接滚动到指定消息所在位置
    if (scrollToMessage()) {
        return true;
    }

    if (!maxScrollUpTimes) {
        return false;
    }

    for (let i = 0; i < maxScrollUpTimes; ++i) {
        const result = await chatMessagesListStore.loadMoreList(cgid);
        if (!result) {
            return false;
        }
        const {list} = chatMessagesListStore.getList(cgid);

        // 如果向上查找 ID 已经小于给定 ID，表示指定的消息在该会话可能不存在
        if (list[0] < messageID) {
            return false;
        }

        if (list.includes(messageID)) {
            // 等待列表界面加载完毕
            await delay(600 * (i + 1));
            return scrollToMessage();
        }
    }
    return false;
}

/**
 * 在界面上显示会话消息，尽量优先在会话消息列表上显示，如果没有则向上滚动列表，如果超过指定滚动次数则在对话框中显示
 * @param cgid 会话消息所属会话 GID
 * @param messageID 消息 ID
 * @param maxScrollUpTimes 最多向上滚动查找次数，如果设置为 0，则不滚动查找直接在对话框中显示
 * @returns 使用 Promise 异步返回处理结果
 */
export async function showChatMessage(cgid: string, messageID: number, maxScrollUpTimes = 5) {
    messageID = +messageID;
    const showInListResult = await showMessageInList(cgid, messageID, maxScrollUpTimes);
    if (!showInListResult) {
        return executeCommand('showMessageInDialog', messageID, cgid);
    }
}

/**
 * 绑定上下文菜单
 * @returns {void}
 */
const addContextMenuCreators = () => {
    // 会话列表上方的 + 按钮
    addContextMenuCreator('menu.add', ({filterType}) => {
        const items = [
            {
                id: 'menu-add-chat',
                label: Lang.string('chat.menu.createChat'),
                click: () => {
                    showCreateChatDialog();
                },
            },
        ];
        return items;
    });

    // 添加会话相关操作菜单
    addContextMenuCreator(
        'chat.actions',
        ({chat}) => {
            const menu = [];
            if (chat.isDeleted || chat.isDismissed) {
                return menu;
            }

            const currentUser = getCurrentUser();
            // 系统会话不允许进行收藏操作
            if (!chat.isSystem && !chat.isDeleted) {
                menu.push({
                    id: 'chat-star',
                    label: Lang.string(chat.star ? 'chat.toolbar.unstar' : 'chat.toolbar.star'),
                    click: () => {
                        toggleChatStar(chat);
                    },
                });
            }
            if (!chat.isDismissed) {
                menu.push({
                    id: 'chat-mute',
                    label: Lang.string(chat.mute ? 'chat.toolbar.cancelMute' : 'chat.toolbar.mute'),
                    click: () => {
                        toggleMuteChat(chat);
                    },
                });
            }

            if (chat.public && platform.has('clipboard.writeText')) {
                menu.push({
                    id: 'chat-invite-link',
                    label: Lang.string('chat.public.copyInvitation'),
                    click: () => {
                        platform.call('clipboard.writeText', `[${chat.name}](xxc://confirmJoinPublicChat/${chat.gid})`);
                    },
                });
            }

            if (chat.canRename(currentUser)) {
                menu.push({
                    id: 'chat-rename',
                    label: Lang.string('common.rename'),
                    click: () => {
                        chatRenamePrompt(chat);
                    },
                });
            }

            if (chat.canDismiss(currentUser)) {
                menu.push({
                    id: 'chat-dismiss',
                    label: Lang.string('chat.group.dismiss'),
                    click: () => {
                        chatDismissConfirm(chat);
                    },
                });
            }

            if (chat.canExit()) {
                tryAddDividerItem(menu);
                menu.push({
                    id: 'chat-exit',
                    label: Lang.string('chat.group.exit'),
                    click: () => {
                        chatExitConfirm(chat);
                    },
                });
            }

            return menu;
        },
        {apiLevel: 5},
    );

    // 添加聊天工具栏更多菜单生成器
    addContextMenuCreator('chat.toolbar.more', (context) => getMenuItemsForContext('chat.actions', context), {
        apiLevel: 5,
    });

    // 添加会话消息发送框发送按钮右键菜单生成器
    addContextMenuCreator(
        'chat.sendbox.sendButton',
        () => {
            const currentHotKey = formatKeyDecoration(getAllUserConfig().sendMessageHotkey);
            let itemsChecked = false;
            const items = [
                {
                    label: Lang.string('chat.sendbox.changeHotkeyTip'),
                    disabled: true,
                },
            ];
            Config.ui['hotkey.sendMessageOptions'].forEach((x) => {
                x = formatKeyDecoration(x);
                if (currentHotKey === x) {
                    itemsChecked = true;
                }
                items.push({
                    label: x,
                    click: () => {
                        getAllUserConfig().sendMessageHotkey = x;
                    },
                    checked: currentHotKey === x,
                });
            });
            if (!itemsChecked) {
                items.push({
                    label: currentHotKey,
                    checked: true,
                });
            }
            return items;
        },
        {apiLevel: 5},
    );

    // 添加聊天上下文菜单生成器
    addContextMenuCreator(
        'chat.menu',
        (context) => {
            let {chat} = context;
            if (typeof chat === 'string') {
                const gid = chat;
                chat = chatsStore.getChat(gid);
                if (!chat || chat.isNotInGroup) {
                    return [
                        {
                            id: 'joinPublicGroup',
                            label: Lang.string('chat.create.join'),
                            href: `xxc://confirmJoinPublicChat/${gid}`,
                        },
                    ];
                }
                context.chat = chat;
            }
            const {menuType = null, viewType = null} = context;
            const menu = [];
            if (chat.isOne2One) {
                menu.push(...getMenuItemsForContext('member', {member: chat.theOtherMemberID}));
                tryAddDividerItem(menu);
            }

            menu.push(...getMenuItemsForContext('chat.actions', context));

            if (!chat.isDismissed) {
                // allow user to cancel hide chat when xxc is newer than xxb.
                if (chat.hidden) {
                    menu.push({
                        id: 'chat-hide',
                        label: Lang.string('chat.toolbar.cancelHide'),
                        click: () => {
                            toggleHideChat(chat, false);
                        },
                    });
                }
                if (menuType === 'recents') {
                    menu.push({
                        label: Lang.string('chat.toolbar.freeze'),
                        click: () => {
                            toggleFreezeChat(chat);
                        },
                    });
                }
            }

            if (DEBUG && platform.has('clipboard.writeText')) {
                tryAddDividerItem(menu);
                menu.push({
                    id: 'chat-copy-gid',
                    label: Lang.string('chat.copyChatGID'),
                    click: () => {
                        platform.call('clipboard.writeText', chat.gid);
                    },
                });
            }

            return tryRemoveLastDivider(menu);
        },
        {apiLevel: 5},
    );

    // 添加置顶消息右键上下文菜单生成器
    addContextMenuCreator('chat.pinned', ({chat, message}: {chat: Chat; message: ChatMessage}) => [
        !message.isImageContent &&
            !message.isObjectContent && {
                id: 'copy-message',
                label: Lang.string('common.copy'),
                click: () => {
                    let copyHtmlText = message.isPlainTextContent ? message.content : renderChatMessageContent(message);
                    copyHtmlText = restoreMessageContainAt(copyHtmlText);
                    const copyPlainText = restoreMessageContainAt(message.content);
                    const clipboard = platform.access('clipboard');
                    if (clipboard.write) {
                        clipboard.write({
                            text: message.isPlainTextContent ? copyHtmlText : strip(copyHtmlText),
                            html: copyHtmlText,
                        });
                        return;
                    }
                    if (clipboard.writeHTML) {
                        clipboard.writeHTML(copyHtmlText);
                        return;
                    }
                    if (clipboard.writeText) {
                        clipboard.writeText(copyPlainText);
                    }
                },
            },
        {
            id: 'message-view',
            label: Lang.string('common.viewDetail'),
            click: () => showChatMessage(chat.gid, message.id),
        },
        (chat.isOne2One || chat.isOwner(getCurrentUser())) && {
            id: 'pinned-unpin',
            label: Lang.string('chat.message.unpin'),
            click: () => unpinMessage(chat, message.id),
        },
    ]);

    // 添加聊天成员上下文件菜单生成器
    addContextMenuCreator(
        'chat.member',
        ({member, chat}) => {
            const menu = [];

            menu.push(...getMenuItemsForContext('member', {member}));
            tryAddDividerItem(menu);

            const currentUser = getCurrentUser();
            if (member.id !== currentUser.id && chat.isGroupOrSystem) {
                const {cgid} = member;
                menu.push({
                    id: 'member-mention',
                    label: Lang.string(`chat.atHim.${member.gender}`, Lang.string('chat.atHim')),
                    url: `xxc://mentionMemberInSendbox/${encodeURIComponent(`${member.id}`)}`,
                });

                if (!Config.ui['chat.denyChatFromMemberProfile']) {
                    menu.push({
                        id: 'chat-active',
                        label: Lang.string('chat.sendMessage'),
                        url: `#/chats/recents/${cgid}`,
                    });
                }
            }
            return menu;
        },
        {apiLevel: 5},
    );

    // 添加侧边功能区聊天成员上下文件菜单生成器
    addContextMenuCreator(
        'chat.sidebar.member',
        (context) => {
            const {onClickMultiSelection, member, chat} = context;

            const menu = getMenuItemsForContext('chat.member', context);
            const currentUser = getCurrentUser();

            if (chat.canKickOff(currentUser, member)) {
                tryAddDividerItem(menu);
                menu.push({
                    id: 'chat-kickoff',
                    label: Lang.string('chat.kickOffFromGroup'),
                    click: async () => {
                        const result = await Modal.confirm(
                            Lang.format('chat.kickOffFromGroup.confirm', member.displayName),
                        );
                        if (result) {
                            return kickOfMemberFromChat(chat, member);
                        }
                        return Promise.reject();
                    },
                });
            }

            if (onClickMultiSelection) {
                tryAddDividerItem(menu);
                menu.push({
                    id: 'chat-multi-selection',
                    label: Lang.string('common.multiSelection'),
                    click: onClickMultiSelection,
                });
            }

            return menu;
        },
        {apiLevel: 5},
    );

    // 添加获取所有历史记录按钮上下文菜单生成器
    addContextMenuCreator('chats.history.fetchAllButton', (context) => {
        const [chats = null] = context.params;
        const recPerPageMap = {
            oneWeek: 50,
            oneMonth: 80,
            halfYear: 100,
            oneYear: 150,
            twoYear: 200,
            all: 200,
        };
        const handleClick = (item) => {
            const startDate = item.data === 'all' ? 0 : getTimeBeforeDesc(item.data);
            fetchHistory({chats, startDate, recPerPage: recPerPageMap[item.data]});
        };
        return [
            {label: Lang.string('chats.history.selectFetchTime'), disabled: true},
            {
                label: `${Lang.string('time.oneWeek')} (${Lang.string('chats.history.sync.fast')})`,
                data: 'oneWeek',
                click: handleClick,
            },
            {label: Lang.string('time.oneMonth'), data: 'oneMonth', click: handleClick},
            {label: Lang.string('time.halfYear'), data: 'halfYear', click: handleClick},
            {label: Lang.string('time.oneYear'), data: 'oneYear', click: handleClick},
            {label: Lang.string('time.twoYear'), data: 'twoYear', click: handleClick},
            {
                label: `${Lang.string('time.all')} (${Lang.string('chats.history.sync.slow')})`,
                data: 'all',
                click: handleClick,
            },
        ];
    });

    // 添加会话列表类型切换菜单生成器
    addContextMenuCreator(
        'chats.menu',
        ({filterType, activeChatId}) =>
            ['recents', 'groups', 'private'].map((x) => ({
                id: x,
                label: Lang.string(`chat.menu.${x}`),
                url: `#/chats/${x}${activeChatId ? `/${activeChatId}` : ''}`,
                checked: filterType === x,
            })),
        {apiLevel: 5},
    );

    // 同步历史消息类型菜单生成器
    addContextMenuCreator(
        'chats.sync.type.menu',
        ({chatType, setChatType}) =>
            ['currentChat', 'allChats'].map((x) => ({
                id: x,
                label: Lang.string(`chat.menu.${x}`),
                click: () => setChatType(x),
                checked: chatType === x,
            })),
        {apiLevel: 5},
    );

    // 添加聊天消息基本功能菜单
    addContextMenuCreator(
        'message.basic',
        ({message}) => {
            if (!message) {
                return;
            }
            const chat = chatsStore.getChat(message.cgid);
            // const sender = membersStore.getMember(message.senderId);
            const currentUser = getCurrentUser();
            const items = [];

            if (!Config.ui['chat.simpleChatView']) {
                items.push({
                    id: 'message-share',
                    label: Lang.string('chat.share'),
                    icon: 'mdi-share-outline',
                    click: () => {
                        window.electronAPI?.currentWindow.show().catch(console.error);
                        executeCommand('showChatShareDialog', message);
                    },
                });
            }

            // 添加撤回按钮
            if ((message.canDelete(currentUser) || chat.isOwner(currentUser))) {
                items.push({
                    id: 'message-retract',
                    label: Lang.string('chat.message.retract'),
                    icon: 'undo-variant',
                    click: () => deleteChatMessage(message, chat),
                });
            }

            // 添加置顶或取消置顶按钮
            if (message.canPin() && (chat.isOne2One || chat.isOwner(currentUser))) {
                if (chat.isPinnedMessage(message.id)) {
                    items.push({
                        id: 'message-unpin',
                        label: Lang.string('chat.message.unpin'),
                        icon: 'pin-off',
                        click: () => unpinMessage(chat, message.id),
                    });
                } else {
                    items.push({
                        id: 'message-pin',
                        label: Lang.string('chat.message.pin'),
                        icon: 'pin',
                        click: () => pinMessage(chat, message.id),
                    });
                }
            }

            return items;
        },
        {apiLevel: 5},
    );

    // 添加文本消息上下文菜单生成器
    addContextMenuCreator(
        'message.text',
        ({message}) => {
            const items = [];
            if (platform.has('clipboard.writeText')) {
                items.push({
                    id: 'message-copy',
                    icon: 'mdi-content-copy',
                    label: Lang.string('chat.message.copy'),
                    click: (_, __, ___, event: React.MouseEvent<HTMLElement>) => {
                        const elm = event.target as HTMLElement;
                        const messageElement = elm.closest<HTMLElement>(`#message-${message.id}`);
                        if (!messageElement) {
                            return;
                        }
                        const contentElements = messageElement.querySelectorAll<HTMLElement>('.app-message-content');
                        const contentElement = contentElements.item(contentElements.length - 1);
                        if (!contentElement) {
                            return;
                        }

                        const {isPlainTextContent} = message;
                        const copyHtmlText = contentElement.innerHTML;
                        // Clone the element and replace emoji images with their alt text to preserve emojis in plain text
                        const clonedElement = contentElement.cloneNode(true) as HTMLElement;
                        clonedElement.querySelectorAll<HTMLImageElement>('img.joypixels').forEach((img) => {
                            const textNode = document.createTextNode(img.alt);
                            img.replaceWith(textNode);
                        });
                        const copyPlainText = clonedElement.innerText;

                        const clipboard = platform.access('clipboard');
                        if (clipboard.write) {
                            clipboard.write({
                                text: copyPlainText,
                                html: isPlainTextContent ? copyHtmlText.replace(/\n/g, '<br />') : copyHtmlText,
                            });
                            return;
                        }
                        if (clipboard.writeHTML) {
                            clipboard.writeHTML(copyHtmlText);
                            return;
                        }
                        if (clipboard.writeText) {
                            clipboard.writeText(copyPlainText);
                        }
                    },
                });
            }
            return items;
        },
        {apiLevel: 5},
    );

    // 添加图片类消息上下文菜单
    addContextMenuCreator(
        'message.image',
        (context) => {
            const {message, event} = context;
            const imageElement = event.target.closest('img');
            if (!imageElement) {
                return [];
            }

            const {imageContent} = message;
            const file = filesStore.getMessageFile(message);
            let url = imageElement.getAttribute('src') ?? file.viewUrl;
            if (url.startsWith('file://')) {
                url = url.substr(7).split('?')[0];
            }
            return [
                ...getMenuItemsForContext('image', {
                    ...context,
                    url,
                    dataType: imageContent.type,
                    image: imageContent,
                    file,
                    options: {messageID: message.id},
                }),
            ];
        },
        {apiLevel: 5},
    );

    // 添加 Url 消息卡片上下文菜单生成器
    addContextMenuCreator(
        'message.url',
        ({url, card, event}) => {
            const items = [...getMenuItemsForContext('link', {url, event})];
            if (!card?.webviewContent) {
                return items;
            }

            const {content} = card;
            const {originSrc} = content;
            tryAddDividerItem(items);
            items.push({
                id: 'open-app',
                label: Lang.string('ext.app.open'),
                url: `!openUrlInDialog/${encodeURIComponent(originSrc || content.src)}/?size=lg&insertCss=${encodeURIComponent(content.insertCss)}`,
                icon: 'mdi-open-in-app',
            });
            if (DEBUG && content.type !== 'iframe') {
                items.push({
                    label: Lang.string('ext.app.openDevTools'),
                    icon: 'mdi-auto-fix',
                    click: () => {
                        if (this.webview?.webview?.openDevTools) {
                            this.webview.webview.openDevTools();
                            return;
                        }
                        if (DEBUG) {
                            console.warn('Cannot open dev tools for current webview.');
                        }
                    },
                });
            }
            return items;
        },
        {apiLevel: 5},
    );

    addContextMenuCreator(
        'message',
        (context) => {
            let {message = context.params[0]} = context;
            if (typeof message === 'number') {
                message = chatMessagesStore.getMessage(message);
            }
            if (!message) {
                return [];
            }

            context.message = message;

            /**
             * 构建菜单项
             * @param {Object[]} items 菜单项
             * @returns {Object[]} 菜单项
             */
            const buildMenuItems = (items) => {
                const menuItems = [...items];
                tryAddDividerItem(menuItems);
                menuItems.push(...getMenuItemsForContext('message.basic', context));
                return menuItems;
            };

            if (message.isEmotionContent && message.emotionContent?.content) {
                return buildMenuItems(
                    getMenuItemsForContext('emoji', {
                        ...context,
                        emoji: joypixels.shortnameToUnicode(message.emotionContent.content),
                    }),
                );
            }
            if (message.isImageContent) {
                return buildMenuItems(getMenuItemsForContext('message.image', context));
            }
            if (message.isTextContent) {
                return buildMenuItems(getMenuItemsForContext('message.text', context));
            }
            if (message.isUrlObject) {
                return buildMenuItems(getMenuItemsForContext('message.url', context));
            }

            return [...getMenuItemsForContext('message.basic', context)];
        },
        {apiLevel: 5},
    );
};

/**
 * 注册命令
 * @returns {void}
 */
const registerCommands = () => {
    // 注册命令：向聊天输入框添加内容
    registerCommand(
        'sendContentToChat',
        (context, content) => {
            const {options = {}} = context;
            sendContentToChat(content || options.content, options);
        },
        null,
        {apiLevel: 2},
    );

    registerCommand(
        'sendContentToServerBySendbox',
        (context, content) => {
            const {options = {}} = context;
            options.send = true;
            options.clear = true;
            sendContentToChat(content || options.content, options);
        },
        null,
        {apiLevel: 7},
    );

    // 注册命令：向聊天输入框添加内容
    registerCommand(
        'mentionMemberInSendbox',
        (context, content, cgid) => {
            const {options = {}} = context;
            mentionMemberInSendbox(content || options.content, cgid || options.cgid);
        },
        null,
        {apiLevel: 2},
    );

    // 注册命令：询问是否加入公开讨论组，如已经在讨论组中则直接跳转
    registerCommand(
        'confirmJoinPublicChat',
        async (context, gid) => {
            const chat = chatsStore.getChat(gid);
            if (chat && !chat.isDeleted) {
                setActiveChat(gid);
                return;
            }
            const publicChat = await chatsStore.fetchPublicChat(gid);
            if (!publicChat) {
                return Modal.alert(Lang.string('chats.joinedChatNotFound'));
            }
            try {
                const confirmResult = await Modal.confirm(
                    Lang.format('chats.confirmToJoinPublicChat', publicChat.name),
                );
                if (confirmResult) {
                    await joinOrExitChat(publicChat);
                    setActiveChat(gid);
                }
            } catch (error) {
                Modal.alert(Lang.error(error));
            }
        },
        null,
        {apiLevel: 4},
    );

    registerCommand(
        'showMessageInList',
        (_context, cgid, messageID, maxScrollUpTimes) => showMessageInList(cgid, messageID, maxScrollUpTimes),
        null,
        {apiLevel: 4},
    );

    registerCommand(
        'showChatMessage',
        (_context, cgid, messageID, maxScrollUpTimes) => showChatMessage(cgid, messageID, maxScrollUpTimes),
        null,
        {apiLevel: 4},
    );

    // 如果平台支持读取剪切板图片则绑定推荐发送剪切板图片命令
    if (platform.has('clipboard.getNewImage')) {
        registerCommand('suggestClipboardImage', () => {
            if (!getAllUserConfig().listenClipboardImage) {
                return;
            }
            const newImage = platform.call('clipboard.getNewImage');
            if (newImage) {
                events.emit(SUGGEST_SEND_IMAGE, newImage);
            }
        });
    }
};

/**
 * 初始化聊天相关功能
 */
export const initImUI = () => {
    // 绑定用户切换事件
    onSwapUser(([_, isDiff]) => {
        if (isDiff) {
            activeCaches.clear();
        }
    });

    onActiveChat((cgid) => {
        const chat = chatsStore.getChat(cgid);
        if (!chat) {
            return;
        }
        const cacheInfo = activeCaches.get(cgid);
        if (!cacheInfo) {
            activeCaches.set(cgid, new ChatCacheInfo(cgid));
        } else {
            cacheInfo.active();
        }
        if (chat.unreadMessagesCount || chat.fileSavedNoticeCount) {
            chatsStore.muteChatUnreadMessages(cgid);
        }
        return true;
    });

    // 当用户加入公开会话时激活所加入的会话
    onChatActionChanged((chat, actionType, flag) => {
        if (chat) {
            if (flag && actionType === 'join' && chat.public) {
                // 用户加入公开讨论组时激活会话
                setActiveChat(chat.gid);
            } else if (
                (flag && (actionType === 'dismiss' || actionType === 'hide' || actionType === 'freeze')) ||
                (!flag && actionType === 'join')
            ) {
                // 用户解散、存档、从最近列表移除以及退出讨论组时则激活最近一个使用的会话
                activeNextChatOnMenu({lastChatGid: chat.gid});
            }
        }
    });

    events.on(DISSMISSED_CHAT, (dismissedChat) => {
        if (isActiveChat(dismissedChat)) {
            activeNextChatOnMenu({lastChatGid: dismissedChat});
        }
    });

    // 绑定上下文菜单
    addContextMenuCreators();

    // 注册命令
    registerCommands();

    if (PERF) {
        setPerfCommandHandlers({
            openTestChats: async (count = 10, chatType = null, testMessgeContent = 'perf test.') => {
                const delayTime = (time) => new Promise((resolve) => setTimeout(resolve, time));
                const openTestChat = async (chat) => {
                    console.log('Chat open', chat);
                    try {
                        PERF_MARK(`activeChatBegin_${chat.gid}`);
                        setActiveChat(chat.gid);
                        await delayTime(500);
                        if (testMessgeContent) {
                            await delayTime(1500);
                            sendContentToChat(testMessgeContent, {cgid: chat.gid});
                            await delayTime(500);
                            const sendBtn = document.querySelector<HTMLElement>(
                                `#chat-view-${chat.gid.replace('&', '_')} .app-chat-sendbox-send-btn`,
                            );
                            if (sendBtn) {
                                sendBtn.click();
                            }
                        }
                    } catch (error) {
                        console.log('Chat open error for chat', chat);
                        console.error(error);
                    }
                };
                const allChats = chatsStore.queryChats((x) => !chatType || x.type === chatType, {
                    sortRules: 'recentFirst',
                    limit: count,
                });
                count = Math.min(allChats.length, count);
                for (let i = 0; i < count; ++i) {
                    await openTestChat(allChats[i]);
                }
                return count;
            },
        });
    }
};

export default {
    setActiveChat,
    isActiveChat,
    getActiveChatGid,
    getActivatedCacheChatsGID,
    chatExitConfirm,
    chatRenamePrompt,
    createGroupChat,
    sendContentToChat,
    mentionMemberInSendbox,
    onSendContentToChat,
    onSuggestSendImage,
    emitChatSendboxFocus,
    onChatSendboxFocus,
    isChatsCacheChanged,
    setChatCacheState,
    takeOutChatCacheState,
};

if (DEBUG) {
    global.$getActivatedCacheChatsGID = getActivatedCacheChatsGID;
    global.$activeCaches = activeCaches;
}
