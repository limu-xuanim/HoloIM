import {getCurrentUser} from '../profile';
import socket from '../server/socket';
import {setCallbackOnInitedDB} from '../db';
import {Subject} from 'rxjs';

export type DeptItem = {
    name: string;
    order: number;
    parent?: number;
    manager?: string;
    path?: string;
    id: number;
    children?: DeptItem[];
    parentsSet?: Set<number>;
};

/**
 * 部门排序比较函数
 * @param d1 部门1
 * @param d2 部门2
 * @returns 部门排序差值
 */
export const deptsSorter = (d1: DeptItem, d2: DeptItem) => {
    let result = (d1.order || 0) - (d2.order || 0);
    if (result === 0 || Number.isNaN(result)) {
        result = d1.id - d2.id;
    }
    return result;
};

/**
 * 对部门树进行排序
 * @param depts 部门数组
 * @returns 排序后的部门数组
 */
export const deptsDeepSort = (depts: DeptItem[]) => {
    for (const dept of depts) {
        if (dept.children) {
            dept.children = deptsDeepSort(dept.children);
        }
    }
    return depts.sort(deptsSorter);
};

/**
 * 从服务器获取指定部门下的用户列表
 * @param deptID 部门 ID
 * @param pager 页码
 * @param excludes 排除的用户id数组
 * @param onlySelf 是否仅获取本部门
 * @returns 使用 Promise 异步返回处理结果
 * @todo 添加缓存机制，避免每次都要从服务器获取
 */
export const fetchMembersListOfDept = async (
    deptID: number,
    pager = {pageID: 1, recPerPage: 50},
    excludes: number[] = [],
    onlySelf = false
) => {
    const params = [
        deptID,
        {pageID: pager.pageID, recPerPage: pager.recPerPage},
        '',
        excludes,
        onlySelf
    ];
    const msgPack = await socket.sendAndListen({
        method: 'usergetlistbydept',
        params
    }, true);

    if (DEBUG_I) {
        console.collapse('STORE.Deps', 'pinkBg', 'fetch dept members from remote', 'pinkPale', deptID, '');
        console.log('data', msgPack.data);
        console.log('pager', msgPack.pager);
        console.log('store', this);
        console.groupEnd();
    }

    if (msgPack?.isSuccess) {
        return {data: msgPack.data, pager: msgPack.pager};
    }
    if (DEBUG_W) {
        console.error(`Cannot get member list of dept "${deptID}"`);
    }
    return null;
};

/**
 * 初始化部门数据
 * @param deptsData 部门原始数据
 * @param deptsMap 部门缓存数据
 * @returns 部门缓存数据
 */
function initDeptsMap(deptsData: User['deptsCache'], deptsMap: Map<number, DeptItem>) {
    if (!deptsMap) {
        deptsMap = new Map();
    }
    const deptsList = [];
    const deptIDList = Object.keys(deptsData);
    for (const deptID of deptIDList) {
        if (!deptID) {
            continue;
        }
        const dept = {...deptsData[deptID as `${number}`]};
        dept.id = Number.parseInt(deptID, 10);
        if (dept.parent === 0) {
            delete dept.parent;
        }
        deptsMap.set(dept.id, dept);
        deptsList.push(dept);
    }

    for (const dept of deptsList) {
        let parentDept = dept.parent && deptsMap.get(dept.parent);
        if (parentDept) {
            const parentsSet = new Set<number>();
            if (!parentDept.children) {
                parentDept.children = [];
            }
            parentDept.children.push(dept);
            while (parentDept) {
                parentsSet.add(parentDept.id);
                parentDept = parentDept.parent && deptsMap.get(parentDept.parent);
            }
            dept.parentsSet = parentsSet;
        }
    }
    return deptsMap;
}

/**
 * 部门数据存储中心
 */
class DeptsStore {
    /**
     * 数据存储标识
     */
    private identify: string;

    /**
     * 部门数据状态，如果为 'expired' 表示只有本地数据或数据已经过期，如果为 'updated' 表示已经从服务器更新了数据，如果为 'none' 表示没有数据
     */
    private deptsDataStatus: false|'expired'|'updated'|'none' = false;

    /**
     * 获取完数据后的回调函数
     */
    private fetchCallbacks: Array<{
        resolve: (value?: unknown) => void;
        reject: (reason?: any) => void;
    }> = [];

    /**
     * 存储部门 ID 和部门对象
     */
    private depts = new Map<number, DeptItem>();

    /**
     * 存储部门树结构
     */
    private deptsTree: DeptItem[] = [];

    /**
     * 存储角色和角色名称
     */
    private roles = new Map<string, string>();

    /**
     * 部门更新事件
     */
    private deptsSubject = new Subject<Map<number, DeptItem>>();

    /**
     * 角色更新事件
     */
    private rolesSubject = new Subject<Map<string, string>>();

    private fetchingIdentify: string;

    /**
     * 创建一个部门数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    constructor(identify?: string) {
        this.identify = identify;
    }

    /**
     * 是否拥有从服务器更新过的数据
     */
    get isUpdatedData() {
        return this.deptsDataStatus === 'updated';
    }

    /**
     * 是否需要更新数据
     */
    get needUpdateData() {
        return this.deptsDataStatus !== 'updated';
    }

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    reset(identify?: string) {
        const identifyChanged = this.identify !== identify;
        if (identifyChanged) {
            this.identify = identify;
            this.roles.clear();
            this.depts.clear();
            this.deptsTree = [];

            // 从本地缓存读取数据
            const {rolesCache, deptsCache} = getCurrentUser();
            if (rolesCache) {
                for (const role of Object.keys(rolesCache)) {
                    this.roles.set(role, rolesCache[role]);
                }
            }
            if (deptsCache) {
                initDeptsMap(deptsCache, this.depts);
            }

            this.deptsDataStatus = (rolesCache || deptsCache) ? 'expired' : 'none';

            if (this.fetchCallbacks.length) {
                for (const cb of this.fetchCallbacks) {
                    cb.reject();
                }
                this.fetchCallbacks.length = 0;
            }

            if (DEBUG_I) {
                console.collapse('STORE.Deps', 'pinkBg', 'load from expired', 'pinkPale');
                console.log('rolesCache', rolesCache);
                console.log('deptsCache', deptsCache);
                console.log('store', this);
                console.groupEnd();
            }
        } else {
            this.deptsDataStatus = 'expired';
        }

        if (DEBUG_I) {
            console.collapse('STORE.Deps', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }
    }

    /**
     * 更新部门和角色数据
     * @param data 部门、角色数据对象
     */
    updateDeptsData(data: {roles: Record<string, string>; depts: Record<`${number}`, DeptItem>}) {
        if (data.roles) {
            this.roles.clear();
            for (const role of Object.keys(data.roles)) {
                this.roles.set(role, data.roles[role]);
            }
            this.rolesSubject.next(this.roles);
        }
        if (data.depts) {
            this.depts.clear();
            initDeptsMap(data.depts, this.depts);
            this.deptsTree = [];
            this.deptsSubject.next(this.depts);
        }

        // 将数据保存到本地缓存
        const currentUser = getCurrentUser();
        if (currentUser) {
            currentUser.rolesCache = data.roles;
            currentUser.deptsCache = data.depts;
            currentUser.save();
        }
    }

    /**
     * 从服务器获取部门和角色数据
     * @returns 使用 Promise 异步返回处理结果
     */
    async fetchDeptsDataFromRemote() {
        if (this.fetchingIdentify === this.identify) {
            return new Promise((resolve, reject) => {
                this.fetchCallbacks.push({resolve, reject});
            });
        }

        let data: Parameters<DeptsStore['updateDeptsData']>[0] = null;
        try {
            this.fetchingIdentify = this.identify;
            data = await socket.sendAndListen('sysgetdepts');
            if (this.fetchingIdentify !== this.identify) {
                return false;
            }

            if (data) {
                this.updateDeptsData(data);
            }

            this.deptsDataStatus = 'updated';

            if (this.fetchCallbacks.length) {
                for (const cb of this.fetchCallbacks) {
                    cb.resolve();
                }
            }

            if (DEBUG_I) {
                console.collapse('STORE.Deps', 'pinkBg', 'fetch from remote', 'pinkPale');
                console.log('data', data);
                console.log('store', this);
                console.groupEnd();
            }
        } catch (error) {
            if (this.fetchCallbacks.length) {
                for (const cb of this.fetchCallbacks) {
                    cb.reject();
                }
            }
            if (DEBUG) {
                console.collapse('STORE.Deps', 'pinkBg', 'fetch from remote error', 'redPale', error.toString(), 'red');
                console.error('error', error);
                console.log('store', this);
                console.groupEnd();
            }
        }
        this.fetchCallbacks.length = 0;
        this.fetchingIdentify = null;

        return data;
    }

    /**
     * 从服务器获取部门和角色数据
     * @returns 使用 Promise 异步返回处理结果
     */
    async tryFetchDeptsDataFromRemote() {
        if (this.needUpdateData) {
            await this.fetchDeptsDataFromRemote();
        }
    }

    /**
     * 获取角色名称
     * @param role 角色代号
     * @returns 角色名称
     */
    getRoleName(role: string) {
        this.tryFetchDeptsDataFromRemote();
        return this.roles.get(role);
    }

    /**
     * 获取部门信息
     * @param deptID 部门 ID
     * @returns 部门信息对象
     */
    getDept(deptID: number|`${number}`) {
        if (typeof deptID !== 'number') {
            deptID = Number.parseInt(deptID, 10);
        }
        this.tryFetchDeptsDataFromRemote();
        return this.depts.get(deptID);
    }

    /**
     * 获取部门名称
     * @param deptID 部门 ID
     * @returns 部门名称
     */
    getDeptName(deptID: number) {
        const dept = this.getDept(deptID);
        return dept ? dept.name : '';
    }

    /**
     * 检查是否拥有部门信息
     * @returns 如果为 true 表示有部门信息
     */
    hasDepts() {
        return !!this.depts.size;
    }

    /**
     * 获取部门树结构（根据当前用户的可见部门）
     * @returns 部门树结构
     */
    getDeptsTree() {
        this.tryFetchDeptsDataFromRemote();

        if (!this.depts.size) {
            return [];
        }

        if (!this.deptsTree || !this.deptsTree.length) {
            this.deptsTree = deptsDeepSort(
                Array.from(this.depts.values()).filter(x => !x.parentsSet || !x.parentsSet.size)
            );
        }
        return this.deptsTree;
    }

    /**
     * 尝试获取部门树结构（根据当前用户的可见部门）
     * @returns 使用 Promise 异步返回处理结果
     */
    async fetchDeptsTree() {
        await this.tryFetchDeptsDataFromRemote();
        return this.getDeptsTree();
    }

    /**
     * 订阅部门变更事件
     * @param listener 监听函数
     * @returns 订阅 ID
     */
    subscribeDeptsChange(listener: (value: Map<number, DeptItem>) => void) {
        return this.deptsSubject.subscribe(listener);
    }

    /**
     * 订阅指定部门变更事件
     * @param deptID 要订阅的部门 ID
     * @param listener 监听函数
     * @returns 订阅 ID
     * @todo 支持指定部门 ID
     */
    subscribeDeptChange(deptID: number, listener: (dept: DeptItem) => void) {
        return this.subscribeDeptsChange(() => listener(this.getDept(deptID)));
    }

    /**
     * 订阅角色变更事件
     * @param listener 监听函数
     * @returns 订阅 ID
     */
    private subscribeRolesChange(listener: (value: Map<string, string>) => void) {
        return this.rolesSubject.subscribe(listener);
    }

    /**
     * 订阅指定角色变更事件
     * @param role 要订阅的角色代号
     * @param listener 监听函数
     * @returns 订阅 ID
     * @todo 支持指定角色代号
     */
    subscribeRoleChange(role: string, listener: (role: string) => void) {
        return this.subscribeRolesChange(() => listener(this.getRoleName(role)));
    }
}

/**
 * 部门数据存储中心
 */
const deptsStore = new DeptsStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(deptsStore.reset.bind(deptsStore));

if (DEBUG_I) {
    global.$deptsStore = deptsStore;
}

export default deptsStore;
