/**
 * 入口文件：index.jsx
 * 这是 Electron 渲染进程启动的主窗口入口文件
 */
import './wdyr';
import 'requestidlecallback-polyfill';
import ReactDOM from 'react-dom/client';
import './style/app.less';
import './utils/debug';
import './utils/log';
import './utils/perf';
import run from './core/runtime';
import HomeIndex from './views/index';
import {triggerUIReady} from './core/ui';
import Lang from './core/lang';
import registerUICommands from './views/register-ui-commands';
import {initMainWindow} from './window-bridge/main';

PERF_MARK('uiResourceLoad');

// 喧喧运行时管理程序就绪时加载 React 界面组件
run()
    .then(() => {
        const appElement = document.getElementById('app-container')!;
        PERF_MARK('uiRenderStart', 'uiResourceLoad', 'resourceLoadTime');

        const root = ReactDOM.createRoot(appElement);
        root.render(<HomeIndex />);

        requestIdleCallback(() => {
            const loadingElement = document.getElementById('loading')!;
            loadingElement.parentElement!.removeChild(loadingElement);

            // 2 秒后重新启用动画效果
            setTimeout(() => {
                document.body.classList.remove('no-animation');
            }, 2000);

            // 注册界面交互命令
            registerUICommands(Lang);

            // 触发界面就绪事件
            triggerUIReady();
            PERF_MARK('uiRenderFinish', 'uiRenderStart', 'uiFirstRenderTime');

            // 初始化主窗口的 Window 对象
            initMainWindow();
        })
    })
    .catch((error) => {
        console.error('runtime not ready:', error);
    });
