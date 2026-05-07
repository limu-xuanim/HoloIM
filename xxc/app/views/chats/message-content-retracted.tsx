import  {memo} from 'react';
import useLang from '../common/use-lang';
import useMemberName from '../common/use-member-name';

type MessageContentRetractedProps = {message: ChatMessage;}
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 已撤销的消息内容
 * @param props React 组件属性对象
 * @param props.message 消息组件
 * @returns JSX.Element
 */
function MessageContentRetracted(props: MessageContentRetractedProps) {
    const {message, className = 'content muted', ...others} = props;
    const deletedBy = message.getDataValue('deletedBy');
    if (deletedBy && deletedBy !== message.senderId) {
        return (
            <RetractedByAdmin
                className={className}
                memberID={deletedBy}
                {...others}
            />
        );
    }

    return (
        <RetractedBySender
            className={className}
            memberID={message.senderId}
            {...others}
        />
    );
}

type RetractedByProps = {memberID: number;}
    & React.HTMLAttributes<HTMLDivElement>;

const RetractedByAdmin = (props: RetractedByProps) => {
    const {memberID, ...others} = props;
    const adminName = useMemberName(memberID);
    const [Lang] = useLang();

    return (
        <div {...others}>
            {Lang.format('chat.message.retracted.byAdmin', adminName)}
        </div>
    );
};

const RetractedBySender = (props: RetractedByProps) => {
    const {memberID, ...others} = props;
    const [Lang] = useLang();
    const senderName = useMemberName(memberID);
    return (
        <div {...others}>
            {Lang.format('chat.message.retracted', senderName)}
        </div>
    );
};

export default memo(MessageContentRetracted);
