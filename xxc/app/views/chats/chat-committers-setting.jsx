import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import Icon from '../../components/icon';
import Lang from '../../core/lang';
import Chat from '../../core/im/chat';
import SelectBox from '../../components/select-box';
import Checkbox from '../../components/checkbox';
import {getChatMembers} from '../../core/im/chat-helper';
import chatsStore, {fetchChatMembersFromRemote} from '../../core/im/chats-store';

/**
 * ChatCommittersSetting 组件 ，显示设置聊天白名单界面
 */
export default class ChatCommittersSetting extends PureComponent {
    static propTypes = {
        chat: PropTypes.instanceOf(Chat),
        className: PropTypes.string,
        children: PropTypes.any,
    };

    static defaultProps = {
        chat: null,
        className: null,
        children: null,
    };

    constructor(props) {
        super(props);

        const {chat} = props;
        const type = chat.committersType;
        const chatMembers = getChatMembers(chat);
        const whitelist = chat.whitelist || new Set();

        this.state = {
            type,
            whitelist,
            chatMembers,
        };
    }

    async componentDidMount() {
        let {chatMembers} = this.state;
        if (chatMembers.length) {
            return;
        }

        let {chat} = this.props;
        await fetchChatMembersFromRemote(chat.gid);
        chat = chatsStore.getChat(chat.gid);
        chatMembers = [...chat.members];

        this.setState({
            chatMembers,
        });
    }

    /**
     * 获取白名单设置字符串
     *
     * @returns {string} 白名单设置字符串
     */
    getCommitters() {
        const {type} = this.state;
        if (type === 'whitelist') {
            return this.state.whitelist;
        }
        return '';
    }

    /**
     * 处理白名单类型变更事件
     * @param {string} type 白名单类型
     * @private
     * @returns {void}
     */
    handleSelectChange = type => {
        this.setState({type});
    };

    /**
     * 处理成员复选框选中变更事件
     * @param {number} memberId 成员 ID
     * @param {boolean} isChecked 是否选中
     * @private
     * @returns {void}
     */
    handleCheckboxChange(memberId, isChecked) {
        const {whitelist} = this.state;
        if (isChecked) {
            whitelist.add(memberId);
        } else {
            whitelist.delete(memberId);
        }
        this.setState({whitelist});
        this.forceUpdate();
    }

    render() {
        const {
            chat,
            className,
            children,
            ...other
        } = this.props;

        const {
            whitelist,
            type,
            chatMembers,
        } = this.state;

        const options = [
            {value: Chat.COMMITTERS_TYPES.all, label: `${Lang.string('chat.committers.type.all')}(${chatMembers.length})`},
            {value: Chat.COMMITTERS_TYPES.whitelist, label: `${Lang.string('chat.committers.type.whitelist')}(${whitelist.size})`},
        ];

        return (
            <div
                {...other}
                className={classes('app-chat-committers-setting', className)}
            >
                <div className="text-gray space-sm -flex -items-center"><Icon name="information-outline" />&nbsp; {Lang.string('chat.committers.committersSettingTip')}</div>
                <SelectBox className="space-sm" style={{width: '50%'}} value={type} options={options} onChange={this.handleSelectChange} />
                {
                    type === 'whitelist' && (
                        <div className="checkbox-list -rounded box x-outline">
                            {
                                chatMembers.map(member => (
                                    <Checkbox
                                        key={member.id}
                                        className="-inline-block"
                                        onChange={this.handleCheckboxChange.bind(this, member.id)}
                                        checked={whitelist.has(member.id)}
                                        label={member.displayName}
                                    />
                                ))
                            }
                        </div>
                    )
                }
                {children}
            </div>
        );
    }
}
