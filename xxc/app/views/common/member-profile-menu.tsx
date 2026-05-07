import {memo} from 'react';
import {addContextMenuCreator} from '../../core/context-menu';
import MemberAvatar from './member-avatar';
import StatusDot from './status-dot';
import Icon from '../../components/icon';
import {isEmptyString, isNotEmptyString} from '../../utils/check-empty';
import {getCurrentUserID, isCurrentUser} from '../../core/profile';
import platform from '../../platform';
import useMember from './use-member';
import Spinner from '../../components/spinner';
import {getMemberAvatar} from '../../core/members/member-helper';
import {createOne2OneChatGid} from '../../core/im/chat';
import {executeCommandLine} from '../../core/commander';
import MemberRoleName from './member-role-name';
import MemberDeptName from './member-dept-name';
import useMemberStatus from './use-member-status';
import {showUserEditInfoDialog} from './user-edit-info-dialog';
import useLang from './use-lang';

type MemberProfileMenuProps = {
    memberID: number,
    showMentionBtn?: boolean,
    disableButton?: boolean,
};

/**
 * 成员资料菜单组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @returns React Node content
 */
function MemberProfileMenu(props: MemberProfileMenuProps) {
    const {memberID, showMentionBtn, disableButton} = props;
    const [member] = useMember(memberID);
    const statusName = useMemberStatus(memberID) as Member['statusName'];
    const [Lang] = useLang();

    if (!member) {
        return <Spinner />;
    }

    const {displayName} = member;
    const views = [
        (
            <div key="name" className="item is-member-name">
                <div className="-rounded-full state" onClick={member.avatar ? () => executeCommandLine(`viewMedia/${encodeURIComponent(getMemberAvatar(member.avatar))}`) : null}>
                    <MemberAvatar memberID={memberID} size={40} />
                </div>
                {isEmptyString(displayName) ? (
                    <div className="content">
                        <div className="title loading-holder -relative loading-holder-line space-xs" style={{width: 80}} />
                        <div className="subtitle loading-holder -relative loading-holder-line" style={{width: 60}} />
                    </div>
                ) : (
                    <div className="content user-selectable">
                        <div className="title strong">{member.displayName} {member.gender && member.gender !== 'u' ? <Icon name={`sprite-gender-${member.gender}`} /> : null}</div>
                        <div className="subtitle">@{member.account}</div>
                    </div>
                )}
            </div>
        ), (
            <div key="status" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.status')}</div>
                <div className="title">
                    <StatusDot status={statusName} label={Lang.string(`member.status.${statusName}`)} />
                </div>
            </div>
        )
    ];
    if (member.dept) {
        views.push(
            <div key="dept" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.dept.short')}</div>
                <MemberDeptName className="title" id={member.dept} />
            </div>
        );
    }
    if (isNotEmptyString(member.role)) {
        views.push(
            <div key="role" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.role')}</div>
                <MemberRoleName className="title -truncate" role={member.role} />
            </div>
        );
    }
    if (isNotEmptyString(member.email)) {
        views.push(
            <div key="email" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.profile.email')}</div>
                <div className="title">{member.email}</div>
            </div>
        );
    }
    if (isNotEmptyString(member.mobile)) {
        views.push(
            <div key="mobile" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.profile.mobile')}</div>
                <div className="title">{member.mobile}</div>
            </div>
        );
    }
    if (isNotEmptyString(member.phone)) {
        views.push(
            <div key="phone" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.profile.phone')}</div>
                <div className="title">{member.phone}</div>
            </div>
        );
    }
    if (isNotEmptyString(member.weixin)) {
        views.push(
            <div key="weixin" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.profile.weixin')}</div>
                <div className="title">{member.weixin}</div>
            </div>
        );
    }
    if (isNotEmptyString(member.qq)) {
        views.push(
            <div key="qq" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">QQ</div>
                <div className="title">{member.qq}</div>
            </div>
        );
    }
    if (isNotEmptyString(member.address)) {
        views.push(
            <div key="address" className="item user-selectable">
                <div className="strong app-member-profile-menu-title">{Lang.string('member.profile.address')}</div>
                <div className="title -truncate" title={member.address}>{member.address}</div>
            </div>
        );
    }

    const cgid = createOne2OneChatGid(getCurrentUserID(), memberID);
    const showChatBtn = !member.isDeleted;
    if (showMentionBtn || showChatBtn || isCurrentUser(memberID)) {
        const buttons = [
            isCurrentUser(memberID) && (
                <a key="editInfoBtn" data-dismiss className="btn btn-sm -rounded gray x-outline" onClick={() => showUserEditInfoDialog(memberID)}>
                    {Lang.string('member.profile.editUserInfo')}
                </a>
            ),
            showChatBtn && (
                <a
                    key="chatBtn"
                    data-dismiss
                    className="btn btn-sm -rounded accent"
                    href={`#/chats/recents/${cgid}`}
                >
                    {Lang.string('member.profile.sendMessage')}
                </a>
            ),
            showMentionBtn && (
                <a key="mentionBtn" data-dismiss className="btn btn-sm -rounded gray x-outline" href={`xxc://mentionMemberInSendbox/${encodeURIComponent(memberID)}`}>
                    {Lang.string(`chat.atHim.${member.gender}`, Lang.string('chat.atHim'))}
                </a>
            )
        ];

        // 检查应用运行的操作系统类型是否是 macOS，对按钮顺序进行处理
        if (platform.env.isOSX) {
            buttons.reverse();
        }

        if (!disableButton) {
            views.push(
                <div key="actions" className="item row single -justify-center actions">
                    {buttons}
                </div>
            );
        }
    }

    return (<> {views} </>);
}

// 注册上下文菜单：用户资料菜单
addContextMenuCreator('member.profile', (context: { showMentionBtn?: any; memberID?: any; member?: any; params?: any;}) => {
    const {params} = context;
    // 从 url 调用的话，params[1] 为 showMentionBtn，params[2] 为 disableButton
    const showMentionBtn = ((params ? params[1] : null) || context.showMentionBtn) === true;
    const disableButton = (params ? params[2] : false);
    let memberID = (params ? params[0] : null) || context.memberID || context.member;
    if (typeof memberID === 'object' && memberID) {
        memberID = memberID.id;
    }
    if (typeof memberID === 'string') {
        if (memberID[0] === '#') {
            memberID = memberID.substring(1);
        }
        memberID = Number.parseInt(memberID, 10);
    }

    return [<MemberProfileMenu key="menu" memberID={memberID} showMentionBtn={showMentionBtn} disableButton={disableButton} />];
}, {apiLevel: 4});

export default memo(MemberProfileMenu);
