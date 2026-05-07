import {createProxyPropertiesMap, createProxyHandler} from './proxy-helper';

/**
 * 状态存储类
 *
 * @class StatusKeeper
 */
export class StatusKeeper<StatusName extends string> {
    $: Partial<Record<`is${Capitalize<StatusName>}`, Readonly<boolean>>> = {};

    /** 状态值 */
    status: number;

    /** 当前状态 */
    mapper: import('./status').default<StatusName>;

    /** 代理对象 */
    #proxy: this;

    /** 获取当前状态变更事件回调函数 */
    onChange: (value: number, oldValue: number, obj?: this) => void;

    /**
     * 创建一个状态存储类实例
     * @param status 当前状态
     * @param mapper 状态表对象
     */
    constructor(status: StatusName|number, mapper: import('./status').default<StatusName>) {
        this.mapper = mapper;
        this.status = mapper.getValue(status);
    }

    /**
     * 获取代理对象
     * @returns 获取代理对象
     */
    get proxy() {
        if (!this.#proxy) {
            const proxyProps = [
                'name',
                'value',
                'is',
            ];
            this.#proxy = new Proxy(this, createProxyHandler(createProxyPropertiesMap(proxyProps)));
        }
        return this.#proxy;
    }

    /**
     * 获取当前状态名称
     */
    get name() {
        return this.mapper.getName(this.status);
    }

    /**
     * 获取当前状态值
     */
    get value() {
        return this.mapper.getValue(this.status);
    }

    /**
     * 检查当前状态是否能够变更到指定的状态
     * @param nameOrValue 新的状态值或名称
     * @param oldNameOrValue 旧的状态值或名称，如果不指定使用当前状态进行判定
     * @returns 如果为 `true` 表示当前状态可以变更到指定的状态
     */
    canChange(nameOrValue: StatusName|number, oldNameOrValue?: StatusName|number): boolean {
        const value = this.mapper.getValue(nameOrValue);
        const oldValue = oldNameOrValue !== undefined ? this.mapper.getValue(oldNameOrValue) : this.value;
        return value !== undefined && oldValue !== value;
    }

    /**
     * 变更状态
     * @param nameOrValue 新的状态值或名称
     * @returns 如果为 `true` 表示状态变更成功
     */
    change(nameOrValue: StatusName|number): boolean {
        const value = this.mapper.getValue(nameOrValue);
        const oldValue = this.value;
        if (oldValue === value) {
            return true;
        }
        if (this.canChange(value)) {
            this.status = value;
            if (typeof this.onChange === 'function') {
                this.onChange(value, oldValue, this);
            }
            return true;
        }
        if (DEBUG) {
            console.error(`Status "${this.mapper.getName(oldValue)}(${oldValue})" cannot change to "${this.mapper.getName(value)}(${value})" with conversion rules.`, this);
        }
        return false;
    }

    /**
     * 检查当前状态是否为给定的状态
     * @param nameOrValue 状态名称或状态值
     * @returns 如果为 `true` 表示为给定的状态
     */
    is(nameOrValue: StatusName|number): boolean {
        const value = this.mapper.getValue(nameOrValue);
        return value !== undefined && value === this.status;
    }
}
