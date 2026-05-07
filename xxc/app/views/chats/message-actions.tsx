import {memo} from 'react';
import Icon from '~/app/components/icon';
import {classes} from '~/app/utils/html-helper';

type MessageActionsProps = {message: ChatMessage;}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 消息操作按钮组件
 * @see https://zh-hans.reactjs.org/docs/components-and-props.html
 * @param props React 组件属性对象
 * @param props.message 消息对象
 * @param props.className 类名
 * @returns JSX.Element
 */
function MessageActions(props: MessageActionsProps) {
    const {message, className, ...others} = props;

    if (!message.isUrlObject) {
        return null;
    }
    return (
        <div className={classes('app-message-actions', className)} {...others}>
            <a className="btn -rounded iconbutton" href={`xxc://showContextMenu/message/${message.id}`}>
                <Icon name="dots-vertical" />
            </a>
        </div>
    );
}

export default memo(MessageActions);
