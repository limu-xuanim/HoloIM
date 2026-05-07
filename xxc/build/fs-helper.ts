import cpx from 'cpx';
import chalk from 'chalk';
import fs from 'node:fs';
import fse from '../nodejs/fs-helper';
import {spawn, spawnSync} from 'node:child_process';
import path from 'node:path';
import {EOL} from 'node:os';
import {extractZipFile} from '../nodejs/zip-helper';
import {formatDate} from '../app/utils/date-helper';
import {generatePackageJson} from './string-helper';
import {printConsumeInfo, printEstimateInfo} from './timecost-helper';
import type {Arch, Platform} from './platform-helper';
import type {PackageConfig} from './config-helper';
import type {ElectronBuilder} from './electron-builder-helper';

/**
 * 复制文件
 */
export function copyFiles(source: string, dest: string, options?: cpx.AsyncOptions) {
    return new Promise<string>((resolve, reject) => {
        cpx.copy(source, dest, options, err => {
            if (err) {
                console.error(`复制文件失败，原路径：${source} 目标路径：${dest}`, err);
                reject(err);
            } else {
                console.log(`    ${chalk.green(chalk.bold('✓'))} 复制 ${chalk.underline(source)} → ${chalk.underline(dest)}`);
                resolve(dest);
            }
        });
    });
}

// 更新 App 目录下的 package.json 文件并安装依赖
function updateAppPackageFile(config: PackageConfig, isVerbose: boolean) {
    return new Promise((resolve, reject) => {
        fse.outputJsonSync(path.resolve(__dirname, '../app/package.json'), generatePackageJson(config), 4, true);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 更新 ${chalk.underline('./app/package.json')}`);

        if (isVerbose) {
            console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
        }
        const npmInstallProcess = spawn('npm', ['install'], {
            cwd: './app/',
            shell: true,
        });
        let npmInstallLog = '';
        npmInstallProcess.stdout.on('data', data => {
            npmInstallLog += data.toString();
        });
        npmInstallProcess.on('close', code => {
            if (isVerbose) {
                console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
            }
            console.log(npmInstallLog.split(EOL).map(line => `    ${line}`).join(EOL));
            console.log(`    ${chalk.green(chalk.bold('✓'))} npm install [result code: ${code}]`);
            resolve(code);
        });
        npmInstallProcess.on('error', spawnError => reject(spawnError));
    });
}

// 清理临时文件
export function cleanTmpFiles() {
    const customStylePath = path.resolve(__dirname, '../app/style/custom.less');
    if (fse.pathExistsSync(customStylePath)) {
        fse.removeSync(customStylePath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 移除自定义样式 ${chalk.underline(customStylePath)}`);
    }

    const indexBakPath = path.resolve(__dirname, '../app/index.html.bak');
    const indexPath = path.resolve(__dirname, '../app/index.html');
    if (fse.pathExistsSync(indexBakPath)) {
        fse.removeSync(indexPath);
        fse.renameSync(indexBakPath, indexPath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 还原 index.html ${chalk.underline(indexPath)}`);
    }

    const packageJsonBakPath = path.resolve(__dirname, '../app/package.json.bak');
    const packageJsonPath = path.resolve(__dirname, '../app/package.json');
    if (fse.pathExistsSync(packageJsonBakPath)) {
        fse.removeSync(packageJsonPath);
        fse.renameSync(packageJsonBakPath, packageJsonPath);
        // 把缺失的尾空行追加回来
        fs.readFile(packageJsonPath, 'utf8', (err, data) => {
            if (err) {
                return;
            }

            if (!data.endsWith(EOL)) {
                fs.appendFile(packageJsonPath, EOL, (e) => {
                    if (e) {
                        console.error(e);
                    }
                })
            }
        });
        console.log(`    ${chalk.green(chalk.bold('✓'))} 还原 package.json ${chalk.underline(packageJsonPath)}`);
    }
}

// 获取当前 commit hash
function getCurrentCommit(short = false, repoPath?: string): string {
    const gitCmd = spawnSync('git', ['rev-parse', 'HEAD'], {
        cwd: repoPath || __dirname,
    });
    const {stdout, error} = gitCmd;
    if (error) {
        return '';
    }
    const commit = `${stdout}`.trim();
    return short ? commit.slice(0, 7) : commit;
}

// 获取 hooks 信息
function getHooksInfo(hooksPath: string): string {
    if (!hooksPath) {
        return null;
    }
    const hooksCommit = getCurrentCommit(true, hooksPath);
    if (!hooksCommit) {
        return null;
    }
    const hooksPathSegs = hooksPath.split('/');
    const hooksName = hooksPathSegs[hooksPathSegs.length - 3];
    const hooksVersion = hooksPathSegs[hooksPathSegs.length - 2];
    return `${hooksName}(${hooksVersion})@${hooksCommit}`;
}

type OutputConfigFilesOptions = {
    isVerbose: boolean;
    isSkipBuild: boolean;
    isBeta: boolean;
    isDebug: boolean;
    betaString: string;
    hooksPath: string;
};

// 输出打包配置文件
export async function outputConfigFiles(config: PackageConfig, electronBuilder: ElectronBuilder, options: OutputConfigFilesOptions) {
    const {isVerbose, isSkipBuild, isBeta, isDebug, betaString, hooksPath} = options;
    console.log(`${chalk.cyanBright(chalk.bold('❖ 创建打包配置文件:'))}\n`);
    printEstimateInfo(`package-prepare${isSkipBuild ? '-fast' : ''}`);

    await updateAppPackageFile(config, isVerbose);

    // 输出 electron builder 配置文件
    const electronBuilderJson = path.resolve(__dirname, './electron-builder.json');
    await fse.outputJson(electronBuilderJson, electronBuilder, 4);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 创建 ${chalk.underline(electronBuilderJson)}`);

    if (!isSkipBuild) {
        const appPkg = {
            name: config.name,
            productName: config.name,
            displayName: config.productName,
            version: config.version,
            displayVersion: config.displayVersion,
            description: config.description,
            main: './main.js',
            author: config.author,
            homepage: config.homepage,
            company: config.company,
            license: config.license,
            bugs: config.bugs,
            commit: getCurrentCommit(),
            hooksInfo: hooksPath && getHooksInfo(hooksPath),
            buildTime: new Date(),
            buildVersion: config.buildVersion,
            buildTypes: {beta: isBeta, debug: isDebug},
            specialVersion: config.specialVersion,
            // configurations: config.configurations,
            // updater: config.autoUpdater,
            // contactURL: config.contactURL,
            // downloadURL: config.downloadURL,
            // errorsURL: config.errorsURL,
        };

        // 备份 package.json 文件
        const packageJsonPath = path.resolve(__dirname, '../app/package.json');
        const packageJsonBakPath = path.resolve(__dirname, '../app/package.json.bak');
        await fse.rename(packageJsonPath, packageJsonBakPath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 备份 package.json 文件 ${chalk.underline(packageJsonPath)}`);

        // 输出应用 package.json 文件
        await fse.outputJson(packageJsonPath, {...generatePackageJson(config), ...appPkg}, 4, true);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 创建 package.json 文件 ${chalk.underline(packageJsonPath)}`);

        // 输出 manifest 文件
        const manifestJsonPath = path.resolve(__dirname, '../app/manifest.json');
        await fse.outputJson(manifestJsonPath, {
            name: config.productName,
            start_url: 'index.html',
            display: 'standalone',
            background_color: '#fff',
            theme_color: '#3f51b5',
            description: config.description,
            icons: [{
                src: 'resources/icons/48x48.png',
                sizes: '48x48',
                type: 'image/png'
            }, {
                src: 'resources/icons/64x64.png',
                sizes: '64x64',
                type: 'image/png'
            }, {
                src: 'resources/icons/96x96.png',
                sizes: '96x96',
                type: 'image/png'
            }, {
                src: 'resources/icons/128x128.png',
                sizes: '128x128',
                type: 'image/png'
            }, {
                src: 'resources/icons/144x144.png',
                sizes: '144x144',
                type: 'image/png'
            }, {
                src: 'resources/icons/192x192.png',
                sizes: '192x192',
                type: 'image/png'
            }, {
                src: 'resources/icons/256x256.png',
                sizes: '256x256',
                type: 'image/png'
            }, {
                src: 'resources/icons/512x512.png',
                sizes: '512x512',
                type: 'image/png'
            }],
        }, 4);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 创建 ${chalk.underline(manifestJsonPath)}`);

        // 读取 index.html 文件
        const indexHtmlPath = path.resolve(__dirname, '../app/index.html');
        const indexHtmlBakPath = path.resolve(__dirname, '../app/index.html.bak');
        const electronIndexHTML = fse.readFileSync(indexHtmlPath, {encoding: 'utf-8'});
        const indexHTMLVersion = `${config.version}${isDebug ? '.debug' : ''}${betaString ? `-${betaString}` : ''}.${formatDate(new Date(), 'yyyyMMddhhmm')}`;

        // 备份 index.html 文件
        await fse.rename(indexHtmlPath, indexHtmlBakPath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 备份 index.html ${chalk.underline(indexHtmlBakPath)}`);

        // 创建 index.html 文件
        await fse.outputFile(indexHtmlPath, electronIndexHTML.replace(/<title>(.*)<\/title>/g, `<title>${config.productName}</title>`).replace(/_VERSION/g, indexHTMLVersion));
        console.log(`    ${chalk.green(chalk.bold('✓'))} 创建 index.html ${chalk.underline(indexHtmlPath)}`);
    }
    printConsumeInfo(`package-prepare${isSkipBuild ? '-fast' : ''}`);
    console.log();
}

// 复制升级文件
export async function copyBinFiles(osType: Platform, arch: Arch) {
    const binPath = path.resolve(__dirname, '../app/bin/');
    await fse.emptyDir(binPath);

    // Copy updater files
    const updaterFiles = {
        'mac-x64': 'updater.mac',
        'mac-arm64': 'updater.macarm64',
        'linux-x64': 'updater.linux64',
        'linux-arm64': 'updater.linuxarm64',
        'linux-x32': 'updater.linux32',
        'win-x64': 'updater.win64.exe',
        'win-x32': 'updater.win32.exe',
    };
    if (osType === 'win') {
        await copyFiles(path.resolve(__dirname, `../updater/bin/${updaterFiles[`win-${arch}` as keyof typeof updaterFiles]}.manifest`), binPath);

        // Copy zenshot files
        const zenshotFilePath = path.resolve(__dirname, '../lib/zenshot/');
        const zipPath = path.resolve(__dirname, '../lib/zenshot.bin.zip'); // zenshot.bin.zip 内部第一层目录为 zenshot/
        const hasZip = fse.pathExistsSync(zipPath);
        if (hasZip) {
            await extractZipFile(zipPath, binPath);
        } else {
            await copyFiles(zenshotFilePath, binPath);
        }
    }
    await copyFiles(path.resolve(__dirname, `../updater/bin/${updaterFiles[`${osType}-${arch}` as keyof typeof updaterFiles]}`), binPath);
}
