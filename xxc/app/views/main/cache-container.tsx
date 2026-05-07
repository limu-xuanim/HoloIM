import ROUTES from '../common/routes';
import ChatsIndex from '../chats';
import ContactsIndex from '../contacts';

/**
 * 主界面视图路由清单
 */
const mainViews = [
    {active: false, path: ROUTES.chats._, view: ChatsIndex},
    {active: false, path: ROUTES.contacts._, view: ContactsIndex},
];

type CacheContainerProps = import('react-router-dom').RouteComponentProps<{
    app: string;
    filterType?: string;
    id?: string;
    params?: string;
}>;
/**
 * CacheContainer 组件 ，显示主界面视图缓存容器界面
 * @param props React 组件属性对象
 * @returns JSX.Element
 */
export default function CacheContainer(props: CacheContainerProps) {
    const {match} = props;

    return (
        <div className="app-main-container user-app-no-dragable dock">
            {
                mainViews.map(item => {
                    const isMatch = match.url.startsWith(item.path);
                    if (isMatch) {
                        item.active = true;
                        return <item.view className="app-container" key={item.path} match={match} />;
                    }
                    if (item.active) {
                        return <item.view className="app-container" key={item.path} match={match} hidden />;
                    }
                    return null;
                })
            }
        </div>
    );
}

export type CacheContainerItemProps = {match: CacheContainerProps['match'];}
    & Partial<{className: string; hidden: boolean;}>
