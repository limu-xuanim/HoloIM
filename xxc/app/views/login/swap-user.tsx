import {useState} from 'react';
import Icon from '~/app/components/icon';
import User from '~/app/core/profile/user';
import {getUserListFromStore, removeUserFromStore} from '~/app/core/profile/user-store';
import {classes} from '~/app/utils/html-helper';
import UserListItem from '../common/user-list-item';
import useLang from '../common/use-lang';

type SwapUserProps = {
    className?: Parameters<typeof classes>[0];
    identify: string;
    server: string;
    onSelectUser: (user: User) => void;
};

/**
 * 获取用户列表
 * @param reload 是否强制重读数据
 * @returns 用户对象列表
 */
const getUserList = (server: string) => {
    const userList = getUserListFromStore();
    if (!server) {
        return userList;
    }

    const serverUrl = User.simplifyServerUrl(server);
    return userList.filter(x => isOriginEqual(User.simplifyServerUrl(x.server!), serverUrl));
};

const isOriginEqual = (u1: string, u2: string) => {
    try {
        const url1 = new URL(u1);
        const url2 = new URL(u2);
        return url1.origin === url2.origin;
    } catch {
        return false;
    }
}

/**
 * SwapUser 组件 ，显示切换用户界面
 */
export default function SwapUser(props: SwapUserProps) {
    const {className, identify, server, onSelectUser, ...other} = props;
    const [hover, setHover] = useState('');
    const [userList, setUserList] = useState(() => getUserList(server));
    const [Lang] = useLang();

    /**
     * 处理鼠标进入事件
     * @param identify 用户标识
     */
    const handleMouseEnter = (_identify: string) => {
        setHover(_identify);
    };

    /**
     * 处理鼠标离开事件
     */
    const handleMouseLeave = () => {
        setHover('');
    };

    /**
     * 处理点击删除按钮事件
     * @param user 删除的用户
     * @param e 事件对象
     */
    const handleDeleteBtnClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, user: User) => {
        removeUserFromStore(user.identify);
        setUserList(() => getUserList(server));
        e.stopPropagation();
    };

    return (
        <div className={classes('app-swap-user list has-padding-v', className)} {...other}>
            {
                userList.map(x => {
                    const user = User.create(x);
                    const userIdentify = user.identify;
                    const isHover = hover === userIdentify;
                    const isActive = userIdentify === identify;
                    return (
                        <UserListItem
                            key={user.identify}
                            user={user}
                            onMouseEnter={() => handleMouseEnter(userIdentify)}
                            onMouseLeave={handleMouseLeave}
                            className={classes('-items-center', {'primary-pale': isActive})}
                            onClick={() => onSelectUser(user)}
                        >
                            {
                                isHover
                                    ? (
                                        <button
                                            type="button"
                                            title={Lang.string('common.remove')}
                                            onClick={(e) => handleDeleteBtnClick(e, user)}
                                            className="btn iconbutton -rounded -z-10"
                                        >
                                            <Icon name="delete text-danger" />
                                        </button>
                                    )
                                    : isActive
                                        ? <div className="checkbox checkbox-sm checked"><label /></div>
                                        : null
                            }
                        </UserListItem>
                    );
                })
            }
        </div>
    );
}
