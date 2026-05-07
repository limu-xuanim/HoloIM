import {useState, useCallback, memo} from 'react';
import {classes, type ClassLike} from '~/app/utils/html-helper';
import {sendContentToChat} from '~/app/core/im/im-ui';
import type ChatMessage from '~/app/core/im/chat-message';
import {getCurrentUserID} from '~/app/core/profile';
import useLang from '../common/use-lang';
import MessageRibbon from './message-ribbon';
import MessageContentRetracted from './message-content-retracted';

type MessageRetractedItemProps = {
    message: ChatMessage;
    className?: ClassLike;
    contentConverter?: (content: string) => string;
};

/**
 * 已撤销的消息组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 */
function MessageRetractedItem(props: MessageRetractedItemProps) {
    const {message, className, contentConverter, ...others} = props;
    const [Lang] = useLang();
    const [reedited, setReedited] = useState(false);
    const canReEdit = !reedited && message.canReedit(getCurrentUserID());

    const handleReedit = useCallback(() => {
        if (message.canReedit(getCurrentUserID())) {
            setReedited(true);
            sendContentToChat(
                message.doReedit(),
                {
                    type: 'text',
                    cgid: message.cgid,
                    clear: false,
                    skipDuplicateText: true
                }
            );
        }
    }, [message]);

    return (
        <div className={classes('center-content', className)} {...others}>
            <MessageRibbon>
                <MessageContentRetracted message={message} />
                {canReEdit ? <span>&nbsp; <a className="text-primary" onClick={handleReedit}>{Lang.string('chat.message.reedit')}</a></span> : null}
            </MessageRibbon>
        </div>
    );
}

export default memo(MessageRetractedItem);
