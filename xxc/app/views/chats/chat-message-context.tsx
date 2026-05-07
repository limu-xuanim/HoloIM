import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {classes, scrollIntoView} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Spinner from '../../components/spinner';
import MessageList from './message-list';
import ChatTitle from './chat-title';
import Lang from '../../core/lang';
import Button from '../../components/button';
import {ChatMessagesStoreModule} from '~/app/entries/vars/ChatMessagesStoreModule';

const {default: chatMessagesStore} = ChatMessagesStoreModule;

/**
 * 会话消息上下文插件组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @returns {JSX.Element} React Node content
 */
export default class ChatMessageContext extends PureComponent {
    static propTypes = {
        messageID: PropTypes.number.isRequired,
        cgid: PropTypes.string.isRequired,
        className: PropTypes.string,
        recPerPage: PropTypes.number,
        messageContentConverter: PropTypes.func,
        showScrollButton: PropTypes.bool,
    };

    static defaultProps = {
        className: null,
        recPerPage: 5,
        messageContentConverter: null,
        showScrollButton: false,
    };

    constructor(props) {
        super(props);
        this.state = {
            prevEnd: 0,
            nextBegin: 0,
            list: []
        };
    }

    componentDidMount() {
        this.tryRefresh();
    }

    componentDidUpdate() {
        this.tryRefresh();
    }

    componentWillUnmount() {
        if (this._highlightTimer) {
            clearTimeout(this._highlightTimer);
        }
        this._messageID = 0;
    }

    /**
     * 尝试刷新消息列表
     * @returns {void}
     */
    tryRefresh() {
        const {messageID} = this.props;
        if (this._messageID !== messageID) {
            this._messageID = messageID;
            this.setState({
                prevEnd: messageID - 1,
                nextBegin: messageID,
                list: []
            }, async () => {
                await this.loadNext();
                if (this._messageID !== messageID) {
                    return;
                }
                await this.loadPrev();

                this._highlightTimer = setTimeout(() => {
                    this.scrollToMessage();
                    this._highlightTimer = null;
                }, 500);
            });
        }
    }

    /**
     * 滚动到消息所在位置
     * @returns {void}
     */
    scrollToMessage() {
        if (this._messageList) {
            const {messageID} = this.props;
            const messageElement = this._messageList.querySelector(`#message-${messageID}`);
            if (messageElement) {
                messageElement.classList.add('highlight');
                scrollIntoView(messageElement, {behavior: 'smooth', block: 'center'});
            }
        }
    }

    /**
     * 向上加载更多消息
     * @returns {Promise} 使用 Promise 异步返回处理结果
     */
    loadNext = async () => {
        const {nextBegin} = this.state;
        if (!nextBegin) {
            return;
        }

        const {messageID, recPerPage, cgid} = this.props;
        const recTotal = nextBegin === messageID ? (recPerPage + 1) : recPerPage;
        const pager = {
            recPerPage: recTotal,
            pageID: 1,
            recTotal,
            pageTotal: 1,
            range: [nextBegin, Number.MAX_SAFE_INTEGER]
        };
        const {ids, list} = await chatMessagesStore.fetchChatMessagesByPage(cgid, {
            pager,
            reverse: false,
            putToCache: false,
        });
        if (this._messageID !== messageID) {
            return;
        }
        if (list && list.length) {
            this.setState(prevState => ({
                nextBegin: list.length < recTotal ? 0 : Math.max(...ids) + 1,
                list: [...prevState.list, ...list]
            }));
        } else {
            this.setState({nextBegin: 0});
        }
    };

    /**
     * 向下加载更多消息
     * @returns {Promise} 使用 Promise 异步返回处理结果
     */
    loadPrev = async () => {
        const {prevEnd} = this.state;
        if (!prevEnd) {
            return;
        }

        const {messageID, recPerPage, cgid} = this.props;
        const pager = {
            recPerPage,
            pageID: 1,
            recTotal: recPerPage,
            pageTotal: 1,
            range: [0, prevEnd]
        };
        const {ids, list} = await chatMessagesStore.fetchChatMessagesByPage(cgid, {
            pager,
            reverse: true,
            putToCache: false,
        });
        if (this._messageID !== messageID) {
            return;
        }
        if (list && list.length) {
            this.setState(prevState => ({
                prevEnd: list.length < recPerPage ? 0 : Math.min(...ids) - 1,
                list: [...list.reverse(), ...prevState.list]
            }));
        } else {
            this.setState({prevEnd: 0});
        }
    };

    /**
     * 获取消息列表元素引用
     * @param {Element} messageList 消息列表元素
     * @returns {void}
     */
    getRef = messageList => {
        this._messageList = messageList;
    };

    /**
     * 生成列表项属性对象
     * @returns {Record} 列表项属性对象
     */
    itemPropsGenerator = () => {
        const {messageContentConverter} = this.props;
        return {contentConverter: messageContentConverter};
    };

    render() {
        const {
            messageID, cgid, className, recPerPage, messageContentConverter, showScrollButton, ...others
        } = this.props;
        const {prevEnd, nextBegin, list} = this.state;

        return (
            <div className={classes('app-chat-message-context column single', className)} {...others}>
                <ChatTitle cgid={cgid} className="-flex-none" />
                {list.length ? (
                    <div className="-flex-auto user-selectable -overflow-y-auto -overflow-x-auto scrollbar-hover fluid">
                        <div className="box center-content">{prevEnd ? <a className="btn -block -rounded text-primary primary-pale" onClick={this.loadPrev}><Icon name="chevron-double-up" /> {Lang.string('common.loadMore')}</a> : <small className="muted">{Lang.string('chat.noMoreMessage')}</small>}</div>
                        <MessageList
                            listRef={this.getRef}
                            cgid={cgid}
                            className="use-font-size-13"
                            messagesOrIndexes={list}
                            listItemProps={this.itemPropsGenerator}
                            bubbleContextMenu
                        />
                        <div className="box center-content">{nextBegin ? <a className="btn -block -rounded text-primary primary-pale" onClick={this.loadNext}><Icon name="chevron-double-down" /> {Lang.string('common.loadMore')}</a> : <small className="muted">{Lang.string('chat.noMoreMessage')}</small>}</div>
                    </div>
                ) : <div className="-flex-auto center-content"><Spinner /></div>}
                {
                    showScrollButton && (
                        <Button
                            key="goToTopBtn"
                            onClick={() => {this.scrollToMessage();}}
                            title={Lang.string('chat.toolbar.scrollToTarget')}
                            icon="mdi-crosshairs-gps"
                            className="app-message-list-scroll-btn dock-right has-margin btn-lg btn-icon -rounded-full primary-pale has-badge shadow-1 dock dock-bottom"
                        />
                    )
                }
            </div>
        );
    }
}
