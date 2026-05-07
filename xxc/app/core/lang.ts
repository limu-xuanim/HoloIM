import LANG_ZH_CN from '../lang/zh-cn.json';
import platform from '../platform';
import {setStoreItem, getStoreItem} from '../utils/store';
import langHelper from '../utils/lang-helper';
import Config from '../config';
import {Language} from '../constants';
import langAtom from '../jotai/atoms/lang';
import type {ElectronPlatform} from '../platform/electron';
import jotaiStore from '../jotai/stores/default';

/** 上次变更语言的时间戳 */
let lastLangSwitchedTime = 0;

const platformLanguage = platform.access<ElectronPlatform['language']>('language');

/**
 * 当前语种存储键名
 */
const STORE_LANG_NAME_KEY = 'LANG_NAME';

const isSupportedLang = (langName: string): langName is ValueOf<typeof Language> => Config.lang.ALL.some(language => language.name === langName);

/**
 * 获取系统平台所使用的默认语言名称
 * @param langConfig 运行时语言配置对象
 * @returns 系统默认语言名称
 */
const getPlatformLangName = (langConfig: typeof Config.lang): ValueOf<typeof Language> => {
    const localLang = navigator.language.toLowerCase();

    if (localLang === 'zh' || localLang === 'zh-cn') {
        return Language.zhCN;
    }

    if (localLang.includes('zh-')) {
        return Language.zhTW;
    }

    for (const language of langConfig.ALL) {
        if (language.name === localLang || localLang.includes(`${language.name}-`)) {
            return language.name as ValueOf<typeof Language>;
        }
    }

    return Language.en;
};

/**
 * 绑定语言变更事件
 * @param listener 事件回调函数
 * @returns 使用 `Symbol` 存储的事件 ID，用于取消事件
 */
export const onLangChange = (listener: (lang: LangHelper) => void) => jotaiStore.sub(langAtom, () => {
    listener(langHelper);
});

/**
 * 获取所有语言清单
 * @returns 语言清单列表
 */
export const getAllLangList = () => Config.lang.ALL;

/**
 * 是否刚刚变更了语言
 * @returns 如果为 `true`，则为刚刚变更了语言，否则没有
 */
export const isJustLangSwitched = () => Date.now() - lastLangSwitchedTime <= 1 * 1000;

/**
 * 获取应用显示名称
 * @param langName 语言名称
 * @returns 语言显示名称
 */
export const getLangDisplayName = (langName = langHelper.name): string => {
    const langSetting = getAllLangList().find(x => x.name === langName);
    return langSetting?.label ?? '';
};

/**
 * 获取平台预设的语言数据对象
 * 该语言数据默认会从 lang/ 目录下加载对应的语言文件
 * @param langName 语言名称
 * @returns 使用 Promise 异步返回处理结果
 */
const loadPlatformLangData = (langName: ValueOf<typeof Language>) => platformLanguage.loadLangData(langName, Config.system.langFilePathFormat);

/**
 * 更改界面语言
 * @param langName 界面语言名称
 * @param notifyPlatform 是否通知平台变更语言
 * @returns 使用 Promise 异步返回处理结果
 */
export const loadLanguage = async (langName: ValueOf<typeof Language>, notifyPlatform = true) => {
    if (!langName) {
        throw new Error('Must provide the langName.');
    }

    if (!isSupportedLang(langName)) {
        langName = Config.lang.DEFAULT as ValueOf<typeof Language>;
    }

    if (langName === langHelper.name) {
        return;
    }

    const platformLangData = await loadPlatformLangData(langName);
    lastLangSwitchedTime = Date.now();
    // 合并语言数据对象
    const langData = {...LANG_ZH_CN, ...platformLangData, ...Config.lang[langName]};
    // 变更语言
    langHelper.change(langName, langData);
    // 存储当前语言配置
    setStoreItem(STORE_LANG_NAME_KEY, langName);
    // 触发语言变更事件
    jotaiStore.set(langAtom, langName);
    // 更新HTML的lang属性，用于CSS自适应样式
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('lang', langName);
    }
    if (notifyPlatform) {
        platform.call('language.handleLangChange', langName, langData);
    }
};

/**
 * 初始化界面语言文本访问功能
 */
export const initLang = () => {
    // 获取默认语言名称
    const storedLangName = getStoreItem(STORE_LANG_NAME_KEY);
    const langName: ValueOf<typeof Language> = isSupportedLang(storedLangName) ? storedLangName : getPlatformLangName(Config.lang);

    // 绑定处理平台请求语言变更的情况
    const setRequestChangeLangHandler = platformLanguage.setRequestChangeLangHandler;
    if (setRequestChangeLangHandler) {
        setRequestChangeLangHandler((newLangName) => {
            loadLanguage(newLangName, false);
        });
    }

    // 加载语言
    const result = loadLanguage(langName);
    // 初始化时也更新HTML的lang属性
    if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('lang', langName);
    }
    return result;
};

/**
 * 从多语言文本定义对象获取符合当前语言设置的文本
 *
 * @param obj 多语言文本定义对象
 * @param defaultString 默认语言文本
 * @returns 语言文本
 * @example
 * const langTextObj = {
 *     'zh-cn': '你好',
 *     'en': 'Hello',
 *     'default': '你好'
 * };
 *
 * const langText = getStringFromObject(langTextObj);
 * // 当在中文环境下 `langText` 值为 `'你好'`
 * // 当在英文环境下 `langText` 值为 `'Hello'`
 * // 在其他语言环境下 `langText` 值为 `'你好'`
 */
export const getStringFromObject = (obj: string|Record<string, string>, defaultString?: string): string => {
    if (typeof obj === 'object') {
        let str = obj[langHelper.name];
        if (str === undefined) {
            str = obj.default;
            if (str === undefined) {
                str = obj[obj.defaultLang];
            }
            if (str === undefined) {
                str = obj[Object.keys(obj)[0]];
            }
        }
        return str ?? defaultString;
    }
    return obj ?? defaultString;
};

type ConfigMediaKey = keyof typeof Config.media;

/**
 * 获取适合当前语言的多媒体文件路径
 * @param mediaName 媒体名称
 * @returns 媒体文件路径
 */
export const getMediaPath = (mediaName: string): string => Config.media[`image.path.${langHelper.name}.${mediaName}`as ConfigMediaKey]
    || Config.media[`image.path.${mediaName}` as ConfigMediaKey]
    || `${Config.media['image.path']}${mediaName}.png`;

if (DEBUG) {
    global.$lang = langHelper;
}

export default langHelper;
