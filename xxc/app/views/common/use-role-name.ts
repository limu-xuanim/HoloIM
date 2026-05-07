import {useState, useEffect} from 'react';
import deptsStore from '../../core/members/depts-store';

/**
 * 角色名称 Hook
 * @param role 角色代号
 * @returns 角色名称
 */
export default function useRoleName(role: string) {
    const [roleName, setRoleName] = useState(() => (role ? deptsStore.getRoleName(role) : null));

    useEffect(() => {
        setRoleName(role ? deptsStore.getRoleName(role) : null);
        const subscription = deptsStore.subscribeRoleChange(role, setRoleName);
        return () => subscription.unsubscribe();
    }, [role]);

    return roleName;
}
