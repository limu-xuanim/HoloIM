import platform from '../platform';
import {initLang} from './lang';
import config from '../config';
import {initIM} from './im/index';

let isFirstRunning = true;

/**
 * 启动渲染进程准备工作
 */
const run = async () => {
    if (isFirstRunning) {
        isFirstRunning = false;
    } else {
        return Promise.resolve();
    }

    // 初始化应用
    await initLang();

    platform.init(config);

    // 初始化 IM 相关功能
    initIM();
};

export default run;
