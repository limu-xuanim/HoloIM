import {ChatMessageImageObtainer} from '~/app/entries/vars/ChatMessageImageObtainer';
import {showMediaPreviewWindow} from '~/app/entries/vars/showMediaPreviewWindow';

type ImageInfo = ConstructorParameters<typeof ChatMessageImageObtainer>[2];
type Options = Partial<{
    imageInfo: ImageInfo;
    id: string;
    idList: number[] | null;
}>;

/**
 * 打开会话消息图片预览界面
 * @param cgid 消息所属会话 GID
 * @param messageID 消息 ID
 * @param options 其他选项
 * @param options.imageInfo 当前消息对应图片信息
 * @param options.imageInfo.src 图片地址
 * @param options.imageInfo.title 图片标题
 * @param options.imageInfo.prev 是否有上一张图片
 * @param options.imageInfo.next 是否有下一张图片
 * @param options.id 图片 ID
 * @returns 弹出层或新窗口
 */
export function showChatMessageImagePreivew(cgid: string, messageID: number, options: Options = {}) {
    const {imageInfo, ...otherOptions} = options;
    const obtianer = new ChatMessageImageObtainer(cgid, messageID, imageInfo, options.idList ?? null);
    return showMediaPreviewWindow(obtianer, otherOptions);
}
