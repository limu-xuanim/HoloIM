import fuid from '../utils/fuid';
import Modal from './modal';
import MediaPreview from './media-preview';
import type {ChatMessageImageObtainer} from '../core/im/chat-message-image-obtainer';
import chatMessagesStore from '../core/im/chat-messages-store';
import {getCurrentUser} from '../core/profile';

type Options = Partial<{
    mediaPreviewProps: Partial<{
        prevText: string;
        nextText: string;
        obtainText: string;
        zoomInText: string;
        zoomOutText: string;
        zoomResetText: string;
        rotate90Text: string;
        retracted: string;
    }>
}>;

const getMessage = (id: number) => chatMessagesStore.getMessage(id);

/**
 * 显示一个媒体预览弹出层或窗体
 * @param obtainer 媒体获取器
 * @param options 选项
 * @returns 弹出层或新窗口
 */
export const showMediaPreviewDialog = (obtainer: ChatMessageImageObtainer|{current: {src: string;}}, options: Options = {}) => {
    const modalId = fuid();
    const user = getCurrentUser();
    return Modal.show({
        closeButton: false,
        actions: false,
        className: 'layer-image-viewer dock clean',
        content: (
            <MediaPreview
                className="dock"
                obtainer={obtainer}
                onRequestClose={() => Modal.hide(modalId)}
                {...options.mediaPreviewProps}
                getMessage={getMessage}
                user={user}
            />
        ),
        id: modalId
    });
};
