import {useState, useEffect} from 'react';
import {isUserVerified} from '../../core/profile';
import {onUserStatusChange} from '~/app/core/profile/user';

/**
 * 当前用户验证状态 Hook
 * @returns 如果为 true，则表示当前用户已经成功登录过
 */
export default function useUserVerified() {
    const [verified, setVerified] = useState(isUserVerified());

    useEffect(() => {
        const subscription = onUserStatusChange(() => setVerified(isUserVerified()));
        return () => subscription.unsubscribe();
    }, []);

    return verified;
}
