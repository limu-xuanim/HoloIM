import path from 'node:path';
import chalk from 'chalk';
import program from 'commander';
import fse from '../nodejs/fs-helper';
import {formatTime} from '~/app/utils/date-helper';
import pkg from '../package.json';
import {formatPlatforms, formatArchs} from './platform-helper';
import {saveTimeCostMap, printEstimateSummary} from './timecost-helper';
import {cleanTmpFiles, outputConfigFiles} from './fs-helper';
import {build} from './builder-helper';
import {getConfig} from './config-helper';
import {getElectronBuilderConfig} from './electron-builder-helper';

// 从环境变量获取部分参数（为了处理多层的 npm script 调用）
const {argv, env} = process;
const {x_build_config: envConfig, x_hooks: envHooks} = env;
if (envConfig && !argv.some(arg => arg.startsWith('--config'))) {
    argv.push(`--config=${envConfig}`);
}
if (envHooks && !argv.some(arg => arg.startsWith('--hooks'))) {
    argv.push(`--hooks=${envHooks}`);
}

// 处理命令行参数
program
    .version(pkg.version)
    .alias('npm run package --')
    .description(`${pkg.productName || pkg.name}的打包工具`)
    .option('-c, --config <config>', '打包配置名称或者指定打包配置文件所在路径', (val, defaultValue) => {
        if (!val) {
            const defaultConfig = fse.readJsonSync(path.resolve(__dirname, './build-config.default.json'), {throws: false});
            console.log(defaultConfig);
            return defaultConfig?.name ?? defaultValue;
        }
        return val;
    }, '')
    .option('-s, --skipbuild', '是否忽略构建最终安装包，仅仅生成用于构建所需的配置文件', false)
    .option('-p, --platform <platform>', '需要打包的平台，可选值包括: "mac", "win", "linux", "browser", "current", 或者使用英文逗号拼接多个平台名称，例如 "win,mac", 特殊值 "current" 用于指定当前打包工具所运行的平台, 特殊值 "all" 或 "*" 用于指定所有平台（相当于 “mac,win,linux,browser”）', formatPlatforms, 'current')
    .option('-a, --arch <arch>', '需要打包的平台处理器架构类型, 可选值包括: "x32", "x64", "arm64", 或者使用英文逗号拼接多个架构名称，例如 "x32,x64", 特殊值 "current" 用于快捷指定当前打包工具所运行的平台架构类型, 特殊值 "all" 或 "*" 用于指定所有架构类型（相当于 “x32,x64,arm64”）', formatArchs, 'current')
    .option('-d, --debug [debug]', '是否打包为方便调试的版本', false)
    .option('-b, --beta [beta]', '是否将版本标记为 Beta 版本', false)
    .option('-v, --verbose', '是否输出额外的信息', false)
    .option('-C, --clean', '存储安装包之前是否清空旧的安装包文件', false)
    .option('-S, --special <special>', '特定版本信息', '')
    .option('-H, --hooks <hooks>', '是否使用 客户端 Hooks-loader', '')
    .option('-M, --msi', '是否为 Windows 打包 msi 安装包', false)
    .option('--appimage', '是否为 Linux 打包 AppImage', false)
    .option('--binonly', '是否忽略最终压缩和打包，仅构建可执行文件', false)
    .parse(argv);

console.log(chalk.magentaBright(`${chalk.bold(`───────────────┤ ${pkg.name.toUpperCase()} ${pkg.version}`)} 打包工具 ├───────────────`));

const configName: string = program.config || 'default';
const platforms = formatPlatforms(program.platform);
const archs = formatArchs(program.arch);
const isDebug: boolean = program.debug;
const isFullDebug = program.debug === 'full';
const isBeta = !!program.beta;
const isVerbose: boolean = program.verbose;
const isSkipBuild: boolean = program.skipbuild;
const isClean: boolean = program.clean;
const specialVersion: string = program.special;
const hooksPath: string = program.hooks?.replace(/[<>"|?*]/g, '');
const isBuildWinMsi: boolean = program.msi;
const isBuildAppImage: boolean = program.appimage;
const isBinOnly: boolean = program.binonly;

const betaString = (isBeta && !pkg.version.includes('beta') && !pkg.version.includes('alpha'))
    ? (typeof program.beta === 'string' ? program.beta : 'beta')
    : '';

const config = getConfig(configName, {isDebug, specialVersion, betaString});

// 输出配置选项
console.log(`
${chalk.cyanBright(chalk.bold('❖ 工具选项:'))}
    config:     ${chalk.bold(configName)}
    platform:   ${chalk.bold(platforms)}
    archs:      ${chalk.bold(archs)}
    debug:      ${isDebug ? (isFullDebug ? chalk.bold.red('full') : chalk.bold('✓')) : chalk.gray('✗')}
    beta:       ${isBeta ? chalk.bold('✓') : chalk.gray('✗')}
    skipBuild:  ${isSkipBuild ? chalk.bold('✓') : chalk.gray('✗')}
    clean:      ${isClean ? chalk.bold('✓') : chalk.gray('✗')}
    verbose:    ${isVerbose ? chalk.bold('✓') : chalk.gray('✗')}
    hooks:      ${hooksPath ? chalk.gray(hooksPath) : chalk.gray('✗')}
    ${chalk.gray('(提示：使用 "-h" 或者 "--help" 命令行选项来查看所有可用命令行配置项)')}
`);

// 输出打包配置
console.log(`${chalk.cyanBright(chalk.bold('❖ 打包配置:'))}\n`);
for (const [key, value] of Object.entries(config)) {
    console.log(`    ${key}:`.padEnd(26) + (value ? (typeof value === 'string' ? value : JSON.stringify(value)) : '[DEFAULT]'));
}
console.log();

const electronBuilderConfig = getElectronBuilderConfig(config, {
    isBuildWinMsi,
    isBuildAppImage,
    isDebug,
    isFullDebug,
    betaString
});

// 安装包输出目录
const packagesPath = path.join(__dirname, '../', electronBuilderConfig.directories.output);

// 执行脚本任务
(async () => {
    const startTime = Date.now();
    const estimateTime = printEstimateSummary(platforms, archs, isSkipBuild);

    cleanTmpFiles();

    await outputConfigFiles(config, electronBuilderConfig, {isBeta, isSkipBuild, isDebug, isVerbose, betaString, hooksPath});

    if (!isSkipBuild) {
        await build(config, hooksPath, {
            isClean,
            isDebug,
            isVerbose,
            isBinOnly,
            betaString,
            isFullDebug,
            platforms,
            archs,
            packagesPath
        });
        cleanTmpFiles();
    }

    saveTimeCostMap();

    console.log(`    ${chalk.bold(chalk.magentaBright('⇒'))} 所有操作完成实际耗时 ${chalk.bold(chalk.red(formatTime(Date.now() - startTime)))}，预计耗时 ${chalk.bold(formatTime(estimateTime))}`);
})();
