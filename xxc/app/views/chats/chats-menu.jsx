import React, {useEffect, useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import Lang from '../../core/lang';
import {classes} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Spinner from '../../components/spinner';
import GroupList from '../../components/group-list';
import deptsStore from '../../core/members/depts-store';

/**
 * 将部门对象转换为分组列表定义对象
 * @param {Object} dept 部门对象
 * @returns {Object} 分组列表定义对象
 */
function convertDeptToGroupListItem(dept) {
    return (dept.title ? dept : {
        title: dept.name,
        type: 'group',
        id: dept.id,
        list: dept.children,
    });
}

/**
 * 部门树菜单
 * @param {{className: string, onSelectMenuItem: function}} props React 组件属性对象
 * @returns {JSX.Element} React 渲染内容
 */
export default function ChatsMenu(props) {
    const {
        className,
        onSelectMenuItem,
    } = props;
    const [selected, setSelected] = useState('recents');
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [deptsTree, setDeptsTree] = useState(null);

    useEffect(() => {
        async function loadDeptsTree() {
            setLoadingDepts(true);
            const depts = await deptsStore.fetchDeptsTree();
            setDeptsTree(depts);
            setLoadingDepts(false);
        }
        loadDeptsTree();
    }, []);

    const handleClick = useCallback(id => {
        setSelected(id);
        if (onSelectMenuItem) {
            onSelectMenuItem(id);
        }
    }, [onSelectMenuItem]);

    const headingCreator = useCallback((group, groupListComponent) => {
        if (group.root && !group.title) {
            return null;
        }
        const icon = groupListComponent.isExpand ? 'chevron-down' : 'chevron-right';
        return (
            <a onClick={handleClick.bind(null, group.id)} className={classes('heading', {'primary-pale': group.id === selected})}>
                <Icon onClick={groupListComponent.handleHeadingClick} name={icon} className={classes('state -rounded-full', {invisible: !group.list || !group.list.length})} />
                <div className={classes('title', {'text-primary': group.id === selected})}>{group.title}</div>
            </a>
        );
    }, [handleClick, selected]);

    const groupData = {
        root: true,
        list: [{
            id: 'recents',
            title: Lang.string('chat.menu.recents'),
            onClick: handleClick.bind(null, 'recents'),
            className: selected === 'recents' ? 'primary-pale text-primary menu-recents' : 'menu-recents'
        }, {
            id: 'groups',
            title: Lang.string('chat.menu.groups'),
            onClick: handleClick.bind(null, 'groups'),
            className: selected === 'groups' ? 'primary-pale text-primary menu-groups' : 'menu-groups'
        }, {
            id: 'contacts',
            type: 'group',
            title: Lang.string('chat.menu.contacts'),
            list: []
        }]
    };
    if (loadingDepts) {
        groupData.list[2].list.push(<Spinner />);
    } else if (deptsTree) {
        groupData.list[2].list.push(...deptsTree);
    }

    return (
        <GroupList
            className="compact"
            rootClassName={classes('app-depts-tree', className)}
            group={groupData}
            hideEmptyGroup={false}
            itemConverter={convertDeptToGroupListItem}
            headingCreator={headingCreator}
            defaultExpand
            toggleWithHeading={false}
        />
    );
}

ChatsMenu.defaultProps = {
    className: null,
    onSelectMenuItem: null
};

ChatsMenu.propTypes = {
    className: PropTypes.string,
    onSelectMenuItem: PropTypes.func
};
