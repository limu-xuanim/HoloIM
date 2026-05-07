import {useState, useEffect} from 'react';
import {onSwapUser, getCurrentUser, onUserLogin, onUserLogout, onUserReconnect} from '~/app/core/profile';
import membersStore from '~/app/core/members/members-store';

/**
 * 当前用户 Hook
 * @returns 返回一个数组，第一个元素当前用户对象
 */
export default function useCurrentUser() {
    const [currentUser, setCurrentUser] = useState<[User | null]>([getCurrentUser()]);
    const currentUserID = currentUser[0]?.id;

    useEffect(() => {
        function handleUserChange() {
            const user = getCurrentUser();
            setCurrentUser([user]);
        }

        handleUserChange();

        const swapSubscription = onSwapUser(handleUserChange);
        const loginSubscription = onUserLogin(handleUserChange);
        const logoutSubscription = onUserLogout(handleUserChange);
        const userReconnectSubscription = onUserReconnect(handleUserChange);
        const userChangeHandler = currentUserID
            ? membersStore.subscribe(currentUserID, (member) => {
                const user = getCurrentUser();
                user?.updateFromMember(member);
                setCurrentUser([user]);
            })
            : null;
        return () => {
            swapSubscription.unsubscribe();
            loginSubscription.unsubscribe();
            logoutSubscription.unsubscribe();
            userReconnectSubscription.unsubscribe();
            if (userChangeHandler) {
                membersStore.unsubscribe(userChangeHandler);
            }
        };
    }, [currentUserID]);

    return currentUser;
}
