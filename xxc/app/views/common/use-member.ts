import {useState, useEffect} from 'react';
import membersStore from '../../core/members/members-store';

/**
 * 成员对象 Hook
 * @param memberID 成员 ID
 * @returns 返回一个数组，第一个元素为成员对象
 */
export default function useMember(memberID: number) {
    const [memberKeeper, setMemberKeeper] = useState(() => [membersStore.getMemberOrTemp(memberID)]);

    useEffect(() => {
        setMemberKeeper([membersStore.getMemberOrTemp(memberID)]);
        return membersStore.unsubscribe.bind(
            membersStore,
            membersStore.subscribe(memberID, member => setMemberKeeper([member]))
        );
    }, [memberID]);

    return memberKeeper;
}
