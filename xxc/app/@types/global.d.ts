/// <reference types="react" />
/// <reference types="react-dom" />


declare module '*.svg' {
    const content: string;
    export default content;
}

interface Console {
    collapse(...args: any[]): void;
    color(...args: any[]): void;
}

declare const console: Console;

/**
 * 分页对象
 */
interface PagerState {
    pageID: number;
    recTotal: number;
    recPerPage: number;
    pageTotal: number;
    range?:[number, number];
}

/**
 * 注册菜单对象
 */
interface ContextMenuItem {
    id?: string,
    label?: string,
    order?: number,
    url?: string,
    href?: string,
    click?: (...args: any[]) => void | boolean,
    disabled?: boolean,
    checked?: boolean,
    icon?: string,
    _hoverLabel?: string,
    _color?: string,
    _hint?: string,
    type?: 'divider' | 'separator' | '-',
    className?: string,
    hidden?: boolean,
    render?: (ContextMenuItem) => JSX.Element,
    extraView?: JSX.Element,
}

/**
 * Add a missing non-standard method to the HTMLElement declaration.
 * (https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollIntoViewIfNeeded)
 */
interface HTMLElement {
    scrollIntoViewIfNeeded?: (centerIfNeeded: boolean) => void;
}

type AbortHandler = import('~/app/utils/abort-handler').default;
type Member = import('../core/members/member').default;
type Chat = import('../core/im/chat').default;
type User = import('../core/profile/user').default;
type ChatMessage = import('../core/im/chat-message').default;
type UserConfig = import('../core/profile/user-config').default;
type Database = import('../core/db/database').Database;
type Entity = import('../core/db/entity').default;
type Component = import('react').Component;
type AppChildWindow = import('../main-process/app-child-window').AppChildWindow;
type AppWindow = import('../main-process/app-window').AppWindow;
type LangHelper = import('../utils/lang-helper').LangHelper;
type ChatMessagesListStore = import('../core/im/chat-messages-list-store').ChatMessagesListStore;
type ChatMessagesStore = typeof import('../core/im/chat-messages-store').default;
type ChatsStore = typeof import('../core/im/chats-store').default;
type MembersStore = typeof import('../core/members/members-store').default;
type FileData = import('../core/files/file-data').default;
type SortChatsOrder = ((a: Chat, b: Chat) => number)|'default'|'onlineFirst'|'recentFirst'|'systemFirst'|'namePinYin'|'lastMessageId'|keyof Chat|false;
type XXCLink = `xxc://${string}`;

declare var $Chat: typeof import('~/app/core/im/chat').default;
declare var $User: typeof User;
declare var $Member: typeof Member;
declare var $ChatMessage: typeof ChatMessage;
declare var $rooms: Map<string, string>;
declare var $profile;
declare var $commands: Map<string, import('~/app/core/commander').Command>;
declare var $executeCommand: (command: string, ...params: any[]) => Promise<any>;
declare var $getDatabaseTable: () => Database | null;
declare var $chatMessagesListStore: ChatMessagesListStore;
declare var $membersStore: MembersStore;
declare var $socket: AppSocket;
declare var $config: import('~/app/config').Config;
declare var $lang;
declare var $platform;
declare var $navtiveWindows;
declare var $setDebugLogLevel: (level: number) => void;
declare var $deptsStore: import('~/app/core/members/depts-store').DeptsStore;
declare var $jitsi;

declare var __non_webpack_require__;

/** 是否开启调试模式 */
declare var DEBUG: boolean;
declare var DEBUG_E: boolean;
declare var DEBUG_I: boolean;
declare var DEBUG_W: boolean;
declare var DEBUG_V: boolean;
declare var LOG_LEVEL: number;
declare var PERF: boolean;
declare var PERF_MARK: (markName: string, measureStartMarkName?: string, measureName?: string, onlyMarkHasMeasure?: boolean) => PerformanceMark;
declare var $Lang;

declare var joypixels: {
    emojiList: Record<string, {category: string; shortnames: string[]; uc_base: string; uc_full: string;}>;
    toShort: (v: string) => string;
    toImage: (v: string) => string;
    shortnameToUnicode: (v: string) => string;
    mapUnicodeCharactersToShort: () => Record<string, string>;
    imagePathPNG: string;
    imageType: string;
    convert: (v: string) => string;
};
