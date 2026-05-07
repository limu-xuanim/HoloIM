import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import EmojiIcon from '~/app/components/emoji-icon';

type MessageContentEmotionProps = {message: ChatMessage}
    & React.HTMLAttributes<HTMLDivElement>

/**
 * 表情消息内容组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @returns JSX.Element
 */
function MessageContentEmotion(props: MessageContentEmotionProps) {
    const {
        message,
        className,
        ...others
    } = props;

    const {emotionContent} = message;

    if (!emotionContent) {
        return null;
    }

    return (
        <EmojiIcon
            className={classes('app-message-content-emotion emoji-hd', className)}
            name={emotionContent.content}
            {...others}
        />
    );
}

export default memo(MessageContentEmotion);
