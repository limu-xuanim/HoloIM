import {memo, forwardRef, type ForwardedRef} from 'react';
import ScrollListCustom, {type ScrollListCustomRef, type ScrollListCustomProps} from './scroll-list-custom';
import ScrollListClassic, {type ScrollListClassicProps, type ScrollListClassicRef} from './scroll-list-classic';

export type ScrollListProps = ScrollListCustomProps | ScrollListClassicProps;

/**
 * 滚动列表组件
 * @param props React 组件属性对象
 * @param props.className CSS 类名
 * @param props.stickyToBottom 是否将底部作为滚动起始位置
 * @param props.useHotkey 是否启用快捷键
 * @param props.animation 是否启用动画效果
 * @param props.customView 内部自定义组件内容
 * @param props.onScroll 当滚动位置变更时的回调函数
 * @param props.onScrollToEnd 当滚动到结束位置时的回调函数
 * @param props.minScrollbarHeight 滚动条拖动条最小高度
 * @param props.scrollPageRatio 使用快捷键滚动一页的高度比例
 * @param props.wheelSpeed 使用滚轮滚动时的速率
 * @param props.showScrollbarAfterShow 是否在界面显示后立即显示滚动条
 * @param props.scrollbarHideDelay 滚动条隐藏延迟
 * @param props.children 滚动内容
 * @param  ref 要转发的 Ref
 * @returns JSX.Element
 */
const ScrollList = forwardRef((props: ScrollListProps, ref: ForwardedRef<ScrollListCustomRef | ScrollListClassicRef>) => {
    if ('ontouchstart' in window) {
        // Touchable 剔除 ScrollListCustom 只有的属性
        // @ts-ignore
        const {animation, hoverEffect, minScrollbarHeight, scrollbarHideDelay, scrollPageRatio, showScrollbarAfterShow, useHotkey, wheelSpeed, ...others} = props as ScrollListClassicProps;

        return <ScrollListClassic ref={ref as ForwardedRef<ScrollListClassicRef>} {...others} />;
    }
    return <ScrollListCustom ref={ref as ForwardedRef<ScrollListCustomRef>} {...props as ScrollListCustomProps} />;
});

export default memo(ScrollList);
