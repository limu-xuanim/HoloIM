import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import Lang from '../../core/lang';
import GroupList from '../../components/group-list';
import Icon from '../../components/icon';
import deptsStore from '../../core/members/depts-store';
import {getCurrentUser} from '../../core/profile';
import Spinner from '../../components/spinner';

/**
 * DeptsTree 组件，显示一个部门菜单
 */
export default class DeptsTree extends PureComponent {
    static propTypes = {
        className: PropTypes.string,
        activeGroupID: PropTypes.string,
        showCompany: PropTypes.bool,
    };

    static defaultProps = {
        className: null,
        activeGroupID: null,
        showCompany: true,
    };

    constructor(props) {
        super(props);
        this.state = {
            loading: true,
            deptsTree: null,
        };
    }

    componentDidMount() {
        const deptsTree = deptsStore.getDeptsTree();
        if (deptsTree) {
            this.setState({deptsTree, loading: false}, this.subscribeDeptsChange.bind(this));
        } else {
            this.subscribeDeptsChange();
        }
    }

    componentWillUnmount() {
        this.deptsSubscription.unsubscribe();
    }

    /**
     * 订阅部门数据变更事件
     * @returns {void}
     */
    subscribeDeptsChange() {
        this.deptsSubscription = deptsStore.subscribeDeptsChange(() => {
            this.setState({deptsTree: deptsStore.getDeptsTree(), loading: false});
        });
    }

    /**
     * 渲染部门条目
     *
     * @param {Object} dept 部门对象
     * @returns {Object} 分组视图条目对象
     * @private
     */
    itemConverter = dept => (dept.title ? dept : {
        title: dept.name,
        type: 'group',
        id: dept.id,
        list: dept.children,
    });

    /**
     * 渲染分组标题
     *
     * @param {Object} group 分组对象
     * @param {Component} groupListComponent GroupList 组件对象
     * @returns {JSX.Element} React 渲染内容
     * @private
     */
    headingCreator = (group, groupListComponent) => {
        if (group.root && !group.title) {
            return null;
        }
        const {activeGroupID} = this.props;
        const icon = groupListComponent.isExpand ? 'chevron-down' : 'chevron-right';
        return (
            <a href={`#/contacts/members/${group.id}`} className={classes('heading', {active: `${group.id}` === activeGroupID})}>
                <Icon onClick={groupListComponent.handleHeadingClick} name={icon} className={classes('state', {invisible: !group.list || !group.list.length})} />
                <div className="title">{group.title}</div>
            </a>
        );
    };

    /**
     * 检查部门是否默认展开
     *
     * @param {Object} group 分组对象
     * @returns {boolean} 如果为 `true`，则默认展开
     * @private
     */
    getDefaultExpand = group => {
        if (group.root) {
            return true;
        }
        const {activeGroupID} = this.props;
        if (activeGroupID && activeGroupID !== 'root') {
            const dept = deptsStore.getDept(activeGroupID);
            const parentsSet = dept?.parentsSet;
            return parentsSet?.has(group.id);
        }
        return false;
    };

    render() {
        const {
            className,
            activeGroupID,
            showCompany,
            ...other
        } = this.props;

        const {deptsTree, loading} = this.state;

        if (loading) {
            return <Spinner />;
        }

        const groupData = {
            list: deptsTree || [],
            root: true,
        };

        if (showCompany) {
            const user = getCurrentUser();
            const membersLabel = Lang.string('contacts.members.all');
            groupData.list = [
                {
                    title: (user?.company) || membersLabel,
                    id: 'root',
                    href: '#/contacts/members/root',
                    className: activeGroupID === 'root' ? 'active' : ''
                },
                ...groupData.list,
            ];
        }

        return (
            <GroupList
                className="compact"
                rootClassName={classes('app-depts-tree', className)}
                group={groupData}
                hideEmptyGroup={false}
                itemConverter={this.itemConverter}
                headingCreator={this.headingCreator}
                defaultExpand={this.getDefaultExpand}
                toggleWithHeading={false}
                {...other}
            />
        );
    }
}
