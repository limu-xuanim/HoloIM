import chalk from 'chalk';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {EOL} from 'node:os';
import fse from '../nodejs/fs-helper';
import {createZipFromDir} from '../nodejs/zip-helper';
import {printConsumeInfo, printEstimateInfo} from './timecost-helper';
import {copyBinFiles, copyFiles} from './fs-helper';
import {ARTIFACT_NAMES} from './electron-builder-helper';
import type {Arch, Platform} from './platform-helper';
import type {PackageConfig} from './config-helper';
import {readProcessOutputByLine} from './log-helper';

const appRootPath = path.resolve(__dirname, '../');

type BuildAppOptions = {
    isBrowser?: boolean;
    isDebug: boolean;
    isFullDebug: boolean;
    isVerbose: boolean;
};

// 处理和编译应用源文件
function buildApp(config: PackageConfig, hooksPath: string, options: BuildAppOptions) {
    const {isBrowser = false, isDebug, isFullDebug, isVerbose} = options;
    if (!isBrowser) {
        console.log(`${chalk.cyanBright(chalk.bold(`❖ 处理和编译应用源文件${isBrowser ? '[browser]' : isDebug ? ' [debug]' : ''}:`))}\n`);
    }
    return new Promise((resolve, reject) => {
        const electronDistPath = isBrowser ? './app/web-dist/' : './app/dist/';
        fse.emptyDirSync(electronDistPath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 清空 ${chalk.underline(electronDistPath)}\n`);

        if (!isBrowser && fse.pathExistsSync('./app/main.js.map')) {
            fse.removeSync('./app/main.js.map');
            console.log(`    ${chalk.green(chalk.bold('✓'))} 移除 ${chalk.underline('./app/main.js.map')}\n`);
        }

        if (config.stylePath) {
            console.log(`${chalk.yellow(chalk.bold(`    [${isBrowser ? '浏览器端：' : ''}处理自定义样式]`))}`);
            fse.outputFileSync(path.resolve(__dirname, '../app/style/custom.less'), `@import "${path.resolve(config.dir, config.stylePath)}";`);
            console.log(`    ${chalk.green(chalk.bold('✓'))} 生成自定义样式文件 ${chalk.underline(path.resolve(__dirname, '../app/style/custom.less'))}`);
            console.log();
        }
        console.log(`${chalk.yellow(chalk.bold(`    [${isBrowser ? '浏览器端：' : ''}使用 Webpack 进行编译]`))}`);
        printEstimateInfo(isBrowser ? 'webpack-browser' : 'webpack-electron');
        if (isVerbose) {
            console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
        }

        const env = {
            ...process.env,
            DISABLE_ENV_CONFIG: String(false),
            HOOKS: hooksPath,
            HOOKS_FAST_MODE: String(true),
            ...(isFullDebug ? {DEVTOOL: 'source-map'} : {})
        };

        const npmBuildProcess = spawn(
            'npm',
            ['run', isBrowser ? 'build-browser' : isDebug ? 'build-debug' : 'build'],
            {
                cwd: appRootPath,
                shell: true,
                env,
            }
        );
        readProcessOutputByLine(npmBuildProcess.stdout, (line) => {
            console.log(`    ${line}`);
        });
        readProcessOutputByLine(npmBuildProcess.stderr, (line) => {
            console.log(`    ${line}`);
        });

        npmBuildProcess.on('close', code => {
            if (isVerbose) {
                console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
            }
            if (config.stylePath) {
                fse.outputFileSync(path.resolve(__dirname, '../app/style/custom.less'), '');
                console.log(`    ${chalk.green(chalk.bold('✓'))} 生成自定义样式文件 ${chalk.underline(path.resolve(__dirname, '../app/style/custom.less'))}`);
            }
            console.log(`    ${chalk.green(chalk.bold('✓'))} 编译完成 [result code: ${code}]`);
            printConsumeInfo(isBrowser ? 'webpack-browser' : 'webpack-electron');
            console.log();
            resolve(code);
        });
        npmBuildProcess.on('error', spawnError => reject(spawnError));
    });
}

type CreatePackageOption = {
    isBinOnly: boolean;
    isDebug: boolean;
    isVerbose: boolean;
    betaString: string;
    packagesPath: string;
};

// 制作安装包
function createPackage(config: PackageConfig, platform: Exclude<Platform, 'browser'>, arch: Arch, options: CreatePackageOption) {
    const {isBinOnly, isDebug, betaString, packagesPath} = options;
    return new Promise((resolve, reject) => {
        const params = [`--${platform}`];
        if (arch) {
            params.push(`--${arch === 'x32' ? 'ia32' : arch}`);
        }
        if (isBinOnly) {
            params.push('--dir');
        }

        const env = {
            ...process.env,
            SKIP_INSTALL_EXTENSIONS: isDebug ? '1' : '0',
            PKG_ARCH: arch.includes('arm') ? arch : (arch.includes('32') ? '32' : '64'),
            PKG_BETA: betaString ? `-${betaString}` : '',
            PKG_DEBUG: isDebug ? '.debug' : '',
            PKG_VER: config.displayVersion,
            MAC_CHIP: platform === 'mac' ? (arch === 'arm64' ? '.m1' : '.intel') : '',
            MAC_CHIP_SHORT: platform === 'mac' && arch === 'arm64' ? '.m1' : '',
        };

        const electronBuilderProcess = spawn('electron-builder', params, {
            shell: true,
            env,
        });
        let electronBuilderLog = '';
        electronBuilderProcess.stdout.on('data', (data) => {
            electronBuilderLog += data.toString();
        });
        electronBuilderProcess.on('close', async code => {
            if (config.buildZip && !isBinOnly) {
                const zipDir = path.join(packagesPath, platform === 'mac' ? 'mac' : (arch.includes('32') ? `${platform}-ia32-unpacked` : `${platform}-unpacked`));
                const zipFileNameFormat = config[`${platform}ZipArtifactName`] || ARTIFACT_NAMES[`${platform}Zip`];
                // biome-ignore lint/style/useSingleVarDeclarator: <explanation>
                const {name} = config, os = platform, ext = 'zip';
                // biome-ignore lint/security/noGlobalEval: <explanation>
                const zipFileName = eval(`\`${zipFileNameFormat}\``);
                const zipFile = path.join(packagesPath, zipFileName);
                await createZipFromDir(zipFile, zipDir, (config.zipSubDir && platform !== 'mac') ? (typeof config.zipSubDir === 'string' ? config.zipSubDir : config.name) : false);
                console.log(`    ${chalk.green(chalk.bold('✓'))} 创建压缩包 ${chalk.underline(path.relative(appRootPath, zipFile))}`);
            }
            console.log(electronBuilderLog.split(EOL).map(line => `    ${line}`).join(EOL));
            resolve(code);
        });
        electronBuilderProcess.on('error', spawnError => reject(spawnError));
    });
}

type BuildBrowserOptions = {
    destRoot: string;
    betaString: string;
    isFullDebug: boolean;
    isVerbose: boolean;
    isDebug: boolean;
}

// 制作浏览器端安装包
async function buildBrowser(config: PackageConfig, hooksPath: string, options: BuildBrowserOptions) {
    const {isDebug, isFullDebug, isVerbose, destRoot, betaString} = options;
    await buildApp(config, hooksPath, {isBrowser: true, isDebug, isFullDebug, isVerbose});

    const copyDist = () => copyFiles('./app/web-dist/**/*', `${destRoot}/dist`);
    const copyMedia = () => copyFiles('./app/media/**/*', `${destRoot}/media`);
    const copyAssets = () => copyFiles('./app/assets/**/*', `${destRoot}/assets`);
    const copyPkg = () => copyFiles('./app/package.json', destRoot);
    const copyIndexHTML = () => copyFiles('./app/index.html', destRoot);
    const copyManifest = () => copyFiles('./app/manifest.json', destRoot);
    const copyResources = () => copyFiles('./resources/**/*', `${destRoot}/resources`);
    const copyLang = () => copyFiles('./app/lang/**/*', `${destRoot}/lang`);
    const copyNodeModules = () => copyFiles('./app/node_modules/**/*', `${destRoot}/node_modules`);

    await Promise.all([
        copyDist(),
        copyMedia(),
        copyAssets(),
        copyPkg(),
        copyIndexHTML(),
        copyManifest(),
        copyResources(),
        copyLang(),
        copyNodeModules()
    ]);

    const copyCustomFiles = [];
    if (config.resourcePath) {
        const customResourcePath = path.resolve(config.dir, config.resourcePath);
        copyCustomFiles.push(() => copyFiles(`${customResourcePath}/**/*`, `${destRoot}/resources`));
    }
    if (config.langPath) {
        const customLangPath = path.resolve(config.dir, config.langPath);
        copyCustomFiles.push(() => copyFiles(`${customLangPath}/**/*`, `${destRoot}/lang`));
    }
    if (config.mediaPath && config.mediaPath !== 'media/') {
        const customMediaPath = path.resolve(config.dir, config.mediaPath);
        copyCustomFiles.push(() => copyFiles(`${customMediaPath}/**/*`, `${destRoot}/media`));
    }
    if (copyCustomFiles.length) {
        await Promise.all(copyCustomFiles.map(x => x()));
    }

    // 创建 zip
    const zipFile = path.resolve(destRoot, '../', `${config.name}.${config.displayVersion}${betaString ? `-${betaString}` : ''}.${isDebug ? 'debug.' : ''}browser.zip`);
    await createZipFromDir(zipFile, destRoot, config.zipSubDir ? `${config.name}-browser` : false);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 创建压缩包 ${chalk.underline(zipFile)}`);
}

async function processCustomMedia(customMediaPath: string) {
    console.log(`${chalk.cyanBright(chalk.bold('❖ 处理自定义媒体文件:'))}\n`);
    const mediaBuildPath = path.resolve(__dirname, '../app/media-build');

    await fse.emptyDir(mediaBuildPath);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 清空 ${chalk.underline(mediaBuildPath)}`);

    await fse.copy(path.resolve(__dirname, '../app/media'), mediaBuildPath);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 复制 ${chalk.underline(path.resolve(__dirname, '../app/media'))} → ${chalk.underline(mediaBuildPath)}`);

    await fse.copy(customMediaPath, mediaBuildPath);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 复制 ${chalk.underline(customMediaPath)} → ${chalk.underline(mediaBuildPath)}`);

    console.log();
}

type BuildOptions = {
    isVerbose: boolean;
    isClean: boolean;
    isDebug: boolean;
    isFullDebug: boolean;
    isBinOnly: boolean;
    betaString: string;
    platforms: Platform[];
    archs: Arch[];
    packagesPath: string;
}

// 执行打包
export async function build(config: PackageConfig, hooksPath: string, options: BuildOptions, callback?: () => void) {
    const {platforms, archs, packagesPath, isVerbose, isClean, isDebug, isBinOnly, betaString, isFullDebug} = options;
    if (config.copyOriginMedia && config.mediaPath !== 'media/') {
        const customMediaPath = path.resolve(config.dir, config.mediaPath);
        await processCustomMedia(customMediaPath);
    }

    let packageNum = 1;
    let packedNum = 0;
    const needPackageBrowser = platforms.includes('browser');
    const onlyPackageBrowser = needPackageBrowser && platforms.length === 1;

    console.log(`${chalk.cyanBright(chalk.bold('❖ 制作安装包:'))}\n`);

    if (isClean) {
        fse.emptyDirSync(packagesPath);
        console.log(`    ${chalk.green(chalk.bold('✓'))} 已清空目录安装包存储目录 ${chalk.underline(packagesPath)}\n`);
    }

    if (needPackageBrowser) {
        console.log(`${chalk.yellow(chalk.bold(`    [${packageNum++}.正在制作浏览器端部署包]`))}`);
        printEstimateInfo('package-browser');
        console.log();
        await buildBrowser(config, hooksPath, {
            destRoot: path.join(packagesPath, 'browser'),
            betaString,
            isDebug,
            isFullDebug,
            isVerbose
        });
        console.log(`    ${chalk.green(chalk.bold('✓'))} 已完成浏览器部署包\n`);
        printConsumeInfo('package-browser');

        packedNum++;
    }

    if (!onlyPackageBrowser) {
        await buildApp(config, hooksPath, {
            isDebug, isFullDebug, isVerbose
        });

        for (const platform of platforms) {
            if (platform === 'browser') {
                continue;
            }

            for (const arch of archs) {
                console.log(`${chalk.yellow(chalk.bold(`    [${packageNum}.正在制作安装包，平台 ${platform}，架构 ${arch}]`))}`);

                packageNum++;
                if ((platform === 'mac' && arch === 'x32') || (arch === 'arm64' && !(platform === 'linux' || platform === 'mac'))) {
                    console.log(`    ${chalk.red(chalk.bold('𐄂'))} 不支持制作此平台安装包： ${platform}-${arch}\n`);
                    continue;
                }


                await copyBinFiles(platform, arch);

                printEstimateInfo(`package-${platform}-${arch}`);

                if (isVerbose) {
                    console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
                }

                await createPackage(config, platform, arch, {isBinOnly, isDebug, isVerbose, betaString, packagesPath});

                if (isVerbose) {
                    console.log(chalk.yellow('══════════════════════════════════════════════════════════════'));
                }
                console.log(`    ${chalk.green(chalk.bold('✓'))} 已完成 ${chalk.bold(platform)}-${chalk.bold(arch)}\n`);
                printConsumeInfo(`package-${platform}-${arch}`);
                console.log();

                packedNum++;
            }
        }
    }

    console.log(chalk.green(`    ${chalk.bold('✓')} 共计 ${packedNum} 个平台的安装包制作完成，安装包已存放在如下位置：`));
    console.log(`      ${chalk.bold('→')} ${chalk.underline(chalk.bold(packagesPath))}`);

    if (callback) {
        callback();
    }
}
