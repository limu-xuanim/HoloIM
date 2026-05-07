import {useState, useEffect} from 'react';
import deptsStore from '~/app/core/members/depts-store';

/**
 * 部门 Hook
 * @param deptID 部门 ID
 * @returns 部门对象
 */
export default function useDept(deptID: number) {
    const [dept, setDept] = useState(() => (deptID ? deptsStore.getDept(deptID) : null));

    useEffect(() => {
        setDept(deptID ? deptsStore.getDept(deptID) : null);
        const subscription = deptsStore.subscribeDeptChange(deptID, setDept)
        return subscription.unsubscribe();
    }, [deptID]);

    return dept;
}
