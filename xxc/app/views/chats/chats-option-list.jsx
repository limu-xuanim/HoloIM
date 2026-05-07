import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {getOne2OneChatGid} from '../../core/im/chat-helper';
import {getCurrentUserID} from '../../core/profile';
import chatsStore from '../../core/im/chats-store';
import membersStore from '../../core/members/members-store';
import ListItem from '../../components/list-item';
import MemberListItem from '../common/member-list-item';
import {classes} from '../../utils/html-helper';
import Spinner from '../../components/spinner';
import Lang from '../../core/lang';
import {fetchMembersListOfDept} from '../../core/members/depts-store';
import ChatListItem from './chat-list-item';

/**
 * 部门成员组件
 */
export default class ChatsOptionList extends PureComponent {
    static propTypes = {
        selections: PropTypes.array,
        excludes: PropTypes.array,
        onClickChat: PropTypes.func,
        recPerPage: PropTypes.number,
        type: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        searchValue: PropTypes.string,
    };

    static defaultProps = {
        selections: [],
        excludes: null,
        onClickChat: null,
        recPerPage: 20,
        type: 'recents',
        searchValue: '',
    };

    constructor() {
        super();
        this.state = {
            page: 1,
            loading: false,
            list: null,
            recTotal: 0,
            searchResult: [],
        };
    }

    componentDidMount() {
        this.loadNextPage(true);
    }

    componentDidUpdate(prevProps) {
        if (this.props.searchValue !== prevProps.searchValue) {
            this.loadNextPage(true);
        }
        if (this.props.type !== prevProps.type) {
            this.loadNextPage(true);
        }
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    /**
     * 获取总页数
     * @returns {number} 总页数
     */
    getTotalPage() {
        return this.props.recPerPage ? Math.ceil(this.state.recTotal / this.props.recPerPage) : 0;
    }

    /**
     * 判断是否拥有下一页数据
     * @returns {boolean} 如果为 true 表示拥有下一页数据
     */
    hasNextPage() {
        return this.state.recTotal > 0 && this.state.page < this.getTotalPage();
    }

    /**
     * 根据搜索框文本搜索会话
     * @returns {Promise<string[] | number[]> | Chat[]} 搜索结果
     */
    searchMembers() {
        const {searchValue, type} = this.props;
        if (searchValue === '') {
            return Promise.resolve([]);
        }
        if (type === 'groups') {
            return chatsStore.searchChats(searchValue, {
                chatType: 'groups',
                excludeMemberIdList: false,
                includeReadonly: false
            });
        }
        if (type === 'recents') {
            return chatsStore.searchChats(searchValue, {
                chatType: '',
                excludeMemberIdList: false,
                includeReadonly: false,
                searchFromRemote: true
            });
        }
        return membersStore.searchFromRemote(searchValue, {dept: type === 'contacts' ? 0 : type});
    }

    /**
     * 加载选项
     * @returns {Promise<{data: number[], pager: {recTotal: number, pageID: number, recPerPage: number}} | {data: Chat[], pager: {recTotal: number, pageID: number, recPerPage: number}}>} 选项列表
     */
    async loadOptions() {
        const {type, recPerPage} = this.props;
        const {recTotal, page} = this.state;
        if (type === 'contacts' || typeof type === 'number') {
            const nextPage = !recTotal ? 1 : page + 1;
            return fetchMembersListOfDept(type === 'contacts' ? 0 : type, {pageID: nextPage, recPerPage});
        }
        const chats = type === 'groups'
            ? chatsStore.getGroupsChats('recentFirst', false, false)
            : chatsStore.getRecentChats({
                includeStar: true,
                sortList: 'recentFirst',
                excludeSystemChats: false,
                includeReadonly: false,
                maxRecentTime: 0
            });
        const nextPage = !recTotal ? page : page + 1;
        return {data: chats.slice(recPerPage * (nextPage - 1), recPerPage * (nextPage)), pager: {pageID: nextPage, recTotal: chats.length, recPerPage}};
    }

    /**
     * 加载下一页搜索数据
     * @param {boolean} reset 是否重新开始加载（从第一页开始）
     * @returns {void}
     */
    loadNextSearchPage(reset) {
        if (reset) {
            this.setState({
                loading: true,
                searchResult: [],
                recTotal: 0,
                page: 1,
                list: null,
            }, async () => {
                const {recPerPage, type} = this.props;
                const {list} = this.state;
                let searchResult;
                try {
                    searchResult = (type === 'groups' || type === 'recents')
                        ? (await this.searchMembers())
                        : (await this.searchMembers()).map(x => x.id);
                } catch (error) {
                    searchResult = [];
                    console.error('Search members from server error', error);
                }
                if (this._unmounted) {
                    return;
                }
                this.setState({
                    loading: false,
                    searchResult,
                    recTotal: searchResult.length,
                    page: 1,
                    list: (list || []).concat(searchResult.slice(0, recPerPage)),
                });
            });
            return;
        }

        this.setState((state, props) => ({
            page: state.page + 1,
            list: (state.list || []).concat(state.searchResult.slice(props.recPerPage * state.page, props.recPerPage * (state.page + 1)))
        }));
    }

    /**
     * 加载下一页无搜索的数据
     * @param {boolean} reset 是否重新开始加载（从第一页开始）
     * @returns {void}
     */
    loadNextNoSearchPage(reset) {
        const beginState = reset ? {
            recTotal: 0,
            page: 1,
            list: null,
        } : {};
        Object.assign(beginState, {
            loading: true
        });
        this.setState(beginState, async () => {
            const {list} = this.state;
            const {pager, data} = await this.loadOptions();
            if (this._unmounted) {
                return;
            }
            this.setState({
                loading: false,
                recTotal: pager.recTotal,
                page: pager.pageID,
                list: (list || []).concat(data),
            });
        });
    }

    /**
     * 加载下一页数据
     * @param {boolean} [reset] 是否重新开始加载（从第一页开始）
     * @returns {void}
     */
    loadNextPage(reset) {
        const {searchValue} = this.props;
        if (searchValue === '') {
            this.loadNextNoSearchPage(reset);
        } else {
            this.loadNextSearchPage(reset);
        }
    }

    /**
     * 渲染选择项
     * @param {number|{gid: string}} item 选项对象或者 ID
     * @param {Set<number|string>} selectionsSet 已选择的集合
     * @param {Set<number|string>} excludesSet 从选项中排除的集合
     * @returns {JSX.Element} React Node
     */
    renderOptionItem(item, selectionsSet, excludesSet) {
        if (typeof item === 'number') {
            const gid = getOne2OneChatGid(item);
            if (item === getCurrentUserID() || (excludesSet && excludesSet.has(gid))) {
                return null;
            }
            return (
                <MemberListItem memberID={item} key={item} onClick={this.props.onClickChat.bind(null, gid)}>
                    <div className={classes('checkbox checkbox-sm', {checked: selectionsSet.has(gid)})}><label /></div>
                </MemberListItem>
            );
        }
        const gid = typeof item === 'object' ? item.gid : item;
        if (excludesSet && excludesSet.has(gid)) {
            return null;
        }
        return (
            <ChatListItem
                gid={gid}
                key={gid}
                onClick={this.props.onClickChat.bind(null, gid)}
                showStatusDot
            >
                <div className={classes('checkbox checkbox-sm', {checked: selectionsSet.has(gid)})}><label /></div>
            </ChatListItem>
        );
    }

    render() {
        const {
            selections,
            excludes,
        } = this.props;

        const listView = [];
        const {
            page, loading, list, recTotal
        } = this.state;

        if (page && list) {
            const selectionsSet = new Set(selections);
            const excludesSet = excludes ? new Set(excludes) : null;
            for (const item of list) {
                const optionView = this.renderOptionItem(item, selectionsSet, excludesSet);
                if (optionView) {
                    listView.push(optionView);
                }
            }
        }

        if (loading) {
            listView.push(<Spinner key="spinner" />);
        } else if (recTotal === 0) {
            listView.push(<ListItem key="notFound" icon="information-outline" className="-items-center item muted disabled" title={<span className="title small">{Lang.string('common.notFoundOptions')}</span>} />);
        } else if (this.hasNextPage()) {
            const buttonText = Lang.string('common.loadMore');
            listView.push(<ListItem key="loadMore" icon="chevron-double-down" className="-items-center item muted" title={<span className="title small">{buttonText}</span>} onClick={this.loadNextPage.bind(this, false)} />);
        }

        return (
            <div className="list compact">
                {listView}
            </div>
        );
    }
}
