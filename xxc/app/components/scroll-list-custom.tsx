import {useRef, useEffect, useCallback, forwardRef, useImperativeHandle} from 'react';
import {classes} from '../utils/html-helper';

type ScrollInfo = {
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
     * 滚动位置
     */
    position: number;
    /**
     * 是否已经停靠在起始位置
     */
    isStickiedAtBegin: boolean;
    /**
     * 是否已经停靠在结束位置
     */
    isStickiedAtEnd: boolean;
    /**
     * 是否在顶部
     */
    isAtTop: boolean;
    /**
     * 是否在底部
     */
    isAtBottom: boolean;
    /**
     * 滚动条位置
     */
    scrollbarPosition: number;
    /**
     * 滚动条拖动条高度
     */
    scrollbarHeight: number;
};

export type ScrollListCustomProps = React.HTMLAttributes<HTMLDivElement>
    & Partial<{
        onScroll: (newInfo: ScrollInfo, oldInfo: ScrollInfo) => void;
        onScrollToEnd: (newInfo: ScrollInfo, oldInfo: ScrollInfo) => void;
        stickyToBottom: boolean;
        minScrollbarHeight: number;
        scrollPageRatio: number;
        wheelSpeed: number;
        useHotkey: boolean;
        animation: boolean;
        animateOnClickScrollbar: boolean;
        customView: React.ReactNode | ((info: ScrollInfo) => React.ReactNode);
        showScrollbarAfterShow: boolean;
        showScrollbarOnChange: boolean; // 是否在滚动区域发生变更时显示滚动条
        scrollbarHideDelay: number;
    }>;

export type ScrollListCustomRef = {
    scrollTo: (position: number, animation?: boolean) => void;
    scrollToBegin: (animation?: boolean) => void;
    listElement: HTMLDivElement;
    scrollInfo: ScrollInfo;
    scrollToElement: (element: HTMLElement, options?: Partial<{
        behavior: 'instant' | 'smooth';
        block: 'nearest' | 'start' | 'center' | 'end';
        ifNeed: boolean;
        offset: number;
    }>) => boolean;
};

const ScrollList = forwardRef((props: ScrollListCustomProps, ref: React.ForwardedRef<ScrollListCustomRef>) => {
    const {
        className,
        stickyToBottom = false,
        useHotkey = true,
        animation = true,
        customView = null,
        children = null,
        onScroll,
        onScrollToEnd,
        minScrollbarHeight = 28,
        scrollPageRatio = 0.8,
        scrollbarHideDelay = 500,
        showScrollbarAfterShow = true,
        showScrollbarOnChange = true,
        animateOnClickScrollbar = false,
        wheelSpeed = 1,
        ...others
    } = props;

    /**
     * 存储列表元素引用
     */
    const listElementRef = useRef<HTMLDivElement>(null);

    /**
     * 存储滚动区域元素引用
     */
    const containerElementRef = useRef<HTMLDivElement>(null);

    /**
     * 存储滚动条元素引用
     */
    const scrollbarElementRef = useRef<HTMLDivElement>(null);

    /**
     * 是否正在移动滚动条
     */
    const isMovingScrollbarRef = useRef<false | {startY: number; startPosition: number;}>(false);

    /**
     * 上次滚动位置变更时间（时间戳，毫秒）
     */
    const lastPositionChangeTimeRef = useRef(0);

    /**
     * 是否正处于触摸动作中
     */
    const touchingRef = useRef<false|{startY: number, lastY: number, startTime: number, isTouchScrollbar: boolean}>(false);

    const updateStyleAnimationFrameRef = useRef<number | null>(null);

    const scrollingEffectTimerRef = useRef<NodeJS.Timeout | null>(null);

    const lastScrollTimeRef = useRef<number>();

    const lastWheelTimeRef = useRef<number>(0);

    const continuousScrollingTimerRef = useRef<number>();

    const continuousScrollingAnimationRef = useRef<number>();

    const acceleratingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const containerSizeObserverRef = useRef<ResizeObserver>();

    /**
     * 滚动位置信息对象
     */
    const scrollInfoRef = useRef({
        stickyToBottom: false,
        scrollbarShowed: false,
        clientHeight: 0,
        scrollHeight: 0,
        position: 0,
        isStickiedAtBegin: true,
        isStickiedAtEnd: true,
        isAtTop: true,
        isAtBottom: true,
        scrollbarPosition: 0,
        scrollbarHeight: 0,
    });

    /**
     * 更新滚动区域位置和滚动条样式
     * @param newPosition 设置新的滚动位置
     * @param animation 是否启用动画效果
     * @returns 如果返回 `true` 则为更新成功，否则为更新被取消（无需更新）
     */
    const updateStyle = useCallback((newPosition?: number, animation = true) => {
        if (!listElementRef.current) {
            return;
        }

        const oldScrollInfo = scrollInfoRef.current;
        const {clientHeight} = listElementRef.current;
        const scrollHeight = containerElementRef.current!.clientHeight;
        const scrollbarShowed = scrollHeight > clientHeight;
        const maxPosition = Math.floor(scrollHeight - clientHeight);
        const position = scrollbarShowed ? (typeof newPosition === 'number' ? Math.min(maxPosition, Math.max(0, Math.floor(newPosition))) : Math.min(maxPosition, oldScrollInfo.position)) : 0;

        // 检查滚动区域大小和位置是否有变更
        if (
            clientHeight === oldScrollInfo.clientHeight
            && scrollHeight === oldScrollInfo.scrollHeight
            && position === oldScrollInfo.position
        ) {
            return false;
        }

        scrollInfoRef.current = {
            stickyToBottom,
            clientHeight,
            scrollHeight,
            position,
            scrollbarHeight: 0,
            scrollbarPosition: 0,
            scrollbarShowed,
            isStickiedAtBegin: !scrollbarShowed || position === 0,
            isStickiedAtEnd: !scrollbarShowed || position === (scrollHeight - clientHeight),
            isAtBottom: !scrollbarShowed || (stickyToBottom ? position === 0 : position === (scrollHeight - clientHeight)),
            isAtTop: !scrollbarShowed || (!stickyToBottom ? position === 0 : position === (scrollHeight - clientHeight)),
        };

        // 更新内容相对于滚动区域的位置
        if (position !== oldScrollInfo.position) {
            containerElementRef.current!.style[stickyToBottom ? 'bottom' : 'top'] = `-${position}px`;
        }

        // 更新滚动条样式
        if (scrollbarShowed) {
            scrollbarElementRef.current!.parentElement!.style.display = 'block';
            const scrollbarHeight = Math.max(minScrollbarHeight, Math.floor(clientHeight * (clientHeight / scrollHeight)));
            const scrollbarPosition = (clientHeight - scrollbarHeight) * (position / (scrollHeight - clientHeight));
            scrollbarElementRef.current!.style[stickyToBottom ? 'bottom' : 'top'] = `${scrollbarPosition}px`;
            scrollbarElementRef.current!.style.height = `${scrollbarHeight}px`;
            scrollInfoRef.current.scrollbarHeight = scrollbarHeight;
            scrollInfoRef.current.scrollbarPosition = scrollbarPosition;
        } else {
            scrollbarElementRef.current!.parentElement!.style.display = 'none';
        }

        // 如果滚动位置发生变化则触发事件
        const positionChanged = position !== oldScrollInfo.position;
        if (onScroll && positionChanged) {
            onScroll({...scrollInfoRef.current}, oldScrollInfo);
        }

        // 如果滚动到结束位置触发事件
        if (onScrollToEnd && scrollInfoRef.current.isStickiedAtEnd && !oldScrollInfo.isStickiedAtEnd) {
            onScrollToEnd({...scrollInfoRef.current}, oldScrollInfo);
        }

        // 是否为急促的滚动（本次位置变更时间于上次小于 100ms）
        // 急促滚动模式下，暂时禁用动画效果，以让滚动体验更流畅
        let isRapid = !animation;
        if (positionChanged) {
            const now = Date.now();
            if (animation) {
                isRapid = (now - lastPositionChangeTimeRef.current) < 100;
            }
            lastPositionChangeTimeRef.current = now;
        }
        startScrollingEffect(isRapid);

        return true;
    }, [minScrollbarHeight, onScroll, onScrollToEnd, stickyToBottom]);

    /**
     * 使用 requestAnimationFrame 来调用 updateStyle，确保交互流畅
     * @param newPosition 设置新的滚动位置
     * @param animation 是否启用动画效果
     */
    const tryUpdateStyle = useCallback((newPosition?: number, animation = true) => {
        if (updateStyleAnimationFrameRef.current) {
            cancelAnimationFrame(updateStyleAnimationFrameRef.current);
        }
        updateStyleAnimationFrameRef.current = requestAnimationFrame(() => {
            updateStyleAnimationFrameRef.current = null;
            updateStyle(newPosition, animation);
        });
    }, [updateStyle]);

    /**
     * 变更滚动位置
     * @param offset 要变更的距离，可以为负数
     * @param animation 是否启用动画效果
     */
    const scrollWithOffset = useCallback((offset: number, animation = true) => {
        const {position} = scrollInfoRef.current;
        tryUpdateStyle(position + offset, animation);
    }, [tryUpdateStyle]);

    /**
     * 滚动到指定位置
     * @param position 距离起始位置的距离
     * @param animation 是否启用动画效果
     */
    const scrollTo = useCallback((position: number, animation = true) => {
        tryUpdateStyle(position, animation);
    }, [tryUpdateStyle]);

    /**
     * 设置滚动条到指定位置
     * @param scrollbarPosition 滚动条位置
     * @param animation 是否启用动画效果
     * @returns 新的位置
     */
    const setScrollbarPosition = (scrollbarPosition: number, animation = true) => {
        if (!scrollInfoRef.current.scrollbarShowed) {
            return;
        }

        const newPosition = scrollbarPosition * ((scrollInfoRef.current.scrollHeight - scrollInfoRef.current.clientHeight) / (scrollInfoRef.current.clientHeight - scrollInfoRef.current.scrollbarHeight));
        scrollTo(newPosition, animation);
        return newPosition;
    }

    /**
     * 滚动到起始位置，如果 stickyToBottom 为 true，则滚动到底部，否则滚动到顶部
     * @param animation 是否启用动画效果
     */
    const scrollToBegin = useCallback((animation = true) => {
        if (scrollInfoRef.current.isStickiedAtBegin) {
            return;
        }
        tryUpdateStyle(0, animation);
    }, [tryUpdateStyle]);

    /**
     * 滚动到指定元素所在位置
     * @param element 要滚动的位置
     * @param options 选项
     * @param options.behavior 滚动方式，instant 和 smooth 表示 直接滚到底 和 使用平滑滚动
     * @param options.block 表示块级元素排列方向要滚动到的位置。start 表示将视口的顶部和元素顶部对齐；center 表示将视口的中间和元素的中间对齐；end 表示将视口的底部和元素底部对齐；nearest 表示就近对齐
     * @param options.ifNeed 如果元素已经可见则不进行滚动操作
     * @param options.offset 额外的移动量
     * @returns 如果返回 `true` 则为操作成功
     */
    const scrollToElement = useCallback((element: HTMLElement, options: Partial<{
        behavior: 'instant' | 'smooth',
        block: 'nearest'| 'start' | 'center' | 'end';
        ifNeed: boolean;
        offset: number;
    }> = {}) => {
        if (!element) {
            return false;
        }

        if (typeof options === 'boolean') {
            options = {behavior: options ? 'smooth' : 'instant'};
        }

        const {behavior = 'instant', block = 'start', ifNeed = true, offset: extraOffset = 0} = options;
        const animation = behavior === 'smooth';
        const elementBounds = element.getBoundingClientRect(); // 元素所在区域
        const listBounds = listElementRef.current!.getBoundingClientRect(); // 列表区域
        const distanceToTop = elementBounds.top - listBounds.top; // 距离顶部的距离
        const distanceToBottom = listBounds.bottom - elementBounds.bottom; // 距离底部的距离
        const isElementTopVisible = distanceToTop >= 0; // 元素顶部是否可见
        const isElementBottomVisible = distanceToBottom >= 0; // 元素底部是否可见

        if (ifNeed && isElementTopVisible && isElementBottomVisible) {
            return false;
        }

        let finalBlockType = block;
        if (block === 'center' && elementBounds.height >= listBounds.height) {
            finalBlockType = 'start';
        } else if (block === 'nearest') {
            finalBlockType = distanceToTop < distanceToBottom ? 'start' : 'end';
        }

        let offset = 0;
        if (finalBlockType === 'start') {
            offset = 0 - distanceToTop;
        } else if (finalBlockType === 'end') {
            offset = distanceToBottom;
        } else if (finalBlockType === 'center') {
            const newTop = Math.round(listBounds.top + (listBounds.height - elementBounds.height) / 2);
            offset = newTop - elementBounds.top;
        }

        if (offset === 0) {
            return false;
        }
        scrollWithOffset((offset + extraOffset) * (stickyToBottom ? 1 : -1), animation);
        return true;
    }, [scrollWithOffset, stickyToBottom]);

    /**
     * 开始显示滚动中交互效果
     * @param isRapid 是否为急促的滚动（本次位置变更时间于上次小于 100ms）
     */
    const startScrollingEffect = useCallback((isRapid = false) => {
        const listElement = listElementRef.current!;
        listElement.classList.toggle('is-rapid', !!isRapid);
        if (!listElement.classList.contains('is-scrolling')) {
            listElement.classList.add('is-scrolling');
        }
        if (scrollingEffectTimerRef.current) {
            clearTimeout(scrollingEffectTimerRef.current);
        }
        scrollingEffectTimerRef.current = setTimeout(
            () => {
                listElement.classList.remove('is-scrolling');
                listElement.classList.remove('is-rapid');
                scrollingEffectTimerRef.current = null;
            },
            scrollbarHideDelay
        );
    }, [scrollbarHideDelay]);

    /**
     * 处理自定义事件
     * @param e 事件对象
     */
    const handleCustomEvent = useCallback((e: {detail: any; stopPropagation: () => void;}) => {
        const action = e.detail;
        if (Array.isArray(action)) {
            const method = action.shift();
            const actionHandler = {
                scrollToElement
            };
            // @ts-ignore
            actionHandler[method](...action);
        }
        e.stopPropagation();
    }, [scrollToElement]);

    /**
     * 处理滚轮事件
     * @param e 事件对象
     */
    const handleWheel = (e: {deltaY: number;}) => {
        const now = Date.now();
        const lastWheelTime = lastWheelTimeRef.current;

        lastWheelTimeRef.current = now;

        // 忽略第一次滚轮事件
        if ((now - lastWheelTime) >= 300) {
            return;
        }

        // 如果 300ms 内用户滚动了内部其他可滚动元素，则忽略此次滚轮事件
        if ((now - (lastScrollTimeRef.current ?? 0)) < 300) {
            return;
        }
        scrollWithOffset(wheelSpeed * e.deltaY * (stickyToBottom ? -1 : 1));
    };

    /**
     * 处理内容区域滚动事件
     * @param e 事件对象
     */
    const handleContainerScroll = useCallback(() => {
        lastScrollTimeRef.current = Date.now();
    }, []);

    /**
     * 处理按键事件
     * @param e 事件对象
     */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const scrollInfo = scrollInfoRef.current;
        if (scrollInfo.scrollHeight <= scrollInfo.clientHeight) {
            return;
        }

        let scrollOffset = 0;
        switch (e.code) {
            case 'PageUp':
                scrollOffset = scrollInfo.clientHeight * scrollPageRatio * (stickyToBottom ? 1 : -1);
                break;
            case 'PageDown':
            case 'Space':
                scrollOffset = scrollInfo.clientHeight * scrollPageRatio * (stickyToBottom ? -1 : 1);
                break;
            case 'ArrowUp':
                scrollOffset = 40 * (stickyToBottom ? 1 : -1);
                break;
            case 'ArrowDown':
                scrollOffset = 40 * (stickyToBottom ? -1 : 1);
                break;
            case 'Home':
                scrollOffset = stickyToBottom ? (scrollInfo.scrollHeight - scrollInfo.clientHeight - scrollInfo.position) : (0 - scrollInfo.position);
                break;
            case 'End':
                scrollOffset = !stickyToBottom ? (scrollInfo.scrollHeight - scrollInfo.clientHeight - scrollInfo.position) : (0 - scrollInfo.position);
                break;
            default:
                break;
        }
        if (scrollOffset) {
            scrollWithOffset(scrollOffset);
        }
    };

    const handleKeyUp = () => {
        if (continuousScrollingTimerRef.current) {
            clearTimeout(continuousScrollingTimerRef.current);
            continuousScrollingTimerRef.current = 0;
        }
        if (continuousScrollingAnimationRef.current) {
            cancelAnimationFrame(continuousScrollingAnimationRef.current);
            continuousScrollingAnimationRef.current = 0;
        }
    };

    /**
     * 处理点击滚动条事件
     * @param e 事件对象
     */
    const handleClickScrollbar = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isMovingScrollbarRef.current || (e.target as HTMLElement).classList.contains('scroll-list-scrollbar-bar')) {
            return;
        }
        const scrollInfo = scrollInfoRef.current;
        if (scrollInfo.scrollHeight <= scrollInfo.clientHeight) {
            return;
        }

        const scrollbarBounds = scrollbarElementRef.current!.parentElement!.getBoundingClientRect();
        const clickPosition = e.clientY - scrollbarBounds.y;
        const newScrollbarPosition = stickyToBottom ? (scrollInfo.clientHeight - clickPosition - Math.floor(scrollInfo.scrollbarHeight / 2)) : (clickPosition - Math.floor(scrollInfo.scrollbarHeight / 2));
        const newPostioin = setScrollbarPosition(newScrollbarPosition, animateOnClickScrollbar);

        // 允许用户点击滚动先跳转到另一个位置然后按住鼠标不放进行拖动
        handleStartMoveScrollbar(e, newPostioin);
    };

    /**
     * 处理滚动条上鼠标移动事件
     * @param e 事件对象
     * @param newPostioin 新的位置信息
     */
    const handleStartMoveScrollbar = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, newPostioin = scrollInfoRef.current.position) => {
        isMovingScrollbarRef.current = {startY: e.clientY, startPosition: newPostioin};
        startListenMouseMove();
        e.stopPropagation();
    };

    /**
     * 开始监听滚动条鼠标按钮相关事件来处理拖拽滚动条行为
     */
    const startListenMouseMove = () => {
        document.addEventListener('mouseup', handleStopMoveScrollbar);
        document.addEventListener('mousemove', handleMoveScrollbar);
    }

    /**
     * 停止监听滚动条鼠标按钮相关事件
     */
    const stopListenMouseMove = useCallback(() => {
        document.removeEventListener('mouseup', handleStopMoveScrollbar);
        document.removeEventListener('mousemove', handleMoveScrollbar);
    }, []);

    /**
     * 处理鼠标按下开始移动滚动条
     */
    const handleStopMoveScrollbar = () => {
        isMovingScrollbarRef.current = false;
        stopListenMouseMove();
    };

    /**
     * 处理鼠标按下移动滚动条事件
     * @param e 事件对象
     */
    const handleMoveScrollbar = (e: MouseEvent) => {
        const isMovingScrollbar = isMovingScrollbarRef.current;
        if (!isMovingScrollbar) {
            return;
        }
        const scrollInfo = scrollInfoRef.current;
        if (scrollInfo.scrollHeight <= scrollInfo.clientHeight) {
            return;
        }

        const {startY, startPosition} = isMovingScrollbar;
        if (e.clientY === startY) {
            return;
        }
        scrollTo(startPosition + (e.clientY - startY) * (stickyToBottom ? -1 : 1) * ((scrollInfo.scrollHeight - scrollInfo.clientHeight) / (scrollInfo.clientHeight - scrollInfo.scrollbarHeight)));
    };

    /**
     * 处理触摸开始事件
     * @param e 触摸事件对象
     */
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        touchingRef.current = {
            startY: touch.clientY,
            lastY: touch.clientY,
            startTime: Date.now(),
            // 是否触摸目标为滚动条拖动条
            isTouchScrollbar: (e.target as HTMLElement).classList.contains('scroll-list-scrollbar-bar'),
        };
    };

    /**
     * 处理触摸移动事件
     * @param e 触摸事件对象
     */
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchingRef.current) {
            return;
        }

        const touch = e.touches[0];
        const thisY = touch.clientY;
        const deltaY = (touchingRef.current.lastY - thisY) * (touchingRef.current.isTouchScrollbar ? -1 : 1);
        touchingRef.current.lastY = thisY;

        handleWheel({deltaY});
    };

    /**
     * 处理触摸结束或取消事件
     * @param e 触摸事件对象
     */
    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!touchingRef.current) {
            return;
        }

        const {startY, startTime, lastY} = touchingRef.current;
        const endTime = Date.now();
        const endY = e.touches[0]?.clientY || lastY;
        // 用户触摸滑动速度，px/ms
        const speed = (endY - startY) / (endTime - startTime);
        // 触摸完成后需要继续加速滑动的距离
        const distance = 300 * speed;

        if (acceleratingTimerRef.current) {
            clearTimeout(acceleratingTimerRef.current);
            acceleratingTimerRef.current = null;
        }

        if (speed !== 0) {
            listElementRef.current!.classList.add('touch-accelerating');
            handleWheel({deltaY: distance * (touchingRef.current.isTouchScrollbar ? 1 : -1)});
            acceleratingTimerRef.current = setTimeout(() => {
                listElementRef.current!.classList.remove('touch-accelerating');
                acceleratingTimerRef.current = null;
            }, 650);
        }

        touchingRef.current = false;
    };

    useImperativeHandle(ref, () => ({
        scrollTo,
        scrollToBegin,
        listElement: listElementRef.current!,
        scrollInfo: scrollInfoRef.current,
        scrollToElement,
    }), [scrollTo, scrollToBegin, scrollToElement]);

    useEffect(() => {
        if (showScrollbarAfterShow) {
            startScrollingEffect();
        }

        return () => {
            if (scrollingEffectTimerRef.current) {
                clearTimeout(scrollingEffectTimerRef.current);
            }
        };
    }, [startScrollingEffect, showScrollbarAfterShow]);

    useEffect(() => {
        tryUpdateStyle();
        // 监听滚动区域尺寸大小变化
        containerSizeObserverRef.current = new ResizeObserver((entries) => {
            // 检查是否可见
            const {contentRect} = entries[0];
            if (!contentRect.left && !contentRect.top && !contentRect.width && !contentRect.height) {
                return;
            }

            if (
                containerElementRef.current!.clientHeight !== scrollInfoRef.current.scrollHeight
                || listElementRef.current!.clientHeight !== scrollInfoRef.current.clientHeight
            ) {
                tryUpdateStyle();
            }
        });
        containerSizeObserverRef.current.observe(containerElementRef.current!);
        containerSizeObserverRef.current.observe(listElementRef.current!);

        return () => {
            containerSizeObserverRef.current?.disconnect();
        };
    }, [tryUpdateStyle]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => () => {
        stopListenMouseMove();
        if (acceleratingTimerRef.current) {
            clearTimeout(acceleratingTimerRef.current);
        }
    }, []);

    useEffect(() => {
        // 监听自定义事件 scrolllist，内部任何元素主动触发此事件可以实现滚动到指定元素位置
        // 类似于原生可滚动元素上的 scrollIntoView 方法
        // @ts-ignore
        listElementRef.current?.addEventListener('scrolllist', handleCustomEvent);

        return () => {
            // @ts-ignore
            listElementRef.current?.removeEventListener('scrolllist', handleCustomEvent);
        };
    }, [handleCustomEvent]);

    useEffect(() => {
        // 监听滚动区域其他可滚动元素的原生滚动事件，以避免同时发生滚动行为
        containerElementRef.current?.addEventListener('scroll', handleContainerScroll, {capture: true});
        return () => {
            containerElementRef.current?.removeEventListener('scroll', handleContainerScroll);
        }
    }, [handleContainerScroll]);

    const classNames = classes(
        'scroll-list',
        className,
        `is-stick-${stickyToBottom ? 'bottom' : 'top'}`,
        {'has-animation': animation}
    );

    return (
        <div
            ref={listElementRef}
            className={classNames}
            onWheel={handleWheel}
            onKeyUp={useHotkey ? handleKeyUp : undefined}
            onKeyDown={useHotkey ? handleKeyDown : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            tabIndex={useHotkey ? 0 : undefined} // 此处是允许滚动区域获得焦点并响应键盘事件实现快捷键滚动操作
            {...others}
        >
            <div className="scroll-list-container" ref={containerElementRef}>
                {children}
            </div>
            <div className="scroll-list-scrollbar" onMouseDown={handleClickScrollbar}>
                <div
                    ref={scrollbarElementRef}
                    className="scroll-list-scrollbar-bar"
                    onMouseDown={e => handleStartMoveScrollbar(e)}
                />
            </div>
            {typeof customView === 'function' ? customView(scrollInfoRef.current) : customView}
        </div>
    );
});

export default ScrollList;
