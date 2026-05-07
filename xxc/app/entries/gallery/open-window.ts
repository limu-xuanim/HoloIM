import {showMediaPreviewDialog} from '~/app/components/media-preview-dialog';
import platform from '~/app/platform';
import Lang from '~/app/core/lang';
import type {ChatMessageImageObtainer} from '~/app/core/im/chat-message-image-obtainer';
import {exposeInWindow, generateWindowFeatures, generateWindowUrl, getTargetWindow, getMainWindow, openWindow} from '~/app/window-bridge/common';
import {WindowType} from '~/app/constants';
import md5 from 'md5';
import * as ChatMessagesStoreModule from '~/app/core/im/chat-messages-store';

import {getCurrentUser} from '~/app/core/profile';

declare global {
    interface Window {
        galleryAPI: {
            Lang: LangHelper;
            ChatMessagesStoreModule: typeof ChatMessagesStoreModule;
            user: User;
            obtainer:
                | ChatMessageImageObtainer
                | {
                      current: {
                          src: string;
                      };
                  };
        };
    }
}

/**
 * 显示一个媒体预览弹出层或窗体
 * @param src 媒体地址或 base64
 * @param options 选项
 * @returns 弹出层或新窗口
 */
export function showMediaPreviewWindow(src: string, options?: Partial<{id: string}>): any;

/**
 * 显示一个媒体预览弹出层或窗体
 * @param obtainer 媒体获取器
 * @param options 选项
 * @returns 弹出层或新窗口
 */
export function showMediaPreviewWindow(obtainer: ChatMessageImageObtainer, options?: Partial<{id: string}>): any;

export function showMediaPreviewWindow(
    srcOrObtainer: string | ChatMessageImageObtainer,
    options: Partial<{id: string}> = {},
) {
    const obtainer = typeof srcOrObtainer === 'string' ? {current: {src: srcOrObtainer}} : srcOrObtainer;

    if (!options.id) {
        options.id = md5(obtainer.current.src);
    }

    if (platform.isElectron) {
        const name = `gallery__id__${options.id}`;
        const existWin = getTargetWindow(name);

        if (existWin) {
            existWin.electronAPI.currentWindow.show();
            return;
        }

        const url = generateWindowUrl(WindowType.gallery, name);
        const features = generateWindowFeatures({
            title: Lang.string('media.preview'),
            minWidth: 500,
            minHeight: 300,
            overlayIcon: 'gallery-win.png',
            vibrancy: 'popover',
            maximize: true,
        });
        const win = openWindow(url, name, features);
        const mainWindow = getMainWindow();
        exposeInWindow(mainWindow, `galleryAPI_${options.id}`, {
            Lang,
            obtainer,
            ChatMessagesStoreModule,
            user: getCurrentUser(),
        });

        return win;
    }

    const mediaPreviewProps = {
        prevText: Lang.string('media.prev'),
        nextText: Lang.string('media.next'),
        obtainText: Lang.string('common.rerequest'),
        zoomInText: Lang.string('media.zoomIn'),
        zoomOutText: Lang.string('media.zoomOut'),
        zoomResetText: Lang.string('media.zoomReset'),
        rotate90Text: Lang.string('media.rotate90'),
        retracted: Lang.string('file.retracted'),
    };
    return showMediaPreviewDialog(obtainer, {mediaPreviewProps});
}
