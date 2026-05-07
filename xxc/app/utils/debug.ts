// 0: 'none'
// 1: 'error'
// 2: 'warn'
// 3: 'info'
// 4: 'verbose'

/**
 * 设置调试日志等级
 * @param [level] 日志等级
 * @returns 设置后的日志等级
 */
function setDebugLogLevel(level = +(process.env.LOG ?? 0)) {
    Object.assign(global, {
        LOG_LEVEL: level,
        DEBUG: level > 0,
        DEBUG_E: level >= 1,
        DEBUG_W: level >= 2,
        DEBUG_I: level >= 3,
        DEBUG_V: level >= 4,
    });

    return level;
}

setDebugLogLevel();

if (DEBUG) {
    global.$setDebugLogLevel = setDebugLogLevel;
}
