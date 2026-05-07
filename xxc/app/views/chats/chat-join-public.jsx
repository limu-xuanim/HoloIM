import {Component} from 'react';
import PropTypes from 'prop-types';
import {classes, rem} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Avatar from '../../components/avatar';
import Messager from '../../components/messager';
import SearchControl from '../../components/search-control';
import Spinner from '../../components/spinner';
import Lang from '../../core/lang';
import {setRoutePath} from '../../core/ui/router';
import ChatListItem from './chat-list-item';
import {joinOrExitChat} from '../../core/im/im-server';
import chatsStore from '../../core/im/chats-store';
import {renderIf} from '~/app/utils/render';

/**
 * ChatJoinPublic 组件 ，显示一个加入公共讨论组界面
 */
export default class ChatJoinPublic extends Component {
    static propTypes = {
        className: PropTypes.string,
        children: PropTypes.any,
        onRequestClose: PropTypes.func,
    };

    static defaultProps = {
        className: null,
        children: null,
        onRequestClose: null,
    };

    constructor(props) {
        super(props);

        this.state = {
            choosed: null,
            search: '',
            chats: [],
            loading: true
        };
    }

    componentDidMount() {
        this.loadPublicChats();
    }

    componentWillUnmount() {
        this.unmounted = true;
    }

    /**
     * 加载公开讨论组
     * @returns {void}
     * @private
     */
    loadPublicChats() {
        this.setState({loading: true});
        chatsStore.fetchPublicChats().then(chats => {
            if (this.unmounted) return;
            this.setState({loading: false, chats});
        }).catch(error => {
            if (this.unmounted) return;
            this.setState({loading: false, chats: []});
            if (error) {
                Messager.show(Lang.error(error), {type: 'danger'});
            }
        });
    }

    /**
     * 处理搜索框值变更事件
     * @param {string} search 搜索字符串
     * @private
     * @returns {void}
     */
    handleSearchChange = search => {
        search = search && search.toLowerCase();
        this.setState({search});
    };

    /**
     * 处理点击刷新按钮事件
     * @private
     * @returns {void}
     */
    handleRefreshBtnClick = () => {
        this.loadPublicChats();
    };

    /**
     * 处理点击加入按钮事件
     * @private
     * @returns {void}
     */
    handleJoinBtnClick = () => {
        const {choosed} = this.state;
        joinOrExitChat(choosed).then(chat => {
            setRoutePath('chats', 'groups', chat.gid);
            const {onRequestClose} = this.props;
            if (onRequestClose) {
                onRequestClose();
            }
            return chat;
        }).catch(error => {
            if (error) {
                Messager.show(Lang.error(error), {type: 'danger'});
            }
        });
    };

    /**
     * 处理点击聊天条目事件
     * @param {Chat} chat 聊天对象
     * @private
     * @returns {void}
     */
    handleChatItemClick(chat) {
        this.setState({choosed: chat});
    }

    /**
     * 判断给定的聊天是否匹配搜索字符串
     *
     * @param {Chat} chat 聊天对象
     * @returns {boolean} 如果返回 `true` 则为是匹配搜索字符串，否则为不是匹配搜索字符串
     * @private
     */
    isMatchSearch(chat) {
        const {search} = this.state;
        if (!search.length) {
            return true;
        }
        const chatName = chat.name.toLowerCase();
        return chatName.includes(search) || chat.gid === search;
    }

    /**
     * 判断给定的聊天是否是选中的聊天
     *
     * @param {Chat} chat 聊天对象
     * @returns {boolean} 如果返回 `true` 则为是选中的聊天，否则为不是选中的聊天
     * @private
     */
    isChoosed(chat) {
        return this.state.choosed && this.state.choosed.gid === chat.gid;
    }

    render() {
        const {
            className,
            children,
            onRequestClose,
            ...other
        } = this.props;

        const {choosed} = this.state;

        return (
            <div
                {...other}
                className={classes('app-chat-join-public column single', className)}
            >
                <div className="x-list-item divider -flex-none">
                    <Avatar icon="arrow-right" iconClassName="text-muted icon-2x" />
                    <div className="title">{Lang.string('chat.create.joinGroupTip')}</div>
                    <div className="-flex-none">
                        <button type="button" onClick={this.handleJoinBtnClick} disabled={!choosed} className="btn primary -rounded">{choosed ? Lang.format('chat.create.joinGroup.format', choosed.name) : Lang.string('chat.create.join')}</button>
                    </div>
                </div>
                <div className="white cell">
                    <div className="column single">
                        <div className="cell heading -flex-none has-padding">
                            <nav className="-flex-auto">
                                <a className={classes('btn text-primary -rounded', {disabled: this.state.loading})} onClick={this.handleRefreshBtnClick}>{Lang.string('common.refresh')}</a>
                            </nav>
                            <SearchControl defaultValue={this.state.search} onSearchChange={this.handleSearchChange} className="-flex-none" style={{width: rem(200)}} placeholder={Lang.string('common.search')} />
                        </div>
                        <div className="cell -overflow-y-auto has-padding -relative">
                            <div className="list fluid compact app-chat-join-public-chat-list">
                                {
                                    !this.state.loading && this.state.chats.map(chat => {
                                        if (!chatsStore.getChat(chat.gid) && this.isMatchSearch(chat)) {
                                            const isChoosed = this.isChoosed(chat);
                                            return (
                                                <ChatListItem
                                                    className={isChoosed ? 'item primary-pale space-sm' : 'item space-sm'}
                                                    onClick={this.handleChatItemClick.bind(this, chat)}
                                                    key={chat.gid}
                                                    gid={chat.gid}
                                                >{renderIf(isChoosed) && <Icon name="check text-success" />}</ChatListItem>
                                            );
                                        }
                                        return null;
                                    })
                                }
                                {this.state.loading && <div className="dock center-content"><Spinner className="text-primary" iconSize={36} /></div>}
                            </div>
                        </div>
                    </div>
                </div>
                {children}
            </div>
        );
    }
}
