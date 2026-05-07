import {useEffect} from 'react';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import {classes} from '../../utils/html-helper';
import MemberListItem from '../common/member-list-item';
import MemberList from '../common/member-list';
import {showContextMenu} from '../../core/context-menu';
import membersStore from '../../core/members/members-store';
import chatsStore from '../../core/im/chats-store';

type ChatSidebarSystemProps = {
    chat: Chat;
} & Partial<{
    className: string;
    children: React.ReactNode;
}> & React.HTMLAttributes<HTMLDivElement>;

/**
 * ChatSidebarSystem 组件 ，显示系统会话侧边栏成员列表界面
 */
export default function ChatSidebarSystem(props: ChatSidebarSystemProps) {
    const {chat, children, className, ...other} = props;
    const {forceUpdate} = useForceUpdate();
    const members = chatsStore.getRecentContactMembers();

    useEffect(() => {
        const dataChangeEventHandler = membersStore.subscribeAny(() => {
            forceUpdate();
        });

        return () => {
            membersStore.unsubscribe(dataChangeEventHandler);
        };
    });

    /**
     * 渲染成员列表项
     *
     * @param member 聊天成员
     * @returns React 渲染内容
     */
    const handleItemRender = (member: Member) => (
        <MemberListItem
            data-id={member.id}
            onContextMenu={handleItemContextMenu}
            onClick={handleMemberItemClick}
            key={member.account}
            memberID={member.id}
        />
    );

    /**
     * 处理聊天成员右键事件
     * @param event 事件对象
     */
    const handleItemContextMenu = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        const member = membersStore.getMember(+event.currentTarget.dataset.id);
        showContextMenu('chat.sidebar.member', {
            chat,
            event,
            member,
        });
    };

    /**
     * 处理联系人条目点击事件
     * @param event 事件对象
     */
    const handleMemberItemClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        const member = membersStore.getMember(+event.currentTarget.dataset.id);
        const {zoom} = document.documentElement.style as any;
        showContextMenu('member.profile', {
            event,
            showMentionBtn: true,
            member,
            options: {
                onItemClick: () => false,
                position: {
                    x: event.pageX,
                    y: event.pageY,
                    offsetX: Math.ceil(
                        (event.target as HTMLElement).parentElement.parentElement.getBoundingClientRect().x
                        * (Number.parseFloat(zoom) || 1)
                        - event.pageX
                    ),
                    direction: 'bottom-left',
                }
            }
        });
    };

    return (
        <div className={classes('chat-sidebar-depts dock', className)} {...other}>
            <div className="scrollbar-hover">
                <MemberList
                    itemRender={handleItemRender}
                    className="compact fluid -flex-auto"
                    members={members}
                />
            </div>
            {children}
        </div>
    );
}
