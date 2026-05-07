import {useEffect, useRef} from 'react';
import {Route, type RouteComponentProps} from 'react-router-dom';
import {isUserVerified} from '~/app/core/profile';
import ROUTES from '../common/routes';
import ContactsHome from './contacts-home';
import type {CacheContainerItemProps} from '../main/cache-container';

type ContactsRouteComponentProps = RouteComponentProps<Partial<{
    objectType: string;
    filterType: string;
}>>;

/**
 * ContactsIndex 组件 ，显示喧喧通讯录入口界面
 */
export default function ContactsIndex(props: CacheContainerItemProps) {
    const filterTypesRef = useRef<Record<string, string>>({});
    const objectTypeRef = useRef('members');

    useEffect(() => {
        PERF_MARK('contactsViewRendered', 'switchToContactsBegin', 'contactsViewLoadTime');
    }, []);

    /**
     * 根据路由渲染内容
     * @param routeObject 路由匹配对象
     * @returns React 渲染内容
     */
    const renderFromRoute = ({match}: ContactsRouteComponentProps) => {
        // 确保 ContactsHome 的 objectType 和 filterType 有合适的值
        const objectType = match?.params.objectType || objectTypeRef.current;
        const filterType = match?.params.filterType
            || filterTypesRef.current[objectType]
            || (objectType === 'members' ? 'root' : 'joined');

        objectTypeRef.current = objectType;
        filterTypesRef.current[objectType] = filterType;

        return <ContactsHome objectType={objectType} filterType={filterType} {...props} />;
    };

    if (!isUserVerified()) {
        return null;
    }
    return <Route path={ROUTES.contacts.__}>{renderFromRoute}</Route>;
}
