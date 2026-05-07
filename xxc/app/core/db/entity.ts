import {v4 as uuidv4} from 'uuid';
import Schema from './schema';
import {createProxyPropertiesMap, createProxyHandler} from '../../utils/proxy-helper';

type EntityType = Record<string, any>
    & Partial<{id: number; gid: string;}>;

/**
 * 集成实体存储类
 *
 * @export
 * @class Entity
 * @abstract
 */
export default class Entity<T extends EntityType> {
    /**
     * 实体名称
     */
    static NAME = 'Entity';

    /**
     * 数据库存储实体属性结构管理器
     */
    static SCHEMA = new Schema({
        gid: {type: 'string', primaryKey: true},
        id: {type: 'int', indexed: true},
    });

    /**
     * 代理对象属性定义
     */
    static PROXY_PROPERTIES = createProxyPropertiesMap([
        'gid',
        'id',
    ]);

    /**
     * 代理对象拦截处理对象
     */
    static PROXY_HANDLER = createProxyHandler(Entity.PROXY_PROPERTIES);

    /**
     * 内部数据存储对象
     */
    readonly $: T = Object.create(null);

    /**
     * 实体类型名称
     */
    readonly entityType: string;

    /**
     * 代理对象
     */
    #proxy: this;

    /**
     * 获取此实例对应类上的代理对象处理对象
     * @returns 代理对象处理定义对象
     */

    get proxyHandler() {
        return Entity.PROXY_HANDLER;
    }

    get proxy() {
        if (!this.#proxy) {
            this.#proxy = new Proxy(this, this.proxyHandler);
        }
        return this.#proxy;
    }

    /**
     * 创建一个基础实体类实例
     * @param data 实体属性对象
     * @param entityType 实体类型名称
     */
    constructor(data: T, entityType = Entity.name) {
        if (typeof data === 'object') {
            this.$set(data);
        }

        this.ensureGid();
        this.entityType = entityType;
    }

    /**
     * 调用此方法确保实体拥有合适的 GID 属性
     */
    ensureGid() {
        this.$.gid ??= uuidv4();
    }

    /**
     * 获取用于数据存储的简单对象
     * @returns 用于的存储对象
     */
    plain(): any {
        this.ensureGid();
        return this.$;
    }

    /**
     * 获取 GID 属性（全局唯一编号）
     */
    get gid(): string {
        return this.$get('gid');
    }

    /**
     * 获取 ID 属性
     */
    get id() {
        return this.$get('id', 0);
    }

    /**
     * 设置 ID 属性
     * @param newId  ID 属性
     */
    set id(newId: number) {
        this.$set('id', newId);
    }

    /**
     * 获取数据库存储实体属性结构管理器
     */

    get schema(): Schema {
        return Entity.SCHEMA;
    }

    /**
     * 设置内部数据属性
     * @param key 要设置的属性名称
     * @param val 要设置的属性值
     * @returns 返回自身用于链式调用
     */
    $set<K extends(keyof T & string)>(key: K, val: T[K]): this;

    /**
     * 设置内部数据属性
     * @param key 属性对象批量设置属性值
     * @returns 返回自身用于链式调用
     */
    $set(key: T): this;

    $set<K extends(keyof T & string)>(key: K|T, val?: T[K]): this {
        if (typeof key === 'object') {
            for (const [k, v] of Object.entries(key)) {
                this.$set(k, v);
            }
        } else {
            const {schema} = this;
            if (schema) {
                val = schema.convertSetterValue(key, val, this);
            }
            this.$[key] = val;
        }
        return this;
    }

    /**
     * 获取内部数据属性的值
     * @param key 属性名称
     * @param defaultValue 默认值
     * @returns 内部数据属性值
     */
    $get<K extends(keyof T & string)>(key: K, defaultValue?: T[K]): T[K] {
        let value = this.$[key];
        const {schema} = this;
        if (schema) {
            value = schema.convertGetterValue(key, value, this);
        }
        if (value === undefined) {
            value = defaultValue;
        }
        return value;
    }
}
