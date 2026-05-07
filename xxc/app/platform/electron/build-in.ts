import env from './env';
import fs from './fs';

/** 内置扩展存储根路径 */
export const buildInPath = window.nodeAPI.pathJoin(process.env.HOT ? env.appRoot : env.appPath, 'build-in');

/**
 * 获取内置运行时配置
 * @returns 运行时配置对象
 */
export const getBuildInConfig = () => {
    // 内置扩展存储根路径内的运行时配置文件路径
    const buildInConfigFile = window.nodeAPI.pathJoin(buildInPath, 'config.json');

    return fs.readJsonSync(buildInConfigFile, {throws: false});
};

/**
 * 从内置配置移除用户信息
 */
export const removeDefaultUser = () => {
    const buildInConfigFile = window.nodeAPI.pathJoin(buildInPath, 'config.json');
    const buildInConfig = fs.readJsonSync(buildInConfigFile, {throws: false});
    if (!buildInConfig?.ui?.defaultUser || buildInConfig.ui.defaultUser.lock) {
        return;
    }
    delete buildInConfig.ui.defaultUser;
    fs.outputJsonSync(buildInConfigFile, buildInConfig);
};

export default {
    buildInPath,
    getBuildInConfig,
    removeDefaultUser,
};
