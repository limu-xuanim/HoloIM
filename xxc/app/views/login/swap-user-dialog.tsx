import Modal from '~/app/components/modal';
import SwapUser from './swap-user';
import Lang from '~/app/core/lang';

/**
 * 显示切换用户对话框
 * @param identify 当前用户标识字符串
 * @param server 当前服务器地址
 * @param onSelectUser 当切换用户时的回调函数
 * @param callback 对话框显示完成的回调函数
 * @returns 使用 Promise 异步返回处理结果
 */
export default function showSwapUserDialog(identify: string, server: string, onSelectUser: (user: User) => void, callback?: () => void) {
    const modalId = 'app-login-swap-user';
    return Modal.show({
        title: <div className="-text-sm -font-semibold -p-2">{Lang.string('login.swapUser')}</div>,
        actions: false,
        id: modalId,
        style: {width: 480, maxHeight: 420},
        content: <SwapUser
            identify={identify}
            server={server}
            onSelectUser={user => {
                Modal.hide(modalId);
                if (onSelectUser) {
                    onSelectUser(user);
                }
            }}
        />
    }, callback);
};
