import {executeAsap, cancelAsap} from './asap';

export type EventName = string | number | symbol;

/** 事件订阅对象 */
type EventSubscriber = {
    event?: EventName;
    events?: EventName[];
    listener: (...args: any[]) => void;
};

/**
 * 标识一个任意事件名称
 */
export const EVENT_ANY = Symbol('*');

/**
 * 延迟事件调度中心
 */
export class EventChannel {
    /** 触发延迟 */
    readonly delayTime: number;

    /** 是否使用回调动态生成参数 */
    private dynamicParams: boolean;

    /** 是否将事件名称添加到事件回调函数参数中 */
    private passEventToListener: boolean;

    /** 存储订阅 ID 和监听对象 */
    private subscribers = new Map<symbol, EventSubscriber>();

    /** 存储事件名称和发布订阅 ID 列表 */
    private subscriptions = new Map<EventName, Set<symbol>>();

    /** 延迟计时器 ID */
    protected timerID: NodeJS.Timeout | null = null;

    /** 存储需要延迟触发的事件名称和调用参数 */
    protected publications = new Map<EventName, any[]>();

    /**
     * 创建一个延迟事件调度中心实例
     * @param options 选项
     * @param options.delayTime 延迟时间，单位毫秒
     * @param options.dynamicParams 使用回调动态生成参数
     * @param options.passEventToListener 将事件名称添加到事件回调函数参数中
     */
    constructor({delayTime = 500, dynamicParams = true, passEventToListener = false} = {}) {
        this.delayTime = delayTime;
        this.dynamicParams = dynamicParams;
        this.passEventToListener = passEventToListener;
    }

    /**
     * 取消所有订阅以及等待触发的事件
     */
    reset() {
        this.clearPublications();
        this.clear();
        this.subscribers.clear();
        this.subscriptions.clear();
    }

    /**
     * 清空所有待触发事件
     */
    clearPublications() {
        if (this.timerID) {
            if (this.delayTime) {
                clearTimeout(this.timerID);
            } else {
                cancelAsap(this.timerID);
            }
            this.timerID = null;
        }
        this.publications.clear();
    }

    /**
     * 订阅事件
     * @param event 事件名称
     * @param listener 事件回调函数
     * @returns 事件标识
     */
    subscribe(event: EventName, listener: (...args: any[]) => void): symbol {
        // 生成订阅者 ID
        const subscriberID = Symbol(typeof event === 'symbol' ? event.description : event);

        // 保存订阅 ID 和监听函数
        const subscriber = {event, listener};
        this.subscribers.set(subscriberID, subscriber);

        // 保存订阅的数据 Key 列表
        if (this.subscriptions.has(event)) {
            this.subscriptions.get(event)!.add(subscriberID);
        } else {
            this.subscriptions.set(event, new Set([subscriberID]));
        }

        // 返回订阅 ID
        return subscriberID;
    }

    /**
     * 一次订阅多个事件
     * @param events 事件名称列表
     * @param listener 事件回调函数
     * @returns 事件标识
     */
    subscribeSome(events: EventName[], listener: (...args: any[]) => void): symbol {
        // 生成订阅者 ID
        const subscriberID = Symbol(events.map(e => (typeof e === 'symbol' ? e.description : e)).join(' '));

        // 保存订阅 ID 和监听函数
        const subscriber = {events, listener};
        this.subscribers.set(subscriberID, subscriber);

        // 保存订阅的数据 Key 列表
        for (const event of events) {
            if (this.subscriptions.has(event)) {
                this.subscriptions.get(event)!.add(subscriberID);
            } else {
                this.subscriptions.set(event, new Set([subscriberID]));
            }
        }

        // 返回订阅 ID
        return subscriberID;
    }

    /**
     * 订阅任意事件
     * @param listener 事件回调函数
     * @returns 事件标识
     */
    subscribeAny(listener: (...args: any[]) => void): symbol {
        return this.subscribe(EVENT_ANY, listener);
    }

    /**
     * 取消订阅事件
     * @param subscriberID 订阅 ID
     * @returns 如果为 true 则取消订阅成功
     */
    unsubscribe(subscriberID: symbol): boolean;

    /**
     * 取消订阅事件
     * @param subscriberIDs 订阅 ID 列表
     * @returns 返回取消订阅结果列表
     */
    unsubscribe(subscriberIDs: symbol[]): boolean[];

    unsubscribe(subscriberID: symbol|symbol[]): boolean|boolean[] {
        if (Array.isArray(subscriberID)) {
            return subscriberID.map(this.unsubscribe.bind(this));
        }
        const subscriber = this.subscribers.get(subscriberID);
        if (!subscriber) {
            return false;
        }

        this.subscribers.delete(subscriberID);
        const events = subscriber.events ?? [subscriber.event];
        for (const event of events) {
            if (!event) {
                continue;
            }
            const subscription = this.subscriptions.get(event);
            if (subscription?.has(subscriberID)) {
                subscription.delete(subscriberID);
                if (!subscription.size) {
                    this.subscriptions.delete(event);
                }
            }
        }
        return true;
    }

    /**
     * 清空所有订阅
     */
    clear() {
        if (!this.subscribers.size) {
            return;
        }

        for (const subscriberID of this.subscribers.keys()) {
            this.unsubscribe(subscriberID);
        }
    }

    /**
     * 发布事件
     * @param events 事件名称，可以使用数组触发多个事件
     * @param params 事件回调参数
     */
    publish(events: EventName|EventName[], ...params: any[]) {
        if (Array.isArray(events)) {
            for (const event of events) {
                if (EVENT_ANY !== event) {
                    this.publications.set(event, params);
                }
            }
        } else if (EVENT_ANY !== events) {
            this.publications.set(events, params);
        }
        this.tryNotifySubscribers();
    }

    /**
     * 立即发布事件
     * @param events 事件名称，可以使用数组触发多个事件
     * @param params 事件回调参数
     */
    publishNow(events: EventName|EventName[], ...params: any[]) {
        if (Array.isArray(events)) {
            for (const event of events) {
                if (EVENT_ANY !== event) {
                    this.emitEvent(event, ...params);
                }
            }
            return;
        }

        if (EVENT_ANY !== events) {
            this.emitEvent(events, ...params);
        }
    }

    /**
     * 尝试延迟通知订阅者
     * @protected
     */
    protected tryNotifySubscribers() {
        if (this.delayTime) {
            if (this.timerID) {
                clearTimeout(this.timerID);
            }
            this.timerID = setTimeout(this.notifySubscribers.bind(this), this.delayTime);
            return;
        }

        if (this.timerID) {
            cancelAsap(this.timerID);
        }
        this.timerID = executeAsap(this.notifySubscribers.bind(this)).id;
    }

    /**
     * 触发事件
     * @param event 事件名称
     * @param params 事件触发参数
     */
    emitEvent(event: EventName, ...params: any[]) {
        const subscriberIDList = this.subscriptions.has(EVENT_ANY) ? [...this.subscriptions.get(EVENT_ANY)!] : [];
        const subscription = this.subscriptions.get(event);
        if (subscription?.size) {
            subscriberIDList.push(...subscription);
        }

        if (!subscriberIDList.length) {
            return;
        }

        if (this.dynamicParams && typeof params[0] === 'function') {
            params[0] = params[0](event);
        }

        if (this.passEventToListener) {
            params.unshift(event);
        }

        const subscriberIDSet = new Set(subscriberIDList);
        for (const subscriberID of subscriberIDSet) {
            const subscriber = this.subscribers.get(subscriberID);
            if (subscriber) {
                subscriber.listener(...params);
            }
        }
    }

    /**
     * 通知订阅者
     * @protected
     */
    protected notifySubscribers() {
        if (!this.publications.size) {
            return;
        }

        for (const [event, params = []] of this.publications) {
            this.emitEvent(event, ...params);
        }

        this.timerID = null;
        this.publications.clear();
    }

    /**
     * 获取订阅者 ID 清单
     * @param event 事件名称
     * @returns 阅者 ID 清单
     */
    getSubscription(event: EventName) {
        return this.subscriptions.get(event);
    }

    /**
     * 获取订阅者信息对象
     * @param subscriberID 订阅 ID
     * @returns 订阅者信息对象
     */
    getSubscriber(subscriberID: symbol) {
        return this.subscribers.get(subscriberID);
    }
}
