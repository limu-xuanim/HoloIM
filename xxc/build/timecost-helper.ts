import chalk from 'chalk';
import path from 'node:path';
import fse from '../nodejs/fs-helper';
import {formatDate, formatTime} from '../app/utils/date-helper';
import type {Arch, Platform} from './platform-helper';

type PackageType = keyof TimeCostMap;

type TimeCostMap = {
    'webpack-electron': number;
    'webpack-browser': number;
    'package-browser': number;
    'package-mac-x64': number;
    'package-mac-x32': number;
    'package-mac-arm64': number;
    'package-win-x64': number;
    'package-win-x32': number;
    'package-win-arm64': number;
    'package-linux-x64': number;
    'package-linux-x32': number;
    'package-linux-arm64': number;
    'package-prepare'?: number;
    'package-prepare-fast'?: number;
};

let firstTime = true;

/**
 * 操作消耗时间表
 */
const timeCostMap: TimeCostMap & Partial<Record<`${PackageType}-begin`, number>> = {
    'webpack-electron': 69930,
    'webpack-browser': 52164,
    'package-browser': 57402,
    'package-mac-x64': 246675,
    'package-mac-x32': 0,
    'package-mac-arm64': 0,
    'package-win-x64': 46301,
    'package-win-x32': 40683,
    'package-win-arm64': 0,
    'package-linux-x64': 268699,
    'package-linux-x32': 287033,
    'package-linux-arm64': 0,
};

/**
 * 获取操作消耗时间
 */
function getTimeCost(): typeof timeCostMap;

function getTimeCost(operation: PackageType): number;

function getTimeCost(operation?: PackageType) {
    if (firstTime) {
        Object.assign(timeCostMap, fse.readJSONSync(path.resolve(__dirname, './build-time-cost.json'), {throws: false}));
        firstTime = false;
    }
    return operation ? timeCostMap[operation] : timeCostMap;
}

// 获取操作消耗时间文本
function getTimeCostText(operation: PackageType) {
    const costTime = getTimeCost(operation);
    if (costTime) {
        return formatTime(costTime);
    }
    return '';
}

// 保存操作消耗时间
export function saveTimeCostMap() {
    fse.outputJSONSync(path.resolve(__dirname, './build-time-cost.json'), timeCostMap, 4);
    console.log(`    ${chalk.green(chalk.bold('✓'))} 保存构建缓存文件 ${chalk.underline('./build-time-cost.json')}`);
}

// 开始记录操作消耗时间
function startRecordCostTime(operation: PackageType) {
    const costMap = getTimeCost();
    costMap[`${operation}-begin`] = Date.now();
}

// 停止记录操作消耗时间
function finishRecordCostTime(operation: PackageType) {
    const costMap = getTimeCost();
    const begin = costMap[`${operation}-begin`];
    if (!begin) {
        return;
    }
    const end = Date.now();
    delete costMap[`${operation}-begin`];
    const cost = end - begin;
    costMap[operation] = cost;
    return cost;
}

// 输出预计耗时信息
export function printEstimateInfo(operation: PackageType) {
    const costTimeText = getTimeCostText(operation);
    if (costTimeText) {
        console.log(`    ${chalk.bold(chalk.magentaBright('♥︎'))} 请耐心等待，预计操作耗时 ${chalk.bold(chalk.red(costTimeText))}...${chalk.grey(`(${formatDate(new Date())} ${operation})`)}`);
    } else {
        console.log(`    ${chalk.bold(chalk.magentaBright('♥︎'))} 请耐心等待，这可能需要花费几分钟时间...${chalk.grey(`(${formatDate(new Date())} ${operation})`)}`);
    }
    startRecordCostTime(operation);
}

// 输出实际耗时信息
export function printConsumeInfo(operation: PackageType) {
    const estimateCostTimeText = getTimeCostText(operation);
    const costTime = finishRecordCostTime(operation);
    if (costTime) {
        const costTimeText = getTimeCostText(operation);
        if (estimateCostTimeText) {
            console.log(`    ${chalk.bold(chalk.magentaBright('⇒'))} 操作实际耗时 ${chalk.bold(chalk.red(costTimeText))}，预计耗时 ${chalk.bold(estimateCostTimeText)}${chalk.grey(`(${formatDate(new Date())} ${operation})`)}`);
        } else {
            console.log(`    ${chalk.bold(chalk.magentaBright('⇒'))} 操作实际耗时 ${chalk.bold(chalk.red(costTimeText))}${chalk.grey(`(${formatDate(new Date())} ${operation})`)}`);
        }
    }
}

export function printEstimateSummary(platforms: Platform[], archs: Arch[], isSkipBuild: boolean) {
    let costTime = 1000;
    if (isSkipBuild) {
        return costTime;
    }

    const needPackageBrowser = platforms.includes('browser');
    const onlyPackageBrowser = needPackageBrowser && platforms.length === 1;
    if (needPackageBrowser) {
        costTime += getTimeCost('package-browser');
    }
    if (!onlyPackageBrowser) {
        costTime += getTimeCost('webpack-electron');
        for (const platform of platforms) {
            if (platform === 'browser') {
                continue;
            }

            for (const arch of archs) {
                costTime += getTimeCost(`package-${platform}-${arch}`);
            }
        }
    }
    console.log(`    ${chalk.bold(chalk.magentaBright('♥︎'))} 预计完成所有操作耗时 ${chalk.bold(chalk.red(formatTime(costTime)))}...\n`);
    return costTime;
}
