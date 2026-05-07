/**
 * 代理对象属性定义
 */
type ProxyPropertyDefinition = string|{
    name?: string;
    func?: (target: any, ...args: any[]) => any;
    set?: boolean|((target: any, value: any) => void);
    get?: boolean|((target: any) => any);
    deleted?: boolean;
};

/**
 * 创建代理对象属性定义表
 * @param properties 代理对象属性定义
 * @param extendProperties 继承的代理对象属性定义
 * @returns 代理对象属性定义表
 */
export const createProxyPropertiesMap = (
    properties: ProxyPropertyDefinition[],
    extendProperties?: Record<string, ProxyPropertyDefinition>
) : Record<string, ProxyPropertyDefinition> => {
    let map: Record<string, ProxyPropertyDefinition> = {};
    for (const prop of properties) {
        if (typeof prop === 'string') {
            map[prop] = {name: prop, get: true};
        } else if (prop.name) {
            map[prop.name] = prop.deleted ? null : prop;
        }
    }
    if (extendProperties) {
        map = {...extendProperties, ...map};
    }
    return map;
};

/**
 * 创建代理对象处理拦截操作对象
 * @param propertiesMap 代理对象属性定义表
 * @param extendHandler 扩展代理对象拦截操作对象
 * @returns 代理对象处理拦截操作对象
 */
export const createProxyHandler = (
    propertiesMap: Record<string, ProxyPropertyDefinition>,
    extendHandler?: ProxyHandler<any>
) : Record<string, any> => {
    const handler: ProxyHandler<any> = {
        // 拦截对象属性的读取，比如 proxy.foo 和 proxy['foo']，访问其函数的 this 绑定为 receiver 对象
        get: (target: any, propertyName: string): any => {
            const property = propertiesMap[propertyName];
            if (property) {
                if (typeof property === 'string' || property.get === true) {
                    return target[propertyName];
                }
                if (property.get) {
                    return property.get(target);
                }
                if (property.func) {
                    return property.func.bind(null, target);
                }
            }
            target._proxyData ??= {};
            return target._proxyData[propertyName];
        },
        // 拦截对象属性的设置，比如 proxy.foo = v 或 proxy['foo'] = v，返回一个布尔值
        set: (target: any, propertyName: string, value: any): boolean => {
            const property = propertiesMap[propertyName];
            if (property && typeof property === 'object') {
                if (property.set === true) {
                    target[propertyName] = value;
                    return true;
                }
                if (typeof property.set === 'function') {
                    property.set(target, value);
                    return true;
                }
            } else {
                target._proxyData ??= {};
                target._proxyData[propertyName] = value;
            }
            return false;
        },
        // 拦截 propKey in proxy 的操作，返回一个布尔值。
        has: (target: any, propertyName: string): boolean => !!(propertiesMap[propertyName] || (target._proxyData && target._proxyData[propertyName])),
        // 拦截 delete proxy[propKey] 的操作，返回一个布尔值。
        deleteProperty: (target: any, propertyName: string): boolean => {
            if (!propertiesMap[propertyName] && target._proxyData) {
                delete target._proxyData[propertyName];
            }
            return false;
        },
        // 拦截Object.getOwnPropertyNames(proxy)、Object.getOwnPropertySymbols(proxy)、Object.keys(proxy)、for...in循环，返回一个数组。该方法返回目标对象所有自身的属性的属性名，而Object.keys()的返回结果仅包括目标对象自身的可遍历属性。
        ownKeys: (target: any): string[] => {
            const keys = Object.keys(propertiesMap);
            if (target._proxyData) {
                keys.push(...Object.keys(target._proxyData));
            }
            return keys;
        },
        // 拦截Object.getOwnPropertyDescriptor(proxy, propKey)，返回属性的描述对象。
        getOwnPropertyDescriptor: (target: any, propertyName: string): PropertyDescriptor => {
            const property = propertiesMap[propertyName];
            if (property) {
                return {
                    writable: typeof property === 'object' && !!property.set,
                    configurable: false,
                    enumerable: true,
                };
            }
            if (target._proxyData) {
                return Object.getOwnPropertyDescriptor(target._proxyData, propertyName);
            }
        },
        // 拦截Object.defineProperty(proxy, propKey, propDesc）、Object.defineProperties(proxy, propDescs)，返回一个布尔值。
        defineProperty: (target: any, propertyName: string, propDesc: PropertyDescriptor): boolean => {
            const property = propertiesMap[propertyName];
            if (property) {
                return false;
            }
            target._proxyData ??= {};
            Object.defineProperty(target, propertyName, propDesc);
            return true;
        },
        // 拦截Object.preventExtensions(proxy)，返回一个布尔值。
        preventExtensions: () => false,
        // 拦截Object.isExtensible(proxy)，返回一个布尔值。
        isExtensible: () => true,
        // 拦截Object.getPrototypeOf(proxy)，返回一个对象。
        getPrototypeOf: (target: any): any => {
            target._proxyData ??= {};
            return Object.getPrototypeOf(target._proxyData);
        },
        // 拦截Object.setPrototypeOf(proxy, proto)，返回一个布尔值。如果目标对象是函数，那么还有两种额外操作可以拦截。
        setPrototypeOf: (target: any, proto: any): any => {
            target._proxyData ??= {};
            return Object.setPrototypeOf(target._proxyData, proto);
        },
        // 拦截 Proxy 实例作为函数调用的操作，比如proxy(...args)、proxy.call(object, ...args)、proxy.apply(...)。
        apply: () => {
            throw new Error('Cannot call apply method on proxy object.');
        },
        // 拦截 Proxy 实例作为构造函数调用的操作，比如new proxy(...args)。
        construct: () => {
            throw new Error('Cannot call constructor on proxy object.');
        },
    };
    if (extendHandler) {
        Object.assign(handler, extendHandler);
    }
    return handler;
};

/**
 * 创建代理对象处理拦截操作对象
 * @param event 事件对象
 * @param extendHandler 扩展代理对象拦截操作对象
 * @returns 代理对象处理拦截操作对象
 */
export const createEventProxy = (event: Event, extendHandler?: Record<string, any>): Event => {
    /**
     * 事件代理对象中允许访问的属性
     */
    const eventProxyPropsSet = new Set([
        'clientX',
        'clientY',
        'altKey',
        'bubbles',
        'button',
        'buttons',
        'cancelable',
        'ctrlKey',
        'metaKey',
        'movementX',
        'movementY',
        'pageX',
        'pageY',
        'screenX',
        'screenY',
        'timeStamp',
        'type',
        'stopPropagation',
        'preventDefault'
    ]);

    return new Proxy(event, ({// 拦截对象属性的读取，比如 proxy.foo 和 proxy['foo']，访问其函数的 this 绑定为 receiver 对象
        get: (target: any, propertyName: string) => {
            if (eventProxyPropsSet.has(propertyName)) {
                return target._proxyData[propertyName];
            }
        },
        // 拦截对象属性的设置，比如 proxy.foo = v 或 proxy['foo'] = v，返回一个布尔值
        set: (target: any, propertyName: string, value: any) => {
            if (eventProxyPropsSet.has(propertyName)) {
                target._proxyData[propertyName] = value;
                return true;
            }
            return false;
        },
        // 拦截 propKey in proxy 的操作，返回一个布尔值。
        has: (target: any, propertyName: string) => !!(eventProxyPropsSet.has(propertyName) || (target._proxyData && target._proxyData[propertyName])),
        // 拦截 delete proxy[propKey] 的操作，返回一个布尔值。
        deleteProperty: (target: any, propertyName: string) => {
            if (!eventProxyPropsSet.has(propertyName) && target._proxyData) {
                delete target._proxyData[propertyName];
                return true;
            }
            return false;
        },
        // 拦截Object.getOwnPropertyNames(proxy)、Object.getOwnPropertySymbols(proxy)、Object.keys(proxy)、for...in循环，返回一个数组。该方法返回目标对象所有自身的属性的属性名，而Object.keys()的返回结果仅包括目标对象自身的可遍历属性。
        ownKeys: (target: any) => {
            const keys = Array.from(eventProxyPropsSet);
            if (target._proxyData) {
                keys.push(...Object.keys(target._proxyData));
            }
            return keys;
        },
        // 拦截Object.getOwnPropertyDescriptor(proxy, propKey)，返回属性的描述对象。
        getOwnPropertyDescriptor: (target: any, propertyName: string) => {
            if (eventProxyPropsSet.has(propertyName)) {
                return Object.getOwnPropertyDescriptor(target, propertyName);
            }
        },
        // 拦截Object.defineProperty(proxy, propKey, propDesc）、Object.defineProperties(proxy, propDescs)，返回一个布尔值。
        defineProperty: () => false,
        // 拦截Object.preventExtensions(proxy)，返回一个布尔值。
        preventExtensions: () => false,
        // 拦截Object.isExtensible(proxy)，返回一个布尔值。
        isExtensible: () => true,
        // 拦截Object.getPrototypeOf(proxy)，返回一个对象。
        getPrototypeOf: (target: any) => Object.getPrototypeOf(target),
        // 拦截Object.setPrototypeOf(proxy, proto)，返回一个布尔值。如果目标对象是函数，那么还有两种额外操作可以拦截。
        setPrototypeOf: (target: any, proto: object) => Object.setPrototypeOf(target, proto),
        // 拦截 Proxy 实例作为函数调用的操作，比如proxy(...args)、proxy.call(object, ...args)、proxy.apply(...)。
        apply: () => {
            throw new Error('Cannot call apply method on proxy object.');
        },
        // 拦截 Proxy 实例作为构造函数调用的操作，比如new proxy(...args)。
        construct: () => {
            throw new Error('Cannot call constructor on proxy object.');
        },
        ...extendHandler
    }));
};
