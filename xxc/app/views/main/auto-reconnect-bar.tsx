import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {classes} from '~/app/utils/html-helper';
import {getUserStatus, getCurrentUser} from '~/app/core/profile';
import useLang from '../common/use-lang';
import {logout, reconnect} from '~/app/core/server';
import {STATUS as MemberStatus} from '~/app/core/members/member';
import Avatar from '~/app/components/avatar';
import {executeCommand} from '~/app/core/commander';
import platform from '~/app/platform';
import Config from '~/app/config';
import {convertTimes} from '~/app/utils/string-helper';
import {updateUserInfoOnTray} from '~/app/core/notice';
import {renderIf} from '~/app/utils/render';
import {onUserStatusChange} from '~/app/core/profile/user';
import type {ElectronPlatform} from '~/app/platform/electron';

const platformUI = platform.access<ElectronPlatform['ui']>('ui');

/**
 * 自动连接登录最短时间计数
 */
const CONNECT_TIME_TICK = 5;

/**
 * 视为短暂离线的时间（单位毫秒）
 */
const SHORT_DISCONNECT_TIME = 1000 * 15;

/**
 * 更新系统通知区图标为离线
 */
const setTrayOffline = () => {
    const user = getCurrentUser();
    if (user) {
        updateUserInfoOnTray(user);
    }
    platformUI.setTrayToGray?.();
};

type AutoReconnectBarProps = Partial<{
    className: string;
}>;

/**
 * AutoReconnectBar 组件 ，显示全局提示消息界面（在主界面顶部显示）
 */
export default function AutoReconnectBar(props: AutoReconnectBarProps) {
    /** 重连次数 */
    const connectTimesRef = useRef(0);

    /** 开始重连时间 */
    const startConnectTimeRef = useRef(0);

    /** 是否已将 Tray 置灰 */
    const hasSetTrayOfflineRef = useRef(false);

    const [tick, setTick] = useState(CONNECT_TIME_TICK);
    const [connecting, setConnecting] = useState(false);
    const [disconnect, setDisconnect] = useState(false);
    const [failMessage, setFailMessage] = useState('');
    const [isShortDisconnect, setIsShortDisconnect] = useState(false);
    const [Lang] = useLang();

    /**
     *  重置状态
     */
    const resetState = useCallback(() => {
        connectTimesRef.current = 0;
        startConnectTimeRef.current = 0;
        hasSetTrayOfflineRef.current = false;

        setTick(CONNECT_TIME_TICK);
        // connecting 已在请求连接时处理，无需额外处理
        // disconnect 状态保持原状
        setFailMessage('');
        setIsShortDisconnect(false);
    }, []);

    /**
     * 取消连接并退出
     */
    const userLogout = useCallback(() => {
        // 当前用户注销登录，将 disconnect 置为 false
        setDisconnect(false);
        resetState();
        logout(true);
    }, [resetState]);

    /**
     * 重新尝试连接到服务器
     */
    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            await reconnect();
            setFailMessage('');
        } catch (error) {
            const _isShortDisconnect = (Date.now() - startConnectTimeRef.current) <= SHORT_DISCONNECT_TIME;
            setIsShortDisconnect(_isShortDisconnect);

            if (!_isShortDisconnect && !hasSetTrayOfflineRef.current) {
                // 通过status.hasSetTrayOffline来判断是否视图层掉线  在确认非短时间掉线的情况下 去触发托盘变灰和托盘标题变更的函数 且只触发一次
                setTrayOffline();
                hasSetTrayOfflineRef.current = true;
            }

            if (DEBUG) {
                console.collapse('Login.error', 'redBg', Lang.error(error), 'redPale');
                console.error(error);
                console.groupEnd();
            }
            if (error.code === 'HTTP_STATUS_401') {
                userLogout();
                executeCommand('showMessager', Lang.error('HTTP_STATUS_401'), {
                    rootClassName: 'message-kickoff-confirm',
                    type: 'danger',
                    icon: 'alert',
                });
            } else if (error.code === 'SER_ERR') {
                userLogout();
                executeCommand('showMessager', Lang.error(error), {
                    rootClassName: 'message-kickoff-confirm ',
                    type: 'danger',
                    icon: 'alert',
                });
            }

            if(connectTimesRef.current < 12) {
                connectTimesRef.current++;
            }

            setFailMessage(Lang.error(error));
            setTick(connectTimesRef.current * CONNECT_TIME_TICK);
        } finally {
            setConnecting(false);
        }
    }, [userLogout, Lang]);

    /**
     * 开始自动重连，也是第一次重连
     */
    const startConnect = useCallback(() => {
        connectTimesRef.current = 0;
        setTick(0);
        setIsShortDisconnect(true);
        startConnectTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        if (disconnect === false || connecting === true) {
            return;
        }
        const intervalID = window.setInterval(() => {
            if (connecting === false) {
                setTick(x => x - 1);
            }
        }, 1000);

        return () => window.clearInterval(intervalID);
    }, [connecting, disconnect]);

    useEffect(() => {
        if (disconnect === false) {
            return;
        }

        // 离线三分钟后弹出主窗口
        const timeoutId = window.setTimeout(() => {
            platformUI.showAndFocusWindow?.();
        }, convertTimes(Config.ui['app.timeToShowMainWindowAfterOffline']));

        return () => window.clearTimeout(timeoutId);
    }, [disconnect]);

    useEffect(() => {
        let userStatus = getUserStatus();
        const subscription = onUserStatusChange(() => {
            const status = getUserStatus();
            if (userStatus === status) {
                return;
            }

            userStatus = status;
            if (MemberStatus.isSame(status, MemberStatus.$.disconnect)) {
                setDisconnect(true);
                startConnect();
                return;
            }

            setDisconnect(false);
            resetState();
            platformUI.setTrayToGray?.(false);
        });

        return () => subscription.unsubscribe();
    }, [resetState, startConnect]);

    // 处于离线状态且倒计时为 0 时尝试重连
    useEffect(() => {
        if (disconnect && tick < 1) {
            connect();
        }
    }, [connect, disconnect, tick]);

    useEffect(() => () => {
        resetState();
    }, [resetState]);

    const reconnectView = useMemo(() => {
        if (connecting) {
            return <Connecting userLogout={userLogout} />;
        }

        return (
            <ToConnect
                tick={tick}
                failMessage={failMessage}
                reconnectNow={connect}
                userLogout={userLogout}
                connectTimes={connectTimesRef.current}
            />
        );
    }, [connecting, tick, failMessage, connect, userLogout]);

    if (!disconnect || isShortDisconnect) {
        return null;
    }

    const {className} = props;
    return (
        <div className={classes('app-auto-reconnect-bar center-content', className, {'app-user-disconnet': disconnect})}>
            {reconnectView}
        </div>
    );
}

type ConnectingProps = {
    userLogout: () => void;
};
function Connecting(props: ConnectingProps) {
    const {userLogout} = props;
    const [Lang] = useLang();

    const logoutBtnView = useMemo(() => {
        if (Config.ui['app.hideLogout']) {
            return null;
        }

        return (
            <nav className="nav nav-sm">
                <a onClick={userLogout}>{Lang.string('login.autoConnect.logout')}</a>
            </nav>
        );
    }, [Lang, userLogout]);

    return (
        <div className="heading yellow shadow-1">
            <Avatar size={24} icon="loading spin" />
            <div className="title small">{Config.ui['app.shortenReconnectMessage'] ? Lang.string('login.autoConnect.connecting.short') : Lang.string('login.autoConnect.connecting')}</div>
            {logoutBtnView}
        </div>
    );
}

type ToConnectProps = {
    tick: number;
    failMessage: string;
    reconnectNow: () => void;
    userLogout: () => void;
    connectTimes: number;
};
function ToConnect(props: ToConnectProps) {
    const {tick, failMessage, reconnectNow, userLogout, connectTimes} = props;
    const [Lang] = useLang();

    const titleView = useMemo(() => {
        if (Config.ui['app.shortenReconnectMessage']) {
            return Lang.string('login.autoConnect.wait.short');
        }

        return (
            <>
                {Lang.format(connectTimes ? 'login.autoConnect.failedAndWait' : 'login.autoConnect.wait', Math.max(0, tick))}
                {renderIf(failMessage) && <span data-hint={failMessage} className="hint--bottom">{Lang.string('login.autoConnect.errorDetail')}</span>}
            </>
        );
    }, [connectTimes, failMessage, tick, Lang]);

    const logoutBtnView = useMemo(() => {
        if (Config.ui['app.hideLogout']) {
            return null;
        }

        return <a onClick={userLogout}>{Lang.string('login.autoConnect.logout')}</a>;
    }, [Lang, userLogout]);


    return (
        <div className="heading yellow -rounded shadow-1">
            <Avatar size={24} icon={tick % 2 === 0 ? 'lan-disconnect' : 'lan-connect'} />
            <div className="title small">
                {titleView}
            </div>
            <nav className="nav nav-sm">
                <a onClick={reconnectNow}>{Lang.string('login.autoConnect.connectIM')}</a>
                {logoutBtnView}
            </nav>
        </div>
    );
}
