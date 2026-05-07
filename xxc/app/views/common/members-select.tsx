import {useEffect, useRef, useState, useMemo} from 'react';
import {classes} from '~/app/utils/html-helper';
import ListItem from '~/app/components/list-item';
import Spinner from '~/app/components/spinner';
import {fetchMembersListOfDept} from '~/app/core/members/depts-store';
import MemberListItem from './member-list-item';
import membersStore, {type Pager} from '~/app/core/members/members-store';
import {fetchChatMembersFromRemote} from '~/app/core/im/chats-store';
import {isNotEmptyArray} from '~/app/utils/check-empty';
import useLang from './use-lang';
import useCurrentUser from './use-current-user';

type MembersSelectProps = Partial<{
    selections: number[];
    excludes: number[];
    excludeSelf: boolean;
    recPerPage: number;
    deptID: number;
    cgid: string;
    searchValue: string;
    onClickMember: (id: number) => void;
    onMembersChange: (members: number[]) => void;
}>;

/**
 * 成员选择列表组件
 */
export default function MembersSelect(props: MembersSelectProps) {
    const {
        selections = [],
        excludes = [],
        excludeSelf = true,
        onClickMember,
        recPerPage = 100,
        deptID = 0,
        cgid = '',
        searchValue = '',
        onMembersChange,
    } = props;
    const [Lang] = useLang();
    const [state, setState] = useState({
        page: 1,
        loading: false,
        list: [] as number[],
        recTotal: 0,
    });
    const unmountedRef = useRef(false);
    const resetRef = useRef<boolean>();
    const [currentUser] = useCurrentUser();

    /**
     * 获取总页数，按群组筛选只有 1 页
     *
     * @returns 总页数
     */
    const getTotalPage = () => cgid
        ? 1
        : recPerPage
            ? Math.ceil(state.recTotal / recPerPage)
            : 0;

    /**
     * 判断是否拥有下一页数据
     * @returns 如果为 true 表示拥有下一页数据
     */
    const hasNextPage = () => state.recTotal > 0 && state.page < getTotalPage();

    /**
     * 加载下一页搜索数据
     * @param reset 是否重新开始加载（从第一页开始）
     * @returns
     */
    const loadNextSearchPage = async (reset: boolean) => {
        let memberList: Member[] = [];
        let pager: Pager;
        let newList: number[];
        try {
            if (excludeSelf) {
                excludes.push(currentUser.id);
            }
            const result = await membersStore.searchFromRemote(searchValue, {
                dept: deptID,
                chat: cgid,
                exclude: excludes,
                pager: {
                    recPerPage,
                    recTotal: reset ? 0 : state.recTotal || 0,
                    pageID: reset ? 1 : state.page + 1
                },
            });
            if ('list' in result && 'pager' in result) {
                memberList = result.list;
                ({pager} = result);
            }
            newList = memberList.map(x => x.id);
        } catch (error) {
            newList = [];
            console.error('Search members from server error', error);
        }

        if (unmountedRef.current) {
            return;
        }

        setState({
            loading: false,
            recTotal: pager.recTotal,
            page: pager.pageID,
            list: newList,
        });
    }

    /**
     * 加载下一页无搜索的数据
     * @param reset 是否重新开始加载（从第一页开始）
     */
    const loadNextNoSearchPage = async () => {
        const excludesSet = [...(new Set(excludes))];
        if (excludeSelf) {
            excludesSet.push(currentUser.id);
        }
        const nextPage = !state.recTotal ? 1 : state.page + 1;
        const {pager, data} = await (async () => {
            if (cgid) {
                const members = await fetchChatMembersFromRemote(cgid);
                return {data: [...members].filter(x => !excludesSet.includes(x)), pager: {recTotal: members.length, pageID: 1}};
            }
            return fetchMembersListOfDept(deptID, {pageID: nextPage, recPerPage}, excludesSet);
        })();
        const newList = [...(state.list), ...data];
        if (unmountedRef.current) {
            return;
        }
        setState({
            loading: false,
            recTotal: pager.recTotal,
            page: pager.pageID,
            list: newList,
        });
    }

    /**
     * 加载下一页数据
     * @param reset 是否重新开始加载（从第一页开始）
     */
    const loadNextPage = (reset: boolean) => {
        resetRef.current = reset;
        if (searchValue === '') {
            if (reset) {
                setState({
                    recTotal: 0,
                    page: 1,
                    list: [],
                    loading: true
                })
            } else {
                setState(prev => ({
                    ...prev,
                    loading: true
                }));
            }
        } else {
            setState(prev => ({
                ...prev,
                loading: true,
                list: []
            }));
        }
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        if (state.loading !== true) {
            return;
        }
        if (searchValue === '') {
            loadNextNoSearchPage();
        } else {
            loadNextSearchPage(resetRef.current ?? true);
        }
    }, [state.loading, searchValue]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        loadNextPage(true);
    }, [])

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
        loadNextPage(true);
    }, [searchValue, deptID, cgid]);

    useEffect(() => () => {
        unmountedRef.current = true;
    }, []);

    const displayList = state.page && isNotEmptyArray(state.list) ? state.list : [];

    // 过滤出可选择聊天的用户（排除不可聊和不可见的用户）
    const selectableMemberIDs = useMemo(() => {
        return displayList.filter(id => {
            const member = membersStore.getMemberOrTemp(id);
            return member;
        });
    }, [displayList]);

    // 对显示列表进行排序：可选中的在前，不可选中的在后
    const sortedDisplayList = useMemo(() => {
        const selectableSet = new Set(selectableMemberIDs);
        const selectable: number[] = [];
        const unselectable: number[] = [];
        for (const id of displayList) {
            if (selectableSet.has(id)) {
                selectable.push(id);
            } else {
                unselectable.push(id);
            }
        }
        return [...selectable, ...unselectable];
    }, [displayList, selectableMemberIDs]);

    // 当可选中的用户列表变化时，通知父组件
    useEffect(() => {
        onMembersChange?.(selectableMemberIDs);
    }, [selectableMemberIDs]);

    const listView = [];

    if (state.page && isNotEmptyArray(sortedDisplayList)) {
        const selectionsSet = new Set(selections);
        for (const memberID of sortedDisplayList) {
            const member = membersStore.getMemberOrTemp(memberID);
            const isDisabled = !member;
            const handleClickMember = () => {
                if (!isDisabled) {
                    onClickMember?.(memberID);
                }
            }
            listView.push(
                <MemberListItem
                    key={memberID}
                    memberID={memberID}
                    onClick={handleClickMember}
                    title={isDisabled ? Lang.string('chat.one2one.cannotCreateChatTip') : undefined}
                    className={isDisabled ? 'disabled-member-item' : undefined}
                >
                    <div className={classes('checkbox checkbox-sm', {checked: selectionsSet.has(memberID), disabled: isDisabled})}>
                        <label />
                    </div>
                </MemberListItem>
            );
        }
    }

    if (state.loading) {
        listView.push(<Spinner key="spinner" />);
    } else if (state.recTotal === 0) {
        listView.push(
            <ListItem
                key="notFound"
                icon="information-outline"
                className="-items-center item muted disabled"
                title={<span className="title small">{Lang.string('common.notFoundOptions')}</span>}
            />
        );
    } else if (hasNextPage()) {
        const buttonText = Lang.string('common.loadMore');
        listView.push(
            <ListItem
                key="loadMore"
                icon="chevron-double-down"
                className="-items-center item muted"
                title={<span className="title small">{buttonText}</span>}
                onClick={() => loadNextPage(false)}
            />);
    }

    return (
        <div className="list compact">
            {listView}
        </div>
    );
}
