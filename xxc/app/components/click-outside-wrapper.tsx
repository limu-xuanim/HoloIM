import {useEffect, useRef} from 'react';

type ClickOutsideWrapperProps = {
    onClickOutside: (event: MouseEvent, wrapper: HTMLDivElement) => void;
    children: JSX.Element|JSX.Element[];
};

/**
 * ClickOutsideWrapper 组件 ，显示一个ClickOutsideWrapper（允许监听元素外点击事件的容器元素，可以很方便的使用此组件制作点击外部即关闭的弹出层）
 * @example <caption>制作一个点击外部即关闭的对话框</caption>
 * let isDialogOpen = true;
 * const renderDialog = props => {
 *     return isDialogOpen ? (<ClickOutsideWrapper
 *         onClickOutside={e => {
 *              isDialogOpen = false;
 *         }}
 *     >
 *          <h1>Dialog heading</h1>
 *          <div>dialog content...</div>
 *     </ClickOutsideWrapper>) : null;
 * };
 */
export default function ClickOutsideWrapper(props: ClickOutsideWrapperProps) {
    const {
        onClickOutside,
        children,
        ...other
    } = props;
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // 这里用来屏蔽右键的情况
            // 不能绑定click事件，click是鼠标抬起时会触发，如果在其他组件中将当前包裹得组件隐藏，那么会触发componentWillUnmount
            // 导致click事件没有触发就被卸载掉。
            if (event.button !== 0) {
                return;
            }
            if (onClickOutside && wrapperRef.current && !wrapperRef.current.contains(event.target as HTMLElement)) {
                onClickOutside(event, wrapperRef.current);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClickOutside]);

    return (
        <div ref={wrapperRef} {...other}>
            {children}
        </div>
    );
}
