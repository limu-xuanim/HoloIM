import {useEffect, useState, useRef} from 'react';
import {classes} from '~/app/utils/html-helper';
import Icon from '~/app/components/icon';
import Spinner from '~/app/components/spinner';
import GroupList from '~/app/components/group-list';
import deptsStore, {type DeptItem} from '~/app/core/members/depts-store';
import useLang from './use-lang';

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

type DeptsMenuProps = {
    className: string;
    onSelectMenuItem: (value: number) => void;
};

/**
 * 部门树菜单
 * @param props React 组件属性对象
 * @returns React 渲染内容
 */
export default function DeptsMenu(props: DeptsMenuProps) {
    const {className, onSelectMenuItem} = props;
    const [selected, setSelected] = useState(0);
    const [loading, setLoading] = useState(true);
    const [deptsTree, setDeptsTree] = useState<DeptItem[]>(null);
    const mounted = useRef(false);
    const [Lang] = useLang();

    useEffect(() => {
        mounted.current = true;
        async function loadDeptsTree() {
            if (!mounted.current) {
                return;
            }
            setLoading(true);
            const depts = await deptsStore.fetchDeptsTree();
            if (!mounted.current) {
                return;
            }
            setDeptsTree(depts);
            setLoading(false);
        }
        loadDeptsTree();
        return () => {
            mounted.current = false;
        };
    }, []);

    function handleClick(id: number) {
        setSelected(id);
        if (onSelectMenuItem) {
            onSelectMenuItem(id);
        }
    }

    function headingCreator(group, groupListComponent) {
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
    }

    const membersLabel = Lang.string('contacts.members.all');
    const groupData = {
        list: [
            {
                title: membersLabel,
                id: 'root',
                onClick: handleClick.bind(null, 0),
                className: !selected ? 'primary-pale text-primary' : ''
            }
        ],
        root: true,
    };
    if (loading) {
        groupData.list.push(<Spinner />);
    } else if (deptsTree) {
        groupData.list.push(...deptsTree);
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
