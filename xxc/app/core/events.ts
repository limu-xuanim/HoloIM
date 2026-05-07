import EventEmitter from 'eventemitter3';

type Listener = (...args: any[]) => void;

type EventRecord = {
    id: symbol;
    name: string;
    listener: Listener;
};

/**
 * 事件管理类
 * （能够同时在 Electron 主进程和渲染进程中工作）
 *
 * @class Events
 */
export class Events {
    private eventsMap = new Map<symbol, EventRecord>();

    private EE = new EventEmitter();

    /**
     * 绑定事件并返回一个 [Symbol] 作为事件绑定 ID 用于取消事件
     * @param name 事件名称
     * @param listener 事件回调函数
     * @returns 事件绑定 ID
     */
    on(name: string, listener: Listener) {
        const id = Symbol(name);
        const event = {id, listener, name};
        this.EE.on(name, listener);
        this.eventsMap.set(id, event);

        if (DEBUG_V) {
            console.collapse('EVENT', 'orangeBg', 'on', 'orangePale', name, '');
            console.trace('event', event);
            console.groupEnd();
        }

        return id;
    }

    /**
     * 绑定一个一次性事件，触发后会自动取消绑定，只会触发一次
     * @param name 事件名称
     * @param listener 事件回调函数
     * @returns 事件绑定 ID
     */
    once(name: string, listener: Listener) {
        const id = Symbol(name);
        const event = {
            id,
            name,
            listener: (...args: any[]) => {
                this.off(id);
                listener(...args);
            }
        };
        this.EE.once(name, event.listener);
        this.eventsMap.set(id, event);

        if (DEBUG_V) {
            console.collapse('EVENT', 'orangeBg', 'once', 'orangePale', name, '');
            console.trace('event', event);
            console.groupEnd();
        }

        return id;
    }

    /**
     * 取消绑定事件
     * @param ids 要取消的事件 ID
     */
    off(...ids: symbol[]) {
        for (const id of ids) {
            if (!id || !this.eventsMap.has(id)) {
                continue;
            }

            const event = this.eventsMap.get(id);
            this.EE.removeListener(event.name, event.listener);
            this.eventsMap.delete(id);

            if (DEBUG_V) {
                console.collapse('EVENT', 'orangeBg', 'off', 'orangePale', event.name, '');
                console.trace('event', event);
                console.groupEnd();
            }
        }
    }

    /**
     * 触发一个事件
     *
     * @param name 要触发的事件名称
     * @param args 事件参数
     */
    emit(name: string, ...args: any[]) {
        this.EE.emit(name, ...args);

        if (DEBUG_I) {
            console.collapse('EVENT', 'orangeBg', 'emit', 'orangePale', name, '');
            console.log('args: ', args);
            console.trace('stacktrace');
            console.groupEnd();
        }
    }
}

/**
 * 全局事件管理类实例
 */
const events = new Events();

/**
 * 全局事件触发器
 */
export default events;
