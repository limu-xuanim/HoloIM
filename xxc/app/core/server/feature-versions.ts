export enum FeatureMinVersions {
    /** 最小支持的服务器版本 */
    MIN_SUPPORT_VERSION = '10.0',

    /** 最小支持 Ping 轮询的服务器版本 */
    MIN_PING_INTERVAL_VERSION = '3.0.0-beta.4',

    /** 最小支持在请求前追加服务器名称的服务器版本 */
    MIN_PREPEND_SERVERNAME_VERSION = '3.1',

    /** 最小支持使用 token 验证的服务器版本 */
    MIN_TOKEN_AUTH_VERSION = '3.2',

    /** 最小支持使用基本用户列表的服务器版本 */
    MIN_BASIC_USER_LIST_VERSION = '3.2.4',

    /** 最小支持在 messageGetList 加 cgid 参数的服务器版本 */
    MIN_MESSAGE_GET_LIST_GID_VERSION = '4.0.beta2',

    /** 最小支持设置管理员功能的服务器版本 */
    MIN_CHAT_SET_ADMINS_VERSION = '4.0.beta3',

    /** 最小支持 USER_GET_LIST_WITHOUT_BASIC_PARAM 的服务器版本  */
    MIN_USER_GET_LIST_WITHOUT_BASIC_PARAM_VERSION = '4.0.beta2',

    /** 最小支持接口 usergetlistbydept 支持使用 onlySelf 参数当服务器版本 */
    MIN_USER_GET_LIST_BY_DEPT_ONLY_SELF_VERSION = '4.3',

    /** 最小支持设置已读消息的服务器版本  */
    MIN_CHAT_SET_LAST_READ_MESSAGE_VERSION = '4.2',

    /** 最小支持私有会话的服务器版本 */
    MIN_PRIVATE_CHAT_VERSION = '4.7',

    /** 最小支持按照最后已知消息同步离线消息的服务器版本 */
    MIN_SYNC_MISSING_VERSION = '5.0',

    /** 最小支持使用 cookie 代替 sessionId 的服务器版本 */
    MIN_COOKIE_SID_VERSION = '5.0',

    /** 最小支持点对点发送文件的服务器版本 */
    MIN_P2P_FILE_TRANSFER_VERSION = '5.1',

    /** 最小支持群组合并的服务器版本 */
    MIN_MERGE_CHATS_VERSION = '5.6',

    /** 最小支持设置已读消息 index 的服务器版本 */
    MIN_CHAT_SET_LAST_READ_MESSAGE_BY_INDEX_VERSION = '5.6',

    /** 最小支持协作文档的服务器版本 */
    MIN_COLLABORA_EDIT_VERSION = '6.4',

    /** 最小合并消息的服务器版本 */
    MIN_MERGED_MESSAGES_VERSION = '9.2',

    /** 最小支持 FrankPHP 的服务器版本 */
    MIN_FRANKPHP_VERSION = '10.0',
}

/** 需要检查的功能版本枚举 */
export enum VersionSupport {
    fileServer = 'fileServer',
}
