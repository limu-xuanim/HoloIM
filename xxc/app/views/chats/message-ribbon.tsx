import {memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import {formatDate} from '~/app/utils/date-helper';
import {renderAvatar} from '~/app/components/avatar';

type MessageRibbonProps = Partial<{
    date: DateLike;
    avatar: Parameters<typeof renderAvatar>[0];
    dateFormat: string;
    content: React.ReactNode;
}> & React.HTMLAttributes<HTMLDivElement>;

/**
 * 消息横幅组件
 * @param props React 组件属性对象
 * @param props.avatar 头像属性对象或头像图标名称
 * @param props.date 要显示在前面的日期
 * @param props.dateFormat 日期格式化字符串，默认 hh:mm
 * @param props.className 类名
 * @param props.content 内容
 * @param props.children 子元素
 * @returns React Node content
 */
function MessageRibbon(props: MessageRibbonProps) {
    const {children, avatar, date, dateFormat = 'hh:mm', className, content, ...others} = props;

    return (
        <div className={classes('app-message-ribbon primary-pale', className)} {...others}>
            {avatar ? renderAvatar(avatar) : null}
            {date ? <span style={{paddingRight: 8}}>{formatDate(date, dateFormat)}</span> : null}
            {content ? <div className="content">{content}</div> : null}
            {children}
        </div>
    );
}

export default memo(MessageRibbon);
