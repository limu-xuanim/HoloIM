import {memo} from 'react';
import {formatDate} from '../../utils/date-helper';
import Config from '../../config';
import {showContextMenu} from '../../core/context-menu';
import {isCurrentUser} from '../../core/profile';
import {openUrl} from '../../core/ui/url';
import MemberNameSpan from '../common/member-name-span';
import MemberAvatar from '../common/member-avatar';
import {getChatMessageSender} from '../../core/im/chat-message-helper';
import {mentionMemberInSendbox} from '../../core/im/im-ui';
import useLang from '../common/use-lang';
import MemberAvatarCommon from '~/app/views/common/member-avatar-common';
import {chatsStore} from '~/app/entries/vars/chatsStore';
import {membersStore} from '~/app/entries/vars/membersStore';
import {showContextMenuWithItems} from '~/app/core/context-menu-independent';
import {getContextMenuItems} from '~/app/entries/vars/getContextMenuItems';
import {setActiveChat} from '~/app/entries/vars/setActiveChat';
import {WindowType} from '~/app/constants';

const isMainWindow = process.env.ENTRY === WindowType.main;

/**
 * TODO: 移除 handleClickSenderAvatar 和 handleUserContextMenu，使用 url 命令实现，去掉 staticUI 属性
 */

/**
 * 处理消息发送者头像点击事件
 * @param sender 发送者对象
 * @param isNotification 是否为通知
 * @param event 点击事件对象
 */
function handleClickSenderAvatar(sender, isNotification: boolean, event: MouseEvent) {
    if (!isMainWindow) {
        return;
    }
    if (isNotification) {
        if (sender.url) {
            openUrl(sender.url);
        }
    } else {
        showContextMenu('member.profile', {
            event,
            showMentionBtn: true,
            member: sender,
            options: {
                onItemClick: () => false,
            }
        });
    }
}

/**
 * 处理显示用户右键菜单事件
 * @param {string} cgid 会话 GID
 * @param {number} senderId 发送者 ID
 * @param {Event} event 事件对象
 */
function handleUserContextMenuA(cgid: string, senderId: number, event: MouseEvent) {
    const sender = membersStore.getMemberOrTemp(senderId);
    showContextMenu('chat.member', {event, member: sender, chat: chatsStore.getChat(cgid)});
}

/**
 * 处理显示用户右键菜单事件
 * @param cgid 会话 GID
 * @param senderId 发送者 ID
 * @param event 事件对象
 */
function handleUserContextMenuB(cgid: string, senderId: number, event: MouseEvent) {
    const sender = membersStore.getMemberOrTemp(senderId);
    let items = getContextMenuItems('chat.member', {event, member: sender, chat: chatsStore.getChat(cgid)});
    items = items.filter(item => item.id === 'chat-active');
    items = items.map(item => {
        if (item.id === 'chat-active') {
            const {url} = item;
            item.click = () => {
                setActiveChat(url.split('/').pop(), {menu: 'recents'});
            };
            delete item.url;
        }
        return item;
    });
    showContextMenuWithItems('chat.member', items, {event, member: sender, chat: chatsStore.getChat(cgid)});
}

const handleUserContextMenu = process.env.ENTRY === WindowType.main ? handleUserContextMenuA : handleUserContextMenuB;

type MessageHeaderProps = {
    message: ChatMessage;
    staticUI?: boolean;
    avatarSize?: number;
    dateFormat?: string;
};

/**
 * 消息头部组件
 */
function MessageHeader(props: MessageHeaderProps) {
    const {
        message, staticUI = false, avatarSize= 30, dateFormat = 'hh:mm'
    } = props;

    const [Lang] = useLang();

    const {isNotification, senderId, cgid} = message;
    const isSendByMe = isCurrentUser(senderId);
    const hideChatAvatar = Config.ui['chat.hideChatAvatar'];
    const mentionOthers = Config.ui['chat.mentionOthers'];

    let sender;
    if (isNotification) {
        sender = message.getSender();
    } else {
        sender = getChatMessageSender(message);
    }
    const onClickSender = ((isNotification && !sender.url) || !isMainWindow) ? null : handleClickSenderAvatar.bind(null, sender, isNotification);
    const memberContextMenuCallback = isNotification ? null : handleUserContextMenu.bind(null, cgid, senderId);
    let avatarView = null;
    if (!hideChatAvatar) {
        avatarView = isNotification ? (
            <MemberAvatarCommon
                code={sender.id || sender.displayName}
                avatar={sender.avatar}
                // biome-ignore lint/complexity/useOptionalChain: <explanation>
                shape={sender.id && sender.id.toString().startsWith('ext-') ? '-rounded' : '-rounded-full'}
                className={onClickSender ? 'state' : null}
                onContextMenu={memberContextMenuCallback}
                onClick={onClickSender}
                size={avatarSize}
                displayName={!sender.id ? sender.displayName : null}
            />
        ) : (
            <MemberAvatar
                shape="-rounded-full"
                className={onClickSender ? 'state' : null}
                memberID={sender.id}
                onContextMenu={memberContextMenuCallback}
                onClick={onClickSender}
                size={avatarSize}
            />
        );
    }
    const senderName = (isSendByMe && Config.ui['chat.showMeAsMySenderName']) ? Lang.string('chat.message.senderMe') : isNotification ? sender.displayName : <MemberNameSpan memberID={sender.id} />;

    return (
        <div className="app-message-header">
            {avatarView}
            <header>
                {
                    (staticUI || isNotification || !mentionOthers || !isMainWindow)
                        ? <span onClick={onClickSender} className="title text-dark">{senderName}</span>
                        : (
                            <a
                                className="title -rounded text-dark"
                                onContextMenu={memberContextMenuCallback}
                                onClick={mentionMemberInSendbox.bind(null, sender.id, cgid)}
                            >
                                {senderName}
                            </a>
                        )
                }
                <small className="time">{formatDate(message.date, dateFormat)}</small>
            </header>
        </div>
    );
}

export default memo(MessageHeader);
