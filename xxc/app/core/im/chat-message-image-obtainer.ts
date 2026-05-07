import membersStore from '../members/members-store';
import chatMessagesStore from './chat-messages-store';
import chatMessagesListStore from './chat-messages-list-store';
import {downloadFileNoThrows} from '../files/files-network';
import filesStore from '../files/files-store';
import Lang  from '../lang';
import {getShortTextOfDate} from '~/app/utils/date-helper';

/**
 * 图片资源信息
 * @property {string} src 图片地址
 * @property {string} title 图片标题
 * @property {string} errorMessage 错误信息
 * @property {boolean|ImageInfo} [prev] 上一个图片信息，如果为 boolean 类型，则仅表示是否拥有对应的信息
 * @property {boolean|ImageInfo} [next] 下一个图片信息，如果为 boolean 类型，则仅表示是否拥有对应的信息
 * @property {Record<string, any>} data 其他信息对象
 */
export type ImageInfo = Partial<{
    src: string;
    title: string;
    errorMessage: string;
    prev: ImageInfo|boolean;
    next: ImageInfo|boolean;
    data: Partial<{
        message: ChatMessage;
        messageID: number;
        prevMessage: ChatMessage;
        nextMessage: ChatMessage;
    }>;
    mediaType: string;
}>;

/**
 * 会话消息图片获取器
 */
export class ChatMessageImageObtainer {
    readonly current: ImageInfo;

    private readonly cgid: string;

    private readonly idList: number[] | null;

    /**
     * 创建一个会话消息图片获取器
     * @param cgid 消息所属会话 GID
     * @param messageID 消息 ID
     * @param imageInfo 当前消息对应图片信息
     * @param imageInfo.src 图片地址
     * @param imageInfo.title 图片标题
     * @param imageInfo.prev 是否有上一张图片
     * @param imageInfo.next 是否有下一张图片
     */
    constructor(cgid: string, messageID: number, imageInfo: ImageInfo = {}, idList: number[] | null = null) {
        this.current = {
            data: {messageID},
            ...imageInfo
        };
        this.cgid = cgid;
        this.idList = idList;

        chatMessagesListStore.getPrevAndNextImageMessage(messageID, true);
    }

    /**
     * 重新获取图片资源信息
     * @param info 图片资源信息对象
     * @returns 异步返回图片资源信息对象
     */
    async obtain(info: ImageInfo): Promise<ImageInfo> {
        const {messageID} = info.data;
        if (!info || !messageID) {
            return null;
        }

        try {
            let {message} = info.data;
            if (!message) {
                message = await chatMessagesStore.asyncGetMessage(this.cgid, messageID);
            }

            const sender = await membersStore.asyncGetMember(message.senderId);
            const time = getShortTextOfDate(Lang, message.sendTime);
            const title = Lang.format('chat.message.userSendAt', {user: sender.displayName, time});

            let errorMessage: string;
            let src: string;
            if (message.imageContent?.type === 'base64') {
                src = message.imageContent.content;
            } else {
                const fileData = filesStore.getMessageFile(message);
                await downloadFileNoThrows(fileData);
                if (fileData.networking.isDownloadFail) {
                    errorMessage = Lang.string('file.downloadFailed');
                } else {
                    src = fileData.viewUrl;
                }
            }

            let {prev, next} = info;
            const siblingMessages = chatMessagesListStore.getPrevAndNextImageMessage(messageID);
            if (prev === undefined) {
                if (siblingMessages?.prev) {
                    if (this.idList) {
                        prev = this.idList.includes(siblingMessages.prev.id);
                    } else {
                        prev = true;
                    }
                } else {
                    prev = false;
                }
            }
            if (next === undefined) {
                if (siblingMessages?.next) {
                    if (this.idList) {
                        next = this.idList.includes(siblingMessages.next.id);
                    } else {
                        next = true;
                    }
                } else {
                    next = false;
                }
            }

            return Object.assign(info, {
                src,
                title,
                prev,
                next,
                errorMessage,
                data: {
                    ...info.data,
                    prevMessage: siblingMessages?.prev,
                    nextMessage: siblingMessages?.next,
                }
            });
        } catch (_error) {
            if (DEBUG) {
                console.error('Error when obtain message image', _error);
            }
            return null;
        }
    }

    /**
     * 获取当前图片资源信息
     * @returns 异步返回图片资源信息对象
     */
    obtainCurrent(): Promise<ImageInfo> {
        const {current} = this;

        if (!current.src || !current.title || current.prev === undefined || current.next === undefined) {
            return this.obtain(current);
        }

        return Promise.resolve(current);
    }

    /**
     * 获取上一张图片资源信息
     * @param current 当前图片资源信息对象
     * @returns 异步返回图片资源信息对象
     */
    async obtainPrev(current: ImageInfo): Promise<ImageInfo> {
        if (current.prev === false) {
            return null;
        }
        if (typeof current.prev === 'object') {
            return current.prev;
        }
        let {prevMessage} = current.data;
        if (!prevMessage) {
            prevMessage = chatMessagesListStore.getPrevAndNextImageMessage(current.data.messageID).prev;
            if (!prevMessage) {
                return null;
            }
        }
        current.prev = await this.obtain({
            next: current,
            data: {
                message: prevMessage,
                messageID: prevMessage.id
            }
        });

        return current.prev;
    }

    /**
     * 获取下一张图片资源信息
     * @param current 当前图片资源信息对象
     * @returns 异步返回图片资源信息对象
     */
    async obtainNext(current: ImageInfo): Promise<ImageInfo> {
        if (current.next === false) {
            return null;
        }
        if (typeof current.next === 'object') {
            return current.next;
        }
        let {nextMessage} = current.data;
        if (!nextMessage) {
            nextMessage = chatMessagesListStore.getPrevAndNextImageMessage(current.data.messageID).next;
            if (!nextMessage) {
                return null;
            }
        }
        current.next = await this.obtain({
            prev: current,
            data: {
                message: nextMessage,
                messageID: nextMessage.id
            }
        });

        return current.next;
    }
}
