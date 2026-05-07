import {useState, useEffect, memo} from 'react';
import Avatar from '~/app/components/avatar';
import {membersStore} from '~/app/entries/vars/membersStore';
import type {ClassLike} from '~/app/utils/html-helper';
import {createAvatarPropsFromMember} from './member-avatar-common';
import useLang from './use-lang';

type MemberAvatarProp = {
    memberID: number;
    className?: ClassLike;
    shape?: string;
    showStatusDot?: boolean;
    size?: number;
    grayOffline?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

const MemberAvatarDefaultProps = Object.freeze({
    shape: '-rounded-full',
    showStatusDot: false,
    size: 24,
    grayOffline: false,
});

/**
 * 成员头像组件
 * @param props React 组件属性对象
 * @returns React 渲染内容
 */
function MemberAvatar(props: MemberAvatarProp) {
    const {memberID, ...otherProps} = props;
    const member = memberID ? membersStore.getMember(memberID) : null;
    const [avatar, setAvatar] = useState(member ? member.avatar : null);
    const [status, setStatus] = useState(member ? member.statusName : 'unverified');
    const [displayName, setDisplayName] = useState(member ? member.displayName : null);
    const [Lang] = useLang();

    useEffect(() => {
        const changedMember = memberID ? membersStore.getMember(memberID) : null;
        setAvatar(changedMember ? changedMember.avatar : null);
        setStatus(changedMember ? changedMember.statusName : 'unverified');
        setDisplayName(changedMember ? changedMember.displayName : null);

        if (memberID) {
            const subscriptionID = membersStore.subscribe(memberID, updatedMember => {
                if (updatedMember) {
                    setAvatar(updatedMember.avatar);
                    setStatus(updatedMember.statusName);
                    setDisplayName(updatedMember.displayName);
                }
            });
            return () => void membersStore.unsubscribe(subscriptionID);
        }
    }, [memberID]);

    const avatarProps = createAvatarPropsFromMember(status, displayName, avatar, {...MemberAvatarDefaultProps, ...otherProps, code: memberID});
    const title = `${displayName} [${Lang.string(`member.status.${status}`)}]`;
    return <Avatar {...avatarProps} title={title} />;
}

export default memo(MemberAvatar);
