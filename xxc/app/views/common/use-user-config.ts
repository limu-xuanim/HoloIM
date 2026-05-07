import {useState, useEffect} from 'react';
import type {AllUserConfig} from '~/app/core/profile/user-config';
import {onUserConfigChange} from '~/app/entries/vars/onUserConfigChange';
import {ProfileModule} from '~/app/entries/vars/ProfileModule';

const {getAllUserConfig, getUserConfig} = ProfileModule;

export function useAllUserConfig() {
    const [config, setConfig] = useState([getAllUserConfig()]);
    useEffect(() => {
        setConfig([getAllUserConfig()]);
        const subscription = onUserConfigChange(() => {
            setConfig([getAllUserConfig()])
        });
        return () => subscription.unsubscribe();
    }, []);
    return config[0];
}

/**
 * 用户配置 Hook
 * @param dependencyConfigName 依赖的配置名称
 * @returns 用户配置对象或配置的值
 */
export function useUserConfig<K extends keyof AllUserConfig>(dependencyConfigName: K): AllUserConfig[K] {
    const [configKeeper, setConfigKeeper] = useState(() => [getUserConfig(dependencyConfigName)]);

    useEffect(() => {
        setConfigKeeper([getUserConfig(dependencyConfigName)]);
        const subscription = onUserConfigChange(([changes]) => {
            if (dependencyConfigName && changes[dependencyConfigName] !== undefined) {
                setConfigKeeper([getUserConfig(dependencyConfigName)]);
            }
        });
        return () => subscription.unsubscribe();
    }, [dependencyConfigName]);

    return configKeeper[0];
}

export default useUserConfig;
