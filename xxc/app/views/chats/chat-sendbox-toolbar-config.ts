import {convertEmojiToString} from '~/app/components/emoji';
import {sendContentToChat} from '~/app/core/im/im-ui';
import Lang from '~/app/core/lang';
import {getCurrentUser} from '~/app/core/profile';
import {VersionSupport} from '~/app/core/server/feature-versions';
import platform from '~/app/platform';
import {showEmojiPopover} from '../common/emoji-popover';
import {tryAddDividerItem} from '~/app/core/context-menu';
import type {ElectronPlatform} from '~/app/platform/electron';
import {showChatTipPopover} from './chat-tip-popover';

const dialog = platform.access<ElectronPlatform['dialog']>('dialog');

export type ChatSendboxDividerItem = {
    type: 'divider';
};

export type ChatSendboxButtonItem = {
    id: string;
    label: string;
    icon: string;
    onClick: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
    onContextMenu?: React.MouseEventHandler<HTMLButtonElement>;
    content?: string;
};

type Options = {
    userConfig: UserConfig;
};

const createChatSendboxToolbarItems = (chat: Chat, options: Options) => {
    const user = getCurrentUser();
    if (!user) {
        return [];
    }

    if (!chat) {
        return [];
    }
    const items: Array<ChatSendboxDividerItem | ChatSendboxButtonItem> = [];
    const {userConfig} = options;

    items.push({
        id: 'emoticon',
        icon: 'svg-input-emoji',
        label: Lang.string('chat.sendbox.toolbar.emoticon'),
        onClick: e => {
            showEmojiPopover({
                x: e.pageX, y: e.pageY, target: e.target, placement: 'top'
            }, emoji => {
                sendContentToChat(convertEmojiToString(emoji), { type: 'emoji' });
            })
        }
    });

    if (user.isVersionSupport(VersionSupport.fileServer)) {
        items.push({
            id: 'image',
            icon: 'svg-input-image',
            label: Lang.string('chat.sendbox.toolbar.image'),
            onClick: () => {
                dialog.showOpenDialog({
                    filters: [
                        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'apng', 'webp'] },
                    ]
                }, files => {
                    if (files?.length) {
                        sendContentToChat(files[0], { type: 'image', cgid: chat.gid });
                    }
                });
            }
        });
    }
    tryAddDividerItem(items);

    if (userConfig?.showMessageTip) {
        items.push({
            id: 'tips',
            icon: 'sprite-input-help',
            label: Lang.string('chat.sendbox.toolbar.tips'),
            onClick: e => {
                showChatTipPopover({x: e.pageX, y: e.pageY, target: e.target, placement: 'top'});
            }
        });
    }
    return items;
};

const getChatSendboxToolbarItems = (chat: Chat, options: Options) => {
    const items = createChatSendboxToolbarItems(chat, options);
    // TODO: 实现一个自定义处理 items 的函数以供扩展
    return items;
};

export default getChatSendboxToolbarItems;
