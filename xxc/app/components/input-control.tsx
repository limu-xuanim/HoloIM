import {type CompositionEvent, forwardRef, useRef, useEffect, useImperativeHandle, useCallback} from 'react';
import hotkeys, {type KeyHandler} from 'hotkeys-js';
import {classes} from '../utils/html-helper';
import fuid from '../utils/fuid';

// 设置输入框快捷键事件
hotkeys.filter = event => {
    const target = event.target as HTMLElement;
    const {tagName} = target;
    if (!/^(INPUT|TEXTAREA|SELECT)$/.test(tagName.toUpperCase())) {
        return true;
    }

    const scope = target.dataset.hotkeyScope;
    if (scope) {
        hotkeys.setScope(scope);
        return true;
    }
    return false;
};

export type InputControlProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>

    & Partial<{
        name: string;
        label: React.ReactNode;
        labelStyle: React.CSSProperties;
        isLabelInline: boolean;
        placeholder: string;
        autoFocus: boolean;
        inputType: React.InputHTMLAttributes<HTMLInputElement>['type'];
        inputStyle: React.CSSProperties;
        inputProps: React.InputHTMLAttributes<HTMLInputElement>,
        value: React.InputHTMLAttributes<HTMLInputElement>['value'];
        helpText: React.ReactNode;
        helpTextClassName: string;
        onChange: (value: string, event: React.ChangeEvent<HTMLInputElement>|CompositionEvent<HTMLInputElement>) => void,
        inputClassName: string;
        defaultValue: React.InputHTMLAttributes<HTMLInputElement>['defaultValue'];
        disabled: boolean;
        children: React.ReactNode;
        hotkeyScope: string;
        hotKeys: Record<string, KeyHandler>;
        addon: string;
        addonInput: React.ReactNode | null;
        inputContainerClassName: string | null;
    }>;

export type InputControlRef = {
    readonly value: string | number | readonly string[];
    setValue: (v: string) => void;
    focus: () => void;
};

/**
 * InputControl 组件 ，显示一个输入框控件
 */
const InputControl = forwardRef((
    props: InputControlProps,
    ref: React.ForwardedRef<InputControlRef>,
) => {
    const {
        name = '',
        label = ' ',
        labelStyle,
        isLabelInline = false,
        placeholder = '',
        autoFocus = false,
        inputType = 'text',
        inputStyle,
        inputProps,
        value,
        helpText,
        helpTextClassName,
        onChange,
        className,
        inputClassName = '-rounded',
        defaultValue,
        disabled = false,
        children,
        hotkeyScope,
        hotKeys,
        addon = '',
        addonInput = null,
        inputContainerClassName = null,
        ...other
    } = props;

    const controlledRef = useRef(value !== undefined);
    const controlNameRef = useRef(name || fuid());
    const hotkeyScopeRef = useRef((hotkeyScope || hotKeys) ? (hotkeyScope || controlNameRef.current) : '');
    const isCompositionEndRef = useRef(true);
    const autoFocusTaskRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * 处理文本输入事件
     * @param event 事件对象
     */
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>|CompositionEvent<HTMLInputElement>) => {
        if (onChange && (controlledRef.current || isCompositionEndRef.current)) {
            onChange((event.target as HTMLInputElement).value, event);
        }
    };

    /**
     * 处理 composition 变更事件
     * @param status composition是否结束
     * @param event Composition 事件对象
     */
    const handleCompositionChange = (status: boolean, event: CompositionEvent<HTMLInputElement>) => {
        isCompositionEndRef.current = status;
        handleChange(event);
    };

    /**
     * 处理 composition 开始事件
     * @param event Composition 事件对象
     */
    const handleCompositionStart = (event: CompositionEvent<HTMLInputElement>) => handleCompositionChange(false, event);

    /**
     * 处理 composition 结束事件
     * @param event Composition 事件对象
     */
    const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => handleCompositionChange(true, event);

    /**
     * 激活输入框
     */
    const focus = useCallback(() => {
        inputRef.current!.focus();
    }, []);

    useImperativeHandle(ref, () => ({
        /**
         * 获取文本框值
         */
        get value() {
            return controlledRef.current ? value! : inputRef.current!.value;
        },

        /**
         * 设置新的值
         * @param v 新的值
         */
        setValue: (v: string) => {
            if (controlledRef.current) {
                throw new Error('Cannot call set value method in a controlled form control, use property "value" to update value.');
            }

            inputRef.current!.value = v;
        },

        /**
         * 激活输入框
         */
        focus,
    }), [focus, value]);

    useEffect(() => {
        if (autoFocus) {
            autoFocusTaskRef.current = setTimeout(() => {
                focus();
                autoFocusTaskRef.current = null;
            }, 100);
        }

        if (hotKeys) {
            for (const [k, v] of Object.entries(hotkeys)) {
                hotkeys(k, hotkeyScopeRef.current, v);
            }
        }
    }, [autoFocus, focus, hotKeys]);

    useEffect(() => {
        if (autoFocusTaskRef.current) {
            clearTimeout(autoFocusTaskRef.current);
            autoFocusTaskRef.current = null;
        }

        if (hotkeyScopeRef.current) {
            hotkeys.deleteScope(hotkeyScopeRef.current);
        }
    }, []);

    return (
        <div className={classes('control', className, {disabled})} {...other}>
            {label && <label htmlFor={controlNameRef.current} style={labelStyle}>{label}</label>}
            <div className={classes('-relative', {'-inline-block': isLabelInline}, inputContainerClassName)}>
                <input
                    name={name}
                    data-hotkey-scope={hotkeyScopeRef.current}
                    disabled={!!disabled}
                    ref={inputRef}
                    value={value}
                    defaultValue={defaultValue}
                    id={controlNameRef.current}
                    type={inputType}
                    className={classes('input', inputClassName, {'-pr-10': !!addon})}
                    placeholder={placeholder}
                    onChange={handleChange}
                    onCompositionStart={handleCompositionStart}
                    onCompositionUpdate={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    style={inputStyle}
                    spellCheck={false}
                    {...inputProps}
                />
                {addonInput}
                {addon && <span className="-absolute -inset-y-0 -right-0 -pr-2 -flex -items-center -pointer-events-none -text-xs -whitespace-nowrap">{addon}</span>}
            </div>
            {helpText ? <p className={helpTextClassName ?? 'help-text'}>{helpText}</p> : null}
            {children}
        </div>
    );
});

export default InputControl;
