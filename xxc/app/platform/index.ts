import Platform from 'Platform';
import {updateConfig} from '../config';

import type {ElectronPlatform} from './electron';
import type {BrowserPlatform} from './browser';
import type {Config} from '../config';
import {PlatformType} from '../constants';

/**
 * 平台模块访问类
 */
export class PlatformModule {
    /** 平台模块对象 */
    #module: ElectronPlatform|BrowserPlatform;

    /**
     * 创建一个平台访问类实例
     * @param module 平台模块对象
     */
    constructor(module: ElectronPlatform|BrowserPlatform) {
        this.#module = module;
    }

    /** 获取平台功能访问对象 */
    get modules() {
        return this.#module;
    }

    /** 获取平台类型名称 */
    get type() {
        return this.#module.type;
    }

    /** 获取平台显示名称 */
    get displayName() {
        return this.#module.displayName;
    }

    /** 获取平台环境变量对象 */
    get env() {
        return this.#module.env;
    }

    /**
     * 当前平台是否为浏览器
     */
    get isBrowser() {
        return this.type === PlatformType.browser;
    }

    /**
     * 当前平台是否为 Electron
     */
    get isElectron() {
        return this.type === PlatformType.electron;
    }

    /**
     * 使用名称路径调用平台模块方法或者获取属性
     * @param nameArr 名称路径，使用 '.' 拼接或者使用字符串数组
     * @param params 调用方法时用到的参数表
     * @returns 返回所调用的方法执行结果
     */
    call = <T = any>(nameArr: string|string[], ...params: any[]): T => {
        const module = this.access(nameArr);
        if (typeof module === 'function') {
            return module(...params);
        }
        return module;
    };

    /**
     * 根据名称路径获取模块内属性值
     * @param nameArr 名称数组
     */
    access = <T = any>(nameArr: string|string[]): T => {
        if (typeof nameArr === 'string') {
            nameArr = nameArr.split('.');
        }
        let module: any = this.#module;
        for (const name of nameArr) {
            module = module[name];
            if (module === null || typeof module !== 'object') {
                break;
            }
        }
        return module;
    };

    /**
     * 判断平台模块中是否拥有指定的方法或属性定义
     * @param nameArr 名称数组
     * @returns 如果返回 `true` 则为拥有指定的方法或属性定义，否则为没有有指定的方法或属性定义
     */
    has = (nameArr: string|string[]): boolean => this.access(nameArr) !== undefined;

    /**
     * 初始化平台模块对象
     * @param config 运行时配置对象
     */
    init(config: Config) {
        this.call<void>('init', config);
    }
}

/** 平台模块对象访问对象 */
const platform = new PlatformModule(Platform);

/**
 * 根据名称路径获取模块内属性值
 * @param nameArr 名称数组
 * @returns 属性值
 */
export const platformAccess = platform.access;

/**
 * 使用名称路径调用平台模块方法或者获取属性
 * @param nameArr 名称路径，使用 '.' 拼接或者使用字符串数组
 * @param params 调用方法时用到的参数表
 * @returns 返回所调用的方法执行结果
 */
export const platformCall = platform.call;

/**
 * 判断平台模块中是否拥有指定的方法或属性定义
 * @param nameArr 名称数组
 * @returns 如果返回 `true` 则为拥有指定的方法或属性定义，否则为没有有指定的方法或属性定义
 */
export const platformHas = platform.has;

// 内置的运行时配置
const buildInConfig = platform.call('buildIn.getBuildInConfig');

// 更新扩展的运行时配置
if (buildInConfig) {
    // 进制通过内置的运行时配置更新权限清单
    if (buildInConfig.system) {
        delete buildInConfig.system.permissions;
    }
    updateConfig(buildInConfig);
}

if (DEBUG) {
    global.$platform = platform;
}

export default platform;
