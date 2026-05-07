import {memo} from 'react';
import {renderChatMessageContent} from '~/app/core/im/chat-message-helper';

type MessageContentRichProps = {message: ChatMessage;}
    & Partial<{contentConverter: (content: string, msg: ChatMessage) => string;}>
    & React.HTMLAttributes<HTMLDivElement>;

function MessageContentRich(props: MessageContentRichProps) {
    const {message, className = 'content', contentConverter, ...others} = props;
    const htmlContent = renderChatMessageContent(message, contentConverter);

    return (
        <div
            className={className}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{__html: htmlContent}}
            {...others}
        />
    );
}

export default memo(MessageContentRich);
