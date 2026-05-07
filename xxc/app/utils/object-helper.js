/**
 * 根据路径访问并依次返回路径对应的属性值
 * @param {Object} object 要访问的对象
 * @param {string|array} pathName 访问路径
 * @returns {any[]} 获取到的路径上的所有值
 * @example
 * const object = {
 *     a: [{b: {c: 1}, d: 2}]
 * };
 *
 * deepGetPath('a[0].b.c'); // 输出 [[{b: {c: 1}, d: 2}], {b: {c: 1}, {c: 1}, 1]
 */
export function deepGetPath(object, pathName) {
    if (object === null || object === undefined) {
        return [object, undefined];
    }

    if (typeof pathName === 'string') {
        pathName = pathName.split('.');
    }

    const fullPath = pathName.join('.');
    let context = object;
    const way = [context];
    while (typeof context === 'object' && context !== null && pathName.length) {
        let name = pathName.shift();
        let subName = null;
        const bracketIndex = name.indexOf('[');
        if (bracketIndex > 0 && bracketIndex < (name.length - 1) && name.endsWith(']')) {
            subName = name.substring(bracketIndex + 1, name.length - 1);
            name = name.substring(0, bracketIndex);
        }

        context = context[name];
        way.push(context);
        if (subName !== null) {
            if (typeof context === 'object' && context !== null) {
                if (context instanceof Map || typeof context.get === 'function') {
                    context = context.get(subName);
                } else {
                    context = context[subName];
                }
                way.push(context);
            } else {
                throw new Error(`Cannot access property "${name}[${subName}]", the full path is "${fullPath}".`);
            }
        }
    }

    if (pathName.length) {
        throw new Error(`Cannot access property with rest path "${pathName.join('.')}", the full path is "${fullPath}".`);
    }

    return way;
}

/**
 * 根据路径访问内部属性值，可以通过 "." 嵌套访问内部属性
 * @param {Object} object 要访问的对象
 * @param {string|array} pathName 访问路径
 * @param {any} [defaultValue] 默认值
 * @returns {any[]} 获取到的值
 * @example
 * const object = {
 *     a: [{b: {c: 1}, d: 2}]
 * };
 *
 * deepGetPath('a[0].b.c'); // 输出 1
 * deepGetPath('a[0].d');   // 输出 2
 * deepGetPath('a');        // 输出 [{b: {c: 1}, d: 2}]
 */
export function deepGet(object, pathName, defaultValue) {
    const way = deepGetPath(object, pathName);
    const lastValue = way[way.length - 1];
    return lastValue === undefined ? defaultValue : lastValue;
}

/**
 * 根据路径访问内部属性值或调用方法，可以通过 "." 嵌套访问内部属性
 * @param {Object} object 要访问的对象
 * @param {string|array} pathName 访问路径
 * @param  {...any} args 调用方法时使用的参数
 * @returns {any} 返回属性值或调用方法的返回值
 */
export function deepInvoke(object, pathName, ...args) {
    const way = deepGetPath(object, pathName);
    const context = way[way.length - 2];
    const target = way[way.length - 1];

    // 如果目标值不是函数则直接返回
    if (typeof target !== 'function') {
        return target;
    }

    return target.call(context, ...args);
}

/**
 * 根据路径访问内部属性值或调用方法，可以通过 "." 嵌套访问内部属性
 * @param {Object} object 要访问的对象
 * @param {string|array} pathName 访问路径
 * @param  {...any} args 调用方法时使用的参数
 * @returns {Promise<any>} 异步返回属性值或调用方法的返回值
 */
export async function deepInvokeAndWait(object, pathName, ...args) {
    const result = await deepInvoke(object, pathName, ...args);
    return result;
}

/**
 * 深度合并一个或多个对象
 * @param {Record<string, any>} object 原始对象
 * @param {Record<string, any>[]} others 要合并的其他对象
 * @returns {Record<string, any>} 返回合并后的对象
 */
export function deepMerge(object, ...others) {
    if (!object || typeof object !== 'object') {
        return object;
    }
    for (const other of others) {
        if (!other || typeof other !== 'object') {
            continue;
        }
        Object.keys(other).forEach(key => {
            const oldValue = object[key];
            const value = other[key];
            if (!value || typeof value !== 'object' || Array.isArray(value) || !oldValue || typeof oldValue !== 'object' || Array.isArray(oldValue)) {
                object[key] = value;
            } else {
                object[key] = deepMerge(oldValue, value);
            }
        });
    }
    return object;
}
