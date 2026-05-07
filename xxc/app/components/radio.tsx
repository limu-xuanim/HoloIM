import {type ReactNode, isValidElement, memo} from 'react';
import {classes} from '../utils/html-helper';
import useUid from './hooks/use-uid';

export type RadioProps = {name: string; value: string;}
    & React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        checked: boolean;
        disabled: boolean;
        label: ReactNode;
        className: string;
        inputProps: React.HTMLAttributes<HTMLInputElement>;
        onChange: (name: string, value: string, checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
        children: ReactNode | ((checked: boolean, props: RadioProps) => ReactNode);
    }>;

/**
 * Radio 组件 ，显示一个单选控件
 * @param props React 组件属性对象
 * @param props.checked 选中状态
 * @param props.disabled 禁用状态
 * @param props.label 标签
 * @param props.className 样式类名
 * @param props.inputProps 其他属性
 * @param props.onChange 状态改变回调
 * @param props.children 子组件
 * @param props.name 名称
 * @param props.value 值
 * @returns React Node
 */
function Radio(props: RadioProps) {
    const controlId = useUid();

    const {
        name,
        value,
        checked = false,
        disabled = false,
        label,
        children,
        className,
        inputProps,
        onChange,
        ...other
    } = props;

    let innerView: ReactNode;
    if (isValidElement(children)) {
        innerView = children;
    } else if (typeof children === 'function') {
        innerView = children(checked, props);
    }

    return (
        <div className={classes('radio', className, {checked, disabled})} {...other}>
            <input
                id={controlId}
                type="radio"
                name={name}
                disabled={disabled}
                checked={checked}
                onChange={e => onChange?.(name, value, e.target.checked, e)}
                value={value}
                {...inputProps}
            />
            {label ? <label htmlFor={controlId}>{label}</label> : null}
            {innerView}
        </div>
    );
}

export default memo(Radio);
