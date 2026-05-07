import type {IpcRendererEvent} from 'electron';
import type {Language} from '~/app/constants';
import {useEffect, useMemo, useState} from 'react';
import {Lang} from '~/app/entries/vars/Lang';
import {EVENT_APP_LANG_CHANGE} from '~/app/platform/electron/remote-events';
import {getPlatformType} from '~/app/core/ui/browser-window';
import {onLangChange} from '~/app/core/lang';

/**
 * 语言 Hook
 * @returns 语言管理对象和语言名称
 */
export default function useLang() {
    const [langName, setLangName] = useState(Lang.name);
    const isElectron = getPlatformType() === 'electron';

    useEffect(() => {
        // 浏览器端通过 jotai 订阅语言变更事件
        const unsubscribe = onLangChange((lang) => {
            setLangName(lang.name);
        });

        if (!isElectron) {
            return () => {
                unsubscribe?.();
            };
        }

        const listener = (_: IpcRendererEvent, name: ValueOf<typeof Language>) => {
            setLangName(name);
        };
        window.electronAPI.ipcRenderer.on[EVENT_APP_LANG_CHANGE](listener);

        return () => {
            window.electronAPI.ipcRendererOff(EVENT_APP_LANG_CHANGE, listener);
            unsubscribe?.();
        };
    }, [isElectron]);

    return useMemo(() => [Lang, langName] as const, [langName])
}
