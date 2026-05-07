// TODO 检查 promise 造成的影响

/** 保存所有注册的全局快捷键 */
const shortcuts = new Map<string, Electron.Accelerator>();

/**
 * 取消注册全局快捷键
 * @param name 要取消的快捷键名称
 */
const unregisterGlobalShortcut = async (name: string) => {
    const accelerator = shortcuts.get(name);
    if (accelerator) {
        try {
            await window.electronAPI.globalShortcutUnregister(name, accelerator);
        } catch (err) {
            if (DEBUG) {
                console.warn('Unregister shortcut error:', name, err);
            }
        }
        shortcuts.delete(name);
        if (DEBUG) {
            console.color(`GLOBAL HOTKEY REMOVE ${name}: ${accelerator}`, 'purpleOutline');
        }
    }
};

/**
 * 注册全局快捷键
 * @param name 快捷键名称
 * @param accelerator 快捷键组合
 * @param callback 快捷键被激活时的回调函数
 */
const registerGlobalShortcut = async (name: string, accelerator: Electron.Accelerator, callback: () => void) => {
    await unregisterGlobalShortcut(name);
    if (accelerator) {
        shortcuts.set(name, accelerator);
        try {
            await window.electronAPI.globalShortcutRegister(name, accelerator, () => {
                if (DEBUG) {
                    console.color(`GLOBAL KEY ACTIVE ${name}: ${accelerator}`, 'redOutline');
                }
                callback();
            });
        } catch (err) {
            if (DEBUG) {
                console.warn('Register shortcut error:', name, accelerator, err);
            }
        }
        if (DEBUG) {
            console.color(`GLOBAL HOTKEY BIND ${name}: ${accelerator}`, 'purpleOutline');
        }
    } else if (DEBUG) {
        console.color(`GLOBAL HOTKEY BIND ${name}: error`, 'purpleOutline', 'Cannot bind empty accelerator', 'red');
    }
};

/**
 * 检查全局快捷键是否被注册
 * @param accelerator 快捷键组合
 * @returns 如果返回 `true` 则为被注册，否则为没有被注册
 */
const isGlobalShortcutRegistered = window.electronAPI.globalShortcutIsRegistered;

export default {
    unregisterAll: window.electronAPI.globalShortcutUnregisterAll,
    unregisterGlobalShortcut,
    registerGlobalShortcut,
    isGlobalShortcutRegistered
};
