import Dexie, {type DexieOptions} from 'dexie';
import Message, {type ChatMessageLike} from '../im/chat-message';
import Member, {type MemberLike} from '../members/member';
import Chat, {type ChatLike} from '../im/chat';

/**
 * 数据库版本
 */
const DB_VERSION = 11;

/**
 * 创建的数据库实例
 */
let db: Database | null = null;

/**
 * 创建数据库实例
 * @param identify 数据库标识
 * @returns 数据库实例
 */
const createDatabase = (identify: string): Database => {
    if (!db) {
        db = new Database(identify);
    } else if (db.identify !== identify) {
        db.destroy();
        db = new Database(identify);
    }
    return db;
};

/**
* 创建并打开数据库
* @param identify 数据库标识
* @returns 使用 Promise 异步返回处理结果
*/
export const createAndOpenDatabase = async (identify: string) => {
    const db = createDatabase(identify);
    await db.open();
    if (DEBUG) {
        console.collapse('Database opened', 'tealBg', identify, 'tealPale');
        console.log('db', db);
        console.groupEnd();
    }
    return db;
};

/** 最近会话表信息 */
const RecentChatsTable = {
    NAME: 'RecentChats',
    dexieFormat: '&gid,lastSummary,timeText'
};

/** 通用数据表：使用 [type+key] 作为主键，避免同一 type+key 多次写入产生重复记录 */
const CommonTable = {
    NAME: 'common',
    dexieFormat: '[type+key],value',
    /** v10 及以前使用的旧格式（含自增 id，会产生重复记录） */
    dexieFormatLegacy: '++id,*type,*key,[type+key],value',
};

/**
 * 数据库管理类
 */
class Database {
    /**
     * 数据库版本
     */
    static VERSION = DB_VERSION;

    /**
     * 数据库标识
     */
    readonly identify: string;

    /**
     * 构建数据库选项
     */
    private options: DexieOptions;

    /**
     * 当前数据库实例
     */
    private db: Dexie;

    /**
     * 创建一个数据库管理类实例
     * @param identify 数据库标识
     * @param dbOptions Dexie 数据库选项
     */
    constructor(identify: string, dbOptions?: DexieOptions) {
        this.identify = identify;
        this.options = {autoOpen: false, ...dbOptions};
        this.init();
    }

    init() {
        this.db = new Dexie(this.identify, this.options);
        this.db.version(1).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
        });
        this.db.version(2).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [RecentChatsTable.NAME]: RecentChatsTable.dexieFormat,
        });
        this.db.version(3).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [RecentChatsTable.NAME]: RecentChatsTable.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
        });
        this.db.version(4).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [RecentChatsTable.NAME]: RecentChatsTable.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
        });
        this.db.version(5).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: Chat.SCHEMA.dexieFormat,
            [RecentChatsTable.NAME]: null,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
        });
        this.db.version(6).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
        });
        this.db.version(7).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
        });
        this.db.version(8).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
            [CommonTable.NAME]: CommonTable.dexieFormatLegacy,
        });
        this.db.version(9).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
            [CommonTable.NAME]: CommonTable.dexieFormatLegacy,
        });
        this.db.version(10).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
            [CommonTable.NAME]: CommonTable.dexieFormatLegacy,
        }).upgrade(trans => {
            trans.table(Chat.NAME).where('gid').equalsIgnoreCase('notification').delete();
            trans.table(Message.NAME).where('cgid').equalsIgnoreCase('notification').delete();
        });
        this.db.version(11).stores({
            [Message.NAME]: Message.SCHEMA.dexieFormat,
            [Chat.name]: null,
            [Chat.NAME]: Chat.SCHEMA.dexieFormat,
            [Member.NAME]: Member.SCHEMA.dexieFormat,
            [CommonTable.NAME]: CommonTable.dexieFormat,
        });
    }

    /**
     * 打开数据库
     * @returns 使用 Promise 异步返回处理结果
     */
    async open() {
        if (this.isOpen) {
            return this.db;
        }

        try {
            await this.db.open();
        } catch (error) {
            await this.db.delete();
            this.init();
            await this.open();
        }
        return this.db;
    }

    /**
     * 当前数据库是否已经打开
     */
    get isOpen() {
        try {
            return this.db.isOpen();
        } catch {
            return false;
        }
    }

    /**
     * 获取数据库 ChatMessage 表
     */
    get chatMessages() {
        return this.isOpen ? this.db.table<ChatMessageLike>(Message.NAME) : null;
    }

    /**
     * 获取数据库 Member 表
     */
    get members() {
        return this.isOpen ? this.db.table<MemberLike>(Member.NAME) : null;
    }

    /**
     * 获取数据库 Chat 表
     */
    get chats() {
        return this.isOpen ? this.db.table<ChatLike>(Chat.NAME) : null;
    }

    /**
     * 获取通用数据表
     */
    get common() {
        return this.isOpen ? this.db.table(CommonTable.NAME) : null;
    }

    /**
     * 关闭并销毁数据库实例
     */
    destroy() {
        this.db.close();
    }
}

export type {Database};
