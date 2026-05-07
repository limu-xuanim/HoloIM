/**
 * 消息记录窗口入口文件
 * 这是 Electron 渲染进程启动的消息记录窗口入口文件
 */
import ReactDOM from 'react-dom/client';
import '~/app/style/history-app.less';
import '~/app/utils/debug';
import '~/app/utils/log';
import '~/app/core/ui/browser-window';
import '~/tailwind.css';
import ChatHistoryApp from './App';

// 喧喧运行时管理程序就绪时加载 React 界面组件
const appElement = document.querySelector<HTMLDivElement>('#app-container')!;

const root = ReactDOM.createRoot(appElement);

root.render(
    // <React.StrictMode>
    <ChatHistoryApp />,
    // </React.StrictMode>
);

requestIdleCallback(() => {
    const loadingElement = document.querySelector<HTMLDivElement>('#loading')!;
    loadingElement.parentElement!.removeChild(loadingElement);

    document.body.classList.remove('no-animation');
});
