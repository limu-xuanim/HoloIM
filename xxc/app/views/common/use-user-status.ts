import {useState, useEffect} from 'react';
import {getUserStatus} from '../../core/profile';
import {onUserStatusChange} from '~/app/core/profile/user';

/**
 * 用户状态 Hook
 * @returns 用户状态代码
 */
export default function useUserStatus() {
    const [userStatus, setUserStatus] = useState(getUserStatus());

    useEffect(() => {
        const subscription = onUserStatusChange(() => setUserStatus(getUserStatus()));
        return () => subscription.unsubscribe();
    }, []);

    return userStatus;
}
