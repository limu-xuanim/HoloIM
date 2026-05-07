import {type ReactNode, memo} from 'react';
import {classes} from '~/app/utils/html-helper';
import {type MemberStatusName, STATUS} from '~/app/core/members/member';
import useLang from './use-lang';

type SvgDotProps = {
    statusName: MemberStatusName;
    className: string;
    style?: React.CSSProperties;
}

function SvgDot(props: SvgDotProps) {
    const {statusName, className, style} = props;

    if (statusName === 'unverified' || statusName === 'disconnect' || statusName === 'offline') {
        return (
            <div className={classes('status-dot', className, `status-${statusName}`)} style={style}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="13" height="13" rx="6.5" fill="#838A9D" stroke="white" />
                    <path d="M4.2002 7H9.8002" stroke="white" />
                </svg>
            </div>
        );
    }

    if (statusName === 'logged' || statusName === 'online') {
        return (
            <div className={classes('status-dot', className, `status-${statusName}`)} style={style}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="13" height="13" rx="6.5" fill="#0DBB7D" stroke="white" />
                    <path d="M4.2002 6.53343L6.06686 8.4001L9.8002 5.6001" stroke="white" />
                </svg>
            </div>
        );
    }

    if (statusName === 'busy') {
        return (
            <div className={classes('status-dot', className, `status-${statusName}`)} style={style}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="13" height="13" rx="6.5" fill="#FF8F50" stroke="white" />
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.6748 3.5H3.3248C3.03523 3.5 2.7998 3.73461 2.7998 4.025V8.75C2.7998 9.03957 3.03523 9.275 3.3248 9.275H5.88418C5.92027 9.275 5.9498 9.30453 5.9498 9.34062V10.0297C5.9498 10.0477 5.93504 10.0625 5.91699 10.0625H5.4248C5.27961 10.0625 5.1623 10.1798 5.1623 10.325V10.5875H8.8373V10.325C8.8373 10.1798 8.72 10.0625 8.5748 10.0625H8.08262C8.06457 10.0625 8.0498 10.0477 8.0498 10.0297V9.34062C8.0498 9.30453 8.07934 9.275 8.11543 9.275H10.6748C10.9644 9.275 11.1998 9.03957 11.1998 8.75V4.025C11.1998 3.73461 10.9644 3.5 10.6748 3.5ZM7.5248 10.0297C7.5248 10.0477 7.51004 10.0625 7.49199 10.0625H6.50762C6.48957 10.0625 6.4748 10.0477 6.4748 10.0297V9.60313C6.4748 9.56703 6.50434 9.5375 6.54043 9.5375H7.45918C7.49527 9.5375 7.5248 9.56703 7.5248 9.60313V10.0297ZM10.6748 8.61875C10.6748 8.69094 10.6157 8.75 10.5436 8.75H3.45605C3.38387 8.75 3.3248 8.69094 3.3248 8.61875V8.10917C3.3248 8.09113 3.33957 8.07636 3.35762 8.07636H10.642C10.66 8.07636 10.6748 8.09113 10.6748 8.10917V8.61875ZM3.86501 5.17576C3.86501 4.99166 4.01424 4.84242 4.19834 4.84242H9.79834C9.98243 4.84242 10.1317 4.99166 10.1317 5.17576C10.1317 5.35985 9.98243 5.50909 9.79834 5.50909H4.19834C4.01424 5.50909 3.86501 5.35985 3.86501 5.17576ZM3.86501 6.57627C3.86501 6.39217 4.01424 6.24294 4.19834 6.24294H7.93167C8.11577 6.24294 8.26501 6.39217 8.26501 6.57627C8.26501 6.76036 8.11577 6.9096 7.93167 6.9096H4.19834C4.01424 6.9096 3.86501 6.76036 3.86501 6.57627Z" fill="white" fillOpacity="0.9" />
                </svg>
            </div>
        );
    }

    if (statusName === 'away') {
        return (
            <div className={classes('status-dot', className, `status-${statusName}`)} style={style}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="13" height="13" rx="6.5" fill="#E33E3E" stroke="white" />
                    <path d="M7 3.5V7.7H9.8" stroke="white" strokeLinecap="square" />
                </svg>
            </div>
        );
    }

    return null
}

type StatusDotProps = {
    status: MemberStatusName;
    className?: string;
    style?: React.CSSProperties;
    label?: ReactNode;
};

/**
 * StatusDot 组件 ，显示状态 SVG 标识
 * @param props React 组件属性对象
 * @returns React 内容
 */
function StatusDot(props: StatusDotProps) {
    const {
        className = '',
        status,
        label,
        style,
    } = props;
    const [Lang] = useLang();
    const statusName = STATUS.getName(status);
    const svgDotView = (<SvgDot statusName={statusName} className={classes(className, '-rounded-full', '-w-[14px] -h-[14px]')} style={style} />);

    if (label) {
        const labelText = label === true ? Lang.string(`member.status.${statusName === 'unverified' ? 'offline' : status}`) : label;
        return <div className="app-member-status -inline-flex -items-center">{svgDotView} &nbsp; <span className="status-label muted">{labelText}</span></div>;
    }
    return svgDotView;
}

export default memo(StatusDot);
