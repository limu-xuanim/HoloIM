import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {classes} from '../../utils/html-helper';
import Avatar from '../../components/avatar';
import Icon from '../../components/icon';
import Button from '../../components/button';
import Lang from '../../core/lang';
import {diagnoseNetwork} from '../../core/server/net-diagnostics';
import Spinner from '../../components/spinner';
import {formatDate} from '../../utils/date-helper';
import platform from '../../platform';
import Config from '../../config';

/**
 * NetDiagnostics 组件 ，显示网络诊断界面
 */
export default class NetDiagnostics extends Component {
    static propTypes = {
        loginError: PropTypes.object,
        user: PropTypes.object.isRequired,
        className: PropTypes.string,
    };

    static defaultProps = {
        loginError: null,
        className: null,
    };

    constructor(props) {
        super(props);

        this.state = {
            waiting: null,
            results: [],
            copied: false,
            expandStates: {}
        };
    }

    componentDidMount() {
        this.diagnose();
    }

    componentWillUnmount() {
        this.unMounted = true;
    }

    /**
     * 进行网络诊断
     * @param {boolean} [reset=false] 如果为 `true` 则忽略上次结果重新进行诊断
     * @returns {void}
     */
    diagnose(reset = false) {
        const {user, loginError} = this.props;
        this.setState({waiting: true, results: [], expandStates: {}}, () => diagnoseNetwork(user, reset ? null : loginError, (result) => {
            const {results} = this.state;
            results.push(result);
            if (!this.unMounted) {
                this.setState({results}, this.scrollToBottom);
            }
        }).then(results => {
            if (!this.unMounted) {
                this.setState({results, waiting: false}, this.scrollToBottom);
            }
        }).catch(error => {
            const {results} = this.state;
            results.push({
                type: 'error',
                id: results.length,
                message: `${Lang.string('diagnostics.diagnoseUnexpectedInterruption')}：${error.message}`,
                detail: error.stack
            });
            if (!this.unMounted) {
                this.setState({results, waiting: false}, this.scrollToBottom);
            }
        }));
    }

    /**
     * 获取诊断日志
     * @returns {string[]} 日志信息
     */
    getDiagnoseLogs() {
        const {results} = this.state;
        return results.map(result => {
            const resultLines = [
                `${formatDate(result.time, 'yyyy-MM-dd hh:mm:ss.SSS')} [${result.type.toUpperCase()}] ${result.code ? `[${result.code}] ` : ''}${result.message}`,
            ];
            if (result.detail) {
                resultLines.push(result.detail);
            }
            return resultLines.join('\n');
        });
    }

    /**
     * 复制诊断信息到剪切板
     * @returns {void}
     */
    copyDiagnoseLogs = () => {
        platform.call('clipboard.writeText', this.getDiagnoseLogs().join('\n\n'));
        this.setState({copied: true}, () => {
            setTimeout(() => {
                this.setState({copied: false});
            }, 3000);
        });
    };

    /**
     * 导出诊断信息到文件
     * @returns {void}
     */
    exportDiagnoseLogs = () => {
        platform.call('dialog.showSaveFileDialog', this.getDiagnoseLogs().join('\n\n'), {
            filename: `${Config.pkg.name}-diagnostics-${formatDate(new Date(), 'yyyyMMddhhmmss')}.log`
        });
    };

    /**
     * 折叠或展开诊断结果
     * @param {string} id ID
     * @param {boolean} toggle 如果为 `true`，则为展开，否则为折叠
     * @returns {void}
     */
    toggleResult(id, toggle) {
        const {expandStates} = this.state;
        expandStates[id] = toggle;
        this.setState({expandStates});
    }

    /**
     * 展开所有诊断结果
     * @returns {void}
     */
    expandAllResults = () => {
        const {expandStates, results} = this.state;
        if (results) {
            results.forEach(result => {
                expandStates[result.id] = true;
            });
            this.setState({expandStates});
        }
    };

    /**
     * 滚动到底部
     * @returns {void}
     */
    scrollToBottom = () => {
        if (this.containerElement) {
            const {parentElement} = this.containerElement;
            if (parentElement) {
                parentElement.scrollTop = parentElement.scrollHeight;
            }
        }
    };

    render() {
        const {
            loginError,
            user,
            className,
            ...other
        } = this.props;

        const {
            waiting, results, copied, expandStates
        } = this.state;

        let waitingView = null;
        if (waiting) {
            waitingView = (
                <div className="center-content space-sm">
                    <Spinner className="-inline-flex" />
                    <div className="has-padding lead">{Lang.string('diagnostics.waitForDiagnosing')}</div>
                </div>
            );
        }

        const resultsView = [];
        let actionsView = null;
        if (results?.length) {
            for (let i = 0; i < results.length; ++i) {
                const result = results[i];
                const typeColor = result.type === 'info' ? 'gray' : result.type === 'error' ? 'danger' : result.type;
                const typeIcon = result.type === 'error' ? 'alert' : result.type === 'warning' ? 'alert-outline' : result.type === 'success' ? 'checkbox-marked-circle' : 'information-outline';
                let expanded = expandStates[result.id];
                if (expanded === undefined) {
                    expanded = result.type === 'error' || result.type === 'warning';
                }
                let detailView = null;
                if (expanded && result.detail) {
                    detailView = (
                        <div className="app-net-diagnostic-result-section dark:-text-gray-500">
                            <div className="heading">
                                <Icon name="android-messages" className="muted-light" />
                                <div className="title strong">{Lang.string('diagnostics.detail')}:</div>
                            </div>
                            <pre className="code">
                                {result.detail}
                            </pre>
                        </div>
                    );
                }
                let suggestionsView = null;
                if (expanded && result.suggestions && result.suggestions.length) {
                    if (!Array.isArray(result.suggestions)) {
                        result.suggestions = [result.suggestions];
                    }
                    suggestionsView = (
                        <div className="app-net-diagnostic-result-section dark:-text-gray-500">
                            <div className="heading">
                                <Icon name="lightbulb" className="muted-light" />
                                <div className="title strong">{Lang.string('diagnostics.suggestions')}:</div>
                            </div>
                            <ul className="code">
                                {result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                                {(result.code && Config.pkg.errorsURL) ? <li><a className="text-primary" href={`${Config.pkg.errorsURL}#${result.code}`}>{Lang.string('diagnostics.moreSuggestions')}</a></li> : null}
                            </ul>
                        </div>
                    );
                }
                let buttonsView = null;
                if (result.detail || (result.suggestions && result.suggestions.length)) {
                    buttonsView = (
                        <nav>
                            <Button onClick={this.toggleResult.bind(this, result.id, !expanded)} icon={`chevron-${expanded ? 'up' : 'down'}`} className="btn-lg -rounded" />
                        </nav>
                    );
                }
                resultsView.push(
                    <div className={`app-net-diagnostic-result ${typeColor}-pale`} key={result.id}>
                        <div className={`app-net-diagnostic-result-border ${typeColor}`} />
                        <div className={`heading text-${typeColor === 'gray' ? 'black' : typeColor}`}>
                            <div className="strong app-net-diagnostic-result-index">#{i + 1}</div>
                            <small className="muted-light">{formatDate(result.time, 'hh:mm:ss.SSS')} </small>
                            <Avatar icon={typeIcon} />
                            <div className="title">
                                {result.code ? <strong>[{result.code}] </strong> : null}
                                {result.message}
                            </div>
                            {buttonsView}
                        </div>
                        {(detailView || suggestionsView) && (
                            <div className={`${typeColor}-pale`}>
                                {detailView}
                                {suggestionsView}
                            </div>
                        )}
                    </div>
                );
            }

            if (!waiting) {
                actionsView = (
                    <div className="app-net-diagnostic-actions has-padding-v center-content">
                        <Button label={Lang.string('diagnostics.restartDiagnose')} className="has-margin-xs primary bg-primary -rounded" onClick={this.diagnose.bind(this, true)} />
                        {platform.has('clipboard.writeText') && <Button disabled={copied} label={Lang.string(copied ? 'diagnostics.copiedDiagnoseLogs' : 'diagnostics.copyDiagnoseLogs')} className="has-margin-xs primary x-outline -rounded" onClick={this.copyDiagnoseLogs} />}
                        {platform.has('dialog.showSaveFileDialog') && <Button label={Lang.string('diagnostics.exportDiagnoseLogs')} className="has-margin-xs primary x-outline -rounded" onClick={this.exportDiagnoseLogs} />}
                        {!!Config.pkg.contactURL && <Button label={Lang.string('diagnostics.contactUs')} className="has-margin-xs primary x-outline -rounded" url={Config.pkg.contactURL} />}
                        <Button label={Lang.string('diagnostics.expandAllDetail')} className="has-margin-xs primary x-outline -rounded" onClick={this.expandAllResults} />
                    </div>
                );
            }
        }

        return (
            <div
                className={classes('app-net-diagnostic', className)}
                ref={e => {this.containerElement = e;}}
                {...other}
            >
                <div className="app-net-diagnostic -overflow-y-auto user-selectable">
                    {resultsView}
                </div>
                {waitingView || actionsView}
            </div>
        );
    }
}
