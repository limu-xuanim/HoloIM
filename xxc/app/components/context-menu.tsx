import React, {type ReactElement} from 'react';
import type {DisplayLayerProps} from '~/app/components/display-layer';
import Display from './display';
import {classes} from '../utils/html-helper';
import Icon, {renderIcon} from './icon';
import fuid from '../utils/fuid';
import platform from '../platform';
import ClickOutsideWrapper from './click-outside-wrapper';

/**
 * @typedef {import('./display-layer').default} DisplayLayer
 */

/**
 * 平台提供的通用界面交互访问对象
 * @type {Object}
 * @private
 */
const platformUI = platform.access('ui');

/**
 * 取消左侧导航更多菜单悬浮窗的 强制显示
 * @returns {void}
 */
const hideCollpaseItems = () => {
    const moreItems = window.document.querySelectorAll<HTMLElement>('.collapse-menu-items');
    if (moreItems[0]) {
        moreItems[0].style.cssText = '';// TODO 后期优化 这里为更多悬浮窗移除强制显示样式
    }
};

/**
 * 显示上下文菜单
 * @param position 菜单显示位置
 * @param position.x x轴坐标
 * @param position.y y轴坐标
 * @param position.triggerElementBounding 触发元素边界
 * @param position.triggerElement 触发元素
 * @param position.direction 方向
 * @param menuItems 菜单项列表
 * @param props DisplayLayer 组件属性
 * @param callback 操作完成时的回调函数
 * @returns 弹出层对象
 */
export const showContextMenu = (
    position: {
        x?: number,
        y?: number,
        offsetX?: number,
        offsetY?: number,
        triggerElementBounding?: DOMRect,
        triggerElement?: HTMLElement,
        direction?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'below-left' | 'below-right' | 'above-left' | 'above-right'
    },
    menuItems: (ContextMenuItem | string | ReactElement)[],
    props: DisplayLayerProps & {
        onItemClick?: (item: ContextMenuItem, idx: number, e: MouseEvent, event: React.MouseEvent) => boolean,
        menuClassName?: string,
        itemClassName?: string,
        event?: React.MouseEvent,
    } = {},
    callback: (() => void) | null = null,
) => {
    let {className, content, style, event} = props;
    const {onItemClick, menuClassName, itemClassName} = props;
    const zoom = platformUI.getZoomFactor();

    if (!position && DEBUG) {
        throw new Error('Position is not defined to show the popover.');
    }

    if (!props.id) {
        props.id = fuid();
    }

    const handleItemClick = (item: ContextMenuItem, idx: number, e: MouseEvent) => {
        let clickResult = null;
        if (onItemClick) {
            clickResult = onItemClick(item, idx, e, event);
        }
        if (item.click) {
            hideCollpaseItems();
            clickResult = item.click(item, idx, e, event);
        }
        if (clickResult !== false) {
            const moreItems = window.document.querySelectorAll<HTMLElement>('.collapse-menu-items');
            if (moreItems[0]) {
                moreItems[0].style.cssText = '';
            }
            Display.remove(props.id);
        }
    };
    let hasIconLeft = false;
    const itemsView: JSX.Element[] = menuItems.map((item, idx) => {
        if (React.isValidElement(item)) {
            return item;
        }
        if (typeof item === 'string') {
            if (item === '-' || item === 'divider' || item === 'separator') {
                item = {type: 'divider'};
            } else {
                item = {label: item};
            }
        }
        const {
            id,
            key,
            className: thisItemClassName,
            hidden,
            click,
            url,
            render,
            type,
            title,
            disabled,
            icon,
            extraView,
            checked,
            label = title,
            ...other
        } = item;
        (Object.keys(other) as Array<keyof typeof other>).forEach(otherKey => {
            if (otherKey.startsWith('_')) {
                delete other[otherKey];
            }
        });

        if (hidden) {
            return null;
        }
        if (render) {
            return render(item);
        }
        if (type === 'divider' || type === 'separator') {
            return <div key={id || idx} className={classes('divider', thisItemClassName)} {...other} />;
        }
        const iconView = icon && renderIcon(icon, {className: 'item-left-icon'});
        if (iconView) {
            hasIconLeft = true;
        }
        let labelView = null;
        if (React.isValidElement(label)) {
            labelView = label;
        } else if (label) {
            labelView = <span className="title">{label}</span>;
        }
        return (
            <a href={url} onClick={handleItemClick.bind(null, item, idx)} key={id || idx} className={classes('item', itemClassName, thisItemClassName, {disabled})} {...other}>
                {iconView}
                {labelView}
                {checked && <Icon name="check" />}
                {extraView}
            </a>
        );
    });
    content = (
        <ClickOutsideWrapper onClickOutside={hideCollpaseItems}>
            <div className={classes('list dropdown-menu', menuClassName, {'has-icon-left': hasIconLeft})}>
                {itemsView}
                {content}
            </div>
        </ClickOutsideWrapper>
    );

    const x = position.x / zoom || 0;
    const y = position.y / zoom || 0;
    style = {
        maxWidth: window.innerWidth,
        maxHeight: window.innerHeight,
        left: x,
        top: y,
        ...style
    };

    className = classes('contextmenu layer -rounded', className);

    props = {
        backdropClassName: 'clean',
        animation: false,
        ...props,
        className,
        style,
        content,
        plugName: 'contextmenu'
    };
    delete props.menuClassName;
    delete props.itemClassName;
    delete props.onItemClick;

    return Display.show(props, display => {
        if (!display) {
            return;
        }
        const ele = display.displayElement;
        let newX = x;
        let newY = y;
        const eleWidth = ele.clientWidth;
        const eleHeight = ele.clientHeight;
        const {direction, triggerElement} = position;
        const triggerElementBounding = position.triggerElementBounding || (triggerElement && triggerElement.getBoundingClientRect());

        if (direction) {
            switch (direction) {
                case 'top':
                    newX -= eleWidth / 2;
                    newY -= eleHeight;
                    break;
                case 'top-left':
                    newX -= eleWidth;
                    newY -= eleHeight;
                    break;
                case 'top-right':
                    newY -= eleHeight;
                    break;
                case 'left':
                    newX -= eleWidth / 2;
                    newY -= eleHeight / 2;
                    break;
                case 'right':
                    newY -= eleHeight / 2;
                    break;
                case 'bottom':
                    newX -= eleWidth / 2;
                    break;
                case 'bottom-left':
                    newX -= eleWidth;
                    break;
                case 'below-left':
                    if (triggerElementBounding) {
                        newX = triggerElementBounding.left;
                        newY = triggerElementBounding.top + triggerElementBounding.height;
                    }
                    break;
                case 'below-right':
                    if (triggerElementBounding) {
                        newX = triggerElementBounding.left + triggerElementBounding.width - eleWidth;
                        newY = triggerElementBounding.top + triggerElementBounding.height;
                    }
                    break;
                case 'above-left':
                    if (triggerElementBounding) {
                        newX = triggerElementBounding.left;
                        newY = triggerElementBounding.top - eleHeight;
                    }
                    break;
                case 'above-right':
                    if (triggerElementBounding) {
                        newX = triggerElementBounding.left + triggerElementBounding.width - eleWidth;
                        newY = triggerElementBounding.top - eleHeight;
                    }
                    break;
            }
        }
        if (position.offsetX) {
            newX += (position.offsetX / zoom);
        }
        if (position.offsetY) {
            newY += position.offsetY / zoom;
        }

        newX = Math.floor(Math.max(0, Math.min(window.innerWidth / zoom - eleWidth, newX)));
        newY = Math.floor(Math.max(0, Math.min(window.innerHeight / zoom - eleHeight, newY)));

        if (newX !== x || newY !== y) {
            display.setStyle({top: newY, left: newX, opacity: 1});
        } else {
            display.setStyle({opacity: 1});
        }
        callback?.();
    });
};

export default {
    show: showContextMenu,
    hide: Display.hide,
    remove: Display.remove
};
