import {showChatShareDialog} from './chats/chat-share-dialog';
import {executeCommandWithContext, registerCommand} from '../core/commander';
import {showUpdateGuideDialog} from './common/update-guide-dialog';
import {showMessager} from '../components/messager';
import {showMemberProfileDialog} from './common/member-profile-dialog';
import {showWebviewDialog} from './common/webview-dialog';
import {initUpdateView} from './common/update-view';
import {setLangObj, showAlert, showConfirm, showModal, showPrompt} from '../components/modal';
import {showChatCommittersSettingDialog} from './chats/chat-committers-setting-dialog';
import {showChatHistoryDialog} from './chats/chat-history-dialog';
import {showChatInviteDialog} from './chats/chat-invite-dialog';
import {showChatTipPopover} from './chats/chat-tip-popover';
import {showEmojiPopover} from './common/emoji-popover';
import {showHotkeySettingDialog} from './common/hotkey-setting-dialog';
import {showCreateChatDialog} from './chats/chat-create-dialog';
import './common/member-profile-menu';
import {displayHide} from '../components/display';
import {showContextMenu} from '../components/context-menu';
import {showChatMentionsDialog} from './chats/chat-mentions-dialog';
import {showMessageInDialog} from './chats/message-view-dialog';
import {showChatMessageImagePreivew} from './chats/chat-message-image-preview';
import {showMediaPreviewWindow} from '../entries/gallery/open-window';
import {openWebviewWindow} from '../entries/webview/open-window';
import {showChatsHistoryWindow} from '../entries/chathistory/open-window';
import {sendContentToChat} from '../core/im/im-ui';

export default (lang) => {
    setLangObj(lang);
    registerCommand('showChatShareDialog', (context, shareMessage) => {
        const {message} = context;
        showChatShareDialog(message || shareMessage);
    }, null, {apiLevel: 4});

    registerCommand('showUpdateGuideDialog', (_context, callback) => showUpdateGuideDialog(callback));

    registerCommand('showMessager', (context, message, callback) => showMessager(message, context.options, callback), null, {apiLevel: 5});
    registerCommand('showAlert', (context, content, callback) => showAlert(content, context.options, callback), null, {apiLevel: 5});
    registerCommand('showConfirm', (context, content, callback) => showConfirm(content, context.options, callback), null, {apiLevel: 5});
    registerCommand('showPrompt', (context, title, defaultValue, callback) => showPrompt(title, defaultValue, context.options, callback), null, {apiLevel: 5});
    registerCommand('showModal', (context, callback) => showModal(context.options, callback), null, {apiLevel: 5});

    // 注册打开成员资料对话框命令
    registerCommand('showMemberProfile', (context, member, callback) => showMemberProfileDialog(member || context.member || (context.options && context.options.memberId), callback), null, {apiLevel: 4});

    registerCommand('openWebviewDialog', (context, url, options, callback) => showWebviewDialog(url || context.url, options || context.options, callback), null, {apiLevel: 5});

    registerCommand('showEmojiPopover', (_context, position, onSelectEmoji, callback) => showEmojiPopover(position, onSelectEmoji, callback), null, {apiLevel: 4});
    registerCommand('showHotkeySettingDialog', (_context, title, defaultHotkey, onKeySelect, callback) => showHotkeySettingDialog(title, defaultHotkey, onKeySelect, callback), null, {apiLevel: 6});
    registerCommand('showChatCommittersSettingDialog', (_context, chat, doSetCommitters, callback) => showChatCommittersSettingDialog(chat, doSetCommitters, callback), null, {apiLevel: 4});
    registerCommand('showChatHistoryDialog', (_context, chat, messageID, callback) => showChatHistoryDialog(chat, messageID, callback), null, {apiLevel: 2});
    registerCommand('showCreateChatDialog', (_context, selections, callback) => showCreateChatDialog(selections, callback), null, {apiLevel: 4});
    registerCommand('showChatInviteDialog', (_context, chat, selections, callback) => showChatInviteDialog(chat, selections, callback), null, {apiLevel: 4});
    registerCommand('showChatTipPopover', (_context, position, callback) => showChatTipPopover(position, callback));
    registerCommand('showChatMentionsDialog', (_context, cgid, callback) => showChatMentionsDialog(cgid, callback), null, {apiLevel: 4});
    registerCommand('showMessageInDialog', (_context, message, cgid, callback) => showMessageInDialog(message, cgid, callback), null, {apiLevel: 4});

    registerCommand('contextMenu', (context, position, items, props, callback) => {
        const {options = {}} = context;
        position = position || options.position;
        if (typeof position === 'string') {
            position = JSON.parse(position);
        }
        items = items || options.items;
        if (typeof items === 'string') {
            items = JSON.parse(items);
        }
        props = props || options.props;
        if (typeof props === 'string') {
            props = JSON.parse(props);
        }
        showContextMenu(position, items, props, callback);
    });

    // 注册关闭弹出层命令
    registerCommand('closeDisplay', (context, displayId, remove) => {
        displayId = displayId || context.displayId;
        if (remove === undefined) {
            if (context.removeModal === undefined) {
                remove = true;
            } else {
                remove = context.removeModal;
            }
        }
        displayHide(displayId, null, remove);
    }, null, {apiLevel: 2});

    // 注册关闭对话框命令
    registerCommand('closeModal', (context, modalId, remove) => executeCommandWithContext('closeDisplay', context, modalId, remove), null, {apiLevel: 2});

    // 注册使用 MediaPreview 查看媒体文件的命令
    registerCommand('viewMedia', (_context, obtainer, options) => showMediaPreviewWindow(obtainer, options), null, {apiLevel: 2});

    // 注册查看会话消息图片的命令
    registerCommand('viewChatMessageImage', (_context, cgid, messageID, options) => {
        showChatMessageImagePreivew(cgid, messageID, options);
    }, null, {apiLevel: 2});

    // 注册打开 webview 窗口功能
    registerCommand('openWebviewWindow', (_context, webviewInfo, options) => openWebviewWindow(webviewInfo, options), null, {apiLevel: 2});

    // 注册打开聊天记录窗口的命令
    registerCommand('showChatsHistoryWindow', (_context, cgid) => showChatsHistoryWindow(cgid), null, {apiLevel: 2});
    initUpdateView();
};
