import DelayAction from '~/app/utils/delay-action';
import {setStoreItem, getStoreItem} from '~/app/utils/store';
import {DataChannel} from './data-channel';
import type {EventName} from '~/app/utils/event-channel';

/**
 * 数据存储中心
 */
export abstract class DataStore<K extends string|number, T extends {expired?: boolean;}, L> {
    _name: string;

    _identify: string;

    _key: string;

    _cache: Map<K, T>;

    _channel: DataChannel;

    _recentAccessLimit: number;

    /**
     * 最近访问的对象列表，按访问时间倒序排列
     */
    _recentAccessList: K[];

    /**
     * 保存数据到数据库延时任务
     */
    _recentAccessSaveTask: DelayAction<() => void>;

    beforeSubscribe: (keys: EventName|EventName[], listener: (args: any[]) => void) => void;

    afterSubscribe: (keys: EventName|EventName[], subscriberIDs: symbol) => void;

    afterUnsubscribe: (subscriberID: symbol|symbol[], result: boolean|boolean[]) => void;

    /**
     * 创建一个数据存储中心
     * @param name 数据存储名称
     * @param options 选项
     * @param options.key 数据项键名
     * @param options.channelDelayTime 更新通知触发延时
     * @param options.recordRecentAccess 记录最近访问的数据个数，如果设置为 0 则不记录
     */
    constructor(
        name: string,
        options: Partial<{
            key: string;
            channelDelayTime: number;
            recordRecentAccess: number;
        }> = {}
    ) {
        const {key = 'id', channelDelayTime = 500, recordRecentAccess = 0} = options;

        this._name = name;
        this._key = key;
        this._cache = new Map();
        this._channel = new DataChannel({key, delayTime: channelDelayTime});
        this._recentAccessLimit = recordRecentAccess;

        if (recordRecentAccess) {
            this._recentAccessList = [];
            this._recentAccessSaveTask = new DelayAction<() => void>(this.saveRecentAccessList.bind(this), 3000);
        }
    }

    /**
     * 获取数据变更事件调度器
     */
    get channel() {
        return this._channel;
    }

    /**
     * 获取缓存大小
     */
    get size() {
        return this._cache.size;
    }

    /**
     * 获取数据存储标识，通常为当前连接的服务器地址
     */
    get identify() {
        return this._identify;
    }

    /**
     * 获取所有数据
     */
    get all() {
        return Array.from(this._cache.values());
    }

    /**
     * 获取所有键值
     */
    get allKeys() {
        return Array.from(this._cache.keys());
    }

    /**
     * 最近访问的对象列表，按访问时间倒序排列
     */
    get recentAccessList() {
        return this._recentAccessList;
    }

    /**
     * 将数据记录为最近访问
     * @param keys 数据 key
     * @returns 如果返回 `true` 表示记录成功
     */
    recordRecentAccess(keys: K|K[]) {
        if (!this._recentAccessLimit) {
            return false;
        }
        if (!Array.isArray(keys)) {
            keys = [keys];
        }

        for (const key of keys) {
            const oldIndex = this._recentAccessList.indexOf(key);
            if (oldIndex > -1) {
                this._recentAccessList.splice(oldIndex, 1);
            }
            this._recentAccessList.unshift(key);
        }
        if (this._recentAccessList.length > this._recentAccessLimit) {
            this._recentAccessList.splice(this._recentAccessLimit - 1, this._recentAccessLimit - this._recentAccessList.length);
        }

        this._recentAccessSaveTask.do();
        return true;
    }

    /**
     * 将最近访问记录保存到本地存储
     */
    saveRecentAccessList() {
        if (this._recentAccessList) {
            setStoreItem(`DATASTORE::${this._identify}::${this._name}`, this._recentAccessList);
        }
    }

    /**
     * 重置数据存储中心
     * @param identify 数据存储标识，通常为当前连接的服务器地址
     * @returns 当前 Store 所属用户是否变更
     */
    reset(identify: string) {
        if (this._identify !== identify) {
            this._identify = identify;
            this._cache.clear();
            this._channel.clearPublications();

            if (this._recentAccessLimit) {
                this._recentAccessSaveTask.cancel();
                if (this._recentAccessList.length) {
                    this.saveRecentAccessList();
                }

                // 从本地存储获取最近访问记
                this._recentAccessList = getStoreItem(`DATASTORE::${this._identify}::${this._name}`, []);
            }

            return true;
        }
        for (const item of this._cache.values()) {
            item.expired = true;
        }
        return false;
    }

    /**
     * 判断是否有指定 Key 的缓存数据
     * @param key 数据 key
     * @returns 如果返回 `true` 则为有指定 Key 的缓存数据
     */
    hasCacheItem(key: K) {
        return this._cache.has(key);
    }

    /**
     * 从缓存获取数据项
     * @param key 数据 key
     * @returns 数据对象
     */
    getItemFromCache = (key: K) => {
        const item = this._cache.get(key);
        if (item) {
            this.recordRecentAccess(key);
        }
        return item;
    };

    /**
     * 删除指定 Key 的缓存数据
     * @param key 数据 key
     * @returns 如果返回 `true` 则删除成功
     */
    deleteCacheItem(key: K) {
        return this._cache.delete(key);
    }

    /**
     * 从缓存获取指定 Key 的多个数据项
     * @param keys 数据 key 列表
     * @returns 数据对象列表
     */
    getItemsFromCache(keys: K[]) {
        return keys.map(key => {
            const item = this._cache.get(key);
            if (item) {
                this.recordRecentAccess(key);
            }
            return item;
        });
    }

    /**
     * 存储数据
     * @param items 要存储的数据对象列表
     * @param options 存储选项
     * @param options.normalizeFunc 格式化方法，如果留空使用默认格式化方法
     * @param options.skipPublish 略过发布更新事件
     * @returns 存储的数据对象列表
     */
    store(
        items: T|L|Array<T|L>,
        options: Partial<{
            normalizeFunc: (obj: T|L, store?: DataStore<K, T, L>) => T;
            skipPublish: boolean;
            putToDatabase: boolean|'reset';
            putToCache: boolean;
        }> = {}
    ): T[] {
        const {normalizeFunc} = options;
        if (!items) {
            return [];
        }
        if (!Array.isArray(items)) {
            items = [items];
        } else if (!items.length) {
            return [];
        }

        if (normalizeFunc) {
            const storedItems = [];
            for (let item of items) {
                item = normalizeFunc(item, this);
                this._cache.set((item as any)[this._key], item);
                storedItems.push(item);
            }
            if (!options.skipPublish) {
                this._channel.publish(storedItems);
            }
            return storedItems;
        }

        for (const item of items) {
            this._cache.set((item as any)[this._key], item as T);
        }
        if (!options.skipPublish) {
            this._channel.publish(items);
        }
        return items as T[];
    }

    /**
     * 订阅指定 Key 的数据变更事件
     * @param key 数据 key
     * @param listener 监听函数
     * @returns 订阅 id
     */
    subscribe(key: EventName, listener: (...args: any[]) => void): symbol;

    /**
     * 订阅指定 Keys 的数据变更事件
     * @param keys 数据 key 列表
     * @param listener 监听函数
     * @returns 订阅 ids
     */
    subscribe(keys: EventName[], listener: (...args: any[]) => void): symbol[];

    subscribe(keys: EventName|EventName[], listener: (...args: any[]) => void): symbol|symbol[] {
        if (this.beforeSubscribe) {
            this.beforeSubscribe(keys, listener);
        }

        let subscriberIDs: symbol|symbol[];
        if (Array.isArray(keys)) {
            subscriberIDs = this._channel.subscribeSome(keys, listener);
        } else {
            subscriberIDs = this._channel.subscribe(keys, listener);
        }

        if (this.afterSubscribe) {
            this.afterSubscribe(keys, subscriberIDs);
        }
        return subscriberIDs;
    }

    /**
     * 取消订阅
     * @param subscriberID 订阅 ID
     * @returns 如果返回 `true` 则为取消成功，否则为取消失败，可能是不存在指定的订阅
     */
    unsubscribe(subscriberID: symbol): boolean;

    /**
     * 取消订阅
     * @param subscriberID 订阅 ID
     * @returns 如果返回 `true` 则为取消成功，否则为取消失败，可能是不存在指定的订阅
     */
    unsubscribe(subscriberID: symbol[]): boolean[];

    /**
     * 取消订阅
     * @param subscriberID 订阅 ID
     * @returns 如果返回 `true` 则为取消成功，否则为取消失败，可能是不存在指定的订阅
     */
    unsubscribe(subscriberID: symbol|symbol[]): boolean|boolean[] {
        const result = Array.isArray(subscriberID)
            ? this._channel.unsubscribe(subscriberID)
            : this._channel.unsubscribe(subscriberID);
        if (this.afterUnsubscribe) {
            this.afterUnsubscribe(subscriberID, result);
        }
        return result;
    }

    /**
     * 订阅所有的数据变更事件
     * @param listener 监听函数
     * @returns 订阅 ID
     */
    subscribeAny(listener: (args: any[]) => void) {
        return this._channel.subscribeAny(listener);
    }

    /**
     * 过滤缓存中的数据项
     * @param condition 过滤条件函数
     * @returns 过滤结果列表
     */
    filter(condition: (value: T, key: K) => boolean) {
        const result = [];
        for (const [key, value] of this._cache) {
            if (condition(value, key)) {
                result.push(value);
            }
        }
        return result;
    }

    /**
     * 遍历缓存中的数据项
     * @param callback 遍历函数，在遍历函数中返回 false 可以提前终止遍历
     */
    forEach(callback: (value: T, key?: K) => any) {
        for (const [key, value] of this._cache) {
            if (callback(value, key) === false) {
                break;
            }
        }
    }
}
