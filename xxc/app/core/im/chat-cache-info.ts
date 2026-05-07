// 界面上的聊天缓存默认寿命，30分钟，在没有激活的状态超过此时间会从界面上移除
export const DEFAULT_CACHE_LIFE_TIME = 30 * 60 * 1000;

/**
 * 聊天缓存信息类
 */
export default class ChatCacheInfo {
    /**
     * 所属的聊天 GID
     */
    readonly cgid: string;

    /**
     * 存储聊天在界面上上次激活的时间
     */
    #activeTime = 0;

    /**
     * 存储界面状态
     */
    private state: Partial<{
        scrollPos: number;
    }>;

    /**
     * 获取聊天在界面上上次激活的时间
     */
    get activeTime() {
        return this.#activeTime;
    }

    /**
     * 判断当前缓存是否被清理
     */
    get isCleaned() {
        return !this.#activeTime;
    }

    /**
     * 创建一个 ChatCacheInfo 类
     * @param cgid
     * @param activeTime
     */
    constructor(cgid: string, activeTime = Date.now()) {
        this.cgid = cgid;
        this.#activeTime = activeTime;
    }

    /**
     * 将当前聊天标记为激活，更新上次激活时间
     */
    active() {
        this.#activeTime = Date.now();
    }

    /**
     * 判断当前缓存是否过期
     * @param life 缓存最长存活时间（距离上次被激活的时间，单位毫秒）
     * @returns 结果
     */
    isExpired(life = DEFAULT_CACHE_LIFE_TIME) {
        return (Date.now() - this.activeTime) >= life;
    }

    /**
     * 标记缓存已被清理
     */
    clean() {
        this.#activeTime = 0;
    }

    /**
     * 保存聊天缓存在界面上的状态，以便于恢复界面
     * @param newState 新的状态
     */
    keepState(newState: typeof this.state) {
        if (!this.state) {
            this.state = {};
        }
        Object.assign(this.state, newState);
    }

    /**
     * 取出聊天缓存在界面上保存的状态
     * @param name 状态名称，可以为 `'scrollPos'`
     * @returns 状态
     */
    takeOutState(name: keyof typeof this.state) {
        const {state} = this;
        if (!state) {
            return null;
        }

        return state[name];
    }
}
