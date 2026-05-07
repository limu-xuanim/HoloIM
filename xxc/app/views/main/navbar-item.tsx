import {memo, useCallback} from 'react';
import {classes} from '~/app/utils/html-helper';
import Avatar from '~/app/components/avatar';
import {useHistory} from 'react-router-dom';

export type NavbarItemProps = {
    id: string;
    icon: string;
    label: string;
    onClick: (() => void) | (() => string);
    active: boolean;
    app: string;
    menu: string;
} & Partial<{
    className: string;
    noticeCount: number;
}>;

/**
 * 导航菜单项
 * @param props React 组件属性对象
 * @param props.id 菜单 ID
 * @param props.icon 菜单图标
 * @param props.label 菜单名称
 * @param props.className 类名
 * @param props.active 是否激活
 * @param props.noticeCount 通知标记数目
 * @param props.onClick 点击时的回调函数
 * @param props.children 子节点内容
 * @returns React Node content
 */
function NavbarItem(props: NavbarItemProps) {
    const {
        id,
        label,
        icon,
        className,
        active = false,
        noticeCount,
        onClick,
        app,
        menu,
    } = props;

    const history = useHistory();

    const handleClick = useCallback(() => {
        const url = onClick();
        if (url) {
            history.push(url);
        }
    }, [history.push, onClick]);

    return (
        <a
            data-id={id}
            data-app={app}
            data-menu={menu}
            className={classes('nav-item hint--right', className, {active})}
            data-hint={label}
            onClick={handleClick}
            draggable={false}
        >
            {Boolean(icon) && <Avatar size={30} auto={icon} />}
            {typeof noticeCount === 'number' && <div className={classes('label label-sm dock-right dock-top -rounded-full red badge fade zoom', {in: !!noticeCount})}>{noticeCount}</div>}
        </a>
    );
}

export default memo(NavbarItem);
