import {StatusKeeper} from './status-keeper';

/** 状态管理类（状态表） */
export default class Status<StatusName extends string> {
    $ = {} as Record<StatusName, number>;

    /** 按状态值顺序依次存储状态名称 */
    #values = new Map<number, StatusName>();

    /** 默认状态 */
    defaultStatus: number;

    /**
     * 创建一个状态管理类
     * @param statuses 状态表对象
     * @param defaultStatus 默认状态
     */
    constructor(statuses: Record<StatusName, number>|StatusName[], defaultStatus: StatusName|number) {
        if (Array.isArray(statuses)) {
            statuses.forEach((statusName, statusValue) => {
                this.defineStatus(statusName, statusValue);
            });
        } else {
            for (const [name, value] of Object.entries<number>(statuses)) {
                this.defineStatus(name as StatusName, value);
            }
        }

        // 防止 this.$ 被修改
        Object.freeze(this.$);

        this.defaultStatus = this.getValue(defaultStatus);
    }

    /**
     * 定义状态
     * @param name 状态名称
     * @param value 状态值
     */
    defineStatus(name: StatusName, value: number) {
        if (this.$[name] !== undefined) {
            throw new Error(`Cannot define status, the name '${name}' is duplicated.`);
        }
        if (typeof value !== 'number') {
            throw new Error(`Cannot define status, the status value(${value}) must be a number.`);
        }
        this.#values.set(value, name);
        this.$[name] = value;
    }

    /**
     * 获取所有状态名称
     */
    get names() {
        return [...this.#values.values()];
    }

    /**
     * 获取所有状态值
     */
    get values() {
        return [...this.#values.keys()];
    }

    /**
     * 获取默认状态名称
     */
    get defaultName() {
        return this.getName(this.defaultStatus);
    }

    /**
     * 获取默认状态值
     */
    get defaultValue(): number {
        return this.getValue(this.defaultStatus);
    }

    /**
     * 获取指定状态的名称
     * @param valueOrName 状态值或名称
     * @returns 状态名称
     */
    getName(valueOrName: StatusName|number): StatusName {
        if (typeof valueOrName === 'number') {
            const name = this.#values.get(valueOrName);
            if (!name) {
                console.error(valueOrName, this);
                throw new Error(`${valueOrName} is not in this status.`);
            }

            return name;
        }

        if (Object.keys(this.$).includes(valueOrName)) {
            return valueOrName;
        }

        console.error(valueOrName, this);
        throw new Error(`${valueOrName} is not in this status.`);
    }

    /**
     * 获取指定状态的值
     * @param valueOrName 状态值或值
     * @param defaultValue 默认状态值
     * @returns 状态的值
     */
    getValue(valueOrName: StatusName|number): number {
        if (typeof valueOrName === 'string') {
            const value = this.$[valueOrName];
            if (!value) {
                console.error(valueOrName, this);
                throw new Error(`${valueOrName} is not in this status.`);
            }

            return value;
        }

        if (this.#values.has(valueOrName)) {
            return valueOrName;
        }

        console.error(valueOrName, this);
        throw new Error(`${valueOrName} is not in this status.`);
    }

    /**
     * 判断两个状态是否相同
     * @param status1 状态1
     * @param status2 状态2
     * @returns 如果为 `true`，表示状态相同
     */
    isSame(status1: StatusName|number, status2: StatusName|number): boolean {
        return this.getValue(status1) === this.getValue(status2);
    }

    /**
     * 判断第一个状态值是否小于或者等于第二个状态值
     * @param status1 状态1
     * @param status2 状态2
     * @returns 如果为 `true`，表示第一个状态值是否小于或者等于第二个状态值
     */
    isLessOrSame(status1: StatusName|number, status2: StatusName|number): boolean {
        return this.getValue(status1) <= this.getValue(status2);
    }

    /**
     * 判断第一个状态值是否大于或者等于第二个状态值
     * @param status1 状态1
     * @param status2 状态2
     * @returns 如果为 `true`，表示第一个状态值是否大于或者等于第二个状态值
     */
    isGreaterOrSame(status1: StatusName|number, status2: StatusName|number): boolean {
        return this.getValue(status1) >= this.getValue(status2);
    }

    /**
     * 创建一个状态存储类实例
     * @param status 状态值或名称
     * @returns 状态管理对象
     */
    create(status: StatusName|number = this.defaultValue): StatusKeeper<StatusName> {
        return new StatusKeeper<StatusName>(status, this);
    }
}

export type PickStatusName<T> = T extends Status<infer R> ? R : T;
