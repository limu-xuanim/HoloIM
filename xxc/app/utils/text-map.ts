import {isEmptyString} from './check-empty';
import {formatString} from './string-helper';

type LangKey = keyof typeof import('~/app/lang/zh-cn.json');

/**
 * 文本表类
 */
export default class TextMap {
    #data: Record<string, string>;

    /**
     * 创建一个文本表类实例
     * @param data 数据类型
     */
    constructor(data: Record<string, string>) {
        this.#data = {...data};
    }

    /**
     * 获取数据对象
     */
    get data() {
        return {...this.#data};
    }

    /**
     * 设置数据对象
     * @param data 新数据对象
     */
    protected setData(data: Record<string, string>) {
        this.#data = data;
    }

    /**
     * 获取使用参数格式化的文本
     * @param name 配置名称
     * @param args 格式化参数
     * @returns 文本
     */
    format<T extends LangKey>(name: T, ...args: any[]): string {
        const str = this.string(name);
        if (isEmptyString(str)) {
            return '';
        }
        if (args?.length) {
            try {
                return formatString(str, ...args);
            } catch (e) {
                throw new Error(`Cannot format lang string with key '${name}', the lang string is '${str}'.`);
            }
        }
        return str;
    }

    /**
     * 根据配置名称获取文本
     * @param name 配置名称
     * @returns 文本
     */
    string<T extends LangKey>(name: T): string;

    /**
     * 根据配置名称获取文本
     * @param name 配置名称
     * @param defaultValue 默认文本，如果没有在找到文本则返回此值
     * @returns 文本
     */
    string(name: string, defaultValue: string): string;

    /**
     * 根据配置名称获取文本
     * @param name 配置名称
     * @param defaultValue 默认文本，如果没有在找到文本则返回此值
     * @returns 文本
     */
    string<T extends LangKey>(name: T|string, defaultValue?: string): string {
        const value = this.#data[name];
        return value ?? defaultValue;
    }
}
