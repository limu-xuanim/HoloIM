import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import {isEmptyString} from '../../utils/check-empty';
import Lang from '../../core/lang';
import {onRoutePathChange} from '../../core/ui/router';
import ListItem from '../../components/list-item';
import Icon from '../../components/icon';
import {showContextMenu} from '../../core/context-menu';
import MemberAvatar from '../common/member-avatar';
import ChatAvatar from '../chats/chat-avatar';
import deptsStore, {fetchMembersListOfDept} from '../../core/members/depts-store';
import membersStore from '../../core/members/members-store';
import chatsStore from '../../core/im/chats-store';
import {getCurrentUser} from '../../core/profile';
import Pager from '../../components/pager';
import SearchControl from '../../components/search-control';
import Spinner from '../../components/spinner';
import {isCurrentUser} from '../../core/profile';

/**
 * ContactsView 组件 ，显示联系人列表界面
 */
export default class ContactsView extends PureComponent {
    static propTypes = {
        className: PropTypes.string,
        deptID: PropTypes.string.isRequired,
        recPerPage: PropTypes.number,
        defaultPage: PropTypes.number,
    };

    static defaultProps = {
        className: null,
        recPerPage: 50,
        defaultPage: 1,
    };

    constructor(props) {
        super(props);

        this.state = {
            pageID: props.defaultPage,
            recTotal: 0,
            membersIDList: [],
            searchValue: '',
            searchResult: [],
        };
    }

    componentDidMount() {
        this.loadDeptMembers();
        this.routePathChangeEventID = onRoutePathChange(this.handleRoutePathChange);

        PERF_MARK('switchToContactsMembersEnd', 'switchToContactsMembersBegin', 'switchToContactsMembersTime');
    }

    componentDidUpdate(prevProps) {
        const {searchValue} = this.state;
        const {deptID} = this.props;
        if (prevProps.deptID !== deptID) {
            if (searchValue === '') {
                this.loadDeptMembers({pageID: 1});
            } else {
                this.searchMembers();
            }
        }
    }

    componentWillUnmount() {
        if (this.membersChangeHandler) {
            membersStore.unsubscribe(this.membersChangeHandler);
        }
        if (this.deptsSubscription) {
            this.deptsSubscription.unsubscribe();
            this.deptsSubscription = null;
        }
        this.routePathChangeEventID.unsubscribe();
        this._unmounted = true;
    }

    /**
     * 处理路由变更事件
     * @param {String} newRoutePath 新的路由路径
     * @returns {void}
     */
    handleRoutePathChange = newRoutePath => {
        if (!newRoutePath.startsWith('#/contacts')) {
            this.clearSearchValue();
        }
    };

    /**
     * 加载部门成员数据
     * @param {Object} startState 新的状态，可以设置页码
     * @returns {void}
     */
    loadDeptMembers(startState) {
        if (this.membersChangeHandler) {
            membersStore.unsubscribe(this.membersChangeHandler);
            this.membersChangeHandler = null;
        }
        if (this.deptsSubscription) {
            this.deptsSubscription.unsubscribe();
            this.deptsSubscription = null;
        }

        const {deptID} = this.props;
        this.setState({
            membersIDList: [],
            loading: true,
            ...startState
        }, async () => {
            const {recPerPage} = this.props;
            const newState = {loading: false};
            const deptMembers = await fetchMembersListOfDept(deptID === 'root' ? 0 : deptID, {
                pageID: this.state.pageID || 1,
                recPerPage
            });
            if (deptMembers) {
                newState.pageID = deptMembers.pager.pageID;
                newState.recPerPage = deptMembers.pager.recPerPage;
                newState.recTotal = deptMembers.pager.recTotal;
                newState.membersIDList = deptMembers.data;
            } else {
                newState.membersIDList = [];
            }
            if (this._unmounted) {
                return;
            }
            this.setState(newState, () => {
                if (this.state.membersIDList.length) {
                    this.membersChangeHandler = membersStore.subscribe(this.state.membersIDList, this.forceUpdate.bind(this, null));
                }
            });

            this.deptsSubscription = deptsStore.subscribeDeptChange(deptID, this.forceUpdate.bind(this, null));
        });
    }

    /**
     * 处理联系人右键菜单事件
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleItemContextMenu = (event) => {
        const cgid = event.currentTarget.getAttribute('data-gid');
        if (cgid) {
            showContextMenu('chat.menu', {
                event,
                chat: cgid,
                menuType: 'groups',
            });
        } else {
            showContextMenu('member', {
                event,
                member: event.currentTarget.getAttribute('data-member'),
            });
        }
    };

    /**
     * 处理页码变更事件
     * @param {number} pageID 新的页码
     * @returns {void}
     */
    handlePageChange = (pageID) => {
        if (this.state.searchValue !== '') {
            this.setState({pageID}, this.searchMembers);
        } else {
            this.loadDeptMembers({pageID});
        }
    };

    /**
     * 处理搜索文本变更事件
     * @param {string} searchValue 搜索框文本
     * @returns {void}
     */
    handleSearchChange = (searchValue) => {
        this.setState({searchValue, pageID: 1, recTotal: 0}, () => {
            this.searchMembers();
        });
    };

    /**
     * 清空搜索框
     * @returns {void}
     */
    clearSearchValue = () => {
        if (this.state.searchValue !== '') {
            this.searchControl.handleOnClearBtnClick();
        }
    };

    /**
     * 根据搜索框文本搜索部门成员
     * @returns {void}
     */
    async searchMembers() {
        const {searchValue, pageID, recTotal} = this.state;
        const {deptID, recPerPage} = this.props;
        if (searchValue === '') {
            this.setState({searchResult: []}, () => {
                this.loadDeptMembers({pageID: 1});
            });
            return;
        }
        let searchResult;
        let pager;
        this.setState({loading: true}, async () => {
            try {
                ({list: searchResult, pager} = await membersStore.searchFromRemote(searchValue, {dept: deptID === 'root' ? 0 : deptID, pager: {pageID, recPerPage, recTotal}}));
                searchResult = searchResult.map(x => x.id);
            } catch (e) {
                searchResult = [];
                console.error('Search members from server error', e);
            }
            if (this._unmounted) {
                return;
            }
            this.setState({
                searchResult, loading: false, recTotal: pager.recTotal || searchResult.length, pageID: pager.pageID || 1
            });
        });
    }

    render() {
        const {
            className,
            deptID,
            recPerPage,
            defaultPage,
            ...other
        } = this.props;

        const {
            pageID, membersIDList, loading, recTotal, searchValue, searchResult
        } = this.state;
        const membersLabel = (deptID && deptID !== 'root') ? deptsStore.getDeptName(deptID) : Lang.string('contacts.members.all');
        let listView = null;
        if (!loading) {
            listView = (searchValue === '' ? membersIDList : searchResult).map(id => {
                const member = membersStore.getMemberOrTemp(id);
                if (!member) {
                    return null;
                }
                const isMe = isCurrentUser(id);
                const one2oneChat = isMe ? null : chatsStore.getContactChat(id);
                let badgeView = null;
                let avatarView = null;
                if (one2oneChat) {
                    if (one2oneChat.mute) {
                        badgeView = <Icon name="bell-off" className="icon-sm muted" />;
                    }
                    avatarView = <ChatAvatar showStar size={30} gid={one2oneChat.gid} />;
                } else {
                    avatarView = <MemberAvatar size={30} memberID={member.id} />;
                }
                const {displayName} = member;
                return (
                    <ListItem
                        data-gid={one2oneChat?.gid}
                        data-member={one2oneChat ? null : id}
                        onContextMenu={this.handleItemContextMenu}
                        key={member.id}
                        className="-rounded -items-center"
                        avatar={avatarView}
                        title={isEmptyString(displayName) ? <span className="-inline-block loading-holder -relative loading-holder-line">{displayName}</span> : displayName}
                        subtitle={deptsStore.getRoleName(member.role)}
                        href={`xxc://showContextMenu/member.profile/${member.id}`}
                        actions={badgeView}
                    />
                );
            }).filter(x => x !== null);
            if (listView.length === 0) {
                listView.push(<ListItem key="notFound" icon="information-outline" className="-items-center item muted disabled" title={<span className="title small">{Lang.string('common.notFoundOptions')}</span>} />);
            }
        }

        return (
            <div className={classes('dock app-contacts-view', className)} {...other}>
                <header className="heading dock dock-top">
                    <div className="title">
                        {membersLabel}
                        {loading ? <Spinner key="spinner" className="-inline-block" iconSize={18} /> : null}
                    </div>
                    <SearchControl
                        placeholder={Lang.string('common.search')}
                        onSearchChange={this.handleSearchChange}
                        ref={e => {this.searchControl = e;}}
                        style={{width: 170}}
                        changeDelay={500}
                    />
                    <Pager
                        page={pageID}
                        recPerPage={recPerPage}
                        recTotal={recTotal}
                        showFirstLast
                        onPageChange={this.handlePageChange}
                    />
                </header>
                <div className="content dock dock-bottom -overflow-y-auto scrollbar-hover">
                    <div className="app-member-list list compact">
                        {listView}
                    </div>
                </div>
            </div>
        );
    }
}
