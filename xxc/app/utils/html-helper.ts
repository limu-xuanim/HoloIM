export type ClassLike = string | string[] | Record<string, any> | null | undefined;

/**
 * 拼接元素类
 * @param args 参数
 * @returns 元素类
 * @example
 * const isActive = false;
 * const isHidden = true;
 * const divClass = classes('btn', ['lg', 'flex-none'], {active: isActive, 'is-hidden': isHidden});
 * // 以上 divClass 最终值为 'btn lg flex-none is-hidden'
 */
export const classes = (...args: ClassLike[]): string => (
    args.map(arg => {
        if (Array.isArray(arg)) {
            return classes(...arg);
        }
        if (arg && typeof arg === 'object') {
            return Object.keys(arg)
                .filter(className => {
                    const condition = arg[className];
                    if (typeof condition === 'function') {
                        return !!condition();
                    }
                    return !!condition;
                })
                .join(' ');
        }
        return arg;
    }).filter(x => (typeof x === 'string') && x.length).join(' ')
);

/**
 * 将像素单位转换为 rem 单位
 * @param value 像素单位值
 * @param rootValue `1rem` 单位对应对像素值
 * @returns 转换结果
 * @example
 * const width = rem(100);
 */
export const rem = (value: number, rootValue = 20): string => (`${value / rootValue}rem`);

export function getSearchParam(key?: null, search?: string): Record<string, string>;
export function getSearchParam(key: string, search?: string): string;

/**
 * 获取浏览器查询字符串键值
 * @param key 要获取值的键名，如果留空则以 `Object` 返回所有键值对
 * @param search 查询字符串，如果留空则使用当前浏览器地址上的查询字符串
 * @returns 查询值
 */
export function getSearchParam(key?: string|null, search = window.location.search) {
    if (search.length <= 1) {
        return key ? '' : {};
    }

    const params: Record<string, string> = {};
    if (search[0] === '?') {
        search = search.substring(1);
    }
    const searchParams = new URLSearchParams(search);

    if (key) {
        const pairValue = searchParams.get(key);
        return pairValue ?? '';
    }

    for (const [pk, pv] of searchParams.entries()) {
        params[pk] = pv;
    }
    return params;
}

export function parseSearchParams(params: Record<string, string>) {
    const result: Record<string, any> = {};
    for (const key of Object.keys(params)) {
        try {
            result[key] = JSON.parse(params[key]);
        } catch {
            result[key] = params[key];
        }
    }
    return result;
}

/**
 * 过滤掉 HTML 标签
 * @param html HTML 源码
 * @returns 过滤结果
 * @function
 */
export const strip = (html: string): string => html.replace(/<(?:.|\n)*?>/gm, '');

/**
 * 转换 HTML 标签
 * @param html HTML 源码
 * @returns 转换结果
 * @function
 */
export const escapeHTML = (html: string): string => {
    const tmp = document.createElement('DIV');
    tmp.innerText = html;
    return tmp.innerHTML || '';
};

/**
 * 判定给定对字符串是否是网址
 * @param url 字符串
 * @returns 判定结果
 */
export const isWebUrl = (url: string): boolean => {
    if (typeof url !== 'string') {
        return false;
    }
    // 浏览器端会将 @ 也识别为网址
    if (/\/@#\d+$/.test(url)) {
        return false;
    }
    return (/^(https?):\/\/[-A-Za-z0-9\u4e00-\u9fa5+&@#/%?=~_|!:,.;]+[-A-Za-z0-9\u4e00-\u9fa5+&@#/%=~_|]$/ig).test(url);
};

/**
 * 判定给定对字符串是否是本地页面地址（file: 协议）
 * @param url 字符串
 * @returns 判定结果
 */
export const isLocalUrl = (url: string): boolean => {
    if (typeof url !== 'string') {
        return false;
    }
    return (/^file:\/\/[-A-Za-z0-9\u4e00-\u9fa5+&@#/%?=~_|!:,.;]+[-A-Za-z0-9\u4e00-\u9fa5+&@#/%=~_|]$/ig).test(url);
};

/**
 * 将字符串内的链接转换为 HTML 链接形式
 * @param text 字符串
 * @returns 转换结果
 * @function
 */
export const linkify = (text = ''): string => text.replace(
    // see https://stackoverflow.com/questions/695438/what-are-the-safe-characters-for-making-urls
    /(((https?:\/\/)|(www\.))([-A-Za-z0-9\u4e00-\u9fa5+&@#/%=~_$|?.'()!,:;]+)([-A-Za-z0-9\u4e00-\u9fa5+&@#/%=~_$|']))/gi,
    (_match, url) => {
        let hyperlink = url;
        if (!hyperlink.match('^https?://')) {
            hyperlink = `http://${hyperlink}`;
        }
        return `<a href="${hyperlink}">${url}</a>`;
    }
);

/**
 * 向页面追加 script 标签
 * @param src 脚本地址
 * @param id 标签 ID
 * @returns 标签 ID
 */
export const appendScript = (src: string, id = `${encodeURIComponent(src).replace(/%/g, '_')}__${Math.floor(Math.random() * 100000)}`): string => {
    let element = <HTMLScriptElement>document.getElementById(id);
    if (!element) {
        element = <HTMLScriptElement>document.createElement('script');
        element.id = id;
        document.body.appendChild(element);
    }
    if (element.src !== src) {
        element.src = src;
    }
    return id;
};

/**
 * 向页面追加 CSS 样式文件引入标签
 * @param href 样式地址
 * @param id 标签 ID
 * @returns 标签 ID
 */
export const appendStyleFile = (href: string, id = `${encodeURIComponent(href).replace(/%/g, '_')}__${Math.floor(Math.random() * 100000)}`): string => {
    let element = <HTMLLinkElement>document.getElementById(id);
    if (!element) {
        element = <HTMLLinkElement>document.createElement('link');
        element.rel = 'stylesheet';
        element.id = id;
        document.body.appendChild(element);
    }
    if (element.href !== href) {
        element.href = href;
    }
    return id;
};

/**
 * @prop ifNeed 仅在不可见时进行滚动，默认为 true
 * @prop checkScrollList 是否检查自定义滚动容器，默认为 true
 * @prop behavior 滚动方式，instant 和 smooth 表示 直接滚到底 和 使用平滑滚动
 * @prop block 表示块级元素垂直排列方向要滚动到的位置。start 表示将视口的顶部和元素顶部对齐；center 表示将视口的中间和元素的中间对齐；end 表示将视口的底部和元素底部对齐；nearest 表示就近对齐。默认为 start
 * @prop inline 表示块级元素水平排列方向要滚动到的位置。默认为 nearest
 */
interface ScrollOptions {
    ifNeed?: boolean,
    checkScrollList?: boolean,
    behavior?: ScrollBehavior,
    block?: 'start' | 'center' | 'end' | 'nearest',
    inline?: 'start' | 'center' | 'end' | 'nearest'
}

/**
 * 滚动指定元素所在的父级元素，直到指定的元素处于可见范围
 * @param element 要滚动到的元素
 * @param options 选项
 * @returns 如果为 true，则操作成功
 */

export function scrollIntoView(element: HTMLElement, options: ScrollOptions|boolean = {}): boolean {
    if (!element) {
        return false;
    }

    if (typeof options === 'boolean') {
        options = {behavior: options ? 'smooth' : 'auto'};
    }

    const {
        ifNeed = true,
        checkScrollList = true,
        behavior = 'auto',
        block = 'nearest',
        inline = 'nearest'
    } = options;

    if (checkScrollList) {
        const scrollList = element.closest('.scroll-list');
        if (scrollList) {
            scrollList.dispatchEvent(new CustomEvent('scrolllist', {
                bubbles: true,
                detail: ['scrollToElement', element, {
                    behavior,
                    block,
                    ifNeed
                }]
            }));
            return true;
        }
    }

    if (ifNeed && typeof element.scrollIntoViewIfNeeded === 'function') {
        element.scrollIntoViewIfNeeded(options.block === 'center');
        return true;
    }

    if (element.scrollIntoView) {
        element.scrollIntoView({
            behavior,
            block,
            inline
        });
        return true;
    }

    return false;
}

/**
 * 将 URL 搜索参数定义转换为字符串形式
 * @param params 参数定义
 * @returns 参数定义字符串
 */
export function stringifySearchParams(params: string|Record<string, string>|Array<[string, string]>) {
    if (typeof params === 'string') {
        return params;
    }
    const paramList = !Array.isArray(params)
        ? Object.entries(params as Record<string, string>)
        : params;

    return paramList
        .reduce((searchParams, [key, value]) => {
            searchParams.append(key, value);
            return searchParams;
        }, new URLSearchParams())
        .toString();
}

export default {
    classes,
    rem,
    getSearchParam,
    stringifySearchParams,
    strip,
    escapeHTML,
    isWebUrl,
    linkify,
    appendScript,
    appendStyleFile,
};
