import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Lang from '../../core/lang';
import Modal from '../../components/modal';
import Icon from '../../components/icon';
import DialogActionButtons from '../common/dialog-action-buttons';
import MemberListItem from '../common/member-list-item';
import fuid from '../../utils/fuid';
import ChatListItem from './chat-list-item';
import SearchControl from '../../components/search-control';
import ChatsOptionList from './chats-option-list';
import ChatsMenu from './chats-menu';

/**
 * 渲染选择项
 * @param {function} handleClickItem 点击选择项的回调函数
 * @param {string|number} id 会话 GID 或成员 ID
 * @returns {JSX.Element} React node
 */
function renderSelectItem(handleClickItem, id) {
    if (typeof id === 'number') {
        return (
            <MemberListItem memberID={id} key={id} onClick={handleClickItem.bind(null, id)}>
                <Icon name="sprite-selection-remove" />
            </MemberListItem>
        );
    }
    return (
        <ChatListItem
            gid={id}
            key={id}
            grayOffline={false}
            onClick={handleClickItem.bind(null, id)}
        >
            <Icon name="sprite-selection-remove" />
        </ChatListItem>
    );
}

/**
 * 创建会话对话框组件
 * @returns {JSX.Element} React 渲染内容
 */
export class ChatsSelectDialog extends PureComponent {
    static propTypes = {
        selections: PropTypes.arrayOf(PropTypes.string),
        excludes: PropTypes.arrayOf(PropTypes.string),
        onFinish: PropTypes.func,
        selectTip: PropTypes.string,
        header: PropTypes.any,
    };

    static defaultProps = {
        selections: null,
        excludes: null,
        onFinish: null,
        selectTip: null,
        header: null,
    };

    /**
     * @constructor
     * @param {{selections: string[], excludes: Set<number>, onFinish: function(string[])}} props React 组件属性对象
     */
    constructor(props) {
        super(props);
        this.state = {
            selections: props.selections || [],
            menuType: 'recents',
            searchValue: '',
        };
    }

    /**
     * 处理选择事件
     * @param {string} menuType 菜单类型
     * @returns {void}
     */
    handleChatMenuSelect = (menuType) => {
        this.setState({menuType});
    };

    /**
     * 处理会话点击事件
     * @param {string | number} gid gid
     * @returns {void}
     */
    handleClickChat = (gid) => {
        const selectionsSet = new Set(this.state.selections);
        if (selectionsSet.has(gid)) {
            selectionsSet.delete(gid);
        } else {
            selectionsSet.add(gid);
        }
        this.setState({
            selections: Array.from(selectionsSet),
        });
    };

    /**
     * 处理确定按钮点击事件
     * @returns {void}
     */
    handleClickPrimaryBtn = () => {
        if (this.props.onFinish) {
            this.props.onFinish(this.state.selections);
        }
    };

    /**
     * 处理搜索值变更事件
     * @param {string} searchValue 搜索文本
     * @returns {void}
     */
    handleSearchChange = (searchValue) => {
        this.setState({searchValue});
    };

    render() {
        return (
            <div className="app-chats-select app-select-panel column single dock">
                {this.props.header ? (
                    <header className="dock-top app-select-panel-header -flex-none">
                        {this.props.header}
                    </header>
                ) : null}
                <div className="-flex-auto app-select-panel-body -relative">
                    <div className="dock-left single column divider-right" style={{width: 200, paddingLeft: 10, paddingTop: 10}}>
                        <header className="-flex-none heading">
                            <div className="title text-gray bold">{Lang.string('common.filter')}</div>
                        </header>
                        <div className="-flex-auto -overflow-y-auto">
                            <ChatsMenu onSelectMenuItem={this.handleChatMenuSelect} />
                        </div>
                    </div>
                    <div
                        className="dock single column divider-right"
                        style={{
                            left: 200, width: 200, paddingLeft: 10, paddingRight: 10, paddingTop: 10
                        }}
                    >
                        <header className="-flex-none">
                            <div className="title text-gray bold" style={{padding: '0.5rem 0'}}>{this.props.selectTip || Lang.string('chat.create.groupsTip')}</div>
                            <SearchControl
                                placeholder={Lang.string(`chats.search.${typeof this.state.menuType === 'number' ? 'contacts' : this.state.menuType}`, Lang.string('common.search'))}
                                onSearchChange={this.handleSearchChange}
                                style={{marginBottom: 6}}
                                changeDelay={500}
                            />
                        </header>
                        <div className="-flex-auto -overflow-y-auto">
                            <ChatsOptionList
                                type={this.state.menuType}
                                excludes={this.props.excludes}
                                selections={this.state.selections}
                                onClickChat={this.handleClickChat}
                                searchValue={this.state.searchValue}
                            />
                        </div>
                    </div>
                    <div
                        className="dock-right single column"
                        style={{
                            width: 200, paddingLeft: 10, paddingRight: 10, paddingTop: 10
                        }}
                    >
                        <header className="-flex-none heading space-sm">
                            <div className="title strong text-primary">{Lang.string('chat.invite.choosed')} ({this.state.selections.length})</div>
                        </header>
                        <div className="list compact -overflow-y-auto">
                            {this.state.selections.map(renderSelectItem.bind(null, this.handleClickChat))}
                        </div>
                    </div>
                </div>
                <DialogActionButtons
                    className="-flex-none divider-top -text-center has-padding-lg"
                    onClickPrimary={this.state.selections && this.state.selections.length ? this.handleClickPrimaryBtn : null}
                    onClickCancel={this.props.onFinish.bind(null, [])}
                />
            </div>
        );
    }
}

/**
 * 显示会话选择对话框
 * @param {Object} options 选项
 * @param {string[]=} options.selections 已经选中的会话 GID 列表
 * @param {string[]=} options.excludes 排除的会话 GID 列表
 * @param {string=} options.selectTip 选择会话时的提示
 * @param {function} callback 显示完成后的回调函数
 * @returns {Promise<string[]>} 使用 Promise 返回结果
 */
export const showChatsSelectDialog = (options = {}, callback = null) => {
    const {selections, excludes, selectTip} = options;

    return new Promise((resolve) => {
        const modalID = fuid();
        function handleFinish(selectedChats) {
            Modal.hide(modalID);
            resolve(selectedChats);
        }

        Modal.show({
            id: modalID,
            actions: false,
            closeButton: false,
            style: {width: 600, height: 500},
            content: <ChatsSelectDialog onFinish={handleFinish} selections={selections} excludes={excludes} selectTip={selectTip} />,
        }, callback);
    });
};

export default {
    show: showChatsSelectDialog,
};
