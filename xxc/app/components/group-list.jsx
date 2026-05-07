import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../utils/html-helper';
import Icon from './icon';
import Heading from './heading';
import ListItem from './list-item';
import Config from '../config';
import {formatString} from '../utils/string-helper';

/**
 * GroupList 组件 ，显示一个分组列表
 */
export default class GroupList extends Component {
    static propTypes = {
        headingCreator: PropTypes.func,
        checkIsGroup: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        itemCreator: PropTypes.func,
        itemConverter: PropTypes.func,
        onExpandChange: PropTypes.func,
        group: PropTypes.object,
        className: PropTypes.string,
        rootClassName: PropTypes.string,
        children: PropTypes.any,
        defaultExpand: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        toggleWithHeading: PropTypes.bool,
        forceCollapse: PropTypes.bool,
        hideEmptyGroup: PropTypes.bool,
        collapseIcon: PropTypes.string,
        expandIcon: PropTypes.string,
        startPageSize: PropTypes.number,
        morePageSize: PropTypes.number,
        defaultPage: PropTypes.number,
        showMoreText: PropTypes.node,
    };

    static defaultProps = {
        headingCreator: null,
        itemCreator: null,
        itemConverter: null,
        group: null,
        className: null,
        rootClassName: null,
        children: null,
        defaultExpand: true,
        toggleWithHeading: true,
        collapseIcon: 'chevron-right',
        expandIcon: 'chevron-down',
        hideEmptyGroup: true,
        checkIsGroup: null,
        onExpandChange: null,
        forceCollapse: false,
        startPageSize: Config.ui['page.start.size'] || 20,
        morePageSize: Config.ui['page.more.size'] || 20,
        defaultPage: 1,
        showMoreText: ''
    };

    static render(list, props, page = 0, onRequestMore = null) {
        const listViews = [];
        props = {...GroupList.defaultProps, ...props};
        const maxIndex = page ? Math.min(list.length, props.startPageSize + (page > 1 ? (page - 1) * props.morePageSize : 0)) : list.length;
        const {checkIsGroup, itemConverter, hideEmptyGroup} = props;
        for (let i = 0; i < maxIndex; ++i) {
            const item = itemConverter ? itemConverter(list[i], i) : list[i];
            if (!item) {
                // 允许通过在 itemConverter 返回 null 来跳过渲染某些分组
                continue;
            }
            if (hideEmptyGroup && (!item.list || !item.list.length)) {
                continue;
            }
            if ((checkIsGroup && (checkIsGroup === true || checkIsGroup(item))) || (!checkIsGroup && (item.type === 'group' || item.list))) {
                listViews.push(<GroupList
                    key={item.key || `id-${item.id}` || `idx-${i}`}
                    group={item}
                    itemCreator={props.itemCreator}
                    itemConverter={itemConverter}
                    className={props.className}
                    toggleWithHeading={props.toggleWithHeading}
                    headingCreator={props.headingCreator}
                    defaultExpand={props.defaultExpand}
                    expandIcon={props.expandIcon}
                    collapseIcon={props.collapseIcon}
                    hideEmptyGroup={hideEmptyGroup}
                    checkIsGroup={checkIsGroup}
                    forceCollapse={props.forceCollapse}
                    onExpandChange={props.onExpandChange}
                    startPageSize={props.startPageSize}
                    morePageSize={props.morePageSize}
                    defaultPage={props.defaultPage}
                    showMoreText={props.showMoreText}
                />);
            } else if (props.itemCreator) {
                listViews.push(props.itemCreator(item, i));
            } else {
                const {id, list: itemList, ...itemProps} = item;
                listViews.push(<ListItem key={item.key || item.id || i} {...itemProps} />);
            }
        }
        const notShowCount = list.length - maxIndex;
        if (notShowCount) {
            const showMoreText = (props && props.showMoreText) ? formatString(props.showMoreText, notShowCount) : '...';
            listViews.push(<ListItem key="showMore" icon="chevron-double-down" className="-items-center item muted" title={<span className="title small">{showMoreText}</span>} onClick={onRequestMore} />);
        }
        return listViews;
    }

    constructor(props) {
        super(props);
        let {defaultExpand, group} = props;
        if (group.expand !== undefined) {
            defaultExpand = group.expand;
        } else if (typeof defaultExpand === 'function') {
            defaultExpand = defaultExpand(group, this);
        }
        this.state = {
            expand: defaultExpand,
            page: props.defaultPage
        };
    }

    /**
     * 切换展开或折叠分组
     * @param {?bool} expand 如果设置为 true，则展开分组，如果为 false，则折叠分组，否则自动切换
     * @param {?Function} callback 操作完成时的回调函数
     * @returns {void}
     */
    toggle(expand, callback) {
        if (expand === undefined) {
            expand = !this.state.expand;
        }
        this.setState({expand}, () => {
            const {onExpandChange, group} = this.props;
            if (onExpandChange) {
                onExpandChange(expand, group);
            }
            if (callback) {
                callback(expand, group);
            }
        });
    }

    /**
     * 展开分组
     * @param {?Function} callback 操作完成时的回调函数
     * @returns {void}
     */
    expand(callback) {
        this.toggle(true, callback);
    }

    /**
     * 折叠分组
     * @param {?Function} callback 操作完成时的回调函数
     * @returns {void}
     */
    collapse(callback) {
        this.toggle(false, callback);
    }

    /**
     * 处理分组标题点击事件
     * @param {Event} e 事件对象
     * @private
     * @returns {void}
     */
    handleHeadingClick = () => {
        this.toggle();
    };

    /**
     * 检查是否展开
     * @type {boolean}
     */
    get isExpand() {
        return !this.props.forceCollapse && this.state.expand;
    }

    /**
     * 处理请求显示更多列表项事件
     * @private
     * @returns {void}
     */
    handleRequestMorePage = () => {
        const {page} = this.state;
        this.setState({page: page + 1});
    };

    /**
     * 渲染分组标题
     *
     * @param {Object} group 分组条目对象
     * @returns {JSX.Element} React 渲染内容
     */
    renderHeading = group => {
        if (group.root && group.title === undefined) {
            return null;
        }
        let headingView = null;
        const {
            headingCreator, expandIcon, collapseIcon, toggleWithHeading
        } = this.props;
        if (headingCreator) {
            headingView = headingCreator(group, this);
        } else if (group.title) {
            const {title} = group;
            if (React.isValidElement(title)) {
                headingView = title;
            } else if (typeof title === 'object') {
                headingView = <Heading {...title} />;
            } else if (title) {
                const icon = this.isExpand ? expandIcon : collapseIcon;
                let iconView = null;
                if (icon) {
                    if (React.isValidElement(icon)) {
                        iconView = icon;
                    } else if (typeof icon === 'object') {
                        iconView = <Icon onClick={toggleWithHeading ? null : this.handleHeadingClick} {...icon} />;
                    } else {
                        iconView = <Icon onClick={toggleWithHeading ? null : this.handleHeadingClick} name={icon} />;
                    }
                }
                headingView = (
                    <header onClick={toggleWithHeading ? this.handleHeadingClick : null} className={classes('heading', group.className)}>
                        {iconView}
                        <div className="title">{title}</div>
                    </header>
                );
            }
        }
        return headingView;
    };

    render() {
        const {
            forceCollapse,
            headingCreator,
            hideEmptyGroup,
            checkIsGroup,
            itemCreator,
            itemConverter,
            group,
            toggleWithHeading,
            defaultExpand,
            expandIcon,
            collapseIcon,
            onExpandChange,
            className,
            children,
            startPageSize,
            morePageSize,
            defaultPage,
            showMoreText,
            rootClassName,
            ...other
        } = this.props;

        const {
            list,
            root,
        } = group;

        const {page} = this.state;
        const expand = root || this.isExpand;

        return (
            <div
                className={classes('list', className, {
                    'is-expand': expand,
                    'is-collapse': !expand,
                    [rootClassName]: rootClassName && root,
                    'group-list-root': root,
                    'app-group-list group-list': !root
                })}
                {...other}
            >
                {this.renderHeading(group)}
                {expand && list && GroupList.render(list, this.props, page, this.handleRequestMorePage)}
                {children}
            </div>
        );
    }
}
