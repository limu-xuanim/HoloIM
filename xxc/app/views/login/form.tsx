import {PureComponent} from 'react';
import PropTypes from 'prop-types';
import to from 'await-to-js';
import Icon from '~/app/components/icon';
import Config from '~/app/config';
import InputControl, {type InputControlRef} from '~/app/components/input-control';
import Modal from '~/app/components/modal';
import Lang, {onLangChange} from '~/app/core/lang';
import {getLastSavedUser, emitUserAutoLoginEvent} from '~/app/core/profile';
import User, {AUTH_PASSWORD_FLAG, AUTH_TOKEN_FLAG} from '~/app/core/profile/user';
import {getUserListFromStore} from '~/app/core/profile/user-store';
import {login} from '~/app/core/server';
import {isAutoLoginNextTime} from '~/app/core/ui';
import {getUpdaterStatus} from '~/app/core/updater';
import platform from '~/app/platform';
import CodedError, {Codes} from '~/app/utils/coded-error';
import {classes, getSearchParam, parseSearchParams} from '~/app/utils/html-helper';
import {isNotEmptyString} from '~/app/utils/check-empty';
import {showUpdateGuideDialog} from '../common/update-guide-dialog';
import {showNetDiagnosticsDialog} from './net-diagnostics-dialog';
import showSwapUserDialog from './swap-user-dialog';
import Checkbox from '~/app/components/checkbox';
import Dropdown from '~/app/components/floating-ui/dropdown';

// 从平台访问对象获取模块功能
const {ui: platformUI} = platform.modules;

/**
 * 是否为第一次显示登录界面
 */
let isFirstShowLoginForm = true;

/**
 * 不需要显示“网络诊断”按钮的错误码列表
 */
const hideDiagnoseNetworkErrorList = ['HTTP_STATUS_401', 'HTTP_STATUS_402', 'HTTP_STATUS_403', 'HTTP_STATUS_405', Codes.INVALID_TOKEN, Codes.INVALID_URL] as const;

type LoginFormProps = React.HTMLAttributes<HTMLFormElement>
    & Partial<{className: string; logging: boolean;}>;

type LoginFormState = {
    account: string;
    password: string;
    serverUrl: string;
    rememberMe: boolean;
    autoLogin: boolean;
    logging: boolean;
    showServerInput: boolean;
    showDiagnoseBtn: boolean;
    message: string;
    loginError: CodedError | null;
    showPassword: boolean;
};

/**
 * Form 组件 ，显示登录表单界面
 */
export default class LoginForm extends PureComponent<LoginFormProps, LoginFormState> {
    static propTypes = {
        className: PropTypes.string,
        logging: PropTypes.bool,
    };

    static defaultProps = {
        className: null as string | null,
        logging: false,
    };

    private lockServer: boolean;

    private isFirstShowLoginForm: boolean;

    private unsubLangChange: () => void;

    private unmounted: boolean;

    private autoLoginOnOpen: boolean;

    private userList: any[];

    private showUpdateDialogTask: NodeJS.Timeout;

    private loginUserData: { server: string; account: string; authKey: string; rememberMe: boolean; autoLogin: boolean; };

    private passwordInput: InputControlRef;

    /**
     * React 组件构造函数，创建一个 Form 组件实例，会在装配之前被调用。
     * @see https://react.docschina.org/docs/react-component.html#constructor
     * @param props 组件属性对象
     */
    constructor(props: LoginFormProps) {
        super(props);

        PERF_MARK('loginFormCreateStart');

        const defaultUser = {
            server: '',
            account: '',
            password: '',
            rememberMe: true,
            autoLogin: false,
            showServerInput: false,
            ...Config.ui.defaultUser,
            ...parseSearchParams(getSearchParam())
        };
        if (!defaultUser.authKey) {
            if (defaultUser.password) {
                defaultUser.authKey = `${AUTH_PASSWORD_FLAG}${defaultUser.password}`;
            } else if (defaultUser.token) {
                defaultUser.authKey = `${AUTH_TOKEN_FLAG}${defaultUser.token}`;
            }
        }

        /**
         * 是否锁定了服务器地址（不提供更改服务器地址输入框）
         */
        this.lockServer = !!(defaultUser.server && defaultUser.lock);
        const state = {
            serverUrl: defaultUser.server,
            account: defaultUser.account,
            password: defaultUser.authKey,
            rememberMe: defaultUser.rememberMe,
            autoLogin: defaultUser.autoLogin,
            showServerInput: PERF,
            message: '',
            messageDetail: '',
            logging: false,
            showDiagnoseBtn: false,
            loginError: null as CodedError | null,
            showPassword: false,
        };

        const lastSavedUser = getLastSavedUser();
        if (lastSavedUser && (!state.account || (state.account === lastSavedUser.account))) {
            if (!this.lockServer) {
                state.serverUrl = ('serverUrl' in lastSavedUser && lastSavedUser.serverUrl) || lastSavedUser.server || '';
            }
            state.account = lastSavedUser.account || '';
            state.password = defaultUser.password ? defaultUser.authKey : lastSavedUser.rememberMe ? lastSavedUser.authKey : '';
            state.rememberMe = lastSavedUser.rememberMe;
            state.autoLogin = lastSavedUser.autoLogin;
        }

        if (state.serverUrl) {
            state.serverUrl = User.simplifyServerUrl(state.serverUrl);
        } else {
            state.showServerInput = true;
        }

        let denyAutoLogin = false;
        if ('isFirstMainWindow' in platformUI) {
            denyAutoLogin = !platformUI.isFirstMainWindow();
        }

        /**
         * 是否在显示界面后自动登录
         */
        const submitable = isNotEmptyString(state.serverUrl) && isNotEmptyString(state.account) && isNotEmptyString(state.password);
        this.isFirstShowLoginForm = isFirstShowLoginForm;
        this.autoLoginOnOpen = isFirstShowLoginForm && !PERF && !denyAutoLogin && submitable && (state.autoLogin || isAutoLoginNextTime());
        isFirstShowLoginForm = false;

        if (this.autoLoginOnOpen) {
            state.logging = true;
        }

        this.state = state;
    }

    public override componentDidMount() {
        if (this.autoLoginOnOpen) {
            document.body.classList.add('app-auto-logging');

            this.login().then(result => {
                emitUserAutoLoginEvent(result ? 'success' : 'fail');
            }).finally(() => {
                document.body.classList.remove('app-auto-logging');
            });
        } else if (this.isFirstShowLoginForm) {
            emitUserAutoLoginEvent('skip');
        }

        this.userList = getUserListFromStore();
        this.unsubLangChange = onLangChange(() => {
            this.forceUpdate();
        });

        PERF_MARK('loginFormCreated', 'loginFormCreateStart', 'loginFormCreateTime');
    }

    public override componentWillUnmount() {
        this.unmounted = true;
        this.unsubLangChange();
    }

    private async login() {
        if (this.showUpdateDialogTask) {
            clearTimeout(this.showUpdateDialogTask);
            this.showUpdateDialogTask = null;
        }
        const {
            account,
            password,
            serverUrl,
            rememberMe,
            autoLogin,
        } = this.state;

        let originError;

        let url = serverUrl.trim();
        url = url.endsWith('/') ? url.slice(0, -1) : url; // 判断最后一个字符是否为'/',如果是就删除最后一个字符，因为后面会用'/'来进行分隔判断
        let urlObj: URL;
        try {
            if (url.startsWith('http://') || url.startsWith('https://')) { // 判断url是否有协议，如果有才能塞到URL中
                urlObj = new URL(url);
                urlObj.protocol = 'https:';
                url = urlObj.toString();
                url = urlObj.pathname.split('/').length > 2 ? `${urlObj.protocol}//${urlObj.hostname}` : url; // 如果有一个以上的'/'，则返回不带端口号的host
            } else {
                urlObj = new URL(`https://${url}`); // 如果不带协议，那么就给他加一个协议用来构造URL
                url = urlObj.pathname.split('/').length > 2 ? urlObj.hostname : url; // 如果有一个以上的'/',则返回不带协议和端口号的host
            }
            this.loginUserData = {
                server: url,
                account,
                authKey: password,
                rememberMe,
                autoLogin,
            };
            PERF_MARK('loginBegin');
            [originError] = await to(login(this.loginUserData));
            if (this.unmounted) {
                return false;
            }
        } catch (e) {
            originError = e.message === 'Failed to construct \'URL\': Invalid URL' ? new CodedError(Codes.INVALID_URL) : e.message;
        }

        if (originError) {
            const error = CodedError.create(originError);
            if (DEBUG) {
                console.collapse('Login.error', 'redBg', error.message, 'redPale');
                console.error({error});
                console.groupEnd();
            }
            const message = Lang.error(error);
            const newState: Partial<LoginFormState> = {
                message,
                logging: false,
                loginError: error,
                showDiagnoseBtn: !hideDiagnoseNetworkErrorList.find(x => x === error.code)
            };

            const isIdentifyFailed = error.code === 'HTTP_STATUS_401' || error.code === Codes.INVALID_TOKEN;
            if (isIdentifyFailed) {
                newState.password = '';
            }

            this.setState(newState as LoginFormState, isIdentifyFailed ? () => {
                this.passwordInput?.focus();
            } : undefined);

            if (error.code === 'CLIENT_REQUIRE_UPDATE') {
                showUpdateGuideDialog();
            }
            PERF_MARK('loginEndWithError', 'loginBegin', 'loginTime');
            return false;
        }

        this.setState({logging: false, showServerInput: false});
        const {needUpdateOptional, skipped} = getUpdaterStatus();
        if (needUpdateOptional && !skipped) {
            this.showUpdateDialogTask = setTimeout(showUpdateGuideDialog, 3000);
        }
        PERF_MARK('loginEnd', 'loginBegin', 'loginTime');
        return true;
    }

    /**
     * 处理输入框变更事件
     * @param field 输入框 ID
     * @param value 输入框值
     */
    private handleInputFieldChange(field: 'account'|'password'|'serverUrl', value: string) {
        const {account, password, serverUrl} = this.state;
        const userState = {
            account,
            password,
            serverUrl,
            message: ''
        };
        userState[field] = value;

        if (field === 'account' && (password?.startsWith(AUTH_TOKEN_FLAG) || !password?.length)) {
            const theUser = this.userList.find(user => user.server === serverUrl && user.account === value);
            userState.password = theUser?.authKey || '';
        }

        this.setState(userState);
    }

    /**
     * 处理记住密码复选框变更事件
     * @param rememberMe 是否记住密码
     */
    private handleRememberPasswordChanged = (rememberMe: boolean) => {
        const {autoLogin} = this.state;
        this.setState({
            rememberMe,
            autoLogin: !rememberMe ? false : autoLogin
        });
    };

    /**
     * 处理自动登录复选框变更事件
     * @param autoLogin 是否自动登录
     */
    private handleAutoLoginChanged = (autoLogin: boolean) => {
        const {rememberMe} = this.state;
        this.setState({
            autoLogin,
            rememberMe: autoLogin ? true : rememberMe
        });
    };

    /**
     * 处理点击登录按钮事件
     */
    private handleLoginBtnClick = () => {
        this.setState({
            logging: true,
            message: '',
        }, async () => {
            const {serverUrl} = this.state;
            if (Config.ui['login.skipHTTPSecurityAlert'] || !serverUrl.toLowerCase().startsWith('http://')) {
                this.login();
                return;
            }
            const [error, result] = await to(
                Modal.confirm(
                    (
                        <div>
                            <h4>{Lang.format('login.nonSecurity.confirm', serverUrl)}</h4>
                            <div className="text-gray">{Lang.string('login.nonSecurity.detail')}</div>
                        </div>
                    ), {
                        actions: [
                            {type: 'cancel'},
                            {type: 'submit', label: Lang.string('login.nonSecurity.btn'), className: 'danger-pale text-danger'},
                        ],
                        style: {maxWidth: 500},
                        className: 'app-login-nonSecurity-dialog',
                    }
                )
            );

            if (error) {
                if (DEBUG) {
                    console.error('Modal.confirm error', error);
                }
                return;
            }

            if (result) {
                this.login();
                return;
            }
            this.setState({
                logging: false,
                message: '',
            });
        });
    };

    /**
     * 处理点击切换用户按钮事件
     */
    private handleSwapUserBtnClick = () => {
        const {serverUrl, account, showServerInput} = this.state;
        const identify = (serverUrl && account) ? User.createIdentify(serverUrl, account) : '';
        showSwapUserDialog(
            identify,
            (this.lockServer || !showServerInput)
                ? serverUrl
                : '',
            user => {
                const newState = {
                    serverUrl: User.simplifyServerUrl(user.serverUrl),
                    account: user.account,
                    password: user.authKey || user.password,
                    message: '',
                    showPassword: false,
                };
                this.setState(newState);
            }
        );
    };

    /**
     * 处理服务器地址变更事件
     * @param server 服务器地址
     */
    private handleServerUrlChange = (server: string, port: string) => {
        this.handleInputFieldChange('serverUrl', port ? `${server}:${port}` : server);
    };

    /**
     * 处理用户名变更事件
     * @param val 用户名
     */
    private handleAccountChange = (val: string) => {
        this.handleInputFieldChange('account', val);
    };

    /**
     * 处理密码变更事件
     * @param val 密码
     */
    private handlePasswordChange = (val: string) => {
        this.handleInputFieldChange('password', val);
    };

    /**
     * 处理点击网络诊断按钮事件
     */
    private handleDiagnoseNetworkBtnClick = () => {
        const {loginError} = this.state;
        showNetDiagnosticsDialog(((loginError?.getExtras) ? loginError.getExtras('user') : null) || this.loginUserData, loginError);
    };

    /**
     * 获取密码框引用
     * @param ref 密码框引用
     */
    private getPasswordInputRef = (ref: InputControlRef) => {
        this.passwordInput = ref;
    };

    /**
     * React 组件生命周期函数：Render
     * @returns  React 渲染内容
     */
    public override render() {
        const {className, logging: propsLogging, ...other} = this.props;

        const {
            serverUrl,
            account,
            password = '',
            rememberMe,
            autoLogin,
            message,
            loginError,
            showDiagnoseBtn,
            showServerInput,
            showPassword,
        } = this.state;

        const logging = propsLogging || this.state.logging;

        const [server, port] = splitUrl(serverUrl);
        const isToken = password.includes(AUTH_TOKEN_FLAG);
        const submitable = isNotEmptyString(serverUrl) && serverUrl[0] !== ':' && isNotEmptyString(account) && isNotEmptyString(password);

        const accountSwitchButton = (
            <button
                data-hint={Lang.string('login.swapUser')}
                onClick={this.handleSwapUserBtnClick}
                type="button"
                className="btn iconbutton -rounded hint--bottom-right -absolute -top-[38px] -right-2"
            >
                <Icon name="sprite-switch-account" />
            </button>
        );

        const clearPasswordButton = (
            <button
                data-hint={Lang.string('login.password.clear')}
                onClick={() => this.setState({password: ''})}
                type="button"
                className="btn iconbutton -rounded hint--bottom-right -absolute -top-[38px] -right-2"
            >
                <Icon name="mdi-backspace-outline" className="text-primary" />
            </button>
        );

        const showPasswordButton = (
            <button
                onClick={() => this.setState({showPassword: false})}
                type="button"
                className="btn iconbutton -rounded hint--bottom-right -absolute -top-[38px] -right-2"
            >
                <Icon name="mdi-eye" />
            </button>
        );

        const hidePasswordButton = (
            <button
                onClick={() => this.setState({showPassword: true})}
                type="button"
                className="btn iconbutton -rounded hint--bottom-right -absolute -top-[38px] -right-2"
            >
                <Icon name="mdi-eye-off" />
            </button>
        );

        const serverView = (
            <InputControl
                value={server}
                autoFocus
                disabled={logging}
                inputContainerClassName="-flex"
                inputClassName="-p-2 -rounded-tl -rounded-bl -w-2/3"
                label={Lang.string('login.serverUrl.label')}
                placeholder={Lang.string('login.serverUrl.hint')}
                onChange={(val) => this.handleServerUrlChange(val, port)}
                className="-relative app-login-server-control"
                addonInput={<>
                    <div className="-flex -h-full -items-center -absolute -top-0" style={{left: "calc(67% + 4px)"}}>:</div>
                    <input className="input -py-2 -pl-3 -w-1/3 -rounded-tr -rounded-br server-port" value={port} onChange={e => this.handleServerUrlChange(server, e.target.value)} placeholder="11443" />
                    </>
                }
            >
                {accountSwitchButton}
            </InputControl>
        );

        return (
            <form className={classes('app-login-form', className)} onSubmit={e => e.preventDefault()} {...other}>
                {
                    message
                        ? (
                            <div className="app-login-message danger -py-2 -px-1.5 -rounded -flex -gap-1 -items-center -mb-2">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4.98094 10.3119L7.29289 7.99995L4.98104 5.6881L5.68814 4.98099L8 7.29284L10.3119 4.98099L11.019 5.6881L8.7071 7.99995L11.0191 10.3119L10.3119 11.019L8 8.70706L5.68805 11.019L4.98094 10.3119Z" fill="white"/>
                                    <path d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.134 15 0.999998 11.866 1 8C1 4.134 4.13401 0.999998 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="white"/>
                                </svg>

                                {message}
                                {
                                    loginError && showDiagnoseBtn
                                        ? <a className="small label -rounded darken-2 x-outline -whitespace-nowrap" onClick={this.handleDiagnoseNetworkBtnClick}>{Lang.string('diagnostics.diagnoseNetwork')} »</a>
                                        : null
                                }
                            </div>
                        )
                        : null
                }
                {showServerInput ? serverView : null}
                <InputControl
                    autoFocus={!showServerInput}
                    value={account}
                    disabled={logging}
                    inputClassName="-p-2 -rounded -bg-[#F8FAFC]"
                    label={Lang.string('login.account.label')}
                    placeholder={Lang.string('login.account.hint')}
                    onChange={this.handleAccountChange}
                    className="-relative app-login-control"
                >
                    {showServerInput ? null : accountSwitchButton}
                </InputControl>
                <InputControl
                    value={isToken ? password.slice(0, 32) : password}
                    disabled={logging}
                    className="-relative app-login-control"
                    inputType={showPassword ? 'text' : 'password'}
                    inputClassName="-p-2 -rounded -bg-[#F8FAFC]"
                    label={Lang.string('login.password.label')}
                    onChange={this.handlePasswordChange}
                    inputProps={isToken ? {disabled: true} : {}}
                    ref={this.getPasswordInputRef}
                    placeholder={Lang.string('login.password.placeholder')}
                >
                    {isToken
                        ? clearPasswordButton
                        : password
                            ? showPassword
                                ? showPasswordButton
                                : hidePasswordButton
                            : null
                    }
                </InputControl>
                <button
                    id="loginBtn"
                    type="submit"
                    disabled={!submitable || logging}
                    className={classes('btn -rounded -p-4 -w-full -text-sm -my-3', submitable ? 'primary bg-primary' : 'gray')}
                    onClick={this.handleLoginBtnClick}
                >
                    {Lang.string(logging ? 'login.btn.logging' : 'login.btn.label')}
                </button>
                <div className="row">
                    <Checkbox
                        disabled={logging}
                        checked={rememberMe}
                        onChange={this.handleRememberPasswordChanged}
                        className="cell"
                        label={Lang.string('login.rememberMe')}
                    />
                    <Checkbox
                        disabled={logging}
                        checked={autoLogin}
                        onChange={this.handleAutoLoginChanged}
                        className="cell"
                        label={Lang.string('login.autoLogin')}
                    />
                    <Dropdown
                        flipOptions={{
                            fallbackPlacements: ['bottom-end', 'top-end']
                        }}
                        offsetValue={4}
                        referenceNode={
                            <button className="-rounded-md -border -bg-transparent -cursor-pointer -border-transparent">
                                <Icon name="mdi-settings-outline" className="-text-gray-500 hover:-text-blue-500" size={18} />
                            </button>
                        }
                        floatingNode={
                            <div>
                                <ul className="-bg-white -m-0 -list-none -shadow -p-2 -rounded -border -border-gray-200 -border-solid dark:-bg-black/10 dark:-border-transparent">
                                    <li>
                                        <Checkbox
                                            checked={showServerInput}
                                            label={Lang.string('login.showServerSetting')}
                                            onChange={(value) => this.setState({showServerInput: value})}
                                        />
                                    </li>
                                </ul>
                            </div>
                        }
                    />
                </div>
            </form>
        );
    }
}

function splitUrl(url: string) {
    url = url.trim();
    url = url.replace(/(?<![:/])\/(?!\/)/g, '');
    if (!/:\d+$/.test(url)) {
        return [url, ''];
    }
    const regex = /^(.*?)(?::(\d+))?$/;
    const match = url.match(regex);
    if (!match) {
        return [url, ''];
    }

    return [match[1], match[2] || ''];
}
