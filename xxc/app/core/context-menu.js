import ContextMenu from '../components/context-menu';
import fuid from '../utils/fuid';
import Lang from './lang';
import {isWebUrl} from '../utils/html-helper';
import platform from '../platform';
import {createEventProxy} from '../utils/proxy-helper';

/**
 * 平台提供的剪切板功能访问对象
 * @type {Object}
 * @private
 */
const clipboard = platform.access('clipboard');

/**
 * 平台提供的通用界面交互访问对象
 * @type {Object}
 * @private
 */
const platformUI = platform.access('ui');

/**
 * 存储所有上下文菜单生成器
 * @type {Record<string, Object>}
 * @private
 */
const contextMenuCreators = {};

/**
 * 存储上下文菜单别名
 * @type {Record<string, string[]>}
 * @private
 */
const contextMenuAliasMap = {};

/**
 * 判断一个上下文菜单项目是否是分隔线
 * @param {string|Object} item 要判断的上下文菜单项
 * @returns {boolean} 如果是则返回 `true`
 * @private
 */
export const isDividerItem = item => item && (['divider', '-', 'separator'].includes(item) || item.type === 'divider');

/**
 * 显示上下文菜单
 * @param {{x: Number, y: Number}} position 菜单显示位置，需要提供 X 和 Y 轴坐标
 * @param {!Object[]} menus 菜单项列表
 * @param {Object} props DisplayLayer 组件属性
 * @param {function} callback 操作完成时的回调函数
 * @returns {DisplayLayer}
 * @function
 */
export const displayContextMenu = ContextMenu.show;

/**
 * 判定上下文菜单项列表最后一项是否为分隔线，如果是则移除它
 * @param {Object[]} items 上下文菜单项列表
 * @returns {Object[]} 菜单项列表 修改后的上下文菜单项列表
 */
export const tryRemoveLastDivider = items => {
    if (items.length && isDividerItem(items[items.length - 1])) {
        items.pop();
    }
    return items;
};

/**
 * 判定上下文菜单项列表最后一项是否为分隔线，如果不是则添加一个分隔线项目到列表末尾
 * @param {ContextMenuItem[]} items 上下文菜单项列表
 * @returns {ContextMenuItem[]} 菜单项列表 修改后的上下文菜单项列表
 */
export const tryAddDividerItem = items => {
    if (items.length && !isDividerItem(items[items.length - 1])) {
        items.push({type: 'divider'});
    }
    return items;
};

/**
 * 判定给定的上下文菜单生成器是否符合给定的名称
 * @param {Record<string, any>} creator 要判断的上下文菜单生成器
 * @param {Function} creator.create 生成菜单项列表的回调函数，create 和 items 属性只能设置一个
 * @param {Object[]} creator.items 固定的菜单项列表，create 和 items 属性只能设置一个
 * @param {string} creator.id 生成器 ID，如果不指定则自动生成
 * @param {string|string[]} creator.match 匹配的上下文名称，多个上下文名称通过字符串数组或者使用英文逗号拼接为一个字符串
 * @param {string} contextName 上下文菜单名称
 * @returns {boolean} 如果符合则返回 `true`
 */
export const isCreatorMatch = (creator, contextName) => {
    if (typeof creator.match === 'string') {
        creator.match = creator.match.split(',');
    }
    if (Array.isArray(creator.match)) {
        creator.match = new Set(creator.match);
    }
    return creator.match && creator.match.has(contextName);
};

/**
 * 通过上下文菜单生成器生成菜单项列表
 * @param {Record<string, any>} creator 上下文菜单生成器
 * @param {Function} creator.create 生成菜单项列表的回调函数，create 和 items 属性只能设置一个
 * @param {Object[]} creator.items 固定的菜单项列表，create 和 items 属性只能设置一个
 * @param {string} creator.id 生成器 ID，如果不指定则自动生成
 * @param {string|string[]} creator.match 匹配的上下文名称，多个上下文名称通过字符串数组或者使用英文逗号拼接为一个字符串
 * @param {Object} context 上下文参数对象
 * @returns {Object[]} 菜单项列表
 */
const getMenuItemsFromCreator = (creator, context) => {
    const menuItems = creator.items || [];
    if (creator.create) {
        const newItems = creator.create(context);
        if (newItems && newItems.length) {
            menuItems.push(...newItems);
        }
    }
    if (creator.formatter) {
        return menuItems.map(creator.formatter);
    }
    return menuItems;
};

/**
 * 通过内部上下文菜单生成器获取指定上下文名称对应的上下文菜单项列表
 * @param {string} contextName 上下文名称
 * @param {Object} context 上下文参数对象
 * @returns {Object[]} 菜单项列表
 */
const getInnerMenuItemsForContext = (contextName, context) => {
    const creators = [];
    Object.keys(contextMenuCreators).forEach(creatorId => {
        const creator = contextMenuCreators[creatorId];
        if (isCreatorMatch(creator, contextName)) {
            creators.push({order: creator.order !== undefined ? creator.order : creators.length, creator});
        }
    });
    const bigNumber = Number.MAX_SAFE_INTEGER / 2;
    creators.sort((c1, c2) => (c1.creator.extension ? (bigNumber + c1.order) : c1.order) - (c2.creator.extension ? (bigNumber + c2.order) : c2.order));

    const items = [];
    creators.forEach(creator => {
        const newItems = getMenuItemsFromCreator(creator.creator, context);
        if (newItems.length) {
            if (!creator.skipAddDivider) {
                tryAddDividerItem(items);
            }
            items.push(...newItems);
        }
    });
    return items;
};

/**
 * 将一个上下文菜单生成器注册到系统
 * @param {Record<string, any>|string|Set<String>} creator 上下文菜单生成器
 * @param {function} creator.create 生成菜单项列表的回调函数，create 和 items 属性只能设置一个
 * @param {Object[]} creator.items 固定的菜单项列表，create 和 items 属性只能设置一个
 * @param {string} creator.id 生成器 ID，如果不指定则自动生成
 * @param {string|string[]} creator.match 匹配的上下文名称，多个上下文名称通过字符串数组或者使用英文逗号拼接为一个字符串
 * @param {function|Object[]} createFuncOrItems 生成菜单项列表的回调函数
 * @param {{apiLevel?: number; formatter?: function; skipAddDivider?: boolean;}} options 其他参数
 * @returns {string} 生成器 ID
 */
export const addContextMenuCreator = (creator, createFuncOrItems, options = null) => {
    if (Array.isArray(creator)) {
        return creator.map(c => addContextMenuCreator(c));
    }
    if (typeof creator === 'string' && creator[0] === '@') {
        return addContextMenuAlias(creator, createFuncOrItems);
    }
    if (typeof creator === 'string' || creator instanceof Set) {
        creator = {match: creator};
    }
    if (typeof createFuncOrItems === 'function') {
        creator.create = createFuncOrItems;
    } else if (Array.isArray(createFuncOrItems)) {
        creator.items = createFuncOrItems;
    }
    if (!creator.id) {
        creator.id = fuid();
    }
    if (typeof creator.match === 'string') {
        creator.match = creator.match.split(',');
    }
    if (Array.isArray(creator.match)) {
        creator.match = new Set(creator.match);
    }
    if (typeof options === 'object' && options) {
        Object.assign(creator, options);
    }

    contextMenuCreators[creator.id] = creator;
    return creator.id;
};

/**
 * 添加上下文菜单别名
 * @param {string} aliasName 别名
 * @param {string|string[]} contextNames 上下文名称
 * @returns {void}
 */
export const addContextMenuAlias = (aliasName, contextNames) => {
    contextMenuAliasMap[aliasName[0] === '@' ? aliasName : `@${aliasName}`] = contextNames.split(',');
};

/**
 * 从系统移除一个上下文菜单生成器
 * @param {string} creatorId 要移除的上下文生成器 ID
 * @returns {boolean} 如果返回 `true` 则为操作成功，否则为操作失败
 */
export const removeContextMenuCreator = creatorId => {
    if (contextMenuCreators[creatorId]) {
        delete contextMenuCreators[creatorId];
        return true;
    }
    return false;
};

/**
 * 格式化上下文菜单项，如果菜单项中有多个同名 ID，则只在第一个位置使用最后一个菜单项（实现菜单项覆盖）
 * @param {Object[]} items 上下文菜单项列表
 * @param {Function} [callback] 回调函数
 * @returns {Object[]} 菜单项列表 上下文菜单项列表
 * @private
 */
export const formatContextMenuItems = (items, callback) => {
    const newItems = [];
    const itemsMap = {};
    items.forEach((item) => {
        if (isDividerItem(item)) {
            return tryAddDividerItem(newItems);
        }
        if (item === null || (typeof item !== 'object')) {
            return;
        }
        let {labels} = item;
        const {label} = item;
        if (typeof label === 'object') {
            labels = label;
        }
        if (labels) {
            item.label = labels[Lang.name] || labels.$default || label;
            delete item.labels;
        }
        if (callback) {
            item = callback(item);
        }
        const {id} = item;
        if (id) {
            const oldIndex = itemsMap[id];
            if (typeof oldIndex === 'number') {
                newItems[oldIndex] = item;
            } else {
                itemsMap[id] = newItems.length;
                newItems.push(item);
            }
        } else {
            newItems.push(item);
        }
    });
    return tryRemoveLastDivider(
        newItems.map((item, index) => {
            const order = typeof item.order === 'number' ? item.order : (index + 0.0001);
            delete item.order;
            return {item, order};
        })
            .sort((x, y) => (x.order - y.order))
            .map(x => x.item)
    );
};

/**
 * 获取指定上下文名称对应的上下文菜单项列表
 * @param {string|string[]} contextNamesOrAliasName 上下文名称或上下文别名名称
 * @param {any} [context={}] 上下文参数对象
 * @param {boolean} [formatItems=true] 是否格式化上下文菜单项
 * @param {any[]} [existItems=null] 已经存在的菜单项
 * @returns {any[]} 菜单项列表 上下文菜单项列表
 */
export const getMenuItemsForContext = (contextNamesOrAliasName, context = {}, formatItems = true, existItems = null) => {
    let contextNames = (typeof contextNamesOrAliasName === 'string' && contextNamesOrAliasName[0] === '@')
        ? contextMenuAliasMap[contextNamesOrAliasName]
        : contextNamesOrAliasName;
    if (typeof contextNames === 'string' && contextNames.includes(',')) {
        contextNames = contextNames.split(',');
    }

    const {event, options = {}} = context;
    const items = [];

    if (Array.isArray(contextNames)) {
        const {contexts} = context;
        let {linkTarget} = options;
        contextNames.forEach(name => {
            name = name.trim();
            const theContext = {...context, ...contexts && contexts[name]};
            if (linkTarget && theContext.options?.linkTarget) {
                linkTarget = false;
            } else if (theContext.options) {
                theContext.options.linkTarget = false;
            }
            items.push(...getMenuItemsForContext(name, theContext, false, items));
        });
        return formatItems ? formatContextMenuItems(items) : items;
    }

    const contextName = contextNames;

    // Get context menu items for link target element
    let linkItemsCount = 0;
    if (event && options.linkTarget && contextName !== 'link') {
        const {url} = context;
        const link = ((options.url ? options.url : (url || event.target.href || event.target.parentElement?.href)) || '').trim();
        if (link && isWebUrl(link)) {
            const linkItems = getInnerMenuItemsForContext('link', {...context, url: link});
            if (linkItems && linkItems.length) {
                linkItemsCount = linkItems.length;
                items.push(...linkItems);
            }
        }
    }

    // Get context menu items from inner creators
    const innerItems = getInnerMenuItemsForContext(contextName, context);
    if (innerItems && innerItems.length) {
        tryAddDividerItem(items).push(...innerItems);
    }

    let textSelectItem;
    if (options.copySelect && platformUI.copySelectText && (!existItems || !existItems.find(x => x.id === 'copy-selected-text')) && !items.find(x => x.id === 'copy-selected-text')) {
        let selectedText = options.selectedText || document.getSelection().toString().trim();
        if (selectedText) {
            const newLinePos = selectedText.indexOf('\n');
            if (newLinePos > -1) selectedText = selectedText.substr(0, newLinePos);
            if (selectedText.length > 20) {
                selectedText = `${selectedText.substr(0, 20)}...`;
            }
            if (linkItemsCount < 3) {
                textSelectItem = {
                    id: 'copy-selected-text',
                    label: Lang.format('menu.copy.select', selectedText),
                    icon: 'mdi-clipboard-text',
                    click: platformUI.copySelectText
                };
            }
        }
    }
    if (textSelectItem) {
        if (options.copySelect === 'first') {
            items.unshift(textSelectItem);
        } else {
            tryAddDividerItem(items).push(textSelectItem);
        }
    }

    let {exclude} = options;
    let finalItems = items;
    if (exclude) {
        if (typeof exclude === 'string') {
            exclude = exclude.split(',');
        }
        if (Array.isArray(exclude)) {
            exclude = new Set(exclude);
        }
        if (exclude.size) {
            finalItems = finalItems.filter(x => x && !exclude.has(x?.id));
        }
    }

    if (formatItems) {
        finalItems = formatContextMenuItems(finalItems);
    }

    return finalItems;
};

/**
 * 在界面上显示上下文菜单
 * @param {string|string[]} contextNamesOrAliasName 上下文名称或者上下文别名名称
 * @param {Object<string,any>} context 上下文参数对象
 * @param {Event | React.UIEvent} context.event 触发上下文菜单的界面事件（例如用户点击事件）
 * @param {number=} context.message 出发上下文菜单的消息
 * @param {Object=} context.options 上下文菜单选项
 * @param {function=} context.callback 上下文菜单显示完成后的回调函数
 * @returns {boolean} 如果为 `true` 则成功显示上下文菜单，如果为 `false` 则无法显示上下文菜单
 */
export const showContextMenu = (contextNamesOrAliasName, context) => {
    if (['ext.apps.navbar', 'ext.apps.navbarZentao'].includes(contextNamesOrAliasName)) {
        const moreItems = document.querySelector('.collapse-menu-items');
        if (moreItems && context.event.target.closest('.collapse-menu-items')) {
            moreItems.style.cssText = 'display:block !important'; // 这里为更多悬浮窗添加强制显示样式
        }
    }

    if (!context) {
        throw new Error('Context must be set.');
    }
    if (context instanceof Event) {
        context = {event: context};
    }
    const {event, options, callback} = context;
    if (!event) {
        throw new Error('Context and context.event must be set.');
    }
    const contextNames = (typeof contextNamesOrAliasName === 'string' && contextNamesOrAliasName[0] === '@') ? contextMenuAliasMap[contextNamesOrAliasName] : contextNamesOrAliasName;
    const items = getMenuItemsForContext(contextNames, context) || [];

    if (DEBUG) {
        console.collapse('ContextMenu', 'greenBgLight', contextNames, 'greenPale');
        if (contextNamesOrAliasName !== contextNames) {
            console.log('alias', contextNamesOrAliasName);
        }
        console.log('context', context);
        console.log('items', items);
        console.groupEnd();
    }

    const position = {x: event.clientX, y: event.clientY};
    if (options?.position) {
        Object.assign(position, options.position);
    }

    const hasItems = !!items.length;
    if (!hasItems) {
        items.push({label: Lang.string('common.noAvailableActions'), disabled: true});
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
    displayContextMenu(position, items, {
        id: defaultContextMenuName,
        className: defaultContextMenuName,
        ...options,
        event,
    }, callback);
    return hasItems;
};

/**
 * 在独立窗口中获取上下文菜单中的项目
 * @param {string|string[]} contextNamesOrAliasName 上下文名称或者上下文别名名称
 * @param {Object} context 上下文参数对象
 * @param {Event} context.event 触发上下文菜单的界面事件（例如用户点击事件）
 * @param {Object} context.options 下文菜单选项
 * @param {function} [context.callback] 下文菜单显示完成后的回调函数
 * @returns {array} 返回所有的菜单项目
 */
export const getContextMenuItems = (contextNamesOrAliasName, context) => {
    if (['ext.apps.navbar', 'ext.apps.navbarZentao'].includes(contextNamesOrAliasName)) {
        const moreItems = document.querySelector('.collapse-menu-items');
        if (moreItems && context.event.target.closest('.collapse-menu-items')) {
            moreItems.style.cssText = 'display:block !important'; // 这里为更多悬浮窗添加强制显示样式
        }
    }

    if (!context) {
        throw new Error('Context must be set.');
    }
    if (context instanceof Event) {
        context = {event: context};
    }
    const {event} = context;
    if (!event) {
        throw new Error('Context and context.event must be set.');
    }
    const contextNames = (typeof contextNamesOrAliasName === 'string' && contextNamesOrAliasName[0] === '@') ? contextMenuAliasMap[contextNamesOrAliasName] : contextNamesOrAliasName;
    const items = getMenuItemsForContext(contextNames, context) || [];

    if (DEBUG) {
        console.collapse('ContextMenu', 'greenBgLight', contextNames, 'greenPale');
        if (contextNamesOrAliasName !== contextNames) {
            console.log('alias', contextNamesOrAliasName);
        }
        console.log('context', context);
        console.log('items', items);
        console.groupEnd();
    }
    return items;
};

// 添加链接上下文菜单生成器
addContextMenuCreator('link', context => {
    const {event, options, url} = context;
    const link = ((options && options.url ? options.url : (url || event.target.href)) || '').trim();
    if (isWebUrl(link)) {
        let linkText = document.getSelection().toString().trim();
        if (event && linkText === '') {
            linkText = event.target.innerText || (event.target.attributes.title ? event.target.attributes.title.value : '');
        }
        const items = [{
            id: 'open-link',
            label: Lang.string('common.openLink'),
            click: () => {
                platformUI.openExternal(link);
            },
            icon: 'mdi-open-in-new'
        }];
        if (clipboard && clipboard.writeText) {
            items.push({
                id: 'copy-link',
                label: Lang.string('common.copyLink'),
                click: () => {
                    clipboard.writeText(link);
                },
                icon: 'mdi-link'
            });

            if (linkText && linkText !== link && `${linkText}/` !== link) {
                items.unshift({
                    id: 'copy-selected-text',
                    label: Lang.format('common.copyFormat', linkText.length > 25 ? `${linkText.substr(0, 25)}…` : linkText),
                    click: () => {
                        clipboard.writeText(linkText);
                    },
                    icon: 'mdi-content-copy'
                });
            } else {
                items.unshift({
                    id: 'copy-selected-text',
                    hidden: true
                });
            }
        }
        return items;
    }
});

if (clipboard && clipboard.writeText) {
    // 添加 Emoji 表情操作上下文菜单
    addContextMenuCreator('emoji', context => {
        const {emoji} = context;
        const items = [];
        if (emoji) {
            items.push({
                id: 'copy-emoticon',
                icon: 'mdi-emoticon-outline',
                label: Lang.string('common.copy'),
                click: () => {
                    clipboard.writeText(emoji);
                }
            });
        }
        return items;
    });
}

if (DEBUG) {
    global.$contextMenuCreators = contextMenuCreators;
}
