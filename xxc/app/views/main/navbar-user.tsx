import {memo} from 'react';
import showUserProfileMenu from './user-profile-menu';
import useCurrentUser from '../common/use-current-user';
import {classes} from '~/app/utils/html-helper';
import MemberAvatarCommon from '../common/member-avatar-common';

type NavbarUserProps = Partial<{
    className: string;
}>;

/**
 * 用户导航组件
 */
function NavbarUser(props: NavbarUserProps) {
    const {className} = props;
    const [currentUser] = useCurrentUser();

    if (!currentUser) {
        return null;
    }
    return (
        <nav className={classes('app-nav-user -flex -flex-col -flex-none -items-center', className)} draggable={false}>
            <a className="-rounded-full -flex-none" onClick={showUserProfileMenu}>
                <MemberAvatarCommon
                    status={currentUser.statusName}
                    displayName={currentUser.displayName}
                    avatar={currentUser.avatar}
                    code={currentUser.id || currentUser.account}
                    showStatusDot
                    size={36}
                />
            </a>
        </nav>
    );
}

export default memo(NavbarUser);
