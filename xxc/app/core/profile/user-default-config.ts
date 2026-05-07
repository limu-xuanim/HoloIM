/**
 * 默认用户个人配置
 */
const defaultConfig = {
    /**
     * 配置版本
     */
    version: 3,
    /**
     * 上次配置变更的时间戳
     */
    lastChangeTime: 0,
    /**
     * 是否在界面上启用动画效果
     */
    'ui.animate.enable': false,
    /**
     * 导航条宽度
     */
    'ui.navbar.width': 50,
    /**
     * 导航上默认激活的项目
     */
    'ui.navbar.active': 'chat',
    /**
     * 是否仅仅在最近聊天上显示未读消息数目红点
     */
    'ui.navbar.onlyShowNoticeCountOnRecents': true,
    /**
     * 聊天列表默认宽度
     */
    'ui.chat.menu.with': 200,
    /**
     * 是否在联系人聊天列表上显示自己
     */
    'ui.chat.menu.showMe': true,
    /**
     * 发送框默认高度
     */
    'ui.chat.sendbox.height': 125,
    /**
     * 聊天侧边栏默认宽度
     */
    'ui.chat.sidebar.width': 300,
    /**
     * 聊天消息字体大小
     */
    'ui.chat.fontSize': {
        name: 13,
        time: '0.9230769231em',
        lineHeight: 1.53846153846,
        size: 13
    },
    /**
     * 是否发送高清表情
     */
    'ui.chat.sendHDEmoticon': true,
    /**
     * 是否在发送框上显示消息发送提示面板
     */
    'ui.chat.showMessageTip': true,
    /**
     * 是否在表情选择面板上显示搜索框
     */
    'ui.chat.enableSearchInEmojiPicker': false,
    /**
     * 联系人分组方式，可用值包括 'normal', 'role', 'dept'
     */
    'ui.chat.contacts.groupBy': 'normal', // 'normal', 'role', 'dept'
    /**
     * 当联系人列表使用角色分组显示时分组排序配置
     */
    'ui.chat.contacts.order.role': {},
    /**
     * 当联系人列表使用自定义分组显示时分组排序配置
     */
    'ui.chat.contacts.categories': {},
    /**
     * 当联系人列表使用部门分组显示时分组排序配置
     */
    'ui.chat.contacts.order.dept': {},
    /**
     * 聊天分组折叠展开状态配置
     */
    'ui.chat.menu.group.states': {},
    /**
     * 联系人默认分组名称
     */
    'ui.chat.contacts.category.default': '',
    /**
     * 是否监听剪切板上的图片并提示直接发送
     */
    'ui.chat.listenClipboardImage': false,
    /**
     * 是否在一对一聊天时向对方发送输入状态
     */
    'ui.chat.sendTypingStatus': true,
    /**
     * 是否显示 collabora 提示
     */
    'ui.chat.showCollaboraPrompt': true,
    /**
     * 是否启用声音通知
     */
    'ui.notify.enableSound': true,
    /**
     * 播放声音通知的时机，"onWindowHide" 或 "onWindowBlur"
     */
    'ui.notify.playSoundCondition': 'onWindowHide', // or "onWindowBlur", "
    /**
     * 是否在用户忙碌时禁用通知
     */
    'ui.notify.muteOnUserIsBusy': true,
    /**
     * 是否启用通知栏图标闪烁通知
     */
    'ui.notify.flashTrayIcon': true,
    /**
     * 通知栏图标闪烁通知时机，"onWindowHide" 或 "onWindowBlur"
     */
    'ui.notify.flashTrayIconCondition': '', // "onWindowBlur",
    
    /**
     * 是否隐藏主窗口当开机启动时
     */
    'ui.app.hideWindowOnOpenAtLogin': false,
    /**
     * 是否隐藏主窗口当窗口失去焦点时
     */
    'ui.app.hideWindowOnBlur': false,
    /**
     * 当窗口隐藏时是否从任务栏移除
     */
    'ui.app.removeFromTaskbarOnHide': false,
    /**
     * 点击关闭窗口按钮时的策略 "ask"、"close" 或 "minimize"
     */
    'ui.app.onClose': 'ask', // or "close", "minimize"
    /**
     * 用户上次手动保存文件的位置
     */
    'local.ui.app.lastFileSavePath': '',
    /**
     * 激活窗口全局快捷键
     */
    'shortcut.focusWindow': 'Ctrl+Alt+X',
    /**
     * 发送消息快捷键
     */
    'shortcut.sendMessage': 'Enter',
    /**
     * 是否断线自动重连
     */
    'user.autoReconnect': true,
    };

export default defaultConfig;

export type UserDefaultConfig = typeof defaultConfig;
