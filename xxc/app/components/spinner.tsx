import {classes} from '../utils/html-helper';
import Icon from './icon';

type SpinnerProps = React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        iconSize: number;
        iconClassName: string;
        iconName: string;
        className: string;
        labelClassName: string;
        label: React.ReactNode;
        children: React.ReactNode;
    }>;

/**
 * Spinner 组件 ，显示一个用于“正在加载中”图标
 */
export default function Spinner(props: SpinnerProps) {
    const {
        iconSize = 24,
        iconName = 'loading',
        iconClassName = 'spin text-gray -inline-block',
        labelClassName = '',
        label = '',
        className = '',
        children,
        ...other
    } = props;

    return (
        <div className={classes('spinner -text-center', className)} {...other}>
            <Icon name={iconName} className={iconClassName} size={iconSize} />
            {
                label
                    ? <div className={classes('muted small title', labelClassName)}>{label}</div>
                    : null
            }
            {children}
        </div>
    );
}
