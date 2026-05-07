import React, {Component} from 'react';
import PropTypes from 'prop-types';
import md5 from 'md5';
import Modal from '../../components/modal';
import InputControl from '../../components/input-control';
import Messager from '../../components/messager';
import {classes} from '../../utils/html-helper';
import {isEmptyString} from '../../utils/check-empty';
import Lang from '../../core/lang';
import Button from '../../components/button';
import platform from '../../platform';
import socket from '../../core/server/socket';
import {getCurrentUser} from '../../core/profile';

/**
 * 检查应用运行的操作系统类型是否是 macOS
 * @type {boolean}
 * @private
 * @constant
 */
const {isOSX} = platform.env;

/**
 * UserChangePassword-Dialog 组件 ，显示修改用户密码界面
 */
export class UserChangePassword extends Component {
    static propTypes = {
        onFinish: PropTypes.func,
        header: PropTypes.node,
        className: PropTypes.string,
        disableCancel: PropTypes.bool,
    };

    static defaultProps = {
        onFinish: null,
        header: null,
        className: null,
        disableCancel: false,
    };

    constructor(props) {
        super(props);

        this.state = {
            password1: '',
            password2: '',
            message: '',
            doing: false
        };
    }

    /**
     * 处理输入框值变更事件
     * @param {string} name 属性名称
     * @param {string} value 属性值
     * @private
     * @returns {void}
     */
    handleInputChange(name, value) {
        this.setState({[name]: value, message: ''});
    }

    /**
     * 处理取消按钮点击事件
     * @private
     * @returns {void}
     */
    handleCancelBtnClick = () => {
        if (this.props.onFinish) {
            this.props.onFinish(false);
        }
    };

    /**
     * 处理确定按钮点击事件
     * @private
     * @returns {void}
     */
    handleConfirmBtnClick = () => {
        const {password1, password2} = this.state;

        if (isEmptyString(password1)) {
            return this.setState({message: Lang.format('user.changePassword.inputRequired', Lang.string('user.changePassword.newPassword'))});
        }
        if (password1.length < 6) {
            return this.setState({message: Lang.string('user.changePassword.denySimplePassword')});
        }
        if (isEmptyString(password2)) {
            return this.setState({message: Lang.format('user.changePassword.inputRequired', Lang.string('user.changePassword.newPasswordRepeat'))});
        }
        if (password1 !== password2) {
            return this.setState({message: Lang.string('user.changePassword.passwordNotSame')});
        }
        const {authKeyInfo} = getCurrentUser();
        if (authKeyInfo && authKeyInfo.type === 'password' && authKeyInfo.key === md5(password1)) {
            return this.setState({message: Lang.string('user.changePassword.notChanged')});
        }

        this.setState({doing: true});
        socket.changeUserPassword(password1).then(() => {
            this.setState({doing: false});
            if (this.props.onFinish) {
                this.props.onFinish(true);
            }
        }).catch(error => {
            this.setState({
                message: Lang.error(error) || Lang.string('user.changePassword.failed'),
                doing: false
            });
        });
    };

    render() {
        const {
            onFinish,
            className,
            header,
            disableCancel,
            ...other
        } = this.props;
        const {
            message, doing, password1, password2
        } = this.state;
        const buttons = [
            <Button key="btn-confirm" onClick={this.handleConfirmBtnClick} className="-text-white btn-wide -rounded bg-primary has-margin-sm" label={Lang.string('user.changePassword.btn.confirm')} />,
        ];
        if (!disableCancel) {
            buttons.push(<Button key="btn-cancel" onClick={this.handleCancelBtnClick} className="btn-wide -rounded gray x-outline has-margin-sm" label={Lang.string('common.cancel')} />);
            if (isOSX) {
                buttons.reverse();
            }
        }

        return (
            <div className={classes('app-user-change-pwd', className)} {...other}>
                {header}
                {message && <div className="box danger -rounded space-sm">{message}</div>}
                <InputControl inputType="password" className={message && (isEmptyString(password1) || password1 !== password2) ? 'has-error' : ''} disabled={doing} onChange={this.handleInputChange.bind(this, 'password1')} defaultValue={password1} label={Lang.string('user.changePassword.newPassword')} />
                <InputControl inputType="password" className={message && (isEmptyString(password2) || password1 !== password2) ? 'has-error' : ''} disabled={doing} onChange={this.handleInputChange.bind(this, 'password2')} defaultValue={password2} label={Lang.string('user.changePassword.newPasswordRepeat')} />
                <div className="has-padding-v -text-center">
                    {buttons}
                </div>
            </div>
        );
    }
}

/**
 * 显示修改密码对话框
 * @param {function} callback 对话框显示回调函数
 * @returns {void}
 */
export const showUserChangePasswordDialog = (callback) => {
    const modalId = 'user-change-pwd';
    const onFinish = result => {
        Modal.hide(modalId);
        if (result) {
            Messager.show(Lang.string('user.changePassword.success'), {type: 'success', autoHide: true});
        }
    };
    return Modal.show({
        actions: false,
        id: modalId,
        className: 'app-user-change-pwd-dialog',
        content: <UserChangePassword onFinish={onFinish} />,
        title: Lang.string('user.changePassword.heading')
    }, callback);
};

export default {
    show: showUserChangePasswordDialog,
};
