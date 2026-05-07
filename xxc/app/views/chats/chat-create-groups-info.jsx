import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Lang from '../../core/lang';
import Radio from '../../components/radio';
import RadioGroup from '../../components/radio-group';
import InputControl from '../../components/input-control';
import Button from '../../components/button';
import platform from '../../platform';
import {isEmptyString} from '../../utils/check-empty';

/**
 * 检查应用运行的操作系统类型是否是 macOS
 * @type {boolean}
 * @private
 * @constant
 */
const {isOSX} = platform.env;

/**
 * ChatCreateGroupsInfo 组件 ，显示创建群，群信息
 */
export default class ChatCreateGroupsInfo extends Component {
    static propTypes = {
        onRequestClose: PropTypes.func,
    };

    static defaultProps = {
        onRequestClose: null,
    };

    constructor(props) {
        super(props);
        this.state = {
            avatar: 'default',
            visibility: 'private',
            name: '',
        };
    }

    /**
     * 处理请求关闭父级对话框
     * @private
     * @param {any} result 操作结果
     * @param {any} options 额外选项
     * @returns {void}
     */
    requestClose(result, options = {}) {
        const {onRequestClose} = this.props;
        if (onRequestClose) {
            onRequestClose(result, options);
        }
    }

    /**
     * 处理值变更事件
     * @param {String} type 返回 radio value
     * @param {Event} e 事件对象
     * @private
     * @returns {void}
     */
    handleRadioChange = (type, e) => {
        const {name} = e.target;
        if (name === 'visibility') {
            this.setState({
                [name]: type
            });
        } else if (name === 'avatar') {
            this.setState({
                [name]: type
            });
        }
    };

    /**
     * 处理讨论组名称变更事件
     * @param {string} name 讨论组名称
     * @private
     * @returns {void}
     */
    handleGroupNameChange = name => {
        this.setState({name});
    };

    /**
     * 处理新建按钮点击事件
     * @private
     * @returns {void}
     */
    handleCreateBtnClick = () => {
        const {name, visibility} = this.state;
        this.requestClose({
            name,
            public: visibility === 'public',
        });
    };

    render() {
        const {visibility, avatar, name} = this.state;

        const buttons = [
            <Button disabled={isEmptyString(name.trim())} key="btn-confirm" className="btn-wide bg-primary -rounded" onClick={this.handleCreateBtnClick} label={Lang.string('chat.group.start')} />,
            <Button key="btn-cancel" className="gray x-outline cancel-btn btn-wide -rounded" onClick={this.requestClose.bind(this, null)} label={Lang.string('common.cancel')} />,
        ];
        if (isOSX) {
            buttons.reverse();
        }

        return (
            <div className="chat-create-groups-info">
                <div className="-flex -justify-between">
                    <div className="groups-name item">
                        <p className="title">{Lang.string('chat.group.name')}</p>
                        <InputControl
                            label={false}
                            autoFocus
                            defaultValue={name}
                            onChange={this.handleGroupNameChange}
                            inputProps={{maxLength: 16}}
                        />
                        <p className="title small">{Lang.string('chat.group.limited')}</p>
                    </div>
                </div>
                <div className="actions toolbar dock-bottom divider-top -text-center has-padding-lg">{buttons}</div>
            </div>
        );
    }
}
