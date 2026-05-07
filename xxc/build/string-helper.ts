import {simplifyVersion} from '../app/utils/version';
import pkg from '../package.json';
import type {PackageConfig} from './config-helper';

// 生成 app/package.json 对象
export function generatePackageJson(config: PackageConfig) {
    return {
        name: pkg.name,
        productName: pkg.name,
        displayName: pkg.productName,
        version: pkg.version,
        displayVersion: simplifyVersion(pkg.version),
        description: pkg.description,
        main: './main.js',
        author: pkg.author,
        homepage: pkg.homepage,
        company: pkg.company,
        license: pkg.license,
        bugs: pkg.bugs,
        // repository: pkg.repository,
        dependencies: pkg.appDependencies,
        downloadURL: pkg.downloadURL,
        contactURL: pkg.contactURL,
        errorsURL: pkg.errorsURL,
        ...((config as any).configurations ? {configurations: (config as any).configurations} : {}),
    };
}
