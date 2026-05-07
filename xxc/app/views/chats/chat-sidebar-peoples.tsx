import {useCallback, useEffect, useRef, useState} from 'react';
import Icon from '~/app/components/icon';
import Modal from '~/app/components/modal';
import {setRoutePath} from '~/app/core/ui/router';
import {getCurrentUser, isCurrentUser} from '~/app/core/profile';
import Messager from '~/app/components/messager';
import Spinner from '~/app/components/spinner';
import {classes} from '~/app/utils/html-helper';
import MemberList from '../common/member-list';
import MemberListItem from '../common/member-list-item';
import {createGroupChat} from '~/app/core/im/im-ui';
import {onActiveChat, setActiveChat} from '~/app/core/im/chat-active-state';
import ChatInviteDialog from './chat-invite-dialog';
import {showContextMenu} from '~/app/core/context-menu';
import {getOne2OneChatGid, getChatMembers} from '~/app/core/im/chat-helper';
import {batchKickMemberFromChat} from '~/app/core/im/im-server';
import events from '~/app/core/events';
import {sortMembers} from '~/app/core/members/member-helper';
import chatsStore from '~/app/core/im/chats-store';
import membersStore from '~/app/core/members/members-store';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import {ChatMenuType} from '~/app/constants';
import useLang from '../common/use-lang';

type ChatSidebarPeoplesProps = {chat: Chat;}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * ChatSidebarPeoples 组件 ，显示聊天侧边栏成员列表界面
 */
export default function ChatSidebarPeoples(props: ChatSidebarPeoplesProps) {
    const {chat, children, className, ...other} = props;
    const {forceUpdate} = useForceUpdate();
    const [Lang] = useLang();

    /**
     * 当前界面上已经显示的成员 ID
     */
    const memberIDSetRef = useRef<Set<number>>();
    const [selection, setSelection] = useState(false);
    const [chosen, setChosen] = useState(new Set<number>());
    const members = getChatMembers(chat);

    /**
     * 渲染成员列表项
     * @param member 聊天成员
     * @param selectionIcon 选择图标视图
     * @returns JSX.Element
     */
    const handleItemRender = (member: Member, selectionIcon: JSX.Element) => {
        const iconsView = [];

        if (!chat.isCommitter(member)) {
            iconsView.push(
                <span
                    key="committer-icon"
                    className="-flex-none hint--left text-gray"
                    data-hint={Lang.string('chat.committers.blocked')}
                >
                    <Icon name="account-lock-outline" />
                </span>
            );
        }

        return (
            <MemberListItem
                data-id={member.id}
                onContextMenu={handleItemContextMenu}
                onClick={handleMemberItemClick}
                key={member.id}
                memberID={member.id}
            >
                {iconsView.length > 0 && <div className="icons -flex-none single row -items-center">{iconsView}</div>}
                {selectionIcon}
            </MemberListItem>
        );
    };

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
            onClickMultiSelection: !selection && (() => {
                setSelection(true);
            }),
        });
    };

    /**
     * 处理邀请按钮点击事件
     */
    const handleInviteBtnClick = useCallback(() => {
        handleCancelSelectionBtnClick();
        ChatInviteDialog.show(chat);
    }, [chat]);

    /**
     * 处理聊天成员点击事件
     * @param event 事件对象
     */
    const handleMemberItemClick = (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        const member = membersStore.getMember(+event.currentTarget.dataset.id);
        if (selection) {
            // 多选时
            const {id} = member;
            if (isCurrentUser(id)) return;
            const newChosen = new Set(chosen);
            if (newChosen.has(id)) {
                newChosen.delete(id);
            } else {
                newChosen.add(id);
            }
            setChosen(newChosen);
        } else {
            const elm = event.target as HTMLElement;

            // 非多选
            showContextMenu('member.profile', {
                event,
                showMentionBtn: true,
                member,
                options: {
                    onItemClick: () => false,
                    position: {
                        x: elm.parentElement.parentElement.getBoundingClientRect().x - 20,
                        y: elm.parentElement.getBoundingClientRect().y,
                        direction: 'bottom-left'
                    }
                }
            });
        }
    };

    /**
     * 处理点击取消多选按钮事件
     */
    const handleCancelSelectionBtnClick = useCallback(() => {
        setChosen(new Set());
        setSelection(false);
    }, []);

    /**
     * 处理发起会话点击事件
     */
    const handleActiveChatBtnClick = () => {
        if (chosen.size === 1) {
            // @ts-ignore
            const one2OneGid = getOne2OneChatGid(...chosen);
            setActiveChat(one2OneGid, {menu: ChatMenuType.recents});
        }
    };

    /**
     * 处理发起群会话点击事件
     */
    const handleCreateGroupBtnClick = () => {
        if (chosen.size > 1) {
            createGroupChat([...chosen]).then(newChat => {
                if (newChat) {
                    setRoutePath('chats', 'groups', newChat.gid);
                }
                handleCancelSelectionBtnClick();
                return true;
            }).catch(error => {
                if (error) {
                    Messager.show(Lang.error(error), {type: 'danger'});
                }
            });
        }
    };

    /**
     * 点击移除成员按钮事件
     */
    const handleRemoveBtnClick = () => {
        const chosenIdList = [...chosen];
        return Modal.confirm(Lang.string('chat.kickOffFromGroup.confirm.batch')).then(result => {
            if (result) {
                return batchKickMemberFromChat(chat, chosenIdList);
            }
        }).then(() => {
            handleCancelSelectionBtnClick();
        });
    };

    useEffect(() => {
        const dataChangeEventHandler = chatsStore.subscribe(chat.gid, () => {
            forceUpdate();
        });

        return () => {
            chatsStore.unsubscribe(dataChangeEventHandler);
        };
    }, [chat.gid, forceUpdate]);

    useEffect(() => {
        const onChatActiveHandler = onActiveChat(() => {
            handleCancelSelectionBtnClick();
        });

        events.off(onChatActiveHandler);
    }, [handleCancelSelectionBtnClick]);


    useEffect(() => {
        const membersChangeHandler = membersStore.subscribeAny((changes) => {
            if (
                changes?.length
                && memberIDSetRef.current?.size
                && changes.some(x => memberIDSetRef.current.has(x.id))
            ) {
                forceUpdate();
            }
        });

        return () => {
            membersStore.unsubscribe(membersChangeHandler);
        };
    }, [forceUpdate]);

    if (!members.length) {
        chatsStore.tryFetchChatMembers(chat.gid);
        return (
            <div
                {...other}
                className={classes('app-chat-sidebar-peoples dock single column -justify-between has-padding-xl', className)}
            >
                <Spinner />
            </div>
        );
    }

    const user = getCurrentUser();
    const {account} = user;

    sortMembers(members, [(x: Member, y: Member) => {
        if (x.account === account) return -1;
        if (y.account === account) return 1;
        return 0;
    }, 'status', '-id']);

    let actionsView = null;
    if (!chat.isSystem) {
        const actions = [];
        const chosenCount = chosen.size;
        if (chosenCount === 1) {
            actions.push(<a key="btn-create-chat" className="btn gray x-outline -rounded" onClick={handleActiveChatBtnClick}>{Lang.string('chat.sidebar.createChat')}</a>);
        }
        if (chosenCount > 1) {
            actions.push(<a key="btn-create-group" className="btn gray x-outline -rounded" onClick={handleCreateGroupBtnClick}>{Lang.string('chat.sidebar.createGroup')}</a>);
        }
        if (chat.canInvite(user) && !selection) {
            actions.push(<a key="btn-invite" className="btn gray x-outline -rounded" onClick={handleInviteBtnClick}>{Lang.string('chat.sidebar.invite')}</a>);
        }
        if (chat.canKickOff(user) && chosenCount > 0) {
            actions.push(<a key="btn-remove-member" className="btn gray x-outline -rounded" onClick={handleRemoveBtnClick}>{Lang.string('chat.sidebar.removeMember')}</a>);
        }
        if (selection) {
            actions.push(<a key="btn-cancel-selection" className="btn -rounded" onClick={handleCancelSelectionBtnClick}>{Lang.string('chat.sidebar.cancelSelection')}</a>);
        }
        if (actions.length) {
            actionsView = <nav className="actions -flex-none has-padding-sm -text-center">{actions}</nav>;
        }
    }

    memberIDSetRef.current = new Set(members.map(x => x.id));

    return (
        <div
            {...other}
            className={classes('app-chat-sidebar-peoples dock single column -justify-between', className)}
        >
            <div className="-overflow-y-auto scrollbar-hover">
                <MemberList
                    itemRender={handleItemRender}
                    className="compact fluid -flex-auto"
                    members={members}
                    selection={selection}
                    chosen={chosen}
                />
            </div>
            {actionsView}
            {children}
        </div>
    );
}
