import {type ForwardedRef, forwardRef, useImperativeHandle, useRef, useState} from 'react'
import {classes} from '../utils/html-helper';
import {isEmptyString} from '../utils/check-empty';

type SelectBoxProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'|'onFocus'|'onBlur'>
    & Partial<{
        name: string;
        value: React.SelectHTMLAttributes<HTMLSelectElement>['value'];
        onChange: (value: string, e: React.ChangeEvent<HTMLSelectElement>) => void;
        onFocus: (e: React.FocusEvent<HTMLSelectElement, Element>) => void;
        onBlur: (e: React.FocusEvent<HTMLSelectElement, Element>) => void;
        children: React.ReactNode;
        selectProps: React.SelectHTMLAttributes<HTMLSelectElement>;
        selectClassName: string;
        options: Array<{
            label: React.ReactNode;
            value: React.OptionHTMLAttributes<HTMLOptionElement>['value'];
        }|string|number>;
    }>;

export type SelectBoxRef = {
    focus: () => void;
};

/**
 * SelectBox 组件 ，显示一个选择框
 */
const SelectBox = forwardRef((
    props: SelectBoxProps,
    ref: ForwardedRef<SelectBoxRef>
) => {
    const {
        name,
        value = '',
        children,
        className,
        selectProps,
        selectClassName = '-rounded',
        options,
        onChange,
        onBlur,
        onFocus,
        ...other
    } = props;

    const [focus, setFocus] = useState(false);
    const [empty, setEmpty] = useState(isEmptyString(value));
    const selectRef = useRef<HTMLSelectElement>(null);

    /**
     * 处理选择框值变更事件
     * @param e 事件对象
     */
    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const {value: v} = e.target;
        setEmpty(isEmptyString(v));
        if (onChange) {
            onChange(v, e);
        }
    };

    /**
     * 处理获得焦点事件
     * @param e 事件对象
     */
    const handleOnSelectFocus = (e: React.FocusEvent<HTMLSelectElement, Element>) => {
        setFocus(true);
        if (onFocus) {
            onFocus(e);
        }
    };

    /**
     * 处理失去焦点事件
     * @param e 事件对象
     */
    const handleOnSelectBlur = (e: React.FocusEvent<HTMLSelectElement, Element>) => {
        setFocus(false);
        if (onBlur) {
            onBlur(e);
        }
    };

    useImperativeHandle(ref, () => ({
        /**
         * 使选择框获得焦点
         */
        focus() {
            selectRef.current?.focus();
        }
    }), []);

    return (
        <div
            className={classes('select', className, {
                focus,
                empty,
                normal: !focus
            })}
            {...other}
        >
            <select
                name={name}
                ref={selectRef}
                className={selectClassName}
                value={value}
                onChange={handleSelectChange}
                {...selectProps}
                onFocus={handleOnSelectFocus}
                onBlur={handleOnSelectBlur}
            >
                {
                    options?.map(option => {
                        if (!option) {
                            return null;
                        }
                        if (typeof option !== 'object') {
                            option = {value: option, label: option};
                        }

                        const {value, label} = option as {label: React.ReactNode; value: React.OptionHTMLAttributes<HTMLOptionElement>['value']};
                        return <option key={String(value)} value={value}>{label}</option>;
                    })
                }
                {children}
            </select>
        </div>
    );
});

export default SelectBox;
