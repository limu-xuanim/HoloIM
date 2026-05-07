import React, {useState} from 'react';
import Config from '../../config';
import Member from '../../core/members/member';
import {classes} from '../../utils/html-helper';
import ListItem from '../../components/list-item';
import MemberListItem, {type MemberListItemProps} from './member-list-item';
import membersStore from '../../core/members/members-store';
import {isCurrentUser} from '../../core/profile';
import useLang from './use-lang';

type MemberLike = Member|{
    id: number;
    status: string;
    realname: string;
    account: string;
    isDeleted: boolean;
    isOnline: boolean;
    displayName: string;
    isOffline: boolean;
};

type MemberListProps = {
    members: Array<MemberLike>;
} & Partial<{
    chosen: Set<number>;
    listItemProps: MemberListItemProps|((member: MemberLike) => MemberListItemProps);
    onItemClick: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
    onItemContextMenu: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
    itemRender: (member: MemberLike, selectionIcon: React.ReactNode) => React.ReactNode;
    contentRender: (member: MemberLike) => React.ReactNode;
    avatarClassName: string;
    heading: React.ReactNode;
    startPageSize: number;
    morePageSize: number;
    defaultPage: number;
    selection: boolean;
}> & React.HTMLAttributes<HTMLDivElement>;

/**
 * MemberList 组件 ，显示成员列表界面
 */
export default function MemberList(props: MemberListProps) {
    const {
        chosen,
        members,
        className,
        listItemProps,
        itemRender,
        onItemClick,
        onItemContextMenu,
        avatarClassName,
        heading,
        startPageSize = Config.ui['page.start.size'] ?? 20,
        morePageSize = Config.ui['page.more.size'] ?? 20,
        defaultPage = 1,
        contentRender,
        selection = false,
        ...other
    } = props;
    const [Lang] = useLang();
    const [page, setPage] = useState(defaultPage);

    /**
     * 处理请求显示更多列表条目事件
     */
    const handleRequestMorePage = () => {
        setPage(page + 1);
    };

    /**
     * 处理列表条目点击事件
     * @param e 事件对象
     */
    const handleOnItemClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        const member = membersStore.getMember(+e.currentTarget.dataset.id);
        if (onItemClick) {
            onItemClick.call(member, e);
        }
    };

    /**
     * 处理显示条目右键菜单事件
     * @param e 事件对象
     */
    const handleOnItemContextMenu = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
        if (onItemContextMenu) {
            const member = membersStore.getMember(+e.currentTarget.dataset.id);
            onItemContextMenu.call(member, e);
        }
    };

    const maxIndex = page ? Math.min(members.length, startPageSize + (page > 1 ? (page - 1) * morePageSize : 0)) : members.length;
    const listViews: React.ReactNode[] = [];
    let selectionIcon: React.ReactNode = null;
    for (let i = 0; i < maxIndex; i += 1) {
        const member = members[i];
        if (selection && !isCurrentUser(member.id)) {
            selectionIcon = <div className={classes('checkbox checkbox-sm', {checked: chosen.has(member.id)})}><label /></div>;
        }
        if (itemRender) {
            listViews.push(itemRender(member, selectionIcon));
        } else {
            const itemProps = typeof listItemProps === 'function'
                ? listItemProps(member)
                : listItemProps;
            listViews.push(
                <MemberListItem
                    data-id={member.id}
                    avatarClassName={avatarClassName}
                    onContextMenu={handleOnItemContextMenu}
                    onClick={handleOnItemClick}
                    {...itemProps}
                    key={member.account}
                    memberID={member.id}
                >{contentRender && contentRender(member)}{selectionIcon}
                </MemberListItem>
            );
        }
    }
    const notShowCount = members.length - maxIndex;
    if (notShowCount) {
        listViews.push(
            <ListItem
                key="showMore"
                icon="chevron-double-down"
                className="-items-center item muted"
                title={<span className="title small">{Lang.format('common.clickShowMoreFormat', notShowCount)}</span>}
                onClick={handleRequestMorePage}
            />
        );
    }

    return (
        <div
            {...other}
            className={classes('app-member-list list', className)}
        >
            {heading}
            {listViews}
        </div>
    );
}
