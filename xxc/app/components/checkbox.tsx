import {memo} from 'react';
import {classes} from '../utils/html-helper';
import useUid from './hooks/use-uid';

type CheckboxProps = Partial<{
    checked: boolean;
    indeterminate: boolean;
    label: React.ReactNode;
    className: string;
    onChange: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
    description: string;
    disabled: boolean;
    inputClassName: string;
}> & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>;

/**
 * Checkbox 组件 ，显示一个复选框
 * @param props React 组件属性对象
 * @param props.checked 选中状态
 * @param props.indeterminate 半选中状态
 * @param props.label 标签
 * @param props.className 样式类名
 * @param props.inputProps 其他属性
 * @param props.onChange 状态改变回调
 * @returns React Node
 */
function Checkbox({
    checked = false,
    indeterminate = false,
    label = null,
    className = null,
    onChange = null,
    description = null,
    disabled = false,
    inputClassName = null,
    ...inputProps
}: CheckboxProps) {
    const _controlId = useUid();

    return (
        <div className={classes('checkbox', className, {checked, indeterminate})}>
            <input className={inputClassName} disabled={disabled} id={_controlId} checked={checked} type="checkbox" onChange={e => onChange?.(e.target.checked, e)} {...inputProps} />
            {label != null && <label className={description ? '-inline-block' : '-block'} htmlFor={_controlId}>{label}</label>}
            {description != null && <span className="text-gray">{` (${description})`}</span>}
        </div>
    );
}

export default memo(Checkbox);
