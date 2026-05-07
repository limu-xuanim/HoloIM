import {initIMNotice} from './im-notice';
import {initImUI} from './im-ui';

export const initIM = () => {
    initImUI();

    // 注册通知功能
    initIMNotice();
};
