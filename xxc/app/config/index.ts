import type {UserDefaultConfig} from '~/app/core/profile/user-default-config';
import pkg from '../package.json';
import ui from './ui';
import lang from './lang';
import media from './media';
import system from './system';

type Pkg = (typeof pkg) & Partial<{
    buildTime: Date;
    specialVersion: string;
    configurations: Partial<Config>;
    companyShortName: string;
    commit: string;
    hooksInfo: string;
}>;

type System = (typeof system) & Partial<{
    specialVersion: string;
    langFilePathFormat: string;
    defaultConfig: UserDefaultConfig;
}>;

type UI = typeof ui;

type Media = typeof media;

type Lang = typeof lang;

/**
 * 应用运行时配置
 */
const config = {
    system: <System>system,
    media: <Media>media,
    ui: <UI>ui,
    pkg: <Pkg>pkg,
    lang: <Lang>lang,
};

export type Config = typeof config;

/**
 * 获取系统特殊版本信息
 * @returns 版本信息
 */
export const getSpecialVersionName = () => config.system.specialVersion || config.pkg.specialVersion;

/**
 * 更新应用运行时配置
 * @param newConfig 新的配置项
 * @returns 应用运行时配置
 */
export const updateConfig = (newConfig: Partial<Config>) => {
    for (const [key, value] of Object.entries(newConfig)) {
        Object.assign(config[key as keyof Config], value)
    }
    return config;
};

// 从 package.json 文件中获取额外的运行时配置选项
const {configurations} = config.pkg;
if (configurations) {
    updateConfig(configurations);
}

if (!config.pkg.buildTime && DEBUG && process.env.NODE_ENV === 'development') {
    config.pkg.buildTime = new Date();
}

if (DEBUG) {
    global.$config = config;
}

export default config;
