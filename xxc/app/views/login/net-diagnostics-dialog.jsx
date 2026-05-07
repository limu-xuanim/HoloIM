import React from 'react';
import Modal from '../../components/modal';
import NetDiagnostics from './net-diagnostics';
import Lang from '../../core/lang';

/**
 * 显示网络诊断对话框
 * @param {Object} user 登录用户账号信息
 * @param {CodedError} [loginError] 上次登录时捕获到的错误信息对象
 * @param {function} [callback] 对话框显示完成的回调函数
 * @returns {Promise} 使用 Promise 异步返回处理结果
 * @returns {void}
 */
export const showNetDiagnosticsDialog = (user, loginError, callback) => {
    if (typeof loginError === 'function') {
        callback = loginError;
        loginError = null;
    }

    const modalId = 'app-net-diagnostics-dialog';
    return Modal.show({
        title: Lang.string('diagnostics.diagnoseNetwork'),
        actions: false,
        id: modalId,
        style: {
            left: 10,
            right: 10,
            bottom: 0,
            top: 30
        },
        className: 'app-net-diagnostics-dialog dock',
        animation: 'enter-from-bottom',
        content: <NetDiagnostics user={user} loginError={loginError} />
    }, callback);
};

export default {
    show: showNetDiagnosticsDialog,
};
