import {type ForwardedRef, forwardRef, useImperativeHandle, useRef, useState} from 'react'
import InputControl, {type InputControlProps, type InputControlRef} from './input-control';
import {classes} from '../utils/html-helper';
import {getKeyDecoration, formatKeyDecoration, isOnlyModifyKeys} from '../utils/shortcut';

type HotkeyInputControlProps = Partial<{
    defaultValue: string;
    className: string;
    onChange: (value: string) => void;
    inputProps: React.InputHTMLAttributes<HTMLInputElement>;
    onlyMotifyKeysText: string;
}> & InputControlProps;

export type HotkeyInputControlRef = {
    getValue: () => string;
};

/**
 * HotkeyInputControl 组件 ，显示一个快捷键输入框
 */
const HotkeyInputControl = forwardRef((
    props: HotkeyInputControlProps,
    ref: ForwardedRef<{
        getValue: () => string;
    }>
) => {
    const {
        onChange,
        defaultValue = '',
        className,
        inputProps,
        onlyMotifyKeysText = '',
        ...other
    } = props;

    const [value, setValue] = useState(formatKeyDecoration(props.defaultValue));
    const [error, setError] = useState<React.ReactNode>();
    const inputControlRef = useRef<InputControlRef>();

    /**
     * 更改输入框内的值
     * @param v 输入框内的值
     * @param err 设置错误提示
     */
    const changeValue = (v: string, err: React.ReactNode = null) => {
        if (onChange) {
            onChange(v);
        }
        setValue(v);
        setError(err);
    };

    /**
     * 处理键盘按键事件
     * @param e 事件对象
     */
    const handleKeyDownEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.code === 'Backspace') {
            changeValue('');
            return;
        }
        const shortcut = getKeyDecoration(e);
        if (isOnlyModifyKeys(shortcut)) {
            changeValue(shortcut, onlyMotifyKeysText);
        } else {
            changeValue(shortcut);
        }
        e.preventDefault();
        e.stopPropagation();
    };

    /**
     * 处理失去焦点事件
     */
    const handleBlurEvent = () => {
        if (isOnlyModifyKeys(value)) {
            changeValue('', onlyMotifyKeysText);
        }
    };

    useImperativeHandle(ref, () => ({
        /**
         * 获取输入框内的值
         * @returns 快捷键字符串
         */
        getValue: () => value
    }), [value]);

    return (
        <InputControl
            {...other}
            placeholder={defaultValue}
            className={classes(className, {'has-error': !!error})}
            helpText={error}
            ref={inputControlRef}
            value={value}
            inputProps={({onKeyDown: handleKeyDownEvent, onBlur: handleBlurEvent, ...inputProps})}
        />
    );
});

export default HotkeyInputControl;
