import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import {isEmptyString} from '~/app/utils/check-empty';
import Icon from '~/app/components/icon';
import StatusDot from '../common/status-dot';
import {showMemberProfileDialog} from '../common/member-profile-dialog';
import Config from '~/app/config';
import platform from '~/app/platform';
import useChatTyping from './use-chat-typing';
import useChat from './use-chat';
import useLang from '../common/use-lang';
import useMemberStatus from '../common/use-member-status';
import {renderIf} from '~/app/utils/render';

type ChatTitleProps = {cgid: string;}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 会话标题组件
 * @param props React 组件属性对象
 * @param props.cgid 会话 GID
 * @param props.className 类名
 * @param props.children 子节点内容
 * @returns  React Node content
 */
function ChatTitle(props: ChatTitleProps) {
    const {
        cgid,
        className,
        children,
        ...others
    } = props;

    const [Lang] = useLang();
    const typing = useChatTyping(cgid);
    const [chat] = useChat(cgid);
    const statusName = useMemberStatus(chat?.theOtherMemberID);

    if (!chat) {
        return null;
    }

    const denyShowMemberProfile = Config.ui['chat.denyShowMemberProfile'];
    const chatName = chat.isGroupOrSystem && (chat.isSystem || chat.members.size)
        ? Lang.format('chat.groupName.format', chat.name, chat.isSystem
            ? Lang.string('chat.all')
            : chat.members.size)
        : chat.name;

    const onTitleClick = (!denyShowMemberProfile && chat.isOne2One) ? showMemberProfileDialog.bind(null, chat.theOtherMemberID, null) : null;
    const showStatusDot = chat.isOne2One && !Config.ui['chat.hideStatusDot']

    return (
        <div className={classes('chat-title heading', className)} {...others}>
            {showStatusDot && <StatusDot status={statusName} />}
            {
                (!denyShowMemberProfile && chat.isOne2One)
                    ? <a className={classes('strong -rounded title !-flex-grow-0 !-basis-auto', {'loading-holder -relative loading-holder-line': isEmptyString(chatName)})} onClick={onTitleClick}>{chatName}</a>
                    : <strong className={classes('title !-flex-grow-0 !-basis-auto', {'loading-holder -relative loading-holder-line': isEmptyString(chatName)})}>{chatName}</strong>
            }
            {renderIf(chat.isOne2One) && <span className="muted -flex-none">[{Lang.string(`member.status.${statusName}`)}]</span>}
            {renderIf(chat.public) && <div className="muted -flex-none" data-hint={Lang.string('chat.public.label')}><Icon className="text-green" name="access-point" /></div>}
            {renderIf(chat.mute) && <div className="muted -flex-none" data-hint={Lang.string('chat.mute.label')}><Icon className="text-brown" name="bell-off" /></div>}
            {renderIf(chat.isDismissed) && <div className="small label -rounded dark -flex-none">{Lang.string('chat.group.dismissed')}</div>}
            {renderIf(chat.isDeleted) && <div className="small label -rounded dark -flex-none">{Lang.string('chat.deleted')}</div>}
            {renderIf(Config.ui['chat.showNoticeOnChatTitle'] && chat.unreadMessagesCount && !platform.call('ui.isWindowOpenAndFocus')) && <div className={classes('label -rounded-full label-sm -flex-none', chat.isMuteOrHidden ? 'blue' : 'red')}>{chat.unreadMessagesCount > 99 ? '99+' : chat.unreadMessagesCount}</div>}
            {renderIf(typing) && <span className="muted -ml-1 -flex-none">{Lang.string('chat.one2one.typing')}</span>}
            <div className="-flex-auto" />
            {children}
        </div>
    );
}

export default memo(ChatTitle);
