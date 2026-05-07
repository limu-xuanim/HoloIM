import {classes, type ClassLike} from '~/app/utils/html-helper';
import ChatMessages from './chat-messages';
import ChatPinnedMessagesView from './chat-pinned-messages-view';
import {useRef} from 'react';

type ChatBodyProps = {
    gid: string;
    className?: ClassLike;
}

/**
 * ChatBody 组件 ，显示一个聊天头部界面
 */
export default function ChatBody(props: ChatBodyProps) {
    const {gid, className} = props;
    const bodyRef = useRef<HTMLDivElement>(null);

    return (
        <div className={classes('app-chat-body column single', className)} ref={bodyRef}>
            <ChatPinnedMessagesView gid={gid} className="-flex -flex-none" />
            <ChatMessages gid={gid} className="-flex-auto" />
        </div>
    );
}
