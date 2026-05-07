import {createElement, memo, type ReactNode, type ElementType} from 'react';
import {isEmptyString} from '~/app/utils/check-empty';
import type ChatMessage from '~/app/core/im/chat-message';
import useMessageSummary from './use-message-summary';

type MessageSummarySpanProps = {
    messageID: number;
    cgid: string;
    children?: ReactNode;
    prefix?: ReactNode;
    limitLength?: number;
    formatCallback?: (summary: string, chatMessage: ChatMessage) => string;
    type?: ElementType;
};

/**
 * 消息概要文本组件
 * @param props React 组件属性对象
 * @param props.messageID 消息 ID
 * @param props.cgid 消息所属会话 GID
 * @param props.children 子元素内容
 * @param props.limitLength 概要文本最大长度
 * @param props.formatCallback 格式化回调函数
 * @param props.type 元素类型
 */
function MessageSummarySpan(props: MessageSummarySpanProps) {
    const {
        messageID,
        cgid,
        children,
        limitLength = 200,
        prefix,
        formatCallback,
        type = 'span',
        ...others
    } = props;
    const summary = useMessageSummary(cgid, messageID, limitLength, formatCallback);
    if (isEmptyString(summary)) {
        return null;
    }
    return createElement(type, {...others, title: summary}, [prefix, summary, children]);
}

export default memo(MessageSummarySpan);
