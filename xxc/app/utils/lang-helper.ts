import TextMap from './text-map';
import {formatString} from './string-helper';
import type {Language} from '../constants';

/**
 * 语言访问辅助类
 */
class LangHelper extends TextMap {
    /**
     * 语言名称
     */
    #name: ValueOf<typeof Language>;

    /**
     * 创建一个语言访问辅助类对象
     * @param name 语言名称
     * @param langData 语言文本表对象
     */
    constructor(name?: ValueOf<typeof Language>, langData: Record<string, string> = {}) {
        super(langData);
        if (name) {
            this.#name = name;
        }
    }

    /**
     * 变更语言名称和语言数据
     * @param name 语言名称
     * @param langData 语言文本表对象
     */
    change(name: ValueOf<typeof Language>, langData: Record<string, string>) {
        this.setData(langData);
        this.#name = name;
    }

    /**
     * 获取语言名称
     */
    get name(): ValueOf<typeof Language> {
        return this.#name;
    }

    // TODO 尝试确定类型
    /**
     * 获取错误信息对应的语言文本
     * @param err 错误信息或错误对象本身
     * @returns 语言文本
     */
    error(err: string|any): string {
        if (!err) {
            if (DEBUG) {
                console.collapse('LANG.error', 'redBg', '<Unknown Error>', 'redPale');
                console.error(err);
                console.groupEnd();
            }
            return '<Unknown Error>';
        }
        if (typeof err === 'string') {
            return this.string(err.startsWith('error.') ? err : `error.${err}`, err);
        }

        let message = '';
        if (err.code) {
            message += this.string(`error.${err.code}`, `${err.message || ''}`);
        } else if (err.message) {
            message = this.string(`error.${err.message}`, err.message);
        }
        if (message) {
            let formatParams = err.formats || err.extras;
            if (formatParams) {
                if (typeof formatParams === 'object' && !Array.isArray(formatParams)) {
                    message = formatString(message, formatParams);
                } else {
                    if (!Array.isArray(formatParams)) {
                        formatParams = [formatParams];
                    }
                    message = formatString(message, ...formatParams);
                }
            }
        }
        return message;
    }
}

const langHelper = new LangHelper();

export default langHelper;

export type {LangHelper}
