import {useState, useEffect, useRef} from 'react';
import chatMessagesStore from '../../core/im/chat-messages-store';
import {getChatMessageSummaryText} from '../../core/im/chat-message-helper';

type FormatCallback = (summary: string, chatMessage: ChatMessage) => string;

/**
 * 获取消息的描述文本
 * @param id 聊天消息 ID
 * @param limitLength 最长文本数目，可选值范围 0～200
 * @param formatCallback 格式化回调函数
 * @returns 消息的描述文本
 */
export function getMessageSummaryText(id: number, limitLength?: number, formatCallback?: FormatCallback): string {
    const message = chatMessagesStore.getItemFromCache(id);
    return message ? getChatMessageSummaryText(message, limitLength, formatCallback) : '';
}

/**
 * 消息的描述文本 Hook
 * @param cgid 聊天消息所属会话 GID
 * @param id 聊天消息 ID
 * @param limitLength 最长文本数目，可选值范围 0～200
 * @param formatCallback 格式化回调函数
 * @returns 消息的描述文本
 */
export default function useMessageSummaryText(cgid: string, id: number, limitLength?: number, formatCallback?: FormatCallback): string {
    const [summaryText, setSummaryText] = useState(getMessageSummaryText(id, limitLength, formatCallback));
    const unmountedRef = useRef(false);

    useEffect(() => () => {
        unmountedRef.current = true;
    }, []);

    useEffect(() => {
        const text = getMessageSummaryText(id, limitLength, formatCallback);
        if (text) {
            setSummaryText(text);
        } else {
            const fetchAndSetMessageSummary = async () => {
                const message = await chatMessagesStore.asyncGetMessage(cgid, id);
                if (unmountedRef.current) {
                    return;
                }
                if (!message) {
                    return;
                }
                setSummaryText(getChatMessageSummaryText(message, limitLength, formatCallback));
            };
            fetchAndSetMessageSummary();
        }
    }, [id, limitLength, formatCallback, cgid]);

    useEffect(() => {
        const subscribeID = chatMessagesStore.subscribe(id, () => {
            setSummaryText(getMessageSummaryText(id, limitLength, formatCallback));
        });
        return () => {
            chatMessagesStore.unsubscribe(subscribeID);
        };
    }, [id, limitLength, formatCallback]);

    return summaryText;
}
