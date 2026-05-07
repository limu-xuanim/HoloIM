import path from 'node:path';
import fse from '../nodejs/fs-helper';
import {simplifyVersion} from '../app/utils/version';
import {formatDate} from '../app/utils/date-helper';
import pkg from '../package.json';
import configJson from './package-config.json';

export type PackageConfig = ReturnType<typeof getConfig>;

type Options = {
    isDebug: boolean;
    betaString: string;
    specialVersion: string;
};
export function getConfig(configName: string, options: Options) {
    const {isDebug, betaString, specialVersion} = options;
    const config = {
        ...configJson,
        name: pkg.name,
        productName: pkg.productName,
        description: pkg.description,
        homepage: pkg.homepage,
        version: pkg.version,
        license: pkg.license,
        company: pkg.company,
        author: pkg.author,
        bugs: pkg.bugs,
        electronVersion: pkg.dependencies.electron,
        // repository: pkg.repository,
        // 生成构建版本字符串
        displayVersion: simplifyVersion(pkg.version),
    };
    tryLoadConfig(config, configName);
    config.buildVersion = `${isDebug ? 'debug' : ''}${(isDebug && betaString) ? '.' : ''}${betaString ? `${betaString}${formatDate(new Date(), 'yyyyMMddhhmm')}` : ''}`;
    config.specialVersion = specialVersion || pkg.specialVersion;
    return config;
}

function tryLoadConfig(config: PackageConfig, configName: string) {
    // 加载基础配置
    const baseConfigPaths = [
        path.resolve(__dirname, './build.default/build-config.json'),
        path.resolve(__dirname, './build-config.base.json'),
    ];
    for (const baseConfigPath of baseConfigPaths) {
        if (fse.pathExistsSync(baseConfigPath)) {
            Object.assign(config, fse.readJSONSync(baseConfigPath, {throws: false}));
        }
    }

    config.dir = __dirname;
    if (configName.includes('/') || configName.includes('\\')) {
        const configFilePath = path.isAbsolute(configName) ? configName : path.resolve(__dirname, configName);
        Object.assign(config, fse.readJsonSync(configFilePath));
        config.dir = path.dirname(configFilePath);
        return;
    }
    if (fse.pathExistsSync(path.resolve(__dirname, `./build-config.${configName}.json`))) {
        Object.assign(config, fse.readJSONSync(path.resolve(__dirname, `./build-config.${configName}.json`), {throws: false}));
        return;
    }
    if (fse.pathExistsSync(path.resolve(__dirname, `./build.${configName}/build-config.json`))) {
        Object.assign(config, fse.readJSONSync(path.resolve(__dirname, `./build.${configName}/build-config.json`), {throws: false}));
        config.dir = path.join(__dirname, `./build.${configName}`);
    }
}
