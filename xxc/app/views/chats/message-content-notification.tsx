import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import {isNotEmptyString} from '../../utils/check-empty';
import Button from '../../components/button';
import MessageContentRich from './message-content-rich';
import useLang from '../common/use-lang';
import type {NotificationMessage} from '~/app/core/im/notification-message';

type MessageContentNotificationProps = {
    message: NotificationMessage;
    contentConverter?: (content: string, msg: ChatMessage) => string;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * 通知类消息内容组件
 * @param props React 组件属性对象
 * @param props.message 会话消息对象
 * @param props.className 类名
 * @param props.contentConverter 文本内容转化回调函数
 * @returns JSX.Element
 */
function MessageContentNotification(props: MessageContentNotificationProps) {
    const {
        message,
        className,
        contentConverter,
        ...others
    } = props;

    const [Lang] = useLang();

    const {
        notification, actions, title, subtitle
    } = message;

    const actionsButtons = [];
    if (notification.url) {
        actionsButtons.push(
            <Button
                btnClass=""
                key="primaryUrl"
                label={Lang.string('common.viewDetail')}
                icon="arrow-right-bold-circle"
                type="a"
                url={notification.url}
                className="text-accent"
            />
        );
    }
    if (actions) {
        for (const action of actions) {
            actionsButtons.push(
                <Button
                    btnClass=""
                    key={action.label}
                    label={action.label}
                    icon={action.icon}
                    type="a"
                    url={action.url}
                    className={`text-${action.type}`}
                />
            );
        }
    }

    const textContentConverter = (content: string) => {
        if (contentConverter) {
            content = contentConverter(content, message);
        }
        if (isNotEmptyString(subtitle) && title !== subtitle) {
            content = `<h5>${subtitle}</h5>${content}`;
        }
        if (isNotEmptyString(title)) {
            content = `<h4>${title}</h4>${content}`;
        }
        return content;
    };

    return (
        <div
            className={classes('app-message-content-notification', className)}
            {...others}
        >
            <MessageContentRich message={message} contentConverter={textContentConverter} />
            {
                actionsButtons?.length
                    ? <nav className="actions nav secondary-pale">{actionsButtons}</nav>
                    : null
            }
        </div>
    );
}

export default memo(MessageContentNotification);
