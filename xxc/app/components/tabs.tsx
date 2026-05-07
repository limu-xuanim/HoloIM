import {useState} from 'react';
import {classes} from '../utils/html-helper';
import TabPane from './tab-pane';

type TabsProps = React.HTMLAttributes<HTMLDivElement>
    &Partial<{
        navClassName: string;
        activeClassName: string;
        tabPaneClass: string;
        contentClassName: string;
        className: string;
        children: JSX.Element|JSX.Element[];
        cache: boolean;
        defaultActivePaneKey: React.Key;
        activePaneKey: React.Key;
        onPaneChange: (key: React.Key, oldKey: React.Key) => void;
    }>;

/**
 * Tabs 组件 ，显示一个标签页控件
 */
export default function Tabs(props: TabsProps) {
    let {
        defaultActivePaneKey,
        activePaneKey: userActivePaneKey,
        cache = false,
        navClassName = '',
        tabPaneClass = '',
        activeClassName = 'active',
        contentClassName = 'active',
        onPaneChange,
        className = '',
        children = [],
        ...other
    } = props;

    const [activePaneKey, setActivePaneKey] = useState(userActivePaneKey || defaultActivePaneKey);

    /**
     * 处理导航变更事件
     * @param key 变更后的当前标签页 Key 值
     */
    const handleNavClick = (key: React.Key) => {
        if (key !== activePaneKey) {
            const oldKey = activePaneKey;
            setActivePaneKey(key);
            onPaneChange?.(key, oldKey);
        }
    };

    const activeKey = userActivePaneKey || activePaneKey;
    if (!Array.isArray(children)) {
        children = [children];
    }
    children = children.filter(x => x && typeof x === 'object');

    return (
        <div className={classes('tabs', className, `tabs-active-${activeKey}`)} {...other}>
            <nav className={classes('nav', navClassName)}>
                {
                    children.map(item => (
                        <a
                            key={item.key}
                            className={item.key === activeKey ? activeClassName : ''}
                            onClick={() => handleNavClick(item.key)}
                        >
                            {item.props.label}
                        </a>
                    ))
                }
            </nav>
            <div className={classes('content', contentClassName)}>
                {
                    children.map(item => {
                        if (item.key === activeKey) {
                            return <div key={item.key} className={classes('tab-pane active', tabPaneClass)}>{item}</div>;
                        }
                        if (cache) {
                            return <div key={item.key} className={classes('tab-pane hidden', tabPaneClass)}>{item}</div>;
                        }
                        return null;
                    })
                }
            </div>
        </div>
    );
}

export {TabPane, Tabs};
