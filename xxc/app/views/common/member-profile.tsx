import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import Icon from '../../components/icon';
import MemberAvatar from './member-avatar';
import useLang from './use-lang';
import useMember from './use-member';
import useDept from './use-dept';
import useRoleName from './use-role-name';

type MemberProfileProps = {memberId: number;}
    & Partial<{
        className: string;
        compact: boolean;
    }>;

/**
 * 成员资料界面组件
 * @param props React 组件属性对象
 * @param props.memberId 成员 ID
 * @param props.compact 是否为紧凑模式
 * @param props.className 类名
 * @returns JSX.Element
 */
function MemberProfile(props: MemberProfileProps) {
    const {memberId, compact = false, className, ...others} = props;
    const [Lang] = useLang();
    const [member] = useMember(memberId);
    const roleName = useRoleName(member.role);
    const dept = useDept(member.dept);

    return (
        <div
            className={classes('app-member-profile space', className, {compact})}
            {...others}
        >
            <header className="column has-padding-sm -items-center">
                {member.avatar ? <a className="-rounded-full" href={`xxc://viewMedia/${encodeURIComponent(member.avatar)}`}><MemberAvatar size={80} className="-flex-none" memberID={memberId} showStatusDot /></a> : <MemberAvatar size={80} className="-flex-none" memberID={memberId} showStatusDot />}
                <div className="profile-content">
                    <div className="title strong">
                        {member.displayName}
                        &nbsp;{member.gender ? member.gender === 'f' ? <Icon name="sprite-gender-f" /> : <Icon name="sprite-gender-m" /> : null}
                    </div>
                    <small className="muted">@{member.account}</small>
                </div>
            </header>
            <div className="divider" />
            {roleName && (
                <div className="x-list-item has-padding-sm">
                    <span className="-flex-none subtitle">{Lang.string('member.role')}</span>
                    <input type="input" className="input clean" readOnly value={roleName} />
                </div>
            )}
            {dept && (
                <div className="x-list-item has-padding-sm">
                    <span className="-flex-none subtitle">{Lang.string('member.dept')}</span>
                    <input type="input" className="input clean" readOnly value={dept.name} />
                </div>
            )}
            {member.email && (
                <div className="x-list-item has-padding-sm">
                    <span className="-flex-none subtitle">{Lang.string('member.profile.email')}</span>
                    <input type="input" className="input clean" readOnly value={member.email} />
                </div>
            )}
            {member.mobile && (
                <div className="x-list-item has-padding-sm">
                    <div className="-flex-none subtitle">{Lang.string('member.profile.mobile')}</div>
                    <input type="input" className="input clean" readOnly value={member.mobile} />
                </div>
            )}
            {member.phone && (
                <div className="x-list-item has-padding-sm">
                    <div className="-flex-none subtitle">{Lang.string('member.profile.phone')}</div>
                    <input type="input" className="input clean" readOnly value={member.phone} />
                </div>
            )}
        </div>
    );
}

export default memo(MemberProfile);
