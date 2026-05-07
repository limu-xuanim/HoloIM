/**
 * WebView 窗口入口文件
 * 这是 Electron 渲染进程启动的 WebView 窗口入口文件
 */
import ReactDOM from 'react-dom/client';
import '~/app/style/webview-window.less';
import '~/app/utils/debug';
import '~/app/utils/log';
import '~/app/core/ui/browser-window';
import '~/tailwind.css';
import WebViewApp from '~/app/entries/webview/App';

// 喧喧运行时管理程序就绪时加载 React 界面组件
const appElement = document.querySelector<HTMLDivElement>('#app-container')!;

const root = ReactDOM.createRoot(appElement);

root.render(
    // <React.StrictMode>
    <WebViewApp />,
    // </React.StrictMode>
);

requestIdleCallback(() => {
    const loadingElement = document.querySelector<HTMLDivElement>('#loading')!;
    loadingElement.parentElement!.removeChild(loadingElement);

    document.body.classList.remove('no-animation');
});
