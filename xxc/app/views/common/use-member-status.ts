import {useState, useEffect} from 'react';
import {membersStore} from '~/app/entries/vars/membersStore';

/**
 * 成员状态 Hook
 * @param memberID 成员 ID
 * @returns 成员状态名称
 */
export default function useMemberStatus(memberID: number | Nullish) {
    const [status, setStatus] = useState(() => (memberID ? membersStore.getMemberOrTemp(memberID).statusName : 'unverified'));

    useEffect(() => {
        setStatus(memberID ? membersStore.getMemberOrTemp(memberID).statusName : 'unverified');
        if (!memberID) {
            return;
        }

        const subscriberID = membersStore.subscribe(memberID, member => setStatus(member.statusName));
        return () => {
            membersStore.unsubscribe(subscriberID);
        };
    }, [memberID]);

    return status;
}
