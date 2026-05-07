import {Subject} from 'rxjs';
import {getSearchParam} from '~/app/utils/html-helper';

/**
 * 格式化路由地址，确保以 `#/` 开头
 * @param pathStr 格式化路由地址
 * @returns 格式化之后的路由地址
 * @example
 * // 以下例子都返回 '#/chats/recents/1&2'
 * formatRoutePath('chats/recents/1&2');
 * formatRoutePath('#chats/recents/1&2');
 * formatRoutePath('/chats/recents/1&2');
 * formatRoutePath('#/chats/recents/1&2');
 */
export const formatRoutePath = (pathStr: string): string => {
    if (pathStr.startsWith('#/')) {
        return pathStr;
    }
    if (pathStr.startsWith('#') || pathStr.startsWith('/')) {
        return `#/${pathStr.substring(1)}`;
    }
    return `#/${pathStr}`;
};

/**
 * 生成路由地址，如果不指定 `paths`，则返回当前路由地址
 * @param paths 路由地址
 * @returns 路由地址
 * @example
 * // 以下例子都返回 '#/chats/recents/1&2'
 * createRoutePath('chats', 'recents', '1&2');
 * createRoutePath('chats/recents/1&2');
 * createRoutePath('/chats/recents/1&2');
 * createRoutePath('#/chats/recents/1&2');
 *
 * // 最后一个参数可以为对象，用于添加查询字符串
 * // 以下例子都返回 '#/chats/recents/1&2?sidebar=true'
 * createRoutePath('chats', 'recents', '1&2', '?sidebar=true');
 * createRoutePath('chats/recents', '1&2', {sidebar: true});
 */
export const createRoutePath = (...paths: (string|Record<string, string>)[]): string => {
    if (!paths || !paths.length || (paths.length === 1 && (paths[0] === undefined || paths[0] === null))) {
        return formatRoutePath(window.location.hash);
    }

    let queryStr = '';
    const lastPath = paths[paths.length - 1];
    if (lastPath && typeof lastPath === 'object') {
        const queryObj = (paths.pop() as Record<string, string>);
        queryStr = Object.keys(queryObj).map(key => `${key}=${encodeURIComponent(queryObj[key])}`).join('&');
        queryStr = `?${queryStr}`;
    } else if (typeof lastPath === 'string' && lastPath.startsWith('?')) {
        queryStr = (paths.pop() as string);
    }
    const pathStr = paths.join('/') + queryStr;
    return formatRoutePath(pathStr);
};

/**
 * 返回当前路由地址
 * @returns 路由地址
 */
export const getRoutePath = (): string => createRoutePath();

/**
 * 判断路由地址是否与给定的路由匹配
 * @param routePath 要判断的路由
 * @param paths 要判断的路由匹配模式，可以使用 `*` 来匹配路径上的任意值
 * @returns 如果返回 `true` 则为匹配，否则为不匹配
 * @example
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats'); // 返回 true
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats', 'recents'); // 返回 true
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats', 'groups'); // 返回 false
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats', '*', '2&4'); // 返回 true
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats', '*', '2&4', {sidebar: true}); // 返回 false
 * isRoutePathMatchWith('#chats/recents/2&4', 'chats/recents/2&4'); // 返回 true
 */
export function isRoutePathMatchWith(routePath: string, ...paths: string[]): boolean {
    const routeArr = getRoutePathArray(routePath);
    const patternArr = getRoutePathArray(...paths);
    for (let i = 0; i < patternArr.length; ++i) {
        const patternItem = patternArr[i];
        if (patternItem === '*') {
            continue;
        }
        if (patternItem !== routeArr[i]) {
            return false;
        }
    }
    return true;
}

/**
 * 判断路由地址是否与当前匹配
 * @param paths 要判断的路由匹配模式，可以使用 `*` 来匹配路径上的任意值
 * @returns 如果返回 `true` 则为匹配，否则为不匹配
 * @example
 * // 假设当前浏览器路由地址为 `'#chats/recents/2&4'`
 * isRoutePathMatch('chats'); // 返回 true
 * isRoutePathMatch('chats', 'recents'); // 返回 true
 * isRoutePathMatch('chats', 'groups'); // 返回 false
 * isRoutePathMatch('chats', '*', '2&4'); // 返回 true
 * isRoutePathMatch('chats', '*', '2&4', {sidebar: true}); // 返回 false
 * isRoutePathMatch('chats/recents/2&4'); // 返回 true
 */
export const isRoutePathMatch = (...paths: string[]): boolean => isRoutePathMatchWith(getRoutePath(), ...paths);

/**
 * 设置当前路由地址
 * @param paths 路由地址
 * @returns 返回设置后的路由地址
 */
export const setRoutePath = (...paths: (string|Record<string, string>)[]): string => {
    const newHash = createRoutePath(...paths);
    if (window.location.hash !== newHash) {
        window.location.hash = newHash;
    }
    return newHash;
};

/**
 * 获取路由路径数组
 * @param paths 路由地址
 * @returns 路由路径数组
 * @example
 * // 以下例子都返回 ['chats', 'recents', '1&2']
 * getRoutePathArray('chats', 'recents', '1&2');
 * getRoutePathArray('chats/recents/1&2');
 * getRoutePathArray('/chats/recents/1&2');
 * getRoutePathArray('#/chats/recents/1&2');
 */
export const getRoutePathArray = (...paths: string[]): string[] => {
    const pathArr = createRoutePath(...paths).substring(2).split('/');
    const lastPath = pathArr[pathArr.length - 1];
    if (lastPath.indexOf('?') > 0) {
        pathArr.pop();
        const pathWithQuery = lastPath.split('?');
        pathArr.push(pathWithQuery[0], `?${pathWithQuery[1]}`);
    }
    return pathArr;
};

/**
 * 解析路由地址信息
 * @param paths 路由地址
 * @returns 路由地址信息对象
 */
export function parseRoutePath(...paths: string[]) {
    const formated = createRoutePath(...paths);
    const pathList = formated.substring(2).split('/');
    const lastPath = pathList[pathList.length - 1];
    let params: Record<string, string> = {};
    if (lastPath.includes('?')) {
        pathList.pop();
        const [path, search] = lastPath.split('?');
        pathList.push(path);
        params = getSearchParam(null, search);
    }
    return {
        route: formated,
        path: pathList.join('/'),
        pathList,
        params
    };
}

/**
 * 路由变更 Subject
 */
const routeChangeSubject = new Subject<[string, string]>();

/**
 * 上次路由地址
 */
let lastRoutePath = createRoutePath();

/**
 * 绑定路由变更事件
 * @param listener 回调函数
 * @returns subscription
 */
export function onRoutePathChange(listener: (current: string, last: string) => void) {
    return routeChangeSubject.subscribe(next => listener(...next));
}

// 监听浏览器地址栏 hash 参数变更事件
window.addEventListener('hashchange', () => {
    const routePath = createRoutePath();

    if (DEBUG) {
        console.color('➜', 'orangeBg', routePath, 'orangePale');
    }

    if (routePath !== lastRoutePath) {
        if (routeChangeSubject.observed) {
            routeChangeSubject.next([routePath, lastRoutePath]);
        }
        lastRoutePath = routePath;
    }
}, false);
