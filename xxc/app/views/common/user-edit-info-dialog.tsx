import {Component} from 'react';
import Modal from '../../components/modal';
import InputControl from '../../components/input-control';
import Messager from '../../components/messager';
import {classes} from '../../utils/html-helper';
import {checkMobileFormat, checkEmailFormat, checkPhoneFormat} from '../../utils/string-helper';
import {isEmptyString} from '~/app/utils/check-empty';
import Lang from '../../core/lang';
import Button from '../../components/button';
import platform from '../../platform';
import socket from '../../core/server/socket';
import RadioGroup from '../../components/radio-group';
import Radio from '../../components/radio';
import membersStore from '../../core/members/members-store';

/**
 * 检查应用运行的操作系统类型是否是 macOS
 */
const {isOSX} = platform.env;

type UserEditInfoProps = {
    memberID: number;
    className?: string;
    disableCancel?: boolean;
    onFinish?: (result: boolean) => void;
};

type UserEditInfoState = {
    realname: string;
    gender: string;
    email: string;
    mobile: string;
    phone: string;
    weixin: string;
    qq: string;
    address: string;
    nameMsg: string;
    doing: boolean;
    member: Member;
    emailMsg: string;
    mobileMsg: string;
    phoneMsg: string;
};

/**
 * UserEditInfo-Dialog 组件 ，显示修改用户个人信息界面
 */
export class UserEditInfo extends Component<UserEditInfoProps, UserEditInfoState> {
    static defaultProps = {
        onFinish: null as (confirmed: boolean) => void,
        className: null as string,
        disableCancel: false,
    };

    membersChangeHandler: symbol;

    constructor(props: UserEditInfoProps) {
        super(props);
        const member = membersStore.getMember(props.memberID);
        this.state = {
            realname: member?.realname ?? '',
            gender: member?.gender ?? '',
            email: member?.email ?? '',
            mobile: member?.mobile ?? '',
            phone: member?.phone ?? '',
            weixin: member?.weixin ?? '',
            qq: member?.qq ?? '',
            address: member?.address ?? '',
            nameMsg: '',
            doing: false,
            member,
            emailMsg: '',
            mobileMsg: '',
            phoneMsg: '',
        };
    }

    override componentDidMount() {
        const {memberID} = this.props;
        this.membersChangeHandler = membersStore.subscribe(memberID, (newMember) => {
            this.setState({
                member: newMember,
                realname: newMember.realname || '',
                gender: newMember.gender || '',
                email: newMember.email || '',
                mobile: newMember.mobile || '',
                phone: newMember.phone || '',
                weixin: newMember.weixin || '',
                qq: newMember.qq || '',
                address: newMember.address || '',
            });
        });
    }

    override componentWillUnmount() {
        membersStore.unsubscribe(this.membersChangeHandler);
    }

    /**
     * 处理输入框值变更事件
     * @param name 属性名称
     * @param value 属性值
     */
    handleInputChange = (name: 'realname'|'email'|'mobile'|'phone'|'weixin'|'qq'|'address', value: string) => {
        let errorMsgName: 'nameMsg'|'emailMsg'|'mobileMsg'|'phoneMsg';
        switch (name) {
            case 'realname':
                errorMsgName = 'nameMsg';
                break;
            case 'email':
                errorMsgName = 'emailMsg';
                break;
            case 'mobile':
                errorMsgName = 'mobileMsg';
                break;
            case 'phone':
                errorMsgName = 'phoneMsg';
                break;
        }
        const state: Partial<UserEditInfoState> = {};
        if (errorMsgName) {
            state[errorMsgName] = '';
        }
        state[name] = value;
        this.setState(state as UserEditInfoState);
    };

    /**
     * 处理取消按钮点击事件
     */
    handleCancelBtnClick = () => {
        if (this.props.onFinish) {
            this.props.onFinish(false);
        }
    };

    /**
     * 处理确定按钮点击事件
     */
    handleConfirmBtnClick = () => {
        const {realname, gender, email, mobile, phone, weixin, qq, address} = this.state;
        let hasError = false;

        if (isEmptyString(realname)) {
            hasError = true;
            this.setState({nameMsg: Lang.format('user.changePassword.inputRequired', Lang.string('member.profile.realname'))});
        }
        if (email && !checkEmailFormat(email)) {
            hasError = true;
            this.setState({emailMsg: Lang.string('user.editInfo.emailError')});
        }

        if (mobile && !checkMobileFormat(mobile)) {
            hasError = true;
            this.setState({mobileMsg: Lang.string('user.editInfo.mobileError')});
        }
        if (phone && !checkPhoneFormat(phone)) {
            hasError = true;
            this.setState({phoneMsg: Lang.string('user.editInfo.telError')});
        }
        if (hasError) {
            return;
        }

        this.setState({doing: true});
        socket.changeUser({
            realname, gender, email, mobile, phone, weixin, qq, address
        }).then(() => {
            this.setState({doing: false});
            if (this.props.onFinish) {
                this.props.onFinish(true);
            }
        }).catch(error => {
            this.setState({doing: false});
            Messager.show(Lang.error(error) || Lang.string('user.editInfo.failed'), {type: 'danger'});
        });
    };

    override render() {
        const {className, disableCancel} = this.props;
        const {nameMsg, doing, member, realname, gender, emailMsg, mobileMsg, phoneMsg} = this.state;
        const buttons = [
            <Button
                key="btn-confirm"
                onClick={this.handleConfirmBtnClick}
                className="-text-white btn-wide -rounded bg-primary has-margin-sm"
                label={Lang.string('member.profile.save')}
            />,
        ];
        if (!disableCancel) {
            buttons.push(<Button
                key="btn-cancel"
                onClick={this.handleCancelBtnClick}
                className="btn-wide -rounded gray x-outline has-margin-sm"
                label={Lang.string('common.cancel')}
            />);
            if (isOSX) {
                buttons.reverse();
            }
        }
        return (
            <form className={classes('app-user-edit-info', className, '-min-w-[320px]', '-pt-2')} onSubmit={e => e.preventDefault()}>
                <div className={nameMsg ? '-flex -items-center user-info-item -mb-0' : '-flex -items-center user-info-item'}>
                    <InputControl
                        inputType="text"
                        className={nameMsg && (isEmptyString(realname) || realname.length < 2) ? 'has-error' : '-inline-block'}
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'realname')}
                        defaultValue={member.realname}
                        label={Lang.string('member.profile.realname')}
                        helpText={nameMsg}
                        isLabelInline
                    />
                    <i className="-inline-block text-red">*</i>
                </div>
                <div className="-flex -items-center user-info-item">
                    <span className="-inline-block user-info-edit-label -text-right">{Lang.string('member.profile.gender')}</span>
                    <RadioGroup onChange={this.handleInputChange.bind(this, 'gender')} className="-inline-block">
                        <Radio name="chat-category" label={Lang.string('member.gender.m')} value="m" checked={gender === 'm'} className="-inline-block" disabled={doing} />
                        <Radio name="chat-category" label={Lang.string('member.gender.f')} value="f" checked={gender === 'f'} className="-inline-block" disabled={doing} />
                    </RadioGroup>
                </div>
                <div className={emailMsg ? '-flex -items-center user-info-item -mb-0' : '-flex -items-center user-info-item'}>
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'email')}
                        className={emailMsg ? 'has-error' : ''}
                        defaultValue={member.email}
                        label={Lang.string('member.profile.email')}
                        helpText={emailMsg}
                        isLabelInline
                    />
                </div>
                <div className={mobileMsg ? '-flex -items-center user-info-item -mb-0' : '-flex -items-center user-info-item'}>
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'mobile')}
                        className={mobileMsg ? 'has-error' : ''}
                        defaultValue={member.mobile}
                        label={Lang.string('member.profile.mobile')}
                        helpText={mobileMsg}
                        isLabelInline
                    />
                </div>
                <div className={phoneMsg ? '-flex -items-center user-info-item -mb-0' : '-flex -items-center user-info-item'}>
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'phone')}
                        className={phoneMsg ? 'has-error' : ''}
                        defaultValue={member.phone}
                        label={Lang.string('member.profile.phone')}
                        helpText={phoneMsg}
                        isLabelInline
                    />
                </div>
                <div className="-flex -items-center user-info-item">
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'weixin')}
                        defaultValue={member.weixin}
                        label={Lang.string('member.profile.weixin')}
                        isLabelInline
                    />
                </div>
                <div className="-flex -items-center user-info-item">
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'qq')}
                        defaultValue={member.qq}
                        label="QQ"
                        isLabelInline
                    />
                </div>
                <div className="-flex -items-center user-info-item">
                    <InputControl
                        inputType="text"
                        disabled={doing}
                        onChange={this.handleInputChange.bind(this, 'address')}
                        defaultValue={member.address}
                        label={Lang.string('member.profile.address')}
                        isLabelInline
                    />
                </div>
                <div className="-text-center -py-2">
                    {buttons}
                </div>
            </form>
        );
    }
}

/**
 * 显示修改个人信息对话框
 * @param memberID 用户ID
 * @param callback 对话框显示回调函数
 */
export const showUserEditInfoDialog = (memberID: number, callback?: () => void) => {
    const modalId = 'user-edit-info';
    const onFinish = (result: boolean) => {
        Modal.hide(modalId);
        if (result) {
            Messager.show(Lang.string('user.editInfo.saveSuccess'), {type: 'success', autoHide: true});
        }
    };
    return Modal.show({
        actions: false,
        id: modalId,
        className: 'app-user-edit-info-dialog',
        content: <UserEditInfo onFinish={onFinish} memberID={memberID} />,
        title: Lang.string('user.editInfo.heading')
    }, callback);
};

export default {
    show: showUserEditInfoDialog,
};
