import {Component} from 'react';
import Config from '~/app/config';
import DEFAULT_USER_CONFIG from '~/app/core/profile/user-default-config';
import {classes} from '~/app/utils/html-helper';
import {formatKeyDecoration} from '~/app/utils/shortcut';
import HotkeyInputControl from '~/app/components/hotkey-input-control';
import Lang from '~/app/core/lang';
import Checkbox from '~/app/components/checkbox';
import SelectBox from '~/app/components/select-box';
import fuid from '~/app/utils/fuid';
import platform from '~/app/platform';
import {getCurrentUser} from '~/app/core/profile';
import Modal from '~/app/components/modal';
import type {ElectronPlatform} from '~/app/platform/electron';

const isBrowser = platform.isBrowser;
const fs = platform.access<ElectronPlatform['fs']>('fs');
const os = platform.access<ElectronPlatform['os']>('os');
const ui = platform.access<ElectronPlatform['ui']>('ui');

/**
 * 判断是否已关闭通知功能
 * @param state React 状态对象
 * @returns 如果是 `true` 则为已关闭通知功能
 */
const isNotificationOff = (state: UserSettingState) => !state['ui.notify.enableSound'];

/**
 * 判断是否已关闭通知栏图标闪烁功能
 * @param state React 状态对象
 * @returns 如果是 `true` 则为已关闭通知栏图标闪烁功能
 */
const isFlashTrayIconOff = (state: UserSettingState) => isBrowser || !state['ui.notify.flashTrayIcon'];

type UserSettingProps = {
    settings: Partial<UserConfig>;
    localSettings: Record<string, any>;
    className: string;
};

type UserSettingState = Partial<UserConfig> & Record<string, any>;

type Item = {
    type: string;
    name: string;
    caption?: string;
    hidden?: ((state: UserSettingState) => boolean) | boolean;
    className?: string;
    options?: Array<{value: string; label: string;}> | string[];
    click?: () => void;
    text?: string;
    description?: string;
    view?: JSX.Element;
};

/**
 * UserSetting 组件 ，显示个人设置界面
 */
export default class UserSetting extends Component<UserSettingProps, UserSettingState> {
    #cacheFilePath: string | false;

    #cachePathExist: boolean;

    /**
     * React 组件构造函数，创建一个 UserSetting 组件实例，会在装配之前被调用。
     * @param props 组件属性对象
     */
    constructor(props: UserSettingProps) {
        super(props);

        this.state = {...this.props.settings, ...this.props.localSettings};
    }

    /**
     * 获取缓存目录
     */
    get cacheFilePath() {
        if (this.#cacheFilePath) {
            return this.#cacheFilePath;
        }

        this.#cacheFilePath = !isBrowser && os.createUserDataPath(getCurrentUser().identify, '', '');
        return this.#cacheFilePath;
    }

    /**
     * 缓存目录是否存在
     */
    get cachePathExist() {
        if (this.#cachePathExist) {
            return this.#cachePathExist;
        }

        this.#cachePathExist = !isBrowser && fs.pathExistsSync(this.cacheFilePath);
        return this.#cachePathExist;
    }

    /**
     * 获取当前设置的个人配置对象
     */
    getSettings() {
        return this.state;
    }

    /**
     * 设置当前设置的个人配置对象
     * @param settings 个人配置对象
     */
    setSettings(settings: typeof this.state) {
        this.setState({...settings});
    }

    /**
     * 修改个人配置
     *
     * @param item 配置项对象
     * @param value 配置项值
     */
    changeConfig(item: Item, value: any) {
        const {name} = item;
        if (typeof value === 'object' && value.target) {
            if (value.target.type === 'checkbox') {
                value = value.target.checked;
            } else {
                ({value} = value.target);
            }
        }
        this.setState({[name]: value});
    }

    /**
     * 渲染普通配置项
     *
     * @param item 配置项对象
     * @returns React 渲染内容
     */
    renderConfigItem(item: Item) {
        const hidden = typeof item.hidden === 'function'
            ? item.hidden(this.state)
            : item.hidden;

        if (hidden) {
            return null;
        }

        switch (item.type) {
            case 'boolean':
                return this.renderBooleanItem(item);
            case 'select':
                return this.renderSelectItem(item);
            case 'hotkey':
                return this.renderHotkeyItem(item);
            case 'zoomFactor':
                return this.renderZoomFactor(item);
            case 'button':
                return this.renderButtonItem(item);
            case 'text':
                return this.renderTextItem(item);
            case 'jsx':
                return item.view;
        }
        return null;
    }

    /**
     * 渲染快捷键配置项
     * @param item 配置项对象
     * @returns React 渲染内容
     */
    renderHotkeyItem(item: Item) {
        const value = this.state[item.name];
        return <HotkeyInputControl onlyMotifyKeysText={Lang.string('setting.hotkeys.cantSetOnlyModifyKeys')} key={item.name} defaultValue={value} labelStyle={{flex: 1}} onChange={this.changeConfig.bind(this, item)} label={item.caption} className={classes('-flex', item.className)} />;
    }

    /**
     * 渲染选择框配置项
     * @param item 配置项对象
     * @returns React 渲染内容
     */
    renderSelectItem(item: Item) {
        const value = this.state[item.name];
        const controlId = fuid();
        return (
            <div className={classes('control -flex selectbox', item.className)} key={item.name}>
                <label htmlFor={controlId}>{item.caption}</label>
                <SelectBox selectProps={{id: controlId}} value={value} options={item.options} onChange={this.changeConfig.bind(this, item)} selectClassName="-rounded" />
            </div>
        );
    }

    /**
     * 渲染布尔值配置项
     * @param item 配置项对象
     * @returns React 渲染内容
     */
    renderBooleanItem(item: Item) {
        const value = this.state[item.name];
        const checked = !!value;
        return (
            <div className={classes('control', item.className)} key={item.name}>
                <Checkbox checked={checked} label={item.caption} description={item.description} onChange={this.changeConfig.bind(this, item)} />
            </div>
        );
    }

    /**
     * 渲染 zoomFactor range 配置项
     * @param item 配置项对象
     * @returns React 渲染内容
     */
    renderZoomFactor(item: Item) {
        const value = this.state[item.name] || 1;
        const controlId = fuid();
        return (
            <div className={classes('rangebox control -flex single -items-center', item.className)} key={item.name}>
                <label htmlFor={controlId}>{item.caption}</label>
                <input className="-flex-auto" id={controlId} type="range" min="0.50" max="2.00" step="0.10" value={value} onChange={this.changeConfig.bind(this, item)} />
                <div className="-flex-none">{`${Math.floor(value * 100)}%`}</div>
            </div>
        );
    }

    /**
     * 渲染按钮项
     * @param item 配置项对象
     * @returns React 渲染内容
     */

    renderButtonItem(item: Item) {
        return <div className={classes('btn -rounded gray x-outline', item.className)} key={item.name} onClick={item.click}>{item.caption}</div>;
    }

    /**
     * 渲染文本项
     *
     * @param item 配置项对象
     * @returns React 渲染内容
     */

    renderTextItem(item: Item) {
        return <div className={classes(item.className)} key={item.name}>{item.text}</div>;
    }

    /**
     * React 组件生命周期函数：Render
     * @returns React 渲染内容
     */
    override render() {
        /**
         * 个人配置界面列表项清单
         */
        const configs = [
            {
                name: 'chats',
                hidden: isBrowser,
                title: Lang.string('setting.section.chats'),
                items: [
                    {
                        type: 'boolean',
                        name: 'ui.chat.sendTypingStatus',
                        caption: Lang.string('setting.chats.sendTypingStatus'),
                    }
                ]
            }, {
                name: 'notification',
                title: Lang.string('setting.section.notification'),
                items: [
                    {
                        type: 'boolean',
                        name: 'ui.notify.enableSound',
                        caption: Lang.string('setting.notification.enableSoundNotification')
                    }, {
                        type: 'select',
                        name: 'ui.notify.playSoundCondition',
                        className: 'level-2',
                        options: [
                            {value: '', label: Lang.string('setting.notification.onNeed')},
                            {value: 'onWindowBlur', label: Lang.string('setting.notification.onWindowBlur')},
                            {value: 'onWindowHide', label: Lang.string('setting.notification.onWindowHide')},
                        ],
                        hidden: isNotificationOff,
                        caption: Lang.string('setting.notification.playSoundCondition')
                    }, {
                        type: 'boolean',
                        className: 'level-2',
                        name: 'ui.notify.muteOnUserIsBusy',
                        hidden: isNotificationOff,
                        caption: Lang.string('setting.notification.muteOnUserIsBusy')
                    }, {
                        type: 'boolean',
                        name: 'ui.notify.flashTrayIcon',
                        hidden: isBrowser,
                        caption: Lang.string('setting.notification.flashTrayIcon')
                    }, {
                        type: 'select',
                        name: 'ui.notify.flashTrayIconCondition',
                        className: 'level-2',
                        options: [
                            {value: 'onWindowBlur', label: Lang.string('setting.notification.onWindowBlur')},
                            {value: 'onWindowHide', label: Lang.string('setting.notification.onWindowHide')},
                        ],
                        hidden: isFlashTrayIconOff,
                        caption: Lang.string('setting.notification.flashTrayIconCondition')
                    }
                ]
            }, {
                name: 'windows',
                hidden: isBrowser,
                title: Lang.string('setting.section.windows'),
                items: [
                    {
                        type: 'boolean',
                        name: 'ui.app.hideWindowOnOpenAtLogin',
                        caption: Lang.string('setting.windows.hideWindowOnOpenAtLogin')
                    }, {
                        type: 'boolean',
                        name: 'ui.app.hideWindowOnBlur',
                        caption: Lang.string('setting.windows.hideWindowOnBlur')
                    }, {
                        type: 'boolean',
                        name: 'ui.app.removeFromTaskbarOnHide',
                        caption: Lang.string('setting.windows.removeFromTaskbarOnHide')
                    }, {
                        type: 'select',
                        name: 'ui.app.onClose',
                        hidden: !ui.showQuitConfirmDialog,
                        options: [
                            {value: 'ask', label: Lang.string('setting.windows.askEveryTime')},
                            {value: 'minimize', label: Lang.string('setting.windows.minimizeMainWindow')},
                            {value: 'close', label: Lang.string('setting.windows.quitApp')},
                        ],
                        caption: Lang.string('setting.windows.onClickCloseButton')
                    }, {
                        type: 'zoomFactor',
                        name: 'local.ui.zoomFactor',
                        hidden: !ui.setZoomFactor,
                        caption: Lang.string('setting.windows.zoomFactor')
                    }
                ]
            }, {
                name: 'hotkeys',
                hidden: isBrowser,
                title: Lang.string('setting.section.hotkeys'),
                items: [
                    {
                        type: 'select',
                        name: 'shortcut.sendMessage',
                        options: Config.ui['hotkey.sendMessageOptions'].map(formatKeyDecoration),
                        caption: Lang.string('setting.hotkeys.sendMessage')
                    }, {
                        type: 'hotkey',
                        hidden: isBrowser,
                        name: 'shortcut.focusWindow',
                        caption: Lang.string('setting.hotkeys.globalFocusWindow')
                    }
                ]
            }, {
                name: 'reset',
                title: Lang.string('setting.section.reset'),
                items: [
                    {
                        type: 'button',
                        name: 'openCacheFilePath',
                        className: '-block dark app-reset-btn ',
                        caption: Lang.string('setting.section.openCacheFilePath'),
                        hidden: !this.cachePathExist,
                        click: () => {
                            if (this.cachePathExist && ui.openFileItem) {
                                ui.openFileItem(this.cacheFilePath);
                            } else {
                                Modal.alert(Lang.string('setting.openCacheFilePath.noCache'));
                            }
                        }
                    },
                    {
                        type: 'text',
                        name: 'openCacheFilePath.tip',
                        className: '-inline-block has-padding-h text-gray cache-tip-position',
                        text: Lang.string('setting.openCacheFilePath.tip'),
                        hidden: !this.cachePathExist,
                    },
                    {
                        type: 'button',
                        name: 'reset',
                        className: `${this.cachePathExist ? '-block' : ''} dark app-reset-btn`,
                        caption: Lang.string('setting.reset.btn'),
                        click: () => {
                            this.setSettings(DEFAULT_USER_CONFIG);
                        }
                    }, {
                        type: 'text',
                        name: 'reset.tip',
                        className: `-inline-block has-padding-h text-gray ${this.cachePathExist ? 'reset-tip-position' : 'reset-tip-position-nocache'}`,
                        text: Lang.string('setting.reset.tip')
                    }
                ]
            }
        ];

        return (
            <div className={classes('app-user-setting space -mt-1', this.props.className)}>
                {
                    configs.map(section => (
                        section.hidden
                            ? null
                            : (
                                <section key={section.name} className={`space app-setting-group-${section.name}`}>
                                    <header className="heading -mb-1">
                                        <strong className="title !-flex-none">{section.title}</strong>
                                        <div className="-flex-1" style={{borderTop: '1.5px dashed #E3E4E9'}} />
                                    </header>
                                    <div className="items">
                                        {section.items.map(item => this.renderConfigItem(item))}
                                    </div>
                                </section>
                            )
                    ))
                }
            </div>
        );
    }
}
