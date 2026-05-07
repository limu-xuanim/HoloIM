import React, {Component} from 'react';
import PropTypes from 'prop-types';
import hotkeys from 'hotkeys-js';
import {classes, scrollIntoView} from '../../utils/html-helper';
import {showContextMenu} from '../../core/context-menu';
import ChatListItem from './chat-list-item';
import ListItem from '../../components/list-item';
import Lang from '../../core/lang';
import {setActiveChat} from '../../core/im/chat-active-state';
import chatsStore from '../../core/im/chats-store';
import Spinner from '../../components/spinner';

/**
 * MenuSearchList 组件 ，显示聊天搜索结果列表界面
 */
export default class MenuSearchList extends Component {
    static propTypes = {
        className: PropTypes.string,
        search: PropTypes.string,
        filter: PropTypes.string,
        children: PropTypes.any,
        defaultPage: PropTypes.number,
        activeChatId: PropTypes.string,
        activeChatOnClick: PropTypes.bool,
    };

    static defaultProps = {
        className: null,
        search: null,
        filter: null,
        children: null,
        defaultPage: 1,
        activeChatId: null,
        activeChatOnClick: true,
    };

    constructor(props) {
        super(props);

        this.state = {
            select: '',
            chats: null,
            loading: false,
        };
    }

    componentDidMount() {
        hotkeys('up', 'chatsMenuSearch', e => {
            const {chats, selectIndex, maxIndex: length} = this;
            if (length > 1) {
                this.selectItem(chats[((selectIndex - 1) + length) % length]?.gid);
            } else if (length) {
                this.selectItem(chats[0]?.gid);
            }
            e.preventDefault();
        });
        hotkeys('down', 'chatsMenuSearch', e => {
            const {chats, selectIndex, maxIndex: length} = this;
            if (length > 1) {
                this.selectItem(chats[((selectIndex + 1) + length) % length]?.gid);
            } else if (length) {
                this.selectItem(chats[0]?.gid);
            }
            e.preventDefault();
        });
        hotkeys('enter', 'chatsMenuSearch', e => {
            if (this.props.activeChatOnClick && this._selectedChat) {
                setActiveChat(this._selectedChat.gid, {autoScrollBehavior: 'always,start'});
                document.getElementById('chatsMenuSearchInput').blur();
            }
            e.preventDefault();
        });
        hotkeys('esc', 'chatsMenuSearch', e => {
            document.getElementById('chatsMenuSearchInput').blur();
            e.preventDefault();
        });

        this.loadChats();
    }

    componentDidUpdate(prevProps) {
        const {search, filter} = this.props;
        if (prevProps.search !== search || prevProps.filter !== filter) {
            this.loadChats();
        }
    }

    componentWillUnmount() {
        hotkeys.deleteScope('chatsMenuSearch');
        this._unmounted = true;
    }

    /**
     * 根据关键字加载关联的会话
     * @returns {Promise<void>} Promise<void>
     */
    async loadChats() {
        const {search, filter} = this.props;
        if (search.length < 2 && encodeURIComponent(search) === search) {
            return;
        }
        this.setState({loading: true});
        const chats = await chatsStore.searchChats(search, {
            chatType: filter,
            excludeMemberIdList: false,
            includeReadonly: true,
            searchFromRemote: true,
            includeNotification: true
        });
        if (this._unmounted) {
            return;
        }
        this.selectItem({select: null, chats, loading: false});
    }

    /**
     * 选中会话
     * @param {Object|string} select 选中的会话或者要更新的状态对象
     * @returns {void}
     */
    selectItem(select) {
        const newState = {};
        if (typeof select === 'object') {
            Object.assign(newState, select);
        } else {
            newState.select = select;
        }
        this.setState(newState, this.scrollToSelectItem);
    }

    /**
     * 处理聊天右键菜单事件
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleItemContextMenu = event => {
        const {filter} = this.props;
        showContextMenu('chat.menu', {
            event,
            chat: event.currentTarget.getAttribute('data-gid'),
            menuType: filter,
            viewType: ''
        });
    };

    /**
     * 处理点击搜索菜单事件
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleItemClick = (event) => {
        if (this.props.activeChatOnClick) {
            const chat = chatsStore.getChat(event.currentTarget.attributes['data-gid'].value);
            setActiveChat(chat.gid, {autoScrollBehavior: 'always,start'});
        }
    };

    /**
     * 处理鼠标进入列表项事件
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleItemMouseEnter = (event) => {
        this.selectItem(event.currentTarget.attributes['data-gid'].value);
    };

    /**
     * 尝试滚动到已选择的搜索结果位置
     * 若有会话列表项被选中，尝试寻找其 DOM 并保证它在视野内
     * @returns {void}
     * @private
     */
    scrollToSelectItem = () => {
        const {select} = this.state;
        if (!select) {
            return;
        }
        const element = document.getElementById(`menuChatSearchListItem-${select}`);
        scrollIntoView(element, {behavior: 'smooth', block: 'nearest', ifNeed: true});
    };

    render() {
        const {
            search,
            filter,
            className,
            children,
            defaultPage,
            activeChatId,
            activeChatOnClick,
            ...other
        } = this.props;

        const {chats, loading} = this.state;
        const listViews = [];
        let headingView = null;
        let scrollClassName = '-overflow-y-auto scrollbar-hover';
        if (!loading) {
            if (chats && chats.length) {
                let {select} = this.state;
                if (!select) {
                    select = chats[0]?.gid;
                }

                this.chats = chats;

                const maxIndex = Math.min(chats.length, 50);
                this.maxIndex = maxIndex;

                for (let i = 0; i < maxIndex; i += 1) {
                    const chat = chats[i];
                    const isSelected = chat.gid === select;
                    if (isSelected) {
                        this._selectedChat = chat;
                        this.selectIndex = i;
                    }
                    listViews.push(<ChatListItem
                        onMouseEnter={this.handleItemMouseEnter}
                        onContextMenu={this.handleItemContextMenu}
                        onClick={this.handleItemClick}
                        onPointerDown={this.handleItemClick}
                        key={chat.gid}
                        data-gid={chat.gid}
                        gid={chat.gid}
                        showStatusDot
                        id={`menuChatSearchListItem-${chat.gid}`}
                        className={classes('item', {hover: isSelected})}
                    />);
                }

                headingView = <div className="title">{Lang.string('chat.menu.searchResult')} ({chats.length > maxIndex ? Lang.format('common.moreThan', maxIndex) : chats.length})</div>;
                if (chats.length > maxIndex) {
                    listViews.push(<ListItem key="resultInfo" style={{pointerEvents: 'none'}} icon="alert-circle-outline" className="-items-center item muted" title={<span className="title small">{Lang.string('chat.menu.resultTooMany')}</span>} />);
                }
            } else {
                headingView = <div className="title">{search.length < 2 && encodeURIComponent(search) === search ? Lang.string('chat.menu.searchTooShort') : Lang.format('chat.menu.emptySearchResultTip', search)}</div>;
            }
        } else {
            scrollClassName = 'overflow-hidden';
            listViews.push(<Spinner key="spinner" style={{marginTop: 4}} />);
        }

        return (
            <div className={classes(`app-menu-search-list ${scrollClassName} list compact`, className)} {...other}>
                <div className="heading">{headingView}</div>
                {listViews}
                {children}
            </div>
        );
    }
}
