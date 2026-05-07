import md5 from 'md5';
import Config from '../../config';
import DelayAction from '../../utils/delay-action';
import DEFAULT, {type UserDefaultConfig} from './user-default-config';

type UserTempConfig = {
    [key: `temp.ui.chat.showSidebar.${string}`]: boolean;
    'ui.chat.list.group.states': Record<string, boolean>;
    'local.skippedVersion': string;
};

export type AllUserConfig = UserDefaultConfig & Partial<UserTempConfig>;

/**
 * 用户配置管理类
 */
export default class UserConfig {
    /**
     * 用户默认配置
     */
    static DEFAULT = DEFAULT;

    private $: AllUserConfig;

    private _hash: string;

    changeAction: DelayAction<(skipUpload: boolean) => void>;

    uploadAction: DelayAction<() => void>;

    lastChange: Partial<AllUserConfig>;

    newChanges: Partial<AllUserConfig>;

    onRequestUpload: (newChanges: Partial<AllUserConfig>, that: this) => void;

    onChange: (newChanges: Partial<AllUserConfig>, that: this) => void;

    /**
     * 创建一个用户配置管理类实例
     * @param config 用户配置数据对象
     */
    constructor(config: Partial<AllUserConfig>) {
        if (config && config.version !== DEFAULT.version) {
            config = null;
        }
        this.$ = {...DEFAULT, ...Config.system.defaultConfig, ...config};

        this.changeAction = new DelayAction((skipUpload: boolean) => {
            this.onChange(this.lastChange, this);
            if (!skipUpload && this.newChanges && typeof this.onRequestUpload === 'function') {
                this.uploadAction.do();
            }
            this.lastChange = null;
        });

        this.uploadAction = new DelayAction(() => {
            this.onRequestUpload(this.newChanges, this);
            this.newChanges = null;
        }, 5000);
    }

    get hash() {
        if (!this._hash) {
            this.exportCloud();
        }
        return this._hash;
    }

    /**
     * 获取配置数据存储对象
     * 配置数据存储对象
     */
    plain() {
        const data: any = {};
        for (const [key, value] of Object.entries(this.$)) {
            if (value !== undefined && !key.startsWith('temp.')) {
                data[key] = value;
            }
        }
        return data as Partial<UserDefaultConfig>;
    }

    /**
     * 导出用于上传到服务器的配置存储对象
     *
     * @param onlyChanges 是否仅导出变更的部分
     * @returns 配置存储对象
     */
    exportCloud(onlyChanges = false) {
        const uploadChanges = onlyChanges ? this.newChanges : this.$;
        const config: any = {};
        for (const key of Object.keys(uploadChanges)) {
            if (!key.startsWith('local.') && !key.startsWith('temp.')) {
                config[key] = this.$[key as keyof AllUserConfig];
            }
        }
        if (Object.keys(config).length) {
            if (!onlyChanges) {
                config.hash = md5(JSON.stringify(config));
                this._hash = config.hash;
            }
            return config as Partial<AllUserConfig> & {hash: string};
        }
        return null;
    }

    /**
     * 将用户配置标记已变更
     * @param change 要变更的数据
     * @param skipUpload 跳过上传
     */
    makeChange(change: Partial<AllUserConfig>, skipUpload = false) {
        this.lastChange = {...this.lastChange, ...change};
        this.newChanges = {...this.newChanges, ...this.lastChange};
        this.$.lastChangeTime = Date.now();
        this._hash = '';
        if (typeof this.onChange === 'function') {
            this.changeAction.do(skipUpload);
        }
    }

    /**
     * 获取指定名称的用户配置项值
     * @param key 配置名称
     * @param defaultValue 默认值
     * @returns 配置项值
     */
    get<K extends keyof AllUserConfig>(key: K, defaultValue?: AllUserConfig[K]): AllUserConfig[K] {
        if (this.$) {
            const val = this.$[key];
            if (val !== undefined) {
                return val;
            }
        }
        if (defaultValue === undefined && key in DEFAULT) {
            defaultValue = DEFAULT[key as keyof UserDefaultConfig] as any;
        }
        return defaultValue;
    }

    set<K extends keyof AllUserConfig>(key: K, value: AllUserConfig[K], skipUpload?: boolean): void;

    set(obj: Partial<AllUserConfig>, value: null, skipUpload?: boolean): void;

    /**
     * 设置配置项的值
     * @param keyOrObj 如果为字符串则为要设置的配置项名称，如果为对象则将对象键值对作为要设置的配置项
     * @param value 当 {keyOrObj} 为字符串时要设置的配置项的值
     * @param skipUpload 跳过上传
     */
    set<K extends keyof AllUserConfig>(
        keyOrObj: K | AllUserConfig,
        value: AllUserConfig[K] | null,
        skipUpload = false,
    ) {
        if (typeof keyOrObj === 'object') {
            const newSettings: any = {};
            for (const [k, v] of Object.entries(keyOrObj)) {
                if (this.$ && this.$[k as keyof AllUserConfig] === v) {
                    continue;
                }
                newSettings[k as keyof AllUserConfig] = v;
            }
            if (Object.keys(newSettings).length) {
                Object.assign(this.$, newSettings);
                this.makeChange(newSettings, skipUpload);
            }
        } else {
            if (this.$ && this.$[keyOrObj] === value) {
                return;
            }
            this.$[keyOrObj] = value;
            this.makeChange(
                {[keyOrObj]: value} as any,
                skipUpload || keyOrObj.startsWith('local.') || keyOrObj.startsWith('temp.'),
            );
        }
    }

    /**
     * 将用户所有配置项重置为给定的配置
     * @param newConfig 要重置的配置项对象，如果留空，则将配置项重置为默认
     */
    reset(newConfig: Partial<AllUserConfig>) {
        this.$ = {...DEFAULT, ...newConfig};
        this.makeChange(this.$, true);
    }

    /**
     * 获取是否自动重连
     */
    get autoReconnect() {
        return this.get('user.autoReconnect');
    }

    /**
     * 设置是否自动重连
     * @param flag 是否自动重连
     */
    set autoReconnect(flag) {
        this.set('user.autoReconnect', flag);
    }

    /**
     * 获取上次保存配置的时间戳
     */
    get lastChangeTime() {
        return this.get('lastChangeTime');
    }

    /**
     * 设置上次保存配置的时间戳
     */
    set lastChangeTime(time) {
        this.set('lastChangeTime', time);
    }

    /**
     * 获取是否显示发送消息提示面板
     */
    get showMessageTip() {
        // 'TODO: hide this option in 3.X version'
        return this.get('ui.chat.showMessageTip');
    }

    /**
     * 设置是否显示发送消息提示面板
     */
    set showMessageTip(flag) {
        this.set('ui.chat.showMessageTip', flag);
    }

    /**
     * 获取是否直接发送高清表情
     */

    get sendHDEmoticon() {
        // return this.get('ui.chat.sendHDEmoticon');
        // 'TODO: hide this option in 3.X version'
        return true;
    }

    /**
     * 设置是否直接发送高清表情
     */
    set sendHDEmoticon(flag) {
        this.set('ui.chat.sendHDEmoticon', flag);
    }

    /**
     * 判断给定当聊天是否显示聊天侧边栏
     * @param cgid 聊天 GID
     * @param defaultValue 默认值
     * @returns 如果是显示状态则返回 true
     */
    isChatSidebarShow(cgid: string, defaultValue = false) {
        return this.get(`temp.ui.chat.showSidebar.${cgid}`, defaultValue);
    }

    /**
     * 设置给定当聊天是否显示聊天侧边栏
     * @param cgid 聊天 GID
     * @param flag 是否显示
     */
    setChatSidebarShow(cgid: string, flag = false) {
        return this.set(`temp.ui.chat.showSidebar.${cgid}`, flag, true);
    }

    /**
     * 获取是否在联系人列表上显示自己
     */
    get showMeOnMenu() {
        return !!this.get('ui.chat.menu.showMe');
    }

    /**
     * 设置是否在联系人列表上显示自己
     */
    set showMeOnMenu(flag) {
        this.set('ui.chat.menu.showMe', flag);
    }

    /**
     * 获取是否在表情选择面板上启用搜索功能
     */

    get enableSearchInEmojiPicker() {
        // return this.get('ui.chat.enableSearchInEmojiPicker');
        // 'TODO: hide this option in 3.X version'
        return false;
    }

    /**
     * 设置是否在表情选择面板上启用搜索功能
     */
    set enableSearchInEmojiPicker(flag) {
        this.set('ui.chat.enableSearchInEmojiPicker', flag);
    }

    /**
     * 获取是否启用声音通知
     */
    get enableSound() {
        return this.get('ui.notify.enableSound');
    }

    /**
     * 设置是否启用声音通知
     */
    set enableSound(flag) {
        this.set('ui.notify.enableSound', flag);
    }

    /**
     * 获取声音通知显示的时机
     */
    get playSoundCondition() {
        return this.get('ui.notify.playSoundCondition');
    }

    /**
     * 设置声音通知显示的时机
     */
    set playSoundCondition(condition) {
        this.set('ui.notify.playSoundCondition', condition);
    }

    /**
     * 获取是否闪烁通知栏图标
     */
    get flashTrayIcon() {
        return this.get('ui.notify.flashTrayIcon');
    }

    /**
     * 设置是否闪烁通知栏图标
     */
    set flashTrayIcon(flag) {
        this.set('ui.notify.flashTrayIcon', flag);
    }

    /**
     * 获取闪烁通知栏图标通知显示的时机
     */
    get flashTrayIconCondition() {
        return this.get('ui.notify.flashTrayIconCondition');
    }

    /**
     * 设置闪烁通知栏图标通知显示的时机
     */
    set flashTrayIconCondition(condition) {
        this.set('ui.notify.flashTrayIconCondition', condition);
    }

    /**
     * 获取是否禁用通知当用户状态设置为忙碌时
     */
    get muteOnUserIsBusy() {
        return this.get('ui.notify.muteOnUserIsBusy');
    }

    /**
     * 设置是否禁用通知当用户状态设置为忙碌时
     */
    set muteOnUserIsBusy(flag) {
        this.set('ui.notify.muteOnUserIsBusy', flag);
    }

    /**
     * 获取激活主窗口快捷键
     */
    get focusWindowHotkey() {
        return this.get('shortcut.focusWindow');
    }

    /**
     * 设置激活主窗口快捷键
     */
    set focusWindowHotkey(shortcut) {
        this.set('shortcut.focusWindow', shortcut);
    }

    /**
     * 获取全局快捷键配置
     */
    get globalHotkeys() {
        return {
            focusWindowHotkey: this.focusWindowHotkey,
        };
    }

    /**
     * 获取发送消息快捷键
     */
    get sendMessageHotkey() {
        return this.get('shortcut.sendMessage', 'Enter');
    }

    /**
     * 设置发送消息快捷键
     */
    set sendMessageHotkey(shortcut) {
        this.set('shortcut.sendMessage', shortcut);
    }

    /**
     * 获取聊天消息字体大小配置
     */
    get chatFontSize() {
        return this.get('ui.chat.fontSize');
    }

    /**
     * 设置聊天消息字体大小配置
     */
    set chatFontSize(fontSize) {
        this.set('ui.chat.fontSize', fontSize);
    }

    /**
     * 获取应用关闭时的策略选项
     */
    get appCloseOption() {
        return this.get('ui.app.onClose');
    }

    /**
     * 设置应用关闭时的策略选项
     */
    set appCloseOption(option) {
        this.set('ui.app.onClose', option);
    }

    /**
     * 获取是否当窗口关闭时从任务栏移除
     */
    get removeFromTaskbarOnHide() {
        return this.get('ui.app.removeFromTaskbarOnHide');
    }

    /**
     * 设置是否当窗口关闭时从任务栏移除
     */
    set removeFromTaskbarOnHide(flag) {
        this.set('ui.app.removeFromTaskbarOnHide', flag);
    }

    /**
     * 获取是否当应用窗口失去焦点时隐藏窗口
     */
    get hideWindowOnBlur() {
        return this.get('ui.app.hideWindowOnBlur');
    }

    /**
     * 设置是否当应用窗口失去焦点时隐藏窗口
     */
    set hideWindowOnBlur(flag) {
        this.set('ui.app.hideWindowOnBlur', flag);
    }

    /**
     * 获取是否开机启动时隐藏窗口
     */
    get hideWindowOnOpenAtLogin() {
        return this.get('ui.app.hideWindowOnOpenAtLogin');
    }

    /**
     * 设置是否开机启动时隐藏窗口
     */
    set hideWindowOnOpenAtLogin(flag) {
        this.set('ui.app.hideWindowOnOpenAtLogin', flag);
    }

    /**
     * 获取联系人分组显示方式
     */
    get contactsGroupByType() {
        return this.get('ui.chat.contacts.groupBy');
    }

    /**
     * 设置联系人分组显示方式
     */
    set contactsGroupByType(type) {
        this.set('ui.chat.contacts.groupBy', type);
    }

    /**
     * 获取联系人列表以角色分组时的排序设置
     *
     * @type {Object}
     */
    get contactsOrderRole() {
        return this.get('ui.chat.contacts.order.role', {});
    }

    /**
     * 设置联系人列表以角色分组时的排序设置
     */
    set contactsOrderRole(orders) {
        this.set('ui.chat.contacts.order.role', orders);
    }

    /**
     * 获取联系人自定义分组数据
     */
    get contactsCategories() {
        return this.get('ui.chat.contacts.categories', {});
    }

    /**
     * 设置联系人自定义分组数据
     */
    set contactsCategories(orders) {
        this.set('ui.chat.contacts.categories', orders);
    }

    /**
     * 获取联系人列表以部门分组时的排序设置
     */
    get contactsOrderDept() {
        return this.get('ui.chat.contacts.order.dept', {});
    }

    /**
     * 设置联系人列表以部门分组时的排序设置
     */
    set contactsOrderDept(orders) {
        this.set('ui.chat.contacts.order.dept', orders);
    }

    /**
     * 获取联系人默认分组名称
     */
    get contactsDefaultCategoryName() {
        return this.get('ui.chat.contacts.category.default');
    }

    /**
     * 设置联系人默认分组名称
     */
    set contactsDefaultCategoryName(name) {
        this.set('ui.chat.contacts.category.default', name);
    }

    /**
     * 获取讨论组分组折叠展开状态
     */
    get chatGroupStates() {
        return this.get('ui.chat.list.group.states', {});
    }

    /**
     * 设置讨论组分组折叠展开状态
     */
    set chatGroupStates(states) {
        this.set('ui.chat.list.group.states', states);
    }

    /**
     * 获取是否监听剪切板图片并提示发送
     */

    get listenClipboardImage() {
        // return this.get('ui.chat.listenClipboardImage', true);
        // 'TODO: hide this option in 3.X version'
        return false;
    }

    /**
     * 设置是否监听剪切板图片并提示发送
     */
    set listenClipboardImage(flag) {
        this.set('ui.chat.listenClipboardImage', flag);
    }

    /**
     * 获取是否在一对一聊天时向对方发送输入状态
     */
    get sendTypingStatus() {
        return this.get('ui.chat.sendTypingStatus', true);
    }

    /**
     * 设置是否在一对一聊天时向对方发送输入状态
     */
    set sendTypingStatus(flag) {
        this.set('ui.chat.sendTypingStatus', flag);
    }

    /**
     * 设置讨论组分组折叠展开状态
     * @param listType 列表类型
     * @param groupType 分组类型
     * @param id 组编号
     * @param expanded 是否展开
     */
    setChatMenuGroupState(listType: string, groupType: string, id: string, expanded: boolean) {
        const {chatGroupStates} = this;
        const key = `${listType}.${groupType}.${id}`;
        if (expanded) {
            chatGroupStates[key] = expanded;
        } else if (chatGroupStates[key]) {
            delete chatGroupStates[key];
        }
        this.chatGroupStates = chatGroupStates;
    }

    /**
     * 检查讨论组分组折叠展开状态
     * @param listType 列表类型
     * @param groupType 分组类型
     * @param id 组编号
     * @returns 如果返回 true 则为展开状态
     */
    getChatMenuGroupState(listType: string, groupType: string, id: string) {
        const {chatGroupStates} = this;
        return !!chatGroupStates?.[`${listType}.${groupType}.${id}`];
    }

    /**
     * 获取忽略的版本信息
     */
    get skippedVersion() {
        return this.get('local.skippedVersion');
    }

    /**
     * 设置忽略的版本信息
     */
    set skippedVersion(version: string) {
        this.set('local.skippedVersion', version);
    }
}
