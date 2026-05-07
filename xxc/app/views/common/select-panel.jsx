import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import GroupList from '../../components/group-list';
import Lang from '../../core/lang';
import {classes} from '../../utils/html-helper';
import SearchControl from '../../components/search-control';
import Icon from '../../components/icon';
import Chat from '../../core/im/chat';
import Member from '../../core/members/member';
import MemberAvatar from './member-avatar';
import ChatAvatar from '../chats/chat-avatar';

/**
 * SelectPanel 组件 ，显示通用选择面板
 */
export default class SelectPanel extends PureComponent {
    static propTypes = {
        listBuilder: PropTypes.func,
        onSelectionsChange: PropTypes.func,
        className: PropTypes.string,
        searchPlaceholderText: PropTypes.string,
        children: PropTypes.any,
        selections: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
    };

    static defaultProps = {
        listBuilder: null,
        onSelectionsChange: null,
        className: null,
        searchPlaceholderText: null,
        children: null,
        selections: null,
    };

    constructor(props) {
        super(props);

        let {selections} = props;
        if (Array.isArray(selections)) {
            const selectionsMap = {};
            selections.forEach(item => {
                selectionsMap[(item instanceof Chat) ? item.gid : item.id] = item;
            });
            selections = selectionsMap;
        }

        this.state = {
            selections,
            search: '',
        };

        this._selectOrder = 0;
    }

    /**
     * 处理搜索框值变更事件
     * @param {string} search 搜索关键字
     * @private
     * @returns {void}
     */
    handSearchChange = search => {
        this.setState({search});
    };

    /**
     * 设置选择的值
     * @param {Object} selections 已选择对象清单
     * @returns {void}
     */
    setSelections(selections) {
        this.setState({selections}, () => {
            const {onSelectionsChange} = this.props;
            if (onSelectionsChange) {
                onSelectionsChange(selections && Object.keys(selections).map(id => selections[id]).sort((x, y) => x.order - y.order).map(x => x.originItem || x));
            }
        });
    }

    /**
     * 处理条目选项点击事件
     * @param {string} id 条目 ID
     * @param {Object} item 条目选项对象
     * @returns {void}
     */
    handleItemClick(id, item) {
        let {selections} = this.state;
        selections = {...selections};
        if (selections[id]) {
            delete selections[id];
        } else {
            selections[id] = {originItem: item, order: this._selectOrder++};
        }
        this.setSelections(selections);
    }

    /**
     * 将条目选项对象转换为 GroupList 直接渲染的格式
     * @param {string} itemType 条目选项类型，可以为 `option` 或者 `selected`
     * @param {Object} item 条目选项对象
     * @returns {Object} GroupList 渲染的条目对象
     */
    itemConverter(itemType, item) {
        if (item.originItem) {
            item = item.originItem;
        }
        const convertedItem = {
            data: item,
            className: '-items-center',
        };
        if (item instanceof Chat) {
            Object.assign(convertedItem, {
                id: item.gid,
                title: item.name,
                avatar: <ChatAvatar gid={item.gid} />
            });
        } else if (item instanceof Member) {
            Object.assign(convertedItem, {
                id: item.id,
                title: item.displayName,
                avatar: <MemberAvatar memberID={item.id} />
            });
        } else if (item.type === 'group') {
            return item;
        } else {
            Object.assign(convertedItem, item);
        }
        const {selections} = this.state;
        if (itemType === 'option') {
            convertedItem.actions = <div className={classes('checkbox checkbox-sm', {checked: selections && selections[convertedItem.id]})}><label /></div>;
        } else {
            convertedItem.actions = <Icon name="sprite-selection-remove" />;
        }
        convertedItem.onClick = this.handleItemClick.bind(this, convertedItem.id, item);
        return convertedItem;
    }

    /**
     * 选择或取消选择整个分组
     * @param {Object} selections 已选择对象清单
     * @param {Object[]} list 分组列表数据
     * @param {boolean} [unselect=false] 是否为取消选择操作
     * @returns {void}
     */
    selectGroupList(selections, list, unselect = false) {
        if (list && list.length) {
            list.forEach(item => {
                if (item.type === 'group' && !(item instanceof Chat) && !(item instanceof Member)) {
                    this.selectGroupList(selections, item.list, unselect);
                } else {
                    const itemId = (item instanceof Chat) ? item.gid : item.id;
                    if (unselect) {
                        if (selections[itemId]) {
                            delete selections[itemId];
                        }
                    } else if (!selections[itemId]) {
                        selections[itemId] = {originItem: item, order: this._selectOrder++};
                    }
                }
            });
        }
        return selections;
    }

    /**
     * 点击列表全选按钮
     * @param {Object} group 当前分组对象
     * @param {boolean} isUnselectAll 是否为全不选操作
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleSelectAllBtnClick = (group, isUnselectAll, event) => {
        const {selections} = this.state;
        this.setSelections(this.selectGroupList({...selections}, group.list, isUnselectAll));
        event.stopPropagation();
    };

    /**
     * 判断指定的分组列表是否已全部选中
     * @param {Object[]} list 分组列表数据
     * @param {Object} selections 已选择对象清单
     * @returns {boolean} 如果为 `true` 表示已全部选中
     */
    isGroupListAllSelected(list, selections) {
        if (list && list.length) {
            for (let i = 0; i < list.length; ++i) {
                const item = list[i];
                if (item.type === 'group' && !(item instanceof Chat) && !(item instanceof Member)) {
                    if (item.list && !this.isGroupListAllSelected(item.list, selections)) {
                        return false;
                    }
                } else if (!selections[(item instanceof Chat) ? item.gid : item.id]) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 设置标题，将全选按钮添加到标题右侧
     * @param {Object} group 当前分组对象
     * @param {Component} groupListComponent 当前 GroupsList 组件实例
     * @private
     * @returns {void}
     */
    headingCreator = (group, groupListComponent) => {
        if (!group.title) return false;
        const icon = groupListComponent.isExpand ? 'chevron-down' : 'chevron-right';
        let isUnselectAll = false;
        const {selections} = this.state;
        if (selections) {
            isUnselectAll = this.isGroupListAllSelected(group.list, selections);
        }
        return (
            <header className="heading" onClick={groupListComponent.handleHeadingClick}>
                <Icon name={icon} />
                <div className="title">{group.title}</div>
                <div className="btn" onClick={this.handleSelectAllBtnClick.bind(this, group, isUnselectAll)}>{Lang.string(`common.${isUnselectAll ? 'unselectAll' : 'selectAll'}`)}</div>
            </header>
        );
    };

    render() {
        const {
            listBuilder,
            onSelectionsChange,
            searchPlaceholderText,
            className,
            children,
            selections: defaultSelections,
            ...other
        } = this.props;

        const {selections, search} = this.state;
        const groupListData = listBuilder(search);
        const selectionsList = selections && Object.keys(selections).map(id => selections[id]).sort((x, y) => x.order - y.order);
        const selectionsCount = selectionsList ? selectionsList.length : 0;

        return (
            <div className={classes('app-select-panel dock', className)} {...other}>
                <div className="dock-left single column">
                    <SearchControl className="-flex-none space-sm" inputClassName="-rounded-full" placeholder={searchPlaceholderText} onSearchChange={this.handSearchChange} />
                    <GroupList
                        group={groupListData}
                        rootClassName="app-select-panel-tree -flex-auto -overflow-y-auto"
                        className="compact"
                        itemConverter={this.itemConverter.bind(this, 'option')}
                        defaultExpand={false}
                        showMoreText={Lang.string('common.clickShowMoreFormat')}
                        headingCreator={this.headingCreator}
                    />
                </div>
                <div className="dock-right single column">
                    <header className="-flex-none heading space-sm">
                        <div className="title">{Lang.string('chat.invite.choosed')} ({selectionsCount})</div>
                    </header>
                    {selectionsList && (
                        <GroupList
                            group={{root: true, list: selectionsList}}
                            rootClassName="app-select-panel-tree -flex-auto -overflow-y-auto"
                            className="compact"
                            itemConverter={this.itemConverter.bind(this, 'selected')}
                            defaultExpand={false}
                            showMoreText={Lang.string('common.clickShowMoreFormat')}
                        />
                    )}
                </div>
                {children}
            </div>
        );
    }
}
