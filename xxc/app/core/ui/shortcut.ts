import {getAllUserConfig} from '../profile';
import platform from '../../platform';
import {executeCommandLine} from '../commander';
import type {ElectronPlatform} from '~/app/platform/electron';

/**
 * 平台提供的快捷键功能访问对象
 */
const shortcut = platform.access<ElectronPlatform['shortcut']>('shortcut');

/**
 * 全局快捷键是否可用
 */
let isGlobalShortcutDisabled = false;

/**
 * 全局快捷键表
 */
let globalHotkeys: Record<string, string> = null;

/**
 * 注册全局快捷键
 */
export const registerShortcut = () => {
    if (!shortcut) {
        return;
    }
    const userConfig = getAllUserConfig();
    if (userConfig) {
        globalHotkeys = userConfig.globalHotkeys;
        for (const [key, value] of Object.entries(globalHotkeys)) {
            shortcut.registerGlobalShortcut(key, value, () => {
                if (!isGlobalShortcutDisabled) {
                    executeCommandLine(`shortcut.${key}`);
                } else if (DEBUG) {
                    console.log(`Global shortcut command '${key}' skipped.`);
                }
            });
        }
    }
};

/**
 * 取消注册全局快捷键
 */
export const unregisterGlobalShortcut = () => {
    if (!shortcut) {
        return;
    }
    if (globalHotkeys) {
        for (const name of Object.keys(globalHotkeys)) {
            shortcut.unregisterGlobalShortcut(name);
        }
        globalHotkeys = null;
    }
};

/**
 * 禁用全局快捷键
 * @param disabled 是否禁用全局快捷键，如果为 `false` 则为取消禁用，否则为禁用
 */
export const disableGlobalShortcut = (disabled = true) => {
    isGlobalShortcutDisabled = disabled;
    unregisterGlobalShortcut();
};

/**
 * 启用全局快捷键
 */
export const enableGlobalShortcut = () => {
    isGlobalShortcutDisabled = false;
    registerShortcut();
};

/**
 * 检查平台是否提供全局快捷键功能
 * @returns 如果为 `true`，则平台支持全局快捷键功能
 */
export const isGlobalShortcutAvailable = () => !!shortcut;
