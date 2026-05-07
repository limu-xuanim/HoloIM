import './perf';
import fs from './fs';
import sound from '../common/sound';
import env from './env';
import image from './image';
import ui from './ui';
import os from './os';
import notify from './notify';
import shortcut from './shortcut';
import dialog from './dialog';
import net from './net';
import crypto from './crypto';
import clipboard from './clipboard';
import buildIn, {buildInPath} from './build-in';
import language, {initLanguage} from './language';
import autoUpdater from './auto-updater';
import netTools from './net-tools';;
import docCookies from './doc-cookies';
import * as remoteEvents from './remote-events';
import type {Config} from '~/app/config';
import {PlatformType} from '~/app/constants';

if (process.type !== 'renderer') {
    throw new Error('platform/electron/index.js must run in renderer process.');
}

export const init = (config: Config) => {
    if (config) {
        // 初始化 ion-sound 声音播放模块
        sound.init(config.media['sound.path']);

        // 初始化界面交互功能模块
        ui.init(config);
    }

    initLanguage();

    if (DEBUG) {
        console.color('Build-in Path', 'greenBg', buildInPath, 'greenPale');
    }
};

const platform = {
    type: PlatformType.electron,
    displayName: `electron ${window.nodeAPI.processVersions.electron}`,
    init,
    language,
    env,
    image,
    ui,
    shortcut,
    dialog,
    fs,
    os,
    sound,
    net,
    crypto,
    notify,
    clipboard,
    buildIn,
    autoUpdater,
    netTools,
    docCookies,
    remoteEvents,
};

export default platform;
export type ElectronPlatform = typeof platform;
