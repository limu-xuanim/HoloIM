import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {classes} from '../utils/html-helper';
import InputControl, {type InputControlRef, type InputControlProps} from './input-control';
import Icon from './icon';
import {isEmptyString} from '../utils/check-empty';
import DelayAction from '../utils/delay-action';

type SearchControlProps = InputControlProps
    & Partial<{
        placeholder: string;
        changeDelay: number;
        onSearchChange: (value: string) => void;
        onBlur: (event: React.FocusEvent<HTMLDivElement, Element>) => void;
        onFocus: (event: React.FocusEvent<HTMLDivElement, Element>) => void;
        onFocusChange: (value: boolean, event: React.FocusEvent<HTMLDivElement, Element>) => void;
        defaultValue: string;
        children: React.ReactNode;
        className: string;
    }>;

export type SearchControlRef = {
    getValue: () => string;
    isEmpty: () => boolean;
    handleOnClearBtnClick: (autoFocus?: boolean) => void;
    inputControlRef: React.MutableRefObject<InputControlRef>;
};

/**
 * SearchControl 组件 ，显示一个搜索框
 */
const SearchControl = forwardRef((
    props: SearchControlProps,
    ref: React.ForwardedRef<SearchControlRef>
) => {
    const {
        className,
        children,
        onSearchChange,
        changeDelay = 100,
        onFocus,
        onFocusChange,
        onBlur,
        defaultValue,
        placeholder,
        ...other
    } = props;

    delete other.value;

    const [value, setValue] = useState(defaultValue);
    const [focus, setFocus] = useState(false);
    const [empty, setEmpty] = useState(isEmptyString(props.defaultValue));
    const delaySearchChangeTaskRef = useRef<DelayAction<(searchValue: string) => void>>();
    const inputControlRef = useRef<InputControlRef>();

    useEffect(() => {
        // 这个 DelayAction 要确保执行 action，这个实例可能一直在重新赋值
        delaySearchChangeTaskRef.current = onSearchChange
            ? new DelayAction((searchValue) => {onSearchChange(searchValue);}, changeDelay)
            : null;
        return () => {
            delaySearchChangeTaskRef.current = null;
        };
    }, [changeDelay, onSearchChange]);

    /**
     * 处理搜索框获得焦点事件
     * @param e 事件对象
     */
    const handleOnInputFocus = (e: React.FocusEvent<HTMLDivElement, Element>) => {
        setFocus(true);
        if (onFocus) {
            onFocus(e);
        }
        if (onFocusChange) {
            onFocusChange(true, e);
        }
    };

    /**
     * 处理搜索框失去焦点事件
     * @param e 事件对象
     */
    const handleOnInputBlur = (e: React.FocusEvent<HTMLDivElement, Element>) => {
        setFocus(false);
        if (onBlur) {
            onBlur(e);
        }
        if (onFocusChange) {
            onFocusChange(false, e);
        }
    };

    /**
     * 设置搜索框值
     * @param v 输入框值
     * @param callback 操作完成时的回调函数
     */
    const setInputValue = useCallback((v: string, callback?: (value: string) => void) => {
        inputControlRef.current.setValue(v);
        setEmpty(isEmptyString(v));
        setValue(v);

        delaySearchChangeTaskRef.current?.do(v);
        callback?.(v);
    }, []);

    /**
     * 处理搜索框值变更事件
     * @param v 搜索框内的文本值
     */
    const handleOnInputChange = (v: string) => {
        setInputValue(typeof v === 'string' ? v : '');
    };

    /**
     * 处理清除按钮点击事件
     * @param autoFocus 是否自动获焦
     */
    const handleOnClearBtnClick = useCallback((autoFocus = true) => {
        setInputValue('', () => {
            if (autoFocus) {
                inputControlRef.current.focus();
            }
        });
    }, [setInputValue]);

    useImperativeHandle(ref, () => ({
        /**
         * 获取输入的值
         * @returns 输入的值
         */
        getValue: () => value.trim(),

        /**
         * 检查搜索框是否为空
         * @returns 如果为 `true`，则搜索框内容为空
         */
        isEmpty: () => empty,

        /**
         * 处理清除按钮点击事件
         */
        handleOnClearBtnClick,

        /**
         * 输入框 ref
         */
        inputControlRef
    }), [empty, handleOnClearBtnClick, value]);

    return (
        <InputControl
            className={classes('search', className, {
                focus,
                empty,
                normal: !focus
            })}
            defaultValue={defaultValue}
            label={<Icon name="sprite-search" />}
            onFocus={handleOnInputFocus}
            onBlur={handleOnInputBlur}
            onChange={handleOnInputChange}
            ref={inputControlRef}
            placeholder={placeholder}
            {...other}
            labelStyle={{zIndex: 1}}
        >
            <Icon name="close" onClick={() => handleOnClearBtnClick()} className="close state" />
            {children}
        </InputControl>
    );
});

export default SearchControl;
