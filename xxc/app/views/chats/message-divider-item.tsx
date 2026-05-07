import {memo} from 'react';
import {classes} from '../../utils/html-helper';
import {createDate, formatDate, isSameWeek, isToday, isYesterday} from '../../utils/date-helper';
import useLang from '../common/use-lang';

const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

type MessageDividerItemProps = Partial<{date: number | string | Date}>
    & React.HTMLAttributes<HTMLDivElement>;

/**
 * 消息分割线组件
 * @param props React 组件属性对象
 * @returns JSX.Element
 */
function MessageDividerItem(props: MessageDividerItemProps) {
    const {
        date,
        className,
        children,
        ...others
    } = props;

    const [Lang] = useLang();

    let dateStr = null;
    if (date) {
        dateStr = formatDate(date, 'YYYY-M-d');
        if (isToday(date)) {
            dateStr = `${Lang.string('time.today')} ${dateStr}`;
        } else if (isYesterday(date)) {
            dateStr = `${Lang.string('time.yesterday')} ${dateStr}`;
        } else if (isSameWeek(date)) {
            dateStr = `${Lang.string(`week.${weekday[createDate(date).getDay()]}`)} ${dateStr}`;
        }
    }

    return (
        <div className={classes('app-message-divider', className)} {...others}>
            <div className="content">{dateStr}{children}</div>
        </div>
    );
}

export default memo(MessageDividerItem);
