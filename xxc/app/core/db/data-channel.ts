import {EventChannel, EVENT_ANY} from '../../utils/event-channel';

/**
 * 数据存储事件调度中心
 */
export class DataChannel extends EventChannel {
    /** 数据键名 */
    private key: string;

    /**
     * 创建一个数据存储事件调度中心实例
     * @param options 选项
     */
    constructor(options: {delayTime?: number; key?: string;} = {}) {
        super(options);
        this.key = options.key ?? 'id';
    }

    /**
     * 发布数据变更
     * @override
     * @param items 变更的数据
     * TODO 检查该处 publish 的实现与调用，可能与基类作用不符
     */
    override publish(items: any) {
        if (Array.isArray(items)) {
            for (const item of items) {
                this.publications.set(item[this.key], item);
            }
        } else {
            this.publications.set(items[this.key], items);
        }
        this.tryNotifySubscribers();
    }

    /**
     * 通知订阅者
     * @override
     */
    override notifySubscribers() {
        if (!this.publications.size) {
            return;
        }

        const subscriberIDList: symbol[] = [];

        const anySubscription = this.getSubscription(EVENT_ANY);
        if (anySubscription?.size) {
            subscriberIDList.push(...anySubscription);
        }

        for (const key of this.publications.keys()) {
            const subscription = this.getSubscription(key);
            if (subscription) {
                subscriberIDList.push(...subscription);
            }
        }

        if (subscriberIDList.length) {
            const subscriberIDSet = new Set(subscriberIDList);
            for (const subscriberID of subscriberIDSet) {
                const subscriber = this.getSubscriber(subscriberID);
                if (!subscriber) {
                    continue;
                }
                let changedItems = null;
                if (subscriber.event === EVENT_ANY || (subscriber.events && subscriber.events[0] === EVENT_ANY)) {
                    changedItems = Array.from(this.publications.values());
                } else if (subscriber.event) {
                    changedItems = this.publications.get(subscriber.event);
                } else if (subscriber.events) {
                    changedItems = subscriber.events.map(this.publications.get.bind(this.publications));
                } else {
                    console.error('DataChannel error: subscriber has not any events.', {subscriber, $this: this, subscriberID});
                }
                subscriber.listener(changedItems);
            }
        }

        this.timerID = null;
        this.publications.clear();
    }
}
