import {createContext, useEffect, useState} from 'react';
import {Route, Redirect} from 'react-router-dom';
import useForceUpdate from '~/app/components/hooks/use-force-update';
import {classes} from '~/app/utils/html-helper';
import ROUTES from '../common/routes';
import {onUserConfigChange} from '~/app/core/profile/user';
import Navbar from './navbar';
import CacheContainer from './cache-container';
import {onLangChange} from '~/app/core/lang';
import '~/tailwind.css';
import {createRoutePath, getRoutePathArray} from '~/app/core/ui/router';
import useRoutePath from '../common/use-route-path';

/**
 * 获取导航上当前激活的菜单 ID
 * @param path 路由路径
 * @returns 菜单 ID
 */
function getNavbarActiveID(path: string): string {
    const routePath = createRoutePath(path);
    const routeArray = getRoutePathArray(routePath);
    const [app] = routeArray;

    return app;
}

export const NavbarActiveIDContext = createContext({
    originNavbarActiveID: '',
    finalNavbarActiveID: '',
    setFinalNavbarActiveID: (val: string) => {console.log(val);},
});

type MainIndexProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Index 组件 ，显示主界面
 */
export default function MainIndex(props: MainIndexProps) {
    const {className, ...other} = props;
    const {forceUpdate} = useForceUpdate();
    const {current} = useRoutePath();
    const [originNavbarActiveID, setOriginNavbarActiveID] = useState(getNavbarActiveID(current));
    const [finalNavbarActiveID, setFinalNavbarActiveID] = useState(originNavbarActiveID);

    useEffect(() => {
        const activeID = getNavbarActiveID(current);
        setOriginNavbarActiveID(activeID);
        setFinalNavbarActiveID(activeID);
    }, [current]);

    useEffect(() => {
        const userConfigChangeSubscription = onUserConfigChange(() => {
            forceUpdate();
        });
        const langUnsub = onLangChange(() => {
            forceUpdate();
        });

        return () => {
            userConfigChangeSubscription.unsubscribe();
            langUnsub();
        };
    }, [forceUpdate]);

    return (
        <div className={classes('app-main', className)} {...other}>
            <NavbarActiveIDContext.Provider value={{originNavbarActiveID, finalNavbarActiveID, setFinalNavbarActiveID}}>
                <Navbar />
                <Route path="/" exact render={() => <Redirect to="/chats" />} />
                <Route path="/index" exact render={() => <Redirect to="/chats" />} />
                <Route path={ROUTES.apps.__} exact component={CacheContainer} />
            </NavbarActiveIDContext.Provider>
        </div>
    );
}
