/**
 * 操作系统类型
 */
export const OSType = Object.freeze({
    win: 'win',
    mac: 'mac',
    linux: 'linux',
});

/**
 * 平台类型
 */
export const PlatformType = Object.freeze({
    electron: 'electron',
    browser: 'browser',
});

/**
 * 设备类型
 */
export const DeviceType = Object.freeze({
    desktop: 'desktop',
    mobile: 'mobile',
});

/**
 * 窗口类型
 */
export const WindowType = Object.freeze({
    main: 'main',
    gallery: 'gallery',
    chathistory: 'chathistory',
    webview: 'webview',
});

/**
 * 语言名称
 */
export const Language = Object.freeze({
    zhCN: 'zh-cn',
    zhTW: 'zh-tw',
    en: 'en',
});

export type Language = ValueOf<typeof Language>;

/**
 * 聊天菜单类型
 */
export const ChatMenuType = Object.freeze({
    recents: 'recents',
    private: 'private',
    groups: 'groups',
});

/**
 * 登陆方式，支持：
 * `'normal'` 为普通登录方式；
 * `'simple'` 为简化登录操作（适用于短线重连）;
 * `'silent'` 为静默登录方式，此方式不会触发事件，适用于诊断或测试
 */
 export const LoginMode = Object.freeze({
    normal: 'normal',
    simple: 'simple',
    silent: 'silent'
 });
