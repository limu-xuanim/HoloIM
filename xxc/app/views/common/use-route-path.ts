import {useState, useEffect} from 'react';
import {getRoutePath, onRoutePathChange} from '../../core/ui/router';

/**
 * 路由信息 Hook
 * @returns 路由信息
 */
export default function useRoutePath() {
    const [routeInfo, setRouteInfo] = useState({current: getRoutePath(), previous: null as (string | null)});

    useEffect(() => {
        const subscription = onRoutePathChange((current, previous) => setRouteInfo({current, previous}));
        return () => subscription.unsubscribe();
    }, []);

    return routeInfo;
}
