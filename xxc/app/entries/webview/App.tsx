import {memo, useEffect} from 'react';
import ErrorBoundary from '~/app/components/error-boundary';
import WindowControllsBar from '../../components/window-controls-bar';
import WebViewFrame from '../../views/common/webview-frame';
import {getWindowStateController} from '../../platform/electron/window-controller';
import {getPlatformType, getOSType} from '~/app/core/ui/browser-window';

/**
 * WebView 窗口界面
 * @returns JSX.Element
 */
function WebViewApp() {
    // 获取远程共享的数据
    const {sourceUrl, favicon, title, webviewOptions, theme = 'auto', titleBarStyle, lang, openUrl} = window.webviewAPI;

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        // 追加平台与操作系统辅助类，保证与主窗体一致的样式选择器
        document.body.classList.add(`platform-${getPlatformType()}`);
        document.body.classList.add(`os-${getOSType()}`);
    }, []);

    return (
        <div className="app-webview-window">
            <WindowControllsBar controller={getWindowStateController()} />
            <ErrorBoundary>
                <WebViewFrame
                    src={sourceUrl}
                    favicon={favicon}
                    title={title}
                    titleBarStyle={titleBarStyle}
                    options={webviewOptions}
                    onRequestOpenUrl={openUrl}
                    lang={lang}
                />
            </ErrorBoundary>
        </div>
    );
}

export default memo(WebViewApp);
