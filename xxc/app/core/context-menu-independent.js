import ContextMenu from '../components/context-menu';

/**
 * 使用已有的上下文菜单项显示上下文菜单
 * @param {string|string[]} contextNames 上下文名称
 * @param {array} items 上下文菜单项目
 * @param {Object} context 上下文参数对象
 * @param {Event} context.event 触发上下文菜单的界面事件（例如用户点击事件）
 * @param {Object} context.options 上下文菜单选项
 * @param {function} context.callback 上下文菜单显示完成后的回调函数
 * @returns {void}
 */
export const showContextMenuWithItems = (contextNames, items, context) => {
    const {event, options, callback} = context;
    const position = {x: event.clientX, y: event.clientY};
    if (options?.position) {
        Object.assign(position, options.position);
    }

    const hasItems = !!items.length;
    if (!hasItems) {
        return;
    }
    if (event) {
        if (event.preventDefault && (!options || options.preventDefault !== false)) {
            event.preventDefault();
        }
        if (event.stopPropagation && (!options || options.stopPropagation !== false)) {
            event.stopPropagation();
        }
    }
    if (options) {
        delete options.copySelect;
        delete options.preventDefault;
        delete options.stopPropagation;
        delete options.linkTarget;
        delete options.position;
    }
    const defaultContextMenuName = `contextmenu-${contextNames.replace(/[.,]/g, '_')}`;
    ContextMenu.show(position, items, {
        id: defaultContextMenuName,
        className: defaultContextMenuName,
        ...options,
        event,
    }, callback);
};
