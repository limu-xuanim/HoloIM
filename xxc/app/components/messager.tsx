import type {DisplayLayerProps} from '~/app/components/display-layer';
import Display from './display';
import {classes} from '../utils/html-helper';
import Icon from './icon';
import fuid from '../utils/fuid';

type MessagerAction = {
    name?: string;
    label?: string;
    url?: string;
    href?: string;
    icon?: string,
    click: (action: MessagerAction, e: React.MouseEvent<HTMLAnchorElement>) => boolean,
};

interface ShowMessagerProps extends Omit<DisplayLayerProps, 'onAction'> {
    type?: 'success' | 'danger' | 'info' | 'warning',
    autoHide?: number | boolean,
    closeButton?: boolean,
    actions?: Array<MessagerAction>,
    className?: string,
    position?: 'top' | 'right' | 'bottom' | 'left' | 'center',
    rootClassName?: string,
    icon?: string,
    onAction?: (action: MessagerAction, e: React.MouseEvent<HTMLAnchorElement>) => boolean,
    id?: string
}

/**
 * 显示浮动的提示消息
 * @param  message 消息内容
 * @param props DisplayLayer 组件属性
 * @param callback 操作完成时的回调函数
 * @returns DisplayLayer 组件
 */
export const showMessager = (message: string | JSX.Element, props: ShowMessagerProps = {}, callback:(...args:any) => void = null) => {
    let {
        type,
        content,
        autoHide,
        closeButton,
        actions,
        className,
        rootClassName,
        position,
        id,
    } = props;
    const {icon, onAction} = props;

    if (!id) {
        id = fuid();
    }

    if (closeButton === undefined) {
        closeButton = true;
    }

    if (position === undefined) {
        position = 'top';
    }

    if (!type) {
        type = 'info';
    }
    rootClassName = classes(rootClassName, `position-${position}`);
    className = classes('messager layer', className || '-rounded', type);

    content = (content || icon)
        ? (
            <div className="row single -items-center">
                {icon ? (typeof icon === 'string' ? <Icon className="-flex-auto messager-icon" name={icon} /> : <div className="-flex-none messager-icon">{icon}</div>) : null}
                {content ? (
                    <div className="-flex-auto messager-content">
                        <h5 className="messager-title">{message}</h5>
                        <div>{content}</div>
                    </div>
                ) : <div className="-flex-auto messager-content">{message}</div>}
            </div>
        )
        : message;

    if (!actions) {
        actions = [];
    }
    if (closeButton) {
        actions.push({
            icon: 'close',
            click: () => {
                Display.hide(id);
                return true;
            }
        });
    }
    let footer = null;
    if (actions && actions.length) {
        const handleActionClick = (action: MessagerAction, e: React.MouseEvent<HTMLAnchorElement>) => {
            let actionResult = null;
            if (onAction) {
                actionResult = onAction(action, e);
            }
            if (action.click) {
                actionResult = action.click(action, e);
            }
            if (actionResult !== false) {
                Display.hide(id);
            }
        };

        footer = (
            <nav className="nav">
                {
                    actions.map((action, actionIndex) => (<a href={action.href || action.url} onClick={handleActionClick.bind(null, action)} key={action.name || actionIndex} title={action.label}>{action.icon ? <Icon name={action.icon} /> : action.label}</a>))
                }
            </nav>
        );
    }

    if (autoHide) {
        if (typeof autoHide !== 'number') {
            autoHide = 5000;
        }
        setTimeout(() => {
            Display.hide(id);
        }, autoHide);
    }

    // 使用立即执行函数复制对象，避免使用类型断言 as

    const displayProps = (({type, autoHide, closeButton, actions, position, onAction, ...others}) => {
        others.backdropClassName = others.backdropClassName ?? 'clean';
        others.rootClassName = rootClassName;
        others.className = className;
        others.content = content;
        others.footer = footer;
        others.plugName = 'messager';
        others.id = id;
        return others;
    })(props);

    return Display.show(displayProps, callback);
};

export default {
    show: showMessager,
    hide: Display.hide,
    remove: Display.remove
};
