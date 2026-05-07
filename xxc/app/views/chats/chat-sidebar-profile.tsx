import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import MemberProfile from '../common/member-profile';
import chatsStore from '../../core/im/chats-store';

type ChatSidebarProfileProps = {gid: string;}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 一对一会话侧边栏对方资料界面
 * @param props React 组件属性对象
 * @param props.gid 一对一会话 GID
 * @returns JSX.Element
 */
function ChatSidebarProfile(props: ChatSidebarProfileProps) {
    const {
        gid,
        className,
        children,
        ...other
    } = props;

    const chat = chatsStore.getChat(gid);
    if (!chat) {
        return null;
    }
    const {theOtherMemberID} = chat;

    return (
        <div
            className={classes('app-chat-sidebar-profile has-padding', className)}
            {...other}
        >
            <MemberProfile compact className="white" memberId={theOtherMemberID} />
            {children}
        </div>
    );
}

export default memo(ChatSidebarProfile);
