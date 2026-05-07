import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Lang from '../../core/lang';
import Modal from '../../components/modal';
import DialogActionButtons from './dialog-action-buttons';
import fuid from '../../utils/fuid';
import SearchControl from '../../components/search-control';
import MemberSelectRadio from './member-select-radio';

/**
 * 创建成员单选组件
 * @param {{selection: number, excludes: Set<number>, onFinish: function(number)}} props React 组件属性对象
 * @returns {JSX.Element} React 渲染内容
 */

export class MemberSelectDialog extends PureComponent {
    /**
     * React 组件属性类型检查
     * @see https://zh-hans.reactjs.org/docs/typechecking-with-proptypes.html
     * @type {Record<string, PropTypes.Validator>}
     */
    static propTypes = {
        chatGid: PropTypes.string,
        selection: PropTypes.number,
        excludes: PropTypes.arrayOf(PropTypes.number),
        onFinish: PropTypes.func,
        selectTip: PropTypes.string,
    };

    /**
     * React 组件默认属性
     * @see https://zh-hans.reactjs.org/docs/react-component.html#defaultprops
     * @type {Record<string, any>}
     */
    static defaultProps = {
        chatGid: null,
        selection: null,
        excludes: null,
        onFinish: null,
        selectTip: null,
    };

    /**
     * React 组件构造函数，创建一个 MembersSelectDialog 组件实例，会在装配之前被调用。
     * @see https://zh-hans.reactjs.org/docs/react-component.html#constructor
     * @param {Object?} props 组件属性对象
     * @constructor
     */
    constructor(props) {
        super(props);
        this.state = {
            chatGid: this.props.chatGid || null,
            selection: this.props.selection || null,
            searchValue: '',
        };
    }

    handleClickMember = (id) => {
        this.setState({
            selection: id,
        });
    };

    handleClickPrimaryBtn = () => {
        if (this.props.onFinish) {
            this.props.onFinish(this.state.selection);
        }
    };

    handleClickCancelBtn = () => {
        if (this.props.onFinish) {
            this.props.onFinish(null);
        }
    };

    handleSearchChange = (searchValue) => {
        this.setState({searchValue});
    };

    render() {
        const {
            chatGid, selection, searchValue
        } = this.state;
        const {selectTip, excludes} = this.props;

        return (
            <div className="app-members-select app-select-panel dock">
                <div
                    className="dock single column divider-right"
                    style={{
                        width: 300, paddingLeft: 10, paddingRight: 10
                    }}
                >
                    <header className="-flex-none">
                        <div className="title text-gray bold" style={{padding: '0.5rem 0'}}>{selectTip || Lang.string('chat.group.members')}</div>
                        <SearchControl
                            placeholder={Lang.string('common.search')}
                            onSearchChange={this.handleSearchChange}
                            style={{marginBottom: 6}}
                            changeDelay={500}
                        />
                    </header>
                    <div className="-flex-auto -overflow-y-auto">
                        <MemberSelectRadio
                            chatGid={chatGid}
                            excludes={excludes}
                            selection={selection}
                            searchValue={searchValue}
                            onClickMember={this.handleClickMember}
                            onMembersChange={this.handleMembersChange}
                        />
                    </div>
                </div>
                <DialogActionButtons
                    className="dock-bottom divider-top -text-center has-padding-lg"
                    onClickPrimary={selection ? this.handleClickPrimaryBtn : null}
                    onClickCancel={this.handleClickCancelBtn}
                />
            </div>

        );
    }
}

/**
 * 显示用户选择对话框
 * @param {Object} options 选项
 * @param {number[]} options.selections 已经选中的用户 ID 列表
 * @param {number[]} options.excludes 排除的用户 ID 列表
 * @param {string} options.selectTip 选择用户时的提示
 * @param {function} callback 显示完成后的回调函数
 * @returns {Promise<number>} 使用 Promise 返回结果
 */
export const showMemberSelectDialog = (options = {}, callback = null) => {
    const {
        chatGid, selection, excludes, selectTip
    } = options;

    return new Promise((resolve) => {
        const modalID = fuid();
        function handleFinish(selectedMember) {
            Modal.hide(modalID);
            resolve(selectedMember);
        }

        Modal.show({
            id: modalID,
            actions: false,
            closeButton: false,
            style: {width: 300, height: 500},
            content: <MemberSelectDialog onFinish={handleFinish} chatGid={chatGid} selection={selection} excludes={excludes} selectTip={selectTip} />,
        }, callback);
    });
};

export default {
    show: showMemberSelectDialog,
};
