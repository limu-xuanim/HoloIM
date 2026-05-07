import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Lang from '../../core/lang';
import {classes} from '../../utils/html-helper';
import ListItem from '../../components/list-item';
import Spinner from '../../components/spinner';
import MemberListItem from './member-list-item';
import membersStore from '../../core/members/members-store';
import chatsStore from '../../core/im/chats-store';

/**
 * 成员单选组件
 * @returns {JSX.Element} React渲染内容
 */
export default class MemberSelectRadio extends PureComponent {
    static propTypes = {
        selection: PropTypes.number,
        excludes: PropTypes.array,
        onClickMember: PropTypes.func,
        recPerPage: PropTypes.number,
        chatGid: PropTypes.string,
        searchValue: PropTypes.string,
        onMembersChange: PropTypes.func
    };

    static defaultProps = {
        selection: null,
        excludes: null,
        onClickMember: null,
        recPerPage: 20,
        chatGid: '',
        searchValue: '',
        onMembersChange: null
    };

    constructor(props) {
        super(props);
        this.state = {
            page: 1,
            loading: false,
            list: null,
            recTotal: 0,
        };
    }

    componentDidMount() {
        this.loadNextPage(true);
    }

    componentDidUpdate(prevProps) {
        if (this.props.searchValue !== prevProps.searchValue) {
            this.loadNextPage(true);
        }
        if (this.props.chatGid !== prevProps.chatGid) {
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
     * 加载下一页搜索数据
     * @param {boolean} reset 是否重新开始加载（从第一页开始）
     * @returns {void}
     */
    loadNextSearchPage(reset) {
        const {onMembersChange} = this.props;
        const {page, recTotal} = this.state;
        this.setState({
            loading: true,
            list: null,
        }, async () => {
            const {
                recPerPage, searchValue, chatGid, excludes
            } = this.props;
            let list;
            let pager;
            try {
                ({list, pager} = (await membersStore.searchFromRemote(searchValue, {chat: chatGid, exclude: excludes, pager: {recPerPage, recTotal: reset ? 0 : recTotal || 0, pageID: reset ? 1 : page + 1}})));
                list = list.map(x => x.id);
            } catch (error) {
                list = [];
                console.error('Search members from server error', error);
            }
            if (onMembersChange) {
                onMembersChange(list);
            }
            if (this._unmounted) {
                return;
            }
            this.setState({
                loading: false,
                recTotal: pager.recTotal,
                page: pager.pageID,
                list,
            });
        });
    }

    /**
     * 加载下一页无搜索的数据
     * @param {boolean} reset 是否重新开始加载（从第一页开始）
     * @returns {void}
     */
    loadNextNoSearchPage(reset) {
        const {onMembersChange} = this.props;
        const beginState = reset ? {
            recTotal: 0,
            page: 1,
            list: null,
        } : {};
        Object.assign(beginState, {
            loading: true
        });
        this.setState(beginState, async () => {
            const {chatGid} = this.props;
            const {list} = this.state;
            const excludes = new Set(this.props.excludes);
            const members = await chatsStore.tryFetchChatMembers(chatGid);
            const memberIDs = Array.from(members).filter(x => !excludes.has(x));
            const newList = [...(list || []), ...memberIDs];
            if (onMembersChange) {
                onMembersChange(newList);
            }
            if (this._unmounted) {
                return;
            }
            this.setState({
                loading: false,
                recTotal: memberIDs.length,
                list: newList,
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

    render() {
        const {
            selection,
            onClickMember,
        } = this.props;

        const listView = [];
        const {
            page, loading, list, recTotal
        } = this.state;

        if (page && list) {
            for (const memberID of list) {
                listView.push(
                    <MemberListItem memberID={memberID} key={memberID} onClick={onClickMember.bind(null, memberID)}>
                        <div className={classes('checkbox checkbox-sm', {checked: memberID === selection})}><label /></div>
                    </MemberListItem>
                );
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
