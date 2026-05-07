/* eslint-disable react/no-danger */
import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import Lang from '../../core/lang';
import {getUpdaterStatus, onUpdaterStatusChanged, isUpdaterAvailable, downloadNewVersion, quitAndInstall, skipNewVersion, notifyMeNextTime} from '../../core/updater';
import events from '../../core/events';
import EmojiIcon from '../../components/emoji-icon';
import marked from '../../utils/markdown';
import {getCurrentUser} from '../../core/profile';
import {simplifyVersion} from '../../utils/version';
/**
 * UpdateGuide 组件 ，显示更新升级指引界面
 */
export default class UpdateGuide extends Component {
    static propTypes = {
        className: PropTypes.string,
        onRequestClose: PropTypes.func,
    };

    static defaultProps = {
        className: null,
        onRequestClose: null,
    };

    constructor(props) {
        super(props);
        this.state = {
            updaterStatus: getUpdaterStatus()
        };
    }

    componentDidMount() {
        if (isUpdaterAvailable()) {
            this.onUpdateStatusChangeHandler = onUpdaterStatusChanged(updaterStatus => {
                this.setState({updaterStatus});
            });
            const {updaterStatus} = this.state;
            if (updaterStatus.needUpdateForce && updaterStatus.status === 'ready') {
                downloadNewVersion();
            }
        }
    }

    componentWillUnmount() {
        if (isUpdaterAvailable()) {
            events.off(this.onUpdateStatusChangeHandler);
        }
    }

    /**
     * 处理点击提醒我下次升级按钮事件
     *
     * @returns {void}
     */
    notifyMeNextTime = () => {
        notifyMeNextTime(getCurrentUser());
        const {onRequestClose} = this.props;
        if (onRequestClose) {
            onRequestClose();
        }
    };

    /**
     * 处理点击忽略当前版本按钮事件
     *
     * @returns {void}
     */
    skipNewVersion = () => {
        skipNewVersion(getCurrentUser());
        const {onRequestClose} = this.props;
        if (onRequestClose) {
            onRequestClose();
        }
    };

    render() {
        const {
            className,
            onRequestClose,
            ...other
        } = this.props;

        const {updaterStatus} = this.state;
        const {
            needUpdate,
            serverUrl,
            updateInfo,
            progress,
            message,
            status,
            needUpdateForce,
        } = updaterStatus;
        const newVersion = simplifyVersion(updaterStatus.newVersion);
        const currentVersion = simplifyVersion(updaterStatus.currentVersion);

        let mainView = null;
        if (needUpdate) {
            // 需要升级
            const readmeText = updateInfo.readme || updateInfo.changeLog;
            const updateReadme = readmeText && marked.parse(readmeText);
            const updateReadmeView = updateReadme ? (
                <details className="space-sm">
                    <summary className="strong space-sm text-primary state">{Lang.format('update.versionDetails', newVersion)}</summary>
                    <div style={{maxHeight: 400}} className="has-padding-sm primary-pale markdown-content -overflow-y-auto" dangerouslySetInnerHTML={{__html: updateReadme}} />
                </details>
            ) : null;
            if (isUpdaterAvailable()) {
                // 客户端升级模块可用
                let updateProgressView = null;
                if (status === 'downloading' || status === 'downloaded') {
                    updateProgressView = (
                        <div className="progress has-padding-v space divider">
                            {progress > 0 && (
                                <div className="box -rounded primary-pale -relative space-xs">
                                    <div className="-rounded bar primary dock dock-left" style={{width: `${progress * 100}%`, transition: 'all .4s'}} />
                                </div>
                            )}
                            <div className="title">{progress > 0 && <strong>{Math.floor(progress * 100)}% </strong>}<span className="text-primary small">{message}</span></div>
                        </div>
                    );
                } else if (status === 'downloadFail') {
                    updateProgressView = (
                        <div className="box danger-pale -rounded text-danger space">
                            {message}
                        </div>
                    );
                }
                let buttonView = null;
                if (status === 'ready') {
                    buttonView = <button key="updateNow" type="button" className="btn primary btn-wide" onClick={downloadNewVersion}>{Lang.string('update.updateNow')}</button>;
                    if (!needUpdateForce) {
                        buttonView = [
                            buttonView,
                            <button key="notifyMeLater" type="button" className="btn text-primary btn-wide" onClick={this.notifyMeNextTime}>{Lang.string('update.notifyMeNextTime')}</button>,
                            <button key="skipThisVersion" type="button" className="btn text-danger btn-wide" onClick={this.skipNewVersion}>{Lang.string('update.skipThisVersion')}</button>,
                        ];
                    }
                } else if (status === 'downloaded') {
                    buttonView = <button type="button" className="btn primary btn-wide" onClick={quitAndInstall}>{Lang.string('update.restartToCompleteUpdate')}</button>;
                } else if (status === 'downloadFail') {
                    buttonView = <button key="retryUpdate" type="button" className="btn primary btn-wide" onClick={downloadNewVersion}>{Lang.string('update.retryUpdate')}</button>;
                    if (!needUpdateForce) {
                        buttonView = [
                            buttonView,
                            <button key="close" type="button" className="btn btn-wide" onClick={onRequestClose}>{Lang.string('common.close')}</button>,
                        ];
                    }
                } else if (status === 'downloading' && !needUpdateForce) {
                    buttonView = <button type="button" className="btn primary btn-wide" onClick={onRequestClose}>{Lang.string('update.closeAndDownloadInBackground')}</button>;
                }
                mainView = (
                    <div>
                        <h3>{needUpdateForce ? Lang.format('update.clientRequiredUpdateToLoginServer', serverUrl) : Lang.string('update.message.newVersionAvailable')}</h3>
                        <p>{Lang.format('update.versionsFormat', newVersion, currentVersion)}</p>
                        {updateProgressView}
                        {updateReadmeView}
                        {buttonView && <div className="-text-center has-padding-v toolbar">{buttonView}</div>}
                    </div>
                );
            } else {
                // 客户端升级模块不可用时，提示联系管理员进行升级
                mainView = (
                    <div>
                        <h3>{needUpdateForce ? Lang.format('update.clientRequiredUpdateToLoginServer', serverUrl) : Lang.string('update.message.newVersionAvailable')}</h3>
                        <p>{Lang.format('update.versionsFormat', newVersion, currentVersion)}</p>
                        {updateReadmeView}
                        <p>{Lang.string('update.contactAdminToUpdate')}</p>
                        <div className="-text-center has-padding-v">
                            <button type="button" className="btn primary btn-wide" onClick={needUpdateForce ? onRequestClose : this.skipNewVersion}>{Lang.string('common.close')}</button>
                        </div>
                    </div>
                );
            }
        } else {
            // 如果不需要升级
            mainView = (
                <div>
                    <EmojiIcon name=":thumbsup:" className="-text-center space" />
                    <h3>{Lang.string('update.message.alreadyNew')}</h3>
                    <div className="-text-center has-padding-v">
                        <button type="button" className="btn primary btn-wide" onClick={onRequestClose}>{Lang.string('common.close')}</button>
                    </div>
                </div>
            );
        }

        return (
            <div
                {...other}
                className={classes('app-update-guide has-padding-v', className)}
            >
                {mainView}
            </div>
        );
    }
}
