import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {classes} from '~/app/utils/html-helper';
import WebView from './webview';
import {renderAvatar} from '~/app/components/avatar';
import {renderIcon} from '~/app/components/icon';
import {showContextMenu} from '~/app/components/context-menu';
import {openUrlInBrowser} from '~/app/core/ui/url';
import Config from '~/app/config';
import platform from '~/app/platform';

/**
 * WebviewFrame 组件 ，显示网页视图界面
 */
export default class WebViewFrame extends Component {
    static propTypes = {
        className: PropTypes.string,
        onLoadingChange: PropTypes.func,
        onPageTitleUpdated: PropTypes.func,
        options: PropTypes.object,
        displayId: PropTypes.any,
        favicon: PropTypes.string,
        src: PropTypes.string.isRequired,
        title: PropTypes.string,
        titleBarStyle: PropTypes.object,
        onRequestOpenUrl: PropTypes.func,
        lang: PropTypes.object.isRequired,
        isMaximizeOnPopup: PropTypes.bool
    };

    static defaultProps = {
        className: null,
        onLoadingChange: null,
        onPageTitleUpdated: null,
        options: null,
        displayId: null,
        favicon: null,
        title: null,
        titleBarStyle: null,
        onRequestOpenUrl: null,
        isMaximizeOnPopup: false
    };

    constructor(props) {
        super(props);

        const {initialTitle} = props.options ?? {};

        this.state = {
            favicon: props.favicon ?? 'mdi-web',
            actualSrc: props.src,
            title: props.title ?? initialTitle ?? actualSrc,
            loading: false,
            isMaximize: props.isMaximizeOnPopup
        };
    }

    componentDidMount() {
        const {webview} = this.webview;
        if (webview && webview.addEventListener) {
            webview.addEventListener('page-favicon-updated', this.handleFaviconUpdated);
        }
    }

    /**
     * 重新加载网页
     * @private
     * @returns {void}
     */
    reloadWebview() {
        if (this.webviewId) {
            const webview = document.getElementById(this.webviewId);
            webview.reload();
        }
    }

    /**
     * 处理网站 Favicon 更新事件
     * @param {Event} e 事件对象
     * @private
     * @returns {void}
     */
    handleFaviconUpdated = e => {
        if (e.favicons && e.favicons.length) {
            this.setState({favicon: e.favicons[0]});
        }
    };

    /**
     * 处理网页标题更新事件
     * @param {string} title 网页标题
     * @param {boolean} explicitSet 是否为以明确设置的网页标题
     * @private
     * @returns {void}
     */
    handlePageTitleChange = (title, explicitSet) => {
        const {onPageTitleUpdated} = this.props;
        const {title: stateTitle} = this.state;
        if (title !== stateTitle) {
            this.setState({title});
        }
        if (onPageTitleUpdated) {
            onPageTitleUpdated(title, explicitSet);
        }
    };

    /**
     * 处理网也加载状态更新事件
     * @param {boolean} loading 是否正在加载
     * @param {...any} params 其他参数
     * @private
     * @returns {void}
     */
    handleLoadingChange = (loading, ...params) => {
        this.setState({loading});
        const {onLoadingChange} = this.props;
        if (onLoadingChange) {
            onLoadingChange(loading, ...params);
        }
    };

    /**
     * 处理点击重新载入按钮事件
     * @private
     * @returns {void}
     */
    handleReloadBtnClick = () => {
        this.setState({loading: true}, () => {
            this.webview.reloadWebview();
        });
    };

    /**
     * 处理重新载入按钮上下文菜单事件
     * @param {Event} event 事件对象
     * @returns {void}
     */
    handleReloadBtnContextMenu = (event) => {
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
            direction: 'below-left',
            triggerElement: event.target,
        }, [{
            label: this.props.lang?.string('webview.foreceReload') ?? 'Force Reload',
            click: () => {
                this.webview.reloadWebview(true);
            }
        }]);
        event.preventDefault();
    };

    /**
     * 处理点击停止加载按钮事件
     * @private
     * @returns {void}
     */
    handleStopBtnClick = () => {
        if (this.webview && this.webview.webview && this.webview.webview.stop) {
            this.webview.webview.stop();
        }
    };

    /**
     * 处理点击返回按钮事件
     * @private
     * @returns {void}
     */
    handleGoBackBtnClick = () => {
        if (this.webview && this.webview.webview && this.webview.webview.goBack) {
            this.webview.webview.goBack();
        }
    };

    /**
     * 处理点击前进按钮事件
     * @private
     * @returns {void}
     */
    handleGoForwardBtnClick = () => {
        if (this.webview && this.webview.webview && this.webview.webview.goForward) {
            this.webview.webview.goForward();
        }
    };

    /**
     * 处理点击在浏览器打开按钮事件
     * @param {Event} event 事件对象
     * @private
     * @returns {void}
     */
    handleOpenBtnClick = () => {
        const url = (this.webview && this.webview.webview && this.webview.webview.getURL) ? this.webview.webview.getURL() : this.props.src;
        if (this.props.onRequestOpenUrl) {
            this.props.onRequestOpenUrl(url);
        } else {
            openUrlInBrowser(url);
        }
    };

    /**
     * 处理点击最大化按钮事件
     * @private
     * @returns {void}
     */
    handleMaximizeBtnClick = () => {
        const {displayId} = this.props;
        if (displayId) {
            const displayEle = document.getElementById(displayId);
            if (displayEle) {
                displayEle.classList.toggle('fullscreen');
                this.setState({isMaximize: displayEle.classList.contains('fullscreen')});
            }
        }
    };

    /**
     * 处理点击开发者工具按钮事件
     * @private
     * @returns {void}
     */
    handleDevBtnClick = () => {
        if (this.webview && this.webview.webview) {
            this.webview.webview.openDevTools();
        }
    };

    /**
     * 处理复制 URL 按钮事件
     * @private
     * @returns {void}
     */
    handleCopyUrlBtnClick = () => {
        if (this.webview && this.webview.webview) {
            const url = this.webview.webview.getURL ? this.webview.webview.getURL() : this.props.src;
            platform.call('clipboard.writeText', url);
        }
    };

    /**
     * 获取 Webview 引用
     * @param {React.ElementRef<WebView>} ref Webview 引用
     * @returns {void}
     */
    getWebviewRef = ref => {
        this.webview = ref;
    };

    render() {
        const {
            className,
            onLoadingChange,
            onPageTitleUpdated,
            src,
            options,
            displayId,
            title,
            favicon,
            onRequestOpenUrl,
            titleBarStyle,
            lang,
            isMaximizeOnPopup,
            ...other
        } = this.props;

        const {isMaximize, actualSrc} = this.state;
        const webview = this.webview && this.webview.webview;
        const showNavButtons = !Config.ui['webview.frame.hiddenNavButtons'];

        return (
            <div className={classes('webview-frame column', className)} {...other}>
                <div className="heading -flex-none shadow-2" style={titleBarStyle}>
                    {renderAvatar({auto: this.state.loading ? 'mdi-loading spin muted' : this.state.favicon, size: 26})}
                    <div title={this.state.title} className="title x-text-ellipsis strong">{this.state.title}</div>
                    <nav className="nav" style={{marginRight: 40}}>
                        {DEBUG ? <a data-hint={lang.string('menu.toggleDeveloperTool')} onClick={this.handleDevBtnClick}>{renderIcon('auto-fix')}</a> : null}
                        {DEBUG ? <a data-hint={lang.string('common.copyLink')} onClick={this.handleCopyUrlBtnClick}>{renderIcon('link')}</a> : null}
                        <a data-hint={lang.string('webview.openInBrowser')} onClick={this.handleOpenBtnClick}>{renderIcon('open-in-new')}</a>
                        {showNavButtons && <a data-hint={lang.string('webview.goBack')} className={webview && webview.canGoBack && webview.canGoBack() ? '' : 'disabled'} onClick={this.handleGoBackBtnClick}>{renderIcon('arrow-left')}</a>}
                        {showNavButtons && <a data-hint={lang.string('webview.goForward')} className={webview && webview.canGoForward && webview.canGoForward() ? '' : 'disabled'} onClick={this.handleGoForwardBtnClick}>{renderIcon('arrow-right')}</a>}
                        {this.state.loading ? <a className="hint--bottom-right" data-hint={lang.string('webview.stopLoad')} onClick={this.handleStopBtnClick}>{renderIcon('close-circle-outline')}</a> : <a className="hint--bottom-right" data-hint={lang.string('webview.reload')} onClick={this.handleReloadBtnClick} onContextMenu={this.handleReloadBtnContextMenu}>{renderIcon('reload')}</a>}
                        {displayId ? <a className="hint--bottom-right" data-hint={lang.string('webview.maximize')} onClick={this.handleMaximizeBtnClick}>{renderIcon(isMaximize ? 'window-restore' : 'window-maximize')}</a> : null}
                    </nav>
                </div>
                <WebView
                    modalId={displayId}
                    ref={this.getWebviewRef}
                    className="-flex-auto -relative"
                    src={actualSrc}
                    {...options}
                    onLoadingChange={this.handleLoadingChange}
                    onPageTitleUpdated={title ? null : this.handlePageTitleChange}
                />
            </div>
        );
    }
}
