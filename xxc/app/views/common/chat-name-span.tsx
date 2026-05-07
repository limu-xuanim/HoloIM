import {memo, createElement, type ReactNode} from 'react';
import {classes} from '~/app/utils/html-helper';
import {isEmptyString} from '~/app/utils/check-empty';
import useChatName from './use-chat-name';

/**
 * React 组件属性类型检查
 */
type ChatNameSpanProps = {
    cgid: string;
    className: string;
    type: string;
    children: ReactNode;
    hideOnLoading: boolean;
};

/**
 * 会话名称组件
 * @param props React 组件属性对象
 * @param props.cgid 会话 gid
 * @param props.className 类名
 * @param props.children 子元素内容
 * @param props.hideOnLoading 当没有用户信息时是否隐藏
 * @returns React Node content
 */
function ChatNameSpan(props: ChatNameSpanProps) {
    const {
        cgid,
        className,
        children,
        hideOnLoading = false,
        type = 'span',
        ...others
    } = props;
    const name = useChatName(cgid);
    const isEmptyName = isEmptyString(name);
    if (hideOnLoading && isEmptyName) {
        return null;
    }

    return createElement(type, {
        className: classes(className, isEmptyName ? '-inline-block loading-holder -relative loading-holder-line' : ''),
        ...others
    }, name, children);
}

export default memo(ChatNameSpan);
