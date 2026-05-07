import platform from '~/app/platform';
import {addContextMenuCreator} from '../context-menu';
import {executeCommand} from '../commander';
import {blobToDataURI} from './files-helper';
import {abortUploadFile, downloadFile, dismissUploadFailedFile,downloadFileNoThrows} from './files-network';
import {chatsStore} from '~/app/entries/vars/chatsStore';
import {sendImageMessage} from '../im/im-server';
import type {ElectronPlatform} from '~/app/platform/electron';
import {showChatMessage} from '~/app/entries/vars/showChatMessage';
import {FilesStoreModule} from '~/app/entries/vars/FilesStoreModule';
import {Lang} from '~/app/entries/vars/Lang';
import {showChatMessageImagePreivew} from '~/app/entries/vars/showChatMessageImagePreivew';
import {showMediaPreviewWindow} from '~/app/entries/vars/showMediaPreviewWindow';

const {getFileData, default: filesStore} = FilesStoreModule

const dialog = platform.access<ElectronPlatform['dialog']>('dialog');
const ui = platform.access<ElectronPlatform['ui']>('ui');
const clipboard = platform.access<ElectronPlatform['clipboard']>('clipboard');

/** 本地缓存是否存在 */
const isLocalCacheEnabled = platform.isElectron;

/**
 * 获取文件上传下载错误信息
 * @param file 文件数据对象
 * @returns 错误信息文本
 */
export function getFileNetworkErrorMessage(file: FileData) {
    const {error} = file.networking;
    if (!error) {
        return null;
    }
    if (error.code === 'HTTP_ABORT') {
        return Lang.string('file.abortNetwork');
    }
    if (file.networking.isDownloadFail) {
        if (error.code === 'HTTP_STATUS_ERROR' && error?.getExtras('status') === 404) {
            return Lang.string('file.notFoundInServer');
        }
        if (error.code === 'EBUSY') {
            return Lang.string('file.error.busy');
        }
        return  Lang.error(error);
    }
    return Lang.string('file.uploadFailed');
}

/**
 * 下载文件到本地缓存
 * @param {String|Object|FileData} file 文件数据对象
 * @param {Object} options 选项
 * @param {boolean} [options.showError] 是否错误信息
 * @param {boolean} [options.throwError] 是否抛出信息
 * @param {boolean} [options.isThumb] 是否为图片缩略图
 * @returns {Promise<boolean>} 最终下载文件的位置
 */
export async function downloadFileToCache(file, options) {
    const fileData = getFileData(file);
    fileData.userSavePath = null;
    try {
        await downloadFile(fileData, {isThumb: options?.isThumb});
        return true;
    } catch (error) {
        if (options?.showError) {
            executeCommand('showMessager', getFileNetworkErrorMessage(fileData) || Lang.error(error), {type: 'danger'});
        }
        if (options?.throwError) {
            throw error;
        }
        return false;
    }
}

/**
 * 打开聊天图片大图预览（与消息气泡双击行为一致）
 * @param file 图片文件数据对象
 */
export function previewImageFile(file: FileData) {
    return showChatMessageImagePreivew(file.cgid, file.messageID, {id: `imageFile-${file.gid}`});
}

type GetFileMenuItemsOptions = {
    canViewMessage: boolean;
    canViewMessageContext: boolean;
};

type FileMenuItem = {
    key: string;
    title: string;
    onClick: () => void;
    icon: string;
} | {
    key: string;
    title: string;
    href: string;
    icon: string;
};

/**
 * 创建文件上下文菜单项列表
 * @param file 文件数据对象
 * @param options 其他上下文菜单选项
 * @param options.canViewMessage 是否能预览文件所属会话消息（尝试激活会话并高亮消息）
 * @param options.canViewMessageContext 是否能预览文件所属会话消息上下文
 * @returns 上下文菜单项列表
 */
export function getFileMenuItems(file: FileData, options: GetFileMenuItemsOptions = {
    canViewMessage: false,
    canViewMessageContext: false
}): FileMenuItem[] {
    if (file.isSendByMe && file.isInLocal) {
        if (file.networking.isUploading) {
            return [
                {
                    key: 'cancel',
                    title: Lang.string('common.cancel'),
                    onClick: () => abortUploadFile(file.gid),
                    icon: 'mdi-close-circle text-danger'
                }
            ];
        }

        if (file.networking.isUploadFail) {
            return [{
                key: 'reupload',
                title: Lang.string('file.reupload'),
                onClick: () => {
                    filesStore.deleteCacheItem(file.gid);
                    sendImageMessage(file, chatsStore.getChat(file.cgid));
                },
                icon: 'mdi-reload'
            }, {
                key: 'dismiss',
                title: Lang.string('file.abort'),
                onClick: () => dismissUploadFailedFile(file.gid),
                icon: 'mdi-close-circle text-warning'
            }];
        }
    }

    if (!file.isOK) {
        return [];
    }

    const actions: FileMenuItem[] = [];
    const {canViewMessageContext, canViewMessage} = options;

    // 打开会话历史记录，并显示文件所属消息上下文
    if (canViewMessageContext) {
        actions.push({
            key: 'view-context',
            title: Lang.string('chat.view.context'),
            href: `!showChatHistoryDialog/${file.cgid}/${file.messageID}`,
            icon: 'mdi-comment-eye-outline'
        });
    }

    // 激活会话并滚动到文件所属消息处
    if (canViewMessage) {
        actions.push({
            key: 'view-message',
            title: Lang.string('chat.view.context'),
            onClick: () => {
                showChatMessage(file.cgid, file.messageID)
            },
            icon: 'mdi-comment-arrow-right-outline'
        });
    }

    return actions;
}

/**
 * 创建图片上下文菜单项列表
 * @param file 图片文件数据对象
 * @param options 其他上下文菜单选项
 * @returns 上下文菜单项列表
 */
export function getImageMenuItems(file: FileData, options) {
    const items = [];
    const {
        cachePath, viewUrl, isBase64, originFile, extName, name
    } = file;
    let {mimeType} = file;

    // 查看图片
    items.push({
        id: 'view-image',
        label: Lang.string('menu.image.view'),
        click: async () => {
            if (!file.isBase64) {
                await downloadFileNoThrows(file);
            }
            showMediaPreviewWindow(file?.viewUrl, options);
        }
    });

    // 加载原图
    if (!isBase64 && isLocalCacheEnabled && !cachePath) {
        items.push({
            id: 'download-image',
            label: Lang.string('menu.image.download'),
            click: async () => {
                await downloadFileNoThrows(file);
            }
        });
    }

    const copyEnable = (isLocalCacheEnabled && cachePath) || !isLocalCacheEnabled || isBase64;

    // 复制图片
    if (mimeType === 'base64' && typeof originFile === 'string') {
        const splitBase64Type = originFile.split(';')?.[0];
        if (splitBase64Type) {
            if (splitBase64Type.includes('svg')) mimeType = 'image/svg';
            else if (splitBase64Type.includes('bmp')) mimeType = 'image/bmp';
            else if (splitBase64Type.includes('tiff')) mimeType = 'image/tiff';
            else if (splitBase64Type.includes('gif')) mimeType = 'image/gif';
        }
    }
    if ((mimeType === 'image/bmp' || mimeType === 'image/tiff' || mimeType === 'image/gif' || mimeType === 'image/svg') && clipboard.writeBmpTiffImageFromFile) {
        const writeBmpTiffImageFromFile = clipboard.writeBmpTiffImageFromFile;
        items.push({
            id: 'copy-image',
            label: Lang.string('menu.image.copy'),
            disabled: !copyEnable,
            click: () => {
                writeBmpTiffImageFromFile(file);
            }
        });
    } else if (clipboard.writeImageFromUrl) {
        const writeImageFromUrl = clipboard.writeImageFromUrl;
        items.push({
            id: 'copy-image',
            label: Lang.string('menu.image.copy'),
            disabled: !copyEnable,
            click: async () => {
                if (typeof originFile === 'string') {
                    writeImageFromUrl(originFile, 'base64');
                    return;
                }
                if (originFile instanceof File || originFile instanceof Blob) {
                    const dataUrl = await blobToDataURI(originFile);
                    writeImageFromUrl(dataUrl, 'base64');
                    return;
                }
                if (cachePath) {
                    writeImageFromUrl(cachePath, 'path');
                    return;
                }

                console.error('The image that cannot be copied is', file);
                executeCommand('showMessager', Lang.error('CANNOT_HANDLE_IMAGE'));
            }
        });
    }

    // 图片另存为
    if (dialog.saveAsImageFromUrl) {
        items.push({
            id: 'save-image',
            label: Lang.string('menu.image.saveAs'),
            disabled: !viewUrl,
            click: async () => {
                try {
                    const filename = await dialog.saveAsImageFromUrl(viewUrl.split('?')[0], extName, name);// 这里因为进行重构的时候加了个?t这样的参数，处理一下

                    if (!filename) {
                        return;
                    }
                    const actions = ui.openFileItem ? [
                        {
                            label: Lang.string('file.open'),
                            click: () => ui.openFileItem(filename)
                        }, {
                            label: Lang.string('file.openFolder'),
                            click: () => ui.showItemInFolder(filename)
                        }
                    ] : null;

                    // 获取当前会话的chatbody
                    const chatBodys = Array.from(document.getElementsByClassName('app-chat-body'));
                    const currChatBody = chatBodys.find(x => x.offsetParent);
                    const chatBodyBounding = currChatBody?.getBoundingClientRect();

                    if (!chatBodyBounding) { // 理论上不会不存在会话窗口，如果不存在则以默认位置展示
                        executeCommand(
                            'showMessager',
                            Lang.format('file.fileSavedAt.format', filename),
                            {
                                actions,
                                closeButton: false,
                                autoHide: 2 * 1000
                            }
                        );
                        return;
                    }

                    // 设置另存图片成功后消息提示的位置，为当前会话窗口的输入框上方30px位置
                    const {top, height} = chatBodyBounding;
                    const style = {
                        position: 'absolute',
                        top: (top + height - (50 + 30)) || 20, // 上偏移 + chatbody高度 - （对话框高度 + 下留空30）|| 默认20
                    };

                    executeCommand(
                        'showMessager',
                        Lang.format('file.fileSavedAt.format', filename),
                        {
                            actions,
                            closeButton: false,
                            autoHide: 2 * 1000,
                            style
                        }
                    );
                } catch (error) {
                    return executeCommand('showMessager', Lang.error(error));
                }
            }
        });
    } else if (viewUrl) {
        // 浏览器直接打开 url 地址下载
        items.push({
            id: 'save-image',
            label: Lang.string('menu.image.saveAs'),
            disabled: !viewUrl,
            click: async () => {
                window.open(viewUrl, '_blank');
            }
        });
    }

    // 打开图片
    if (!isBase64 && ui.openFileItem) {
        items.push({
            id: 'open-image',
            disabled: !cachePath,
            label: Lang.string('menu.image.open'),
            click: () => ui.openFileItem(cachePath)
        });
    }

    return items;
}

// 添加上下文菜单生成器
addContextMenuCreator('file', ({file, ...others}) => getFileMenuItems(file, others), {apiLevel: 4});
addContextMenuCreator('image', ({file, ...others}) => getImageMenuItems(file, others), {apiLevel: 4});
