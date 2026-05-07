import DelayAction from '../../utils/delay-action';
import {unionSets} from '../../utils/set-helper';
import Member, {type MemberLike} from './member';
import dexie, {beginDBBusyTask, endDBBusyTask, setCallbackOnInitedDB} from '../db';
import {DataStore} from '../db/datastore';
import socket from '../server/socket';
import {getCurrentUser, getCurrentUserID, isUserOnline, onUserLogout, onUserReconnect} from '../profile';

/**
 * 分页对象
 */
export type Pager = {
    recPerPage: number;
    recTotal: number;
    pageID: number;
};

/**
 * 格式化成员对象
 * @param member 成员对象
 * @param fromDB 是否从数据库读取
 * @returns 成员对象
 */
const normalizeMember = (member: Member|MemberLike) => {
    if (!(member instanceof Member)) {
        member = new Member(member);
    }
    const currentUserID = getCurrentUserID();
    if (!member.cgid) {
        if (currentUserID !== member.id) {
            member.cgid = [currentUserID, member.id].sort().join('&');
        }
    }

    return member;
};

const normalizeMemberFromDB = (member: Member|MemberLike, fromDB = false) => {
    member = normalizeMember(member);
    const currentUserID = getCurrentUserID();
    if (!fromDB && currentUserID === member.id) {
        getCurrentUser().updateFromMember(member);
    }

    return member;
};

/**
 * 根据 id 从服务器查询用户
 * @param ids 用户id
 * @returns 查询结果
 */
export async function fetchMembersFromRemote(ids: number[]) {
    try {
        return await socket.sendAndListen({
            method: 'usergetlist',
            params: [ids],
        });
    } catch {
        return [];
    }
}

/**
 * 成员数据存储中心
 */
export class MembersStore extends DataStore<number, Member, MemberLike> {
    /**
     * 请求详细用户数据任务信息
     */
    private _fetchInfo = {
        timerID: null as NodeJS.Timeout | null,
        waiting: new Set<number>(),
        fetching: new Set<number>(),
    };

    /**
     * 执行远程请求数据时的等待时间
     */
    _fetchWaitTime = 1000;

    /**
     * 保存数据到数据库延时任务
     */
    _databaseSaveTask: DelayAction<() => void>;

    /**
     * 需要保存到数据库的成员 id 集合
     */
    _membersNeedSave = new Set<number>();

    /**
     * 数据库查询延时任务
     */
    _databaseQueryTask: DelayAction<() => void>;

    /**
     * 需要从数据库的查询的成员 ID 集合
     */
    _membersNeedQuery = new Set<number>();

    /**
     * 已经订阅状态变更的成员 ID 集合
     */
    membersSubscribed = new Set<number>();

    _gettingFromDatabase: Set<number>;

    /**
     * 创建一个成员数据存储中心实例
     */
    constructor() {
        super('Member', {recordRecentAccess: 100});

        this._databaseSaveTask = new DelayAction(this.saveMembersToDatabase.bind(this), 3000);
        this._databaseQueryTask = new DelayAction(this.queryMembersFromDatabase.bind(this), 200);
    }

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     */
    override reset(identify: string) {
        const identifyChanged = super.reset(identify);
        if (this._fetchInfo.timerID) {
            clearTimeout(this._fetchInfo.timerID);
            this._fetchInfo.timerID = null;
        }
        this._fetchInfo.waiting.clear();
        if (this._fetchInfo.fetching) {
            this._fetchInfo.fetching.clear();
        }
        this._databaseQueryTask.cancel();
        this._membersNeedQuery.clear();
        this.membersSubscribed.clear();

        if (DEBUG_I) {
            console.collapse('STORE.Member', 'pinkBg', 'reset', 'pinkPale', identifyChanged, '');
            console.log('identify', identify);
            console.groupEnd();
        }
        return true;
    }

    /**
     * 存储数据
     * @param members 要存储的数据对象列表
     * @param options 存储选项
     * @param options.putToDatabase 是否将数据更新到数据库
     * @returns 存储的数据对象列表
     * @override
     */
    store(members: MemberLike|Member|Array<Member|MemberLike>, options: Partial<{putToDatabase: boolean;}> = {}) {
        if (!members) {
            return;
        }
        if (!Array.isArray(members)) {
            members = [members];
        } else if (!members.length) {
            return;
        }

        const {putToDatabase = true} = options;

        const realMembers = super.store(members, {normalizeFunc: normalizeMember});

        if (putToDatabase) {
            this.planToSaveMembersToDatabase(realMembers.map(x => x.id));
        }

        if (DEBUG_I) {
            console.collapse('STORE.Member', 'pinkBg', 'store', 'pinkPale', realMembers.length, '');
            console.trace('members', realMembers);
            console.log('store', this);
            console.groupEnd();
        }

        return realMembers;
    }

    /**
     * 尝试从服务器获取成员列表
     * @param ids 要获取的成员 ID 列表
     */
    fetchFromRemote(ids?: number|number[]) {
        if (typeof ids === 'number') {
            ids = [ids];
        }

        const {fetching, waiting} = this._fetchInfo;

        if (Array.isArray(ids) && ids.length) {
            const waitIds = fetching ? ids.filter(id => !fetching.has(id)) : ids;
            if (waitIds.length) {
                this._fetchInfo.waiting = unionSets(waiting, waitIds);
            }
        }

        if (fetching?.size) {
            return;
        }

        if (this._fetchInfo.timerID) {
            clearTimeout(this._fetchInfo.timerID);
        }
        this._fetchInfo.timerID = setTimeout(async () => {
            this._fetchInfo.timerID = null;
            await this.fetchFromRemoteImmediately();
            if (this._fetchInfo.waiting.size) {
                this.fetchFromRemote();
            }
        }, this._fetchWaitTime);
    }

    /**
     * 立即从服务器获取等待队列中的成员信息
     * @returns 使用 Promise 异步返回处理结果
     */
    async fetchFromRemoteImmediately() {
        const {waiting} = this._fetchInfo;
        if (!isUserOnline() || !socket.isConnected || !waiting.size) {
            return;
        }

        const waitingIds = [...waiting];

        this._fetchInfo.waiting.clear();
        this._fetchInfo.fetching = new Set(waitingIds);

        try {
            socket.subscribeUser('userupdate', waitingIds);
            waitingIds.forEach(id => this.membersSubscribed.add(id));
            await fetchMembersFromRemote(waitingIds);
        } catch (_) {
            this._fetchInfo.waiting = unionSets(this._fetchInfo.waiting, waitingIds);
        }
        this._fetchInfo.fetching = null;
    }

    async searchFromRemote(search: string): Promise<Member[]>;

    async searchFromRemote(
        search: string,
        options: Partial<{
            chat: string;
            dept: number;
            limit: number;
            exclude: number[];
        }>
    ): Promise<Member[]>;

    async searchFromRemote(
        search: string,
        options: Partial<{
            chat: string;
            dept: number;
            limit: number;
            exclude: number[];
        }> & {pager: Pager},
    ): Promise<{list: Member[]; pager: Pager;}>;

    /**
     * 从服务端搜索成员
     * @param search 要搜索的关键字
     * @param options 搜索选项（在某个群或某个部门搜索）
     * @param options.chat 要搜索的群 ID
     * @param options.dept 要搜索的部门 ID
     * @param options.limit 搜索结果数量限制
     * @param options.exclude 要排除的成员 ID 列表
     * @param options.pager 分页信息
     * @returns 使用 Promise 异步返回处理结果
     */
    async searchFromRemote(
        search: string,
        options: Partial<{
            chat: string;
            dept: number;
            limit: number;
            exclude: number[];
            pager: Pager,
        }> = {},
    ) {
        const {data: remoteMembers, pager} = await socket.sendAndListen<{data: Member[]; pager: Pager;}>({
            method: 'usersearch',
            params: [search, options, false]
        });

        const storedMembers = this.store(remoteMembers) || [];
        return options.pager ? {list: storedMembers, pager} : storedMembers;
    }

    /**
     * 稍后将指定会话保存到数据库
     * @param members 要保存的成员列表
     */
    planToSaveMembersToDatabase(memberIDs: number[]) {
        for (const id of memberIDs) {
            this._membersNeedSave.add(id);
        }
        this._databaseSaveTask.do();
    }

    /**
     * 将更改的成员保存到数据库
     */
    async saveMembersToDatabase() {
        if (!this._membersNeedSave.size) {
            return;
        }
        const membersNeedSave = [];
        for (const id of this._membersNeedSave) {
            const member = this.getItemFromCache(id);
            if (member) {
                membersNeedSave.push(member.plain());
            }
        }
        this._membersNeedSave.clear();

        if (membersNeedSave.length) {
            beginDBBusyTask();
            try {
                const memberTable = dexie.database.members;

                if (membersNeedSave.length) {
                    await memberTable.bulkPut(membersNeedSave);
                }

                if (DEBUG_I) {
                    console.collapse('STORE.Member', 'pinkBg', 'save members to memberTable', 'pinkPale', membersNeedSave.length, '');
                    console.log('membersNeedSave', membersNeedSave);
                    console.log('store', this);
                    console.groupEnd();
                }
            } catch (error) {
                if (DEBUG) {
                    console.collapse('STORE.Member', 'pinkBg', 'save members to memberTable Error', 'redPale', String(error), 'red');
                    console.error('error', error);
                    console.log('membersNeedSave', membersNeedSave);
                    console.log('store', this);
                    console.groupEnd();
                }
            }
            endDBBusyTask();
        }
    }

    /**
     * 尝试从数据库获取成员信息
     * @param ids 成员 ID 列表
     */
    tryQueryMembersFromDatabase(ids: number|number[]) {
        if (typeof ids === 'number') {
            ids = [ids];
        }
        let hasAdded = false;
        for (const id of ids) {
            if (!this._membersNeedQuery.has(id)) {
                this._membersNeedQuery.add(id);
                hasAdded = true;
            }
        }
        if (hasAdded) {
            this._databaseQueryTask.do();
        }
    }

    /**
     * 处理等待队列中需要从数据库查询用户的信息
     * @returns 使用 Promise 异步返回处理结果
     */
    async queryMembersFromDatabase() {
        if (!this._membersNeedQuery.size) {
            return;
        }
        const ids = [...this._membersNeedQuery];
        this._membersNeedQuery.clear();
        return this.getMembersFromDatabase(ids);
    }

    /**
     * 从数据库获取多个成员信息
     * @param ids 成员 ID 列表
     * @returns 使用 Promise 异步返回处理结果
     */
    async getMembersFromDatabase(ids: number|number[]) {
        const identify = this._identify;
        const memberTable = dexie.database?.members;
        if (!memberTable) {
            return;
        }
        let membersInDb: MemberLike[];
        if (Array.isArray(ids)) {
            membersInDb = await memberTable.bulkGet(ids);
        } else {
            const memberLike = await memberTable.get(ids);
            if (memberLike) {
                membersInDb = [memberLike];
            }
        }
        if (!membersInDb || identify !== this._identify) {
            return;
        }
        const updatedMembers: Member[] = [];
        const members = membersInDb.map(memberLike => {
            if (!memberLike) {
                return null;
            }
            const cacheMember = this._cache.get(memberLike.id);
            if (cacheMember) {
                return cacheMember;
            }

            const member = normalizeMemberFromDB(memberLike, true);
            member.expired = true;
            updatedMembers.push(member);
            return member;
        });

        if (DEBUG_I) {
            console.collapse('STORE.Member', 'pinkBg', 'get members from memberTable', 'pinkPale', members.length, '');
            console.log('members', members);
            console.log('store', this);
            console.groupEnd();
        }

        if (updatedMembers.length) {
            this.store(updatedMembers, {putToDatabase: false});
        }
        return members;
    }

    /**
     * 从数据库加载最近访问的成员到缓存中
     */
    async loadRecentAccessMembersFromDatabase() {
        const {recentAccessList} = this;
        if (recentAccessList && recentAccessList.length) {
            const members = await this.getMembersFromDatabase(recentAccessList);
            if (DEBUG_I) {
                console.collapse('STORE.Member', 'pinkBg', 'load recent access members', 'pinkPale', members.length, '');
                console.log('recentAccessList', recentAccessList);
                console.log('members', members);
                console.log('store', this);
                console.groupEnd();
            }
        }
    }

    /**
     * 从缓存中获取成员
     * @param id 成员 ID
     * @returns 成员对象
     */
    getMember(id: number) {
        if (Number.isNaN(id) || id <= 0) {
            return null;
        }
        const member = this.getItemFromCache(id);
        if (!member) {
            this.tryQueryMembersFromDatabase(id);
        }
        if (!member || member.expired) {
            this.fetchFromRemote(id);
        } else {
            member.lastAccessTime = Date.now();
        }
        return member;
    }

    /**
     * 从缓存中获取成员，如果没有找到生成一个临时用户
     * @param id 成员 ID
     * @returns 成员对象
     */
    getMemberOrTemp = (id: number) => {
        const member = this.getMember(id);
        return member || new Member({
            id,
            status: 'offline',
            realname: '',
            account: '',
            displayName: '',
        });
    };

    /**
     * 根据 ID、账户或真实姓名从缓存中查找成员
     * @param key ID、账户或真实姓名
     * @returns  如果找到返回成员对象，否则返回 null
     */
    guessMemberInCache(key: string|number) {
        if (typeof key === 'string') {
            if (key[0] === '#') {
                const id = Number.parseInt(key.substring(1), 10);
                if (!Number.isNaN(id)) {
                    key = id;
                }
            } else if (key[0] === '@') {
                key = key.substring(1);
            }
        }
        if (typeof key === 'number') {
            return this.getItemFromCache(key);
        }
        let member: Member = null;
        this.forEach(m => {
            if (m.account === key || m.realname === key) {
                member = m;
                return false;
            }
        });
        return member;
    }

    /**
     * 从缓存中获取成员列表
     * @param ids 成员 ID 列表
     * @returns 成员列表
     */
    getMembers(ids: number[]) {
        const members = this.getItemsFromCache(ids);
        const idsNeedLookupDatabase = new Set<number>();
        const idsNeedFetchFromRemote = new Set<number>();
        ids.forEach((id, index) => {
            const member = members[index];
            if (!member) {
                if (this._gettingFromDatabase && !this._gettingFromDatabase.has(id)) {
                    idsNeedLookupDatabase.add(id);
                }
                idsNeedFetchFromRemote.add(id);
            } else if (member.expired) {
                idsNeedFetchFromRemote.add(id);
            }
        });

        if (idsNeedLookupDatabase.size) {
            this.tryQueryMembersFromDatabase([...idsNeedLookupDatabase]);
        }
        if (idsNeedFetchFromRemote.size) {
            this.fetchFromRemote([...idsNeedFetchFromRemote]);
        }
        return members;
    }

    /**
     * 异步获取成员，依次尝试从内存、数据库和服务器获取成员
     * @param id 成员 ID 或账号
     * @returns 成员对象
     */
    async asyncGetMember(id: number) {
        if (!id) {
            return null;
        }

        let member = this.getItemFromCache(id);
        if (!member) {
            const resultInDb = await this.getMembersFromDatabase([id]);
            if (resultInDb) {
                member = resultInDb[0];
            }
        }
        if (!member || member.expired) {
            const resultFromRemote = await fetchMembersFromRemote([id]);
            if (resultFromRemote) {
                member = resultFromRemote[0];
            }
        }
        return member;
    }

    /**
     * 异步获取多个成员，依次尝试从内存、数据库和服务器获取成员
     * @param ids 成员 ID 列表，或者成员账号列表
     * @returns 成员对象
     */
    async asyncGetMembers(ids: number[]) {
        if (!ids || !ids.length) {
            return null;
        }

        const members = this.getItemsFromCache(ids);
        const idsNeedLookup = new Set<number>();
        const idIndexesMap = new Map<number, number>();
        ids.forEach((id, index) => {
            const member = members[index];
            if (!member) {
                idsNeedLookup.add(id);
            }
            idIndexesMap.set(id, index);
        });

        // 查询数据库
        if (idsNeedLookup.size) {
            const resultsInDB = await this.getMembersFromDatabase([...idsNeedLookup]);
            if (resultsInDB && resultsInDB.length) {
                for (const member of resultsInDB) {
                    if (member && !member.expired) {
                        idsNeedLookup.delete(member.id);
                        members[idIndexesMap.get(member.id)] = member;
                    }
                }
            }
        }

        // 从服务器获取
        if (idsNeedLookup.size) {
            const resultFromRemote = await fetchMembersFromRemote(ids);
            if (resultFromRemote && resultFromRemote.length) {
                for (const member of resultFromRemote) {
                    members[idIndexesMap.get(member.id)] = member;
                }
            }
        }

        return members;
    }
}

/**
 * 成员数据存储中心
 */
const membersStore = new MembersStore();

// 监听数据库初始化完成事件
setCallbackOnInitedDB(membersStore.reset.bind(membersStore));

// 当用户退出时保存未保存的数据
onUserLogout(() => {
    membersStore.saveMembersToDatabase();
});

// 当用户断线重连后，向服务端请求重新订阅成员状态变更
onUserReconnect(() => {
    if (membersStore.membersSubscribed.size) {
        socket.subscribeUser('userupdate', [...membersStore.membersSubscribed]);
    }
});

if (DEBUG) {
    global.$membersStore = membersStore;
}

export default membersStore;
