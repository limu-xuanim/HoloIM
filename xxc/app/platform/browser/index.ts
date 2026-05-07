import clipboard from './clipboard';
import sound from '../common/sound';
import crypto from './crypto';
import env from './env';
import ui from './ui';
import dialog from './dialog';
import notify from './notify';
import net from './net';
import language from './language';
import docCookies from './doc-cookies';
import type {Config} from '../../config';
import {PlatformType} from '~/app/constants';

export const init = (config: Config) => {
    if (config) {
        // 初始化 ion-sound 声音播放模块
        sound.init(config.media['sound.path']);
    }
};

/** 浏览器平台上所有可用的模块 */
const platform = {
    type: PlatformType.browser,
    displayName: 'browser',
    init,
    clipboard,
    crypto,
    env,
    ui,
    notify,
    sound,
    net,
    dialog,
    language,
    docCookies
};

export default platform;
export type BrowserPlatform = typeof platform;
