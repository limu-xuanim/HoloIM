import {useRef, useEffect, forwardRef, useImperativeHandle, useCallback} from 'react';
import {classes} from '../utils/html-helper';

export type ScrollInfo = {
    /**
     * 是否已设置将底部作为滚动起始位置
     */
    stickyToBottom: boolean;
    /**
     * 滚动条是否显示
     */
    scrollbarShowed: boolean;
    /**
     * 滚动容器高度
     */
    clientHeight: number;
    /**
     * 滚动内容高度
     */
    scrollHeight: number;
    /**
     * 相对滚动位置
     */
    position: number;
    /**
     * 滚动位置
     */
    scrollTop: number;
    /**
     * 是否已经停靠在起始位置
     */
    isStickiedAtBegin: boolean;
    /**
     * 是否已经停靠在结束位置
     */
    isStickiedAtEnd: boolean;
    /**
     * 是否在顶不
     */
    isAtTop: boolean;
    /**
     * 是否在底部
     */
    isAtBottom: boolean;
};

export type ScrollListClassicProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'onScroll'>
    & Partial<{
        onScroll: (newInfo: ScrollInfo, oldInfo: ScrollInfo) => void;
        onScrollToEnd: (newInfo: ScrollInfo, oldInfo: ScrollInfo) => void;
        stickyToBottom: boolean;
        hoverEffect: boolean;
        customView: React.ReactNode | ((info: ScrollInfo) => React.ReactNode);
    }>;

export type ScrollListClassicRef = {
    scrollToBegin: () => void;
    scrollTo: (position: number) => void;
    scrollInfo: ScrollInfo;
};
const ScrollListClassic = forwardRef((props: ScrollListClassicProps, ref: React.ForwardedRef<ScrollListClassicRef>) => {
    const {
        className,
        stickyToBottom = false,
        customView = null,
        children = null,
        onScrollToEnd,
        onScroll,
        hoverEffect = true,
        ...others
    } = props;

    const scrollInfoRef = useRef({
        stickyToBottom: false,
        scrollbarShowed: false,
        clientHeight: 0,
        scrollHeight: 0,
        position: 0,
        scrollTop: 0,
        isStickiedAtBegin: true,
        isStickiedAtEnd: true,
        isAtTop: true,
        isAtBottom: true,
    });
    const contentElementRef = useRef<HTMLDivElement>(null);
    const containerElementRef = useRef<HTMLDivElement>(null);
    const fixStickyPositionAnimationIDRef = useRef<number>();
    const containerSizeObserverRef = useRef<ResizeObserver>();

    /**
     * 更新滚动位置信息
     */
    const updateScrollInfo = useCallback(() => {
        const oldScrollInfo = scrollInfoRef.current;
        const {clientHeight, scrollHeight, scrollTop} = containerElementRef.current!;
        const extraHeight = scrollHeight - clientHeight;
        const scrollbarShowed = extraHeight > 0;
        const position = stickyToBottom ? (extraHeight - scrollTop) : scrollTop;

        scrollInfoRef.current = {
            scrollTop,
            position,
            stickyToBottom,
            clientHeight,
            scrollHeight,
            scrollbarShowed,
            isStickiedAtBegin: !scrollbarShowed || position === 0,
            isStickiedAtEnd: !scrollbarShowed || position === extraHeight,
            isAtBottom: scrollTop === extraHeight,
            isAtTop: scrollTop === 0,
        };

        // 如果滚动位置发生变化则触发事件
        const positionChanged = position !== oldScrollInfo.position;
        if (onScroll && positionChanged) {
            onScroll({...scrollInfoRef.current}, oldScrollInfo);
        }

        // 如果滚动到结束位置触发事件
        if (onScrollToEnd && scrollInfoRef.current.isStickiedAtEnd && !oldScrollInfo.isStickiedAtEnd) {
            onScrollToEnd({...scrollInfoRef.current}, oldScrollInfo);
        }
    }, [onScroll, onScrollToEnd, stickyToBottom]);

    /**
     * 滚动到指定位置
     * @param scrollTop 滚动位置
     */
    const setScrollTop = useCallback((scrollTop: number) => {
        containerElementRef.current!.scrollTop = scrollTop;
    }, []);

    /**
     * 滚动到指定位置（相对于 stickyToBottom 设置）
     * @param position 距离起始位置的距离
     */
    const scrollTo = useCallback((position: number) => {
        const {clientHeight, scrollHeight} = containerElementRef.current!;
        setScrollTop(stickyToBottom ? (scrollHeight - clientHeight - position) : position);
    }, [setScrollTop, stickyToBottom]);

    /**
     * 滚动到起始位置，如果 stickyToBottom 为 true，则滚动到底部，否则滚动到顶部
     * @returns 如果返回 `true` 则为操作成功
     */
    const scrollToBegin = useCallback(() => scrollTo(0), [scrollTo]);

    /**
     * 滚动到结束位置，如果 stickyToBottom 为 true，则滚动到顶部，否则滚动到底部
     * @returns 如果返回 `true` 则为操作成功
     */
    const scrollToEnd = useCallback(() => {
        const {clientHeight, scrollHeight} = containerElementRef.current!;
        return scrollTo(scrollHeight - clientHeight);
    }, [scrollTo]);

    /**
     * 根据停靠位置修复滚动位置
     */
    const fixStickyPosition = useCallback(() => {
        if (!stickyToBottom) {
            return;
        }
        keepPosition(scrollInfoRef.current.position);
    }, [stickyToBottom]);

    /**
     * 保持滚动条在指定位置一定的时间
     * @param position 要保持的位置
     * @param minTime 至少要保持的时间，单位毫秒，默认 500 毫秒
     * @param startTime 上次执行操作时的起始时间，默认为 0
     */
    const keepPosition = useCallback((position: number, minTime = 500, startTime = 0) => {
        startTime = startTime || Date.now();
        const time = (Date.now() - startTime);
        if (time <= minTime) {
            scrollTo(position);
        }
        if (time < minTime) {
            fixStickyPositionAnimationIDRef.current = requestAnimationFrame(() => keepPosition(position, minTime, startTime));
        }
    }, [scrollTo]);

    useEffect(() => {
        updateScrollInfo();
        if (stickyToBottom) {
            // 监听滚动区域尺寸大小变化
            containerSizeObserverRef.current = new ResizeObserver(() => {
                if (
                    containerElementRef.current!.scrollHeight !== scrollInfoRef.current.scrollHeight
                    || containerElementRef.current!.clientHeight !== scrollInfoRef.current.clientHeight
                ) {
                    fixStickyPosition();
                }
            });
            containerSizeObserverRef.current.observe(containerElementRef.current!);
            containerSizeObserverRef.current.observe(contentElementRef.current!);

            scrollToEnd();
        }
    }, [fixStickyPosition, scrollToEnd, updateScrollInfo, stickyToBottom]);

    useEffect(() => () => {
        if (containerSizeObserverRef.current) {
            containerSizeObserverRef.current.disconnect();
        }
        if (fixStickyPositionAnimationIDRef.current) {
            cancelAnimationFrame(fixStickyPositionAnimationIDRef.current);
        }
    }, []);

    useImperativeHandle(ref, () => ({
        scrollToBegin,
        scrollTo,
        scrollInfo: scrollInfoRef.current,
    }), [scrollToBegin, scrollTo]);

    const classNames = classes(
        'scroll-list-classic',
        className,
        `is-stick-${stickyToBottom ? 'bottom' : 'top'}`
    );

    return (
        <div className={classNames} {...others}>
            <div
                ref={containerElementRef}
                className={classes('scroll-list-classic-container', {'scrollbar-hover': hoverEffect})}
                onScroll={updateScrollInfo}
            >
                <div className="scroll-list-classic-content" ref={contentElementRef}>
                    {children}
                </div>
            </div>
            {typeof customView === 'function' ? customView(scrollInfoRef.current) : customView}
        </div>
    );
});

export default ScrollListClassic;
