import React, {forwardRef, Ref, useImperativeHandle, useState} from 'react';
import useLang from '../common/use-lang';

type ChatShareMessagerProps = {
    langString: string;
    current?: number
    total: number;
}

export type ChatShareMessagerRef = {
    setCurrent: React.Dispatch<React.SetStateAction<number>>
}

/**
 * 聊天转发、发送提示气泡内容
 * @param props.langString 语言包key
 * @param props.current 当前转发、发送的数量
 * @param props.total 总数量
 * @param ref 组件ref，用于外部调用
 */
const ChatShareMessager = forwardRef((props: ChatShareMessagerProps, ref: Ref<ChatShareMessagerRef>) => {
    const [current, setCurrent] = useState(props.current ?? 1);
    const [Lang] = useLang();

    useImperativeHandle(ref, () => ({setCurrent}), []);

    return (
        <div>
            {`${Lang.string(props.langString)}(${current}/${props.total})`}
        </div>
    );
});

export default ChatShareMessager;
