import pkg from '~/app/package.json';

type Config = import('~/app/config').Config;

/**
 * 运行时配置对象
 */
const electronConfig = {
    system: {},
    media: {},
    ui: {},
    pkg,
    lang: {},
} as unknown as Config;

/**
 * 更新应用运行时配置
 * @param newConfig 新的配置项
 * @returns 应用运行时配置
 */
export const updateConfig = (newConfig: Partial<Config>) => {
    Object.keys(newConfig).forEach((key: keyof Config) => {
        if (electronConfig[key]) {
            Object.assign(electronConfig[key], newConfig[key]);
        }
    });
    return electronConfig;
};

const {configurations} = electronConfig.pkg;
if (configurations) {
    updateConfig(configurations);
}

export default electronConfig;
