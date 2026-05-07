import {useState, useEffect} from 'react';
import {membersStore} from '~/app/entries/vars/membersStore';

/**
 * 成员名称 Hook
 * @param id 成员 ID
 * @returns 成员名称
 */
export default function useMemberName(memberID: number): string {
    const [name, setName] = useState(() => membersStore.getMemberOrTemp(memberID)?.displayName ?? '');

    useEffect(() => {
        setName(membersStore.getMemberOrTemp(memberID)?.displayName ?? '');
        return membersStore.unsubscribe.bind(
            membersStore,
            membersStore.subscribe(memberID, member => {
                setName(member.displayName);
            })
        );
    }, [memberID]);

    return name;
}
