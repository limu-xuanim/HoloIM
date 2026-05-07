import {useState, useEffect} from 'react';
import {isUserOnline} from '../../core/profile';
import {onUserStatusChange} from '~/app/core/profile/user';

/**
 * 用户在线状态 Hook
 * @returns 是否在线
 */
export default function useUserOnlineStatus() {
    const [isOnline, setIsOnline] = useState(isUserOnline());

    useEffect(() => {
        const subscription = onUserStatusChange(() => setIsOnline(isUserOnline()));
        return () => subscription.unsubscribe();
    }, [])

    return isOnline;
}
